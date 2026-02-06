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

import { openStore, parseInput, closeAndExit, closeAndFail, run } from './common';

run(async () => {
  const input = await parseInput();
  const store = await openStore();

  if (!input.id) {
    await closeAndFail(store, 'Missing required field: id');
  }
  if (!input.name) {
    await closeAndFail(store, 'Missing required field: name');
  }

  // Store schema definition as a delta (schemas are data)
  const pointers: any[] = [
    { role: 'typed', target: { id: input.id, context: 'type' } },
    { role: 'type', target: 'HyperSchema' },
    { role: 'named', target: { id: input.id, context: 'name' } },
    { role: 'name', target: input.name }
  ];

  // Store declared properties as additional pointers
  if (input.properties && Array.isArray(input.properties)) {
    for (const prop of input.properties) {
      pointers.push(
        { role: 'declares', target: { id: input.id, context: 'properties' } },
        { role: 'property', target: prop }
      );
    }
  }

  const delta = store.createDelta(input.author || 'system', pointers);
  await store.persistDelta(delta);

  await closeAndExit(store, {
    schemaId: input.id,
    deltaId: delta.id,
    name: input.name,
    properties: input.properties || []
  });
});
