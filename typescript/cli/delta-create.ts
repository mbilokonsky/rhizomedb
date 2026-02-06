#!/usr/bin/env npx ts-node
/**
 * Create and persist a delta.
 * Input: {"author": "...", "pointers": [...]}
 * Output: the full persisted delta as JSON
 */

import { Pointer } from '../src/core/types';
import { validatePointer, ValidationError } from '../src/core/validation';
import { parseInput, withStore, closeAndExit, closeAndFail, fail, run } from './common';

run(async () => {
  const input = await parseInput();

  if (!input.author) {
    fail('Missing required field: author');
  }
  if (!input.pointers || !Array.isArray(input.pointers)) {
    fail('Missing required field: pointers (array)');
  }

  const pointers = input.pointers as Pointer[];

  // Validate each pointer before creating the delta
  for (let i = 0; i < pointers.length; i++) {
    try {
      validatePointer(pointers[i]);
    } catch (err) {
      if (err instanceof ValidationError) {
        fail(`Invalid pointer at index ${i}: ${err.message}`);
      }
      throw err;
    }
  }

  await withStore(async (store) => {
    const delta = store.createDelta(input.author as string, pointers);
    await store.persistDelta(delta);
    await closeAndExit(store, delta);
  });
});
