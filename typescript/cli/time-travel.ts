#!/usr/bin/env npx ts-node
/**
 * Query at a past timestamp.
 * Input: {"objectId": "...", "timestamp": number, "schema?": "..."}
 * Output: the HyperView as of that time
 *
 * Uses the constructHyperView function directly with a queryTimestamp
 * parameter to filter deltas by time.
 */

import { openStore, parseInput, closeAndExit, closeAndFail, run } from './common';
import { createStandardSchema, constructHyperView, SchemaRegistry } from '../src/schemas/hyperview';

run(async () => {
  const input = await parseInput();
  const store = await openStore();

  if (!input.objectId) {
    await closeAndFail(store, 'Missing required field: objectId');
  }
  if (typeof input.timestamp !== 'number') {
    await closeAndFail(store, 'Missing required field: timestamp (number)');
  }

  const schema = createStandardSchema(
    input.schema || '_default_query',
    input.schema || 'Default Query Schema'
  );

  const registry = new SchemaRegistry();
  registry.register(schema);

  // Collect all deltas from the store
  const allDeltas: any[] = [];
  for await (const delta of store.scanDeltas({ includeNegated: true })) {
    allDeltas.push(delta);
  }

  const hyperView = constructHyperView(
    input.objectId,
    schema,
    allDeltas,
    registry,
    input.timestamp
  );

  await closeAndExit(store, hyperView);
});
