/**
 * MCP Resource implementations for RhizomeDB domain objects
 */

import { RhizomeDB } from 'rhizomedb';
import { Delta } from 'rhizomedb';

export interface ResourceContext {
  db: RhizomeDB;
}

/**
 * Get a domain object as a resource
 *
 * Resource URI format: rhizome://object/{objectId}
 */
export async function getObjectResource(
  context: ResourceContext,
  objectId: string
): Promise<{ content: string; mimeType: string }> {
  const deltas = context.db.queryDeltas({
    targetIds: [objectId],
    includeNegated: false
  });

  if (deltas.length === 0) {
    throw new Error(`Object not found: ${objectId}`);
  }

  // Build a simple object representation from deltas
  const obj: Record<string, unknown> = {
    id: objectId,
    _deltaCount: deltas.length
  };

  // Group deltas by context
  const byContext: Record<string, Delta[]> = {};

  for (const delta of deltas) {
    for (const pointer of delta.pointers) {
      if (typeof pointer.target === 'object' && 'id' in pointer.target) {
        if (pointer.target.id === objectId && pointer.target.context) {
          if (!byContext[pointer.target.context]) {
            byContext[pointer.target.context] = [];
          }
          byContext[pointer.target.context].push(delta);
        }
      }
    }
  }

  // Extract simple values
  for (const [context, contextDeltas] of Object.entries(byContext)) {
    const values: unknown[] = [];

    for (const delta of contextDeltas) {
      // Find non-reference pointers
      for (const pointer of delta.pointers) {
        if (typeof pointer.target !== 'object' || !('id' in pointer.target)) {
          values.push(pointer.target);
        } else if (pointer.target.id !== objectId) {
          // This is a reference to another object
          values.push({ _ref: pointer.target.id, _role: pointer.role });
        }
      }
    }

    obj[context] = values.length === 1 ? values[0] : values;
  }

  return {
    content: JSON.stringify(obj, null, 2),
    mimeType: 'application/json'
  };
}

/**
 * Get a delta as a resource
 *
 * Resource URI format: rhizome://delta/{deltaId}
 */
export async function getDeltaResource(
  context: ResourceContext,
  deltaId: string
): Promise<{ content: string; mimeType: string }> {
  const deltas = await context.db.getDeltas([deltaId]);

  if (deltas.length === 0) {
    throw new Error(`Delta not found: ${deltaId}`);
  }

  const delta = deltas[0];

  return {
    content: JSON.stringify(delta, null, 2),
    mimeType: 'application/json'
  };
}

/**
 * List all available objects (sample - returns objects with recent activity)
 */
export async function listObjects(
  context: ResourceContext,
  limit: number = 100
): Promise<Array<{ uri: string; name: string; description?: string }>> {
  // Get recent deltas and extract unique object IDs
  const allDeltas = context.db.queryDeltas({});
  const objectIds = new Set<string>();

  for (const delta of allDeltas) {
    for (const pointer of delta.pointers) {
      if (typeof pointer.target === 'object' && 'id' in pointer.target) {
        objectIds.add(pointer.target.id);
      }
    }
  }

  // Convert to resource list
  const resources = Array.from(objectIds)
    .slice(0, limit)
    .map((id) => ({
      uri: `rhizome://object/${id}`,
      name: id,
      description: `Domain object: ${id}`
    }));

  return resources;
}
