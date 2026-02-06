#!/usr/bin/env npx ts-node
/**
 * Retract a property from an entity.
 * Input:  {"entity": "alice", "property": "name", "author": "agent-1"}
 * Output: {"negatedDeltaIds": ["..."], "count": 1}
 *
 * Finds all active deltas asserting something about the entity in context "property",
 * then creates negation deltas for each. Semantic opposite of `claim`.
 */

import { parseInput, withStore, closeAndExit, closeAndFail, fail, run } from './common';
import { isReference } from '../src/core/validation';

run(async () => {
  const input = await parseInput();

  if (!input.entity) fail('Missing required field: entity');
  if (!input.property) fail('Missing required field: property');
  if (!input.author) fail('Missing required field: author');

  const entity = input.entity as string;
  const property = input.property as string;
  const author = input.author as string;

  await withStore(async (store) => {
    // Find all active deltas that target this entity in the given context
    const matchingDeltaIds: string[] = [];

    for await (const delta of store.scanDeltas({ targetIds: [entity] })) {
      const matchesContext = delta.pointers.some(
        p => isReference(p.target) && p.target.id === entity && p.target.context === property
      );
      if (matchesContext) {
        matchingDeltaIds.push(delta.id);
      }
    }

    if (matchingDeltaIds.length === 0) {
      await closeAndFail(store, `No active deltas found for entity "${entity}" with property "${property}"`);
    }

    // Negate each matching delta
    const negatedDeltaIds: string[] = [];
    for (const deltaId of matchingDeltaIds) {
      const negation = store.negateDelta(author, deltaId);
      await store.persistDelta(negation);
      negatedDeltaIds.push(negation.id);
    }

    await closeAndExit(store, {
      negatedDeltaIds,
      count: negatedDeltaIds.length
    });
  });
});
