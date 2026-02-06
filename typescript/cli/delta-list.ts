#!/usr/bin/env npx ts-node
/**
 * List deltas matching optional filters.
 * Input: {"author?", "targetId?", "after?", "before?", "limit?"}
 * Output: {"deltas": [...]}
 */

import { DeltaFilter } from '../src/core/types';
import { openStore, parseInput, closeAndExit, run } from './common';

run(async () => {
  const input = await parseInput();
  const store = await openStore();

  const filter: DeltaFilter = {
    includeNegated: input.includeNegated || false
  };

  if (input.author) {
    filter.authors = [input.author];
  }
  if (input.targetId) {
    filter.targetIds = [input.targetId];
  }
  if (input.after || input.before) {
    filter.timestampRange = {};
    if (input.after) filter.timestampRange.start = input.after;
    if (input.before) filter.timestampRange.end = input.before;
  }

  const deltas: any[] = [];
  const limit = input.limit || Infinity;

  for await (const delta of store.scanDeltas(filter)) {
    deltas.push(delta);
    if (deltas.length >= limit) break;
  }

  await closeAndExit(store, { deltas, count: deltas.length });
});
