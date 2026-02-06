#!/usr/bin/env npx ts-node
/**
 * Register a HyperSchema by storing it as deltas.
 * Input: {"id": "...", "name": "...", "properties": ["prop1", "prop2", ...]}
 *
 * Since HyperSchemas contain functions (select, transform) which can't be
 * serialized, this stores schema metadata as deltas and creates a standard
 * selectByTargetContext schema. The properties list declares which context
 * values this schema expects to organize.
 *
 * Output: {"schemaId": "...", "deltaId": "...", "name": "..."}
 */

import { Pointer } from '../src/core/types';
import { parseInput, withStore, closeAndExit, closeAndFail, fail, run } from './common';

run(async () => {
  const input = await parseInput();

  if (!input.id) {
    fail('Missing required field: id');
  }
  if (!input.name) {
    fail('Missing required field: name');
  }

  await withStore(async (store) => {
    const schemaId = input.id as string;
    const schemaName = input.name as string;

    // Store schema definition as a delta (schemas are data)
    const pointers: Pointer[] = [
      { role: 'typed', target: { id: schemaId, context: 'type' } },
      { role: 'type', target: 'HyperSchema' },
      { role: 'named', target: { id: schemaId, context: 'name' } },
      { role: 'name', target: schemaName }
    ];

    // Store declared properties as additional pointers
    if (input.properties && Array.isArray(input.properties)) {
      for (const prop of input.properties as string[]) {
        pointers.push(
          { role: 'declares', target: { id: schemaId, context: 'properties' } },
          { role: 'property', target: prop }
        );
      }
    }

    const delta = store.createDelta((input.author as string) || 'system', pointers);
    await store.persistDelta(delta);

    await closeAndExit(store, {
      schemaId,
      deltaId: delta.id,
      name: schemaName,
      properties: input.properties || []
    });
  });
});
