#!/usr/bin/env npx ts-node
/**
 * Query a domain object.
 * Input: {"objectId": "...", "schema?": "schemaId", "resolve?": boolean}
 * Output: resolved View (default) or raw HyperView
 *
 * Without a named schema, uses the standard selectByTargetContext pattern
 * which organizes deltas by their Reference context field.
 */

import { Delta } from '../src/core/types';
import { openStore, parseInput, closeAndExit, closeAndFail, run } from './common';
import { createStandardSchema } from '../src/schemas/hyperview';
import { ViewResolver, mostRecent } from '../src/queries/view-resolver';

run(async () => {
  const input = await parseInput();
  const store = await openStore();

  if (!input.objectId) {
    await closeAndFail(store, 'Missing required field: objectId');
  }

  // Build or resolve schema
  const schema = createStandardSchema(
    input.schema || '_default_query',
    input.schema || 'Default Query Schema'
  );

  const hyperView = await store.applyHyperSchema(input.objectId, schema);

  // If resolve is false, return raw HyperView
  if (input.resolve === false) {
    await closeAndExit(store, hyperView);
    return;
  }

  // Auto-detect properties from the HyperView and build a ViewSchema
  // For each property, extract all non-self-referencing primitive values
  const properties: Record<string, any> = {};
  for (const [key, value] of Object.entries(hyperView)) {
    if (key === 'id' || key === '_metadata' || !Array.isArray(value)) continue;

    properties[key] = {
      source: key,
      extract: (delta: Delta) => {
        // Find the first pointer whose target is a primitive (not a reference to the queried object)
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
