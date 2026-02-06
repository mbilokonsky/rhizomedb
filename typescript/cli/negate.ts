#!/usr/bin/env npx ts-node
/**
 * Negate a delta.
 * Input: {"deltaId": "...", "author": "...", "reason?": "..."}
 * Output: the negation delta
 */

import { openStore, parseInput, closeAndExit, closeAndFail, run } from './common';

run(async () => {
  const input = await parseInput();
  const store = await openStore();

  if (!input.deltaId) {
    await closeAndFail(store, 'Missing required field: deltaId');
  }
  if (!input.author) {
    await closeAndFail(store, 'Missing required field: author');
  }

  // Verify the target delta exists
  const existing = await store.getDeltas([input.deltaId]);
  if (existing.length === 0) {
    await closeAndFail(store, `Target delta not found: ${input.deltaId}`);
  }

  const negation = store.negateDelta(input.author, input.deltaId, input.reason);
  await store.persistDelta(negation);
  await closeAndExit(store, negation);
});
