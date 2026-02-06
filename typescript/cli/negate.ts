#!/usr/bin/env npx ts-node
/**
 * Negate a delta.
 * Input: {"deltaId": "...", "author": "...", "reason?": "..."}
 * Output: the negation delta
 */

import { parseInput, withStore, closeAndExit, closeAndFail, fail, run } from './common';

run(async () => {
  const input = await parseInput();

  if (!input.deltaId) {
    fail('Missing required field: deltaId');
  }
  if (!input.author) {
    fail('Missing required field: author');
  }

  await withStore(async (store) => {
    // Verify the target delta exists
    const existing = await store.getDeltas([input.deltaId as string]);
    if (existing.length === 0) {
      await closeAndFail(store, `Target delta not found: ${input.deltaId}`);
    }

    const negation = store.negateDelta(
      input.author as string,
      input.deltaId as string,
      input.reason as string | undefined
    );
    await store.persistDelta(negation);
    await closeAndExit(store, negation);
  });
});
