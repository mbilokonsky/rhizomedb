#!/usr/bin/env npx ts-node
/**
 * List deltas matching optional filters.
 * Input: {"author?", "targetId?", "after?", "before?", "limit?"}
 * Output: {"deltas": [...]}
 */

import { Delta, DeltaFilter } from '../src/core/types';
import { parseInput, withStore, closeAndExit, run } from './common';

run(async () => {
  const input = await parseInput();

  await withStore(async (store) => {
    const filter: DeltaFilter = {
      includeNegated: (input.includeNegated as boolean) || false
    };

    if (input.author) {
      filter.authors = [input.author as string];
    }
    if (input.targetId) {
      filter.targetIds = [input.targetId as string];
    }
    if (input.after || input.before) {
      filter.timestampRange = {};
      if (input.after) filter.timestampRange.start = input.after as number;
      if (input.before) filter.timestampRange.end = input.before as number;
    }

    const deltas: Delta[] = [];
    const limit = (input.limit as number) || Infinity;

    for await (const delta of store.scanDeltas(filter)) {
      deltas.push(delta);
      if (deltas.length >= limit) break;
    }

    await closeAndExit(store, { deltas, count: deltas.length });
  });
});
