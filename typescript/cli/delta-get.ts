#!/usr/bin/env npx ts-node
/**
 * Get a specific delta by ID.
 * Input: {"id": "..."}
 * Output: the delta JSON, or error if not found
 */

import { parseInput, withStore, closeAndExit, closeAndFail, fail, run } from './common';

run(async () => {
  const input = await parseInput();

  if (!input.id) {
    fail('Missing required field: id');
  }

  await withStore(async (store) => {
    const deltas = await store.getDeltas([input.id as string]);
    if (deltas.length === 0) {
      await closeAndFail(store, `Delta not found: ${input.id}`);
    }

    await closeAndExit(store, deltas[0]);
  });
});
