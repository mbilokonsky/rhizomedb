#!/usr/bin/env npx ts-node
/**
 * Query at a past timestamp.
 * Input: {"objectId": "...", "timestamp": number, "schema?": "..."}
 * Output: the HyperView as of that time
 *
 * Uses the constructHyperView function directly with a queryTimestamp
 * parameter to filter deltas by time.
 */

import { Delta } from '../src/core/types';
import { parseInput, withStore, closeAndExit, closeAndFail, fail, run } from './common';
import { createStandardSchema, constructHyperView, SchemaRegistry } from '../src/schemas/hyperview';

const MAX_DELTAS = 100_000;

run(async () => {
  const input = await parseInput();

  if (!input.objectId) {
    fail('Missing required field: objectId');
  }
  if (typeof input.timestamp !== 'number') {
    fail('Missing required field: timestamp (number)');
  }

  await withStore(async (store) => {
    const schemaId = (input.schema as string) || '_default_query';
    const schema = createStandardSchema(
      schemaId,
      schemaId === '_default_query' ? 'Default Query Schema' : schemaId
    );

    const registry = new SchemaRegistry();
    registry.register(schema);

    // Collect all deltas from the store with safeguard
    const allDeltas: Delta[] = [];
    for await (const delta of store.scanDeltas({ includeNegated: true })) {
      allDeltas.push(delta);
      if (allDeltas.length > MAX_DELTAS) {
        await closeAndFail(store, `Too many deltas (>${MAX_DELTAS}). Use filters or a narrower time range.`);
      }
    }

    const hyperView = constructHyperView(
      input.objectId as string,
      schema,
      allDeltas,
      registry,
      input.timestamp as number
    );

    await closeAndExit(store, hyperView);
  });
});
