#!/usr/bin/env npx ts-node
/**
 * Create and persist a delta.
 * Input: {"author": "...", "pointers": [...]}
 * Output: the full persisted delta as JSON
 */

import { openStore, parseInput, closeAndExit, closeAndFail, run } from './common';

run(async () => {
  const input = await parseInput();
  const store = await openStore();

  if (!input.author) {
    await closeAndFail(store, 'Missing required field: author');
  }
  if (!input.pointers || !Array.isArray(input.pointers)) {
    await closeAndFail(store, 'Missing required field: pointers (array)');
  }

  const delta = store.createDelta(input.author, input.pointers);
  await store.persistDelta(delta);
  await closeAndExit(store, delta);
});
