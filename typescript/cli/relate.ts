#!/usr/bin/env npx ts-node
/**
 * Assert a relationship between two entities.
 * Input:  {"from": "alice", "fromContext": "posts", "fromRole": "author",
 *          "to": "post_1", "toContext": "author", "toRole": "post", "author": "agent-1"}
 * Output: {"deltaId": "...", "from": "alice", "to": "post_1"}
 *
 * Internally creates the relationship pattern delta:
 * - {role: fromRole, target: {id: from, context: fromContext}}
 * - {role: toRole, target: {id: to, context: toContext}}
 */

import { Pointer } from '../src/core/types';
import { parseInput, withStore, closeAndExit, fail, run } from './common';

run(async () => {
  const input = await parseInput();

  if (!input.from) fail('Missing required field: from');
  if (!input.fromContext) fail('Missing required field: fromContext');
  if (!input.fromRole) fail('Missing required field: fromRole');
  if (!input.to) fail('Missing required field: to');
  if (!input.toContext) fail('Missing required field: toContext');
  if (!input.toRole) fail('Missing required field: toRole');
  if (!input.author) fail('Missing required field: author');

  const from = input.from as string;
  const fromContext = input.fromContext as string;
  const fromRole = input.fromRole as string;
  const to = input.to as string;
  const toContext = input.toContext as string;
  const toRole = input.toRole as string;
  const author = input.author as string;

  const pointers: Pointer[] = [
    { role: fromRole, target: { id: from, context: fromContext } },
    { role: toRole, target: { id: to, context: toContext } }
  ];

  await withStore(async (store) => {
    const delta = store.createDelta(author, pointers);
    await store.persistDelta(delta);
    await closeAndExit(store, {
      deltaId: delta.id,
      from,
      to
    });
  });
});
