#!/usr/bin/env npx ts-node
/**
 * Assert a fact about an entity.
 * Input:  {"entity": "alice", "property": "name", "value": "Alice Smith", "author": "agent-1", "role?": "named"}
 * Output: {"deltaId": "...", "entity": "alice", "property": "name", "value": "Alice Smith"}
 *
 * Internally creates the annotation pattern delta:
 * - {role: "<past-participle>", target: {id: entity, context: property}}
 * - {role: property, target: value}
 */

import { Pointer } from '../src/core/types';
import { parseInput, withStore, closeAndExit, fail, run } from './common';

/**
 * Convention: past-participle role = property + "d"
 * Override with explicit role for irregular verbs.
 */
function defaultRole(property: string): string {
  return property + 'd';
}

run(async () => {
  const input = await parseInput();

  if (!input.entity) fail('Missing required field: entity');
  if (!input.property) fail('Missing required field: property');
  if (input.value === undefined || input.value === null) fail('Missing required field: value');
  if (!input.author) fail('Missing required field: author');

  const entity = input.entity as string;
  const property = input.property as string;
  const value = input.value as string | number | boolean;
  const author = input.author as string;
  const role = (input.role as string) || defaultRole(property);

  const pointers: Pointer[] = [
    { role, target: { id: entity, context: property } },
    { role: property, target: value }
  ];

  await withStore(async (store) => {
    const delta = store.createDelta(author, pointers);
    await store.persistDelta(delta);
    await closeAndExit(store, {
      deltaId: delta.id,
      entity,
      property,
      value
    });
  });
});
