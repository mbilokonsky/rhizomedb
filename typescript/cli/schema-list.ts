#!/usr/bin/env npx ts-node
/**
 * List registered schemas (stored as deltas with type "HyperSchema").
 * No args needed.
 * Output: {"schemas": [{"id", "name", "properties": [...]}]}
 */

import { withStore, closeAndExit, run } from './common';
import { isDomainNodeReference } from '../src/core/validation';

run(async () => {
  await withStore(async (store) => {
    // Find all deltas that declare a HyperSchema type
    const schemas: Map<string, { id: string; name: string; properties: string[] }> = new Map();

    for await (const delta of store.scanDeltas()) {
      let schemaId: string | null = null;
      let isSchema = false;
      let name: string | null = null;
      const properties: string[] = [];

      for (const pointer of delta.pointers) {
        if (pointer.role === 'type' && pointer.target === 'HyperSchema') {
          isSchema = true;
        }
        if (pointer.role === 'typed' && isDomainNodeReference(pointer.target)) {
          schemaId = pointer.target.id;
        }
        if (pointer.role === 'name' && typeof pointer.target === 'string') {
          name = pointer.target;
        }
        if (pointer.role === 'property' && typeof pointer.target === 'string') {
          properties.push(pointer.target);
        }
      }

      if (isSchema && schemaId) {
        const existing = schemas.get(schemaId);
        if (existing) {
          if (name) existing.name = name;
          existing.properties.push(...properties);
        } else {
          schemas.set(schemaId, {
            id: schemaId,
            name: name || schemaId,
            properties
          });
        }
      }
    }

    await closeAndExit(store, { schemas: Array.from(schemas.values()), count: schemas.size });
  });
});
