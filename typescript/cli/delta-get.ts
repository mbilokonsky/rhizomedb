#!/usr/bin/env npx ts-node
/**
 * Get a specific delta by ID.
 * Input: {"id": "..."}
 * Output: the delta JSON, or error if not found
 */

import { openStore, parseInput, closeAndExit, closeAndFail, run } from './common';

run(async () => {
  const input = await parseInput();
  const store = await openStore();

  if (!input.id) {
    await closeAndFail(store, 'Missing required field: id');
  }

  const deltas = await store.getDeltas([input.id]);
  if (deltas.length === 0) {
    await closeAndFail(store, `Delta not found: ${input.id}`);
  }

  await closeAndExit(store, deltas[0]);
});
