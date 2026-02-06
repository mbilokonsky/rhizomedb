#!/usr/bin/env npx ts-node
/**
 * Query a domain object.
 * Input: {"objectId": "...", "schema?": "schemaId", "resolve?": boolean}
 * Output: resolved View (default) or raw HyperView
 *
 * Without a named schema, uses the standard selectByTargetContext pattern
 * which organizes deltas by their Reference context field.
 */

import { Delta, PropertyResolution } from '../src/core/types';
import { parseInput, withStore, closeAndExit, closeAndFail, fail, run } from './common';
import { createStandardSchema } from '../src/schemas/hyperview';
import { ViewResolver, mostRecent } from '../src/queries/view-resolver';

run(async () => {
  const input = await parseInput();

  if (!input.objectId) {
    fail('Missing required field: objectId');
  }

  await withStore(async (store) => {
    // Build or resolve schema
    const schemaId = (input.schema as string) || '_default_query';
    const schema = createStandardSchema(schemaId, schemaId === '_default_query' ? 'Default Query Schema' : schemaId);

    const hyperView = await store.applyHyperSchema(input.objectId as string, schema);

    // If resolve is false, return raw HyperView
    if (input.resolve === false) {
      await closeAndExit(store, hyperView);
      return;
    }

    // Auto-detect properties from the HyperView and build a ViewSchema
    const properties: Record<string, PropertyResolution> = {};
    for (const [key, value] of Object.entries(hyperView)) {
      if (key === 'id' || key === '_metadata' || !Array.isArray(value)) continue;

      properties[key] = {
        source: key,
        extract: (delta: Delta) => {
          for (const p of delta.pointers) {
            if (typeof p.target === 'string' || typeof p.target === 'number' || typeof p.target === 'boolean') {
              return p.target;
            }
          }
          return null;
        },
        resolve: mostRecent
      };
    }

    if (Object.keys(properties).length === 0) {
      await closeAndExit(store, { id: input.objectId });
      return;
    }

    const viewSchema = { properties };
    const resolver = new ViewResolver();
    const view = resolver.resolveView(hyperView, viewSchema);

    await closeAndExit(store, view);
  });
});
