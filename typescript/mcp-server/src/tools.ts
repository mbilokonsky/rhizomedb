/**
 * MCP Tool implementations for RhizomeDB operations
 */

import { RhizomeDB } from 'rhizomedb';
import { Delta, Pointer, DeltaFilter, HyperSchema } from 'rhizomedb';

export interface ToolContext {
  db: RhizomeDB;
  authorId: string;
}

/**
 * Create a new delta (assertion) in the database
 */
export async function createDelta(
  context: ToolContext,
  args: { pointers: Pointer[] }
): Promise<{ delta: Delta }> {
  const delta = context.db.createDelta(context.authorId, args.pointers);
  await context.db.persistDelta(delta);

  return {
    delta: {
      id: delta.id,
      timestamp: delta.timestamp,
      author: delta.author,
      system: delta.system,
      pointers: delta.pointers
    }
  };
}

/**
 * Query deltas by filter
 */
export async function queryDeltas(
  context: ToolContext,
  args: {
    ids?: string[];
    authors?: string[];
    systems?: string[];
    targetIds?: string[];
    targetContexts?: string[];
    timestampStart?: number;
    timestampEnd?: number;
    includeNegated?: boolean;
    limit?: number;
  }
): Promise<{ deltas: Delta[]; count: number }> {
  const filter: DeltaFilter = {
    ids: args.ids,
    authors: args.authors,
    systems: args.systems,
    targetIds: args.targetIds,
    targetContexts: args.targetContexts,
    timestampRange:
      args.timestampStart !== undefined || args.timestampEnd !== undefined
        ? { start: args.timestampStart, end: args.timestampEnd }
        : undefined,
    includeNegated: args.includeNegated || false
  };

  const deltas = context.db.queryDeltas(filter);
  const limited = args.limit ? deltas.slice(0, args.limit) : deltas;

  return {
    deltas: limited,
    count: deltas.length
  };
}

/**
 * Get a domain object as a HyperView using a registered schema
 */
export async function getHyperView(
  context: ToolContext,
  args: { objectId: string; schemaId: string }
): Promise<{ hyperView: unknown }> {
  const cached = context.db.getHyperView(args.objectId, args.schemaId);

  if (cached) {
    return { hyperView: cached };
  }

  // Schema not found or view not materialized
  throw new Error(
    `No materialized view found for object ${args.objectId} with schema ${args.schemaId}. ` +
      'Register the schema first and materialize the view.'
  );
}

/**
 * Materialize a HyperView for a domain object
 */
export async function materializeView(
  context: ToolContext,
  args: { objectId: string; schemaId: string }
): Promise<{ hyperView: unknown }> {
  // Find registered schema
  const schema = (context.db as any).schemaRegistry?.get(args.schemaId);

  if (!schema) {
    throw new Error(`Schema not found: ${args.schemaId}`);
  }

  const materialized = context.db.materializeHyperView(args.objectId, schema);

  return { hyperView: materialized };
}

/**
 * Time-travel query: Get deltas as they existed at a specific timestamp
 */
export async function timeTravelQuery(
  context: ToolContext,
  args: {
    objectId?: string;
    schemaId?: string;
    timestamp: number;
    targetIds?: string[];
  }
): Promise<{ deltas: Delta[]; timestamp: number }> {
  // Query deltas up to the specified timestamp
  const filter: DeltaFilter = {
    timestampRange: { end: args.timestamp },
    targetIds: args.targetIds || (args.objectId ? [args.objectId] : undefined),
    includeNegated: false
  };

  const deltas = context.db.queryDeltas(filter);

  return {
    deltas,
    timestamp: args.timestamp
  };
}

/**
 * Negate (retract) a delta
 */
export async function negateDelta(
  context: ToolContext,
  args: { deltaId: string; reason?: string }
): Promise<{ negationDelta: Delta }> {
  const negation = context.db.negateDelta(context.authorId, args.deltaId, args.reason);
  await context.db.persistDelta(negation);

  return { negationDelta: negation };
}

/**
 * Get database statistics
 */
export async function getStats(context: ToolContext): Promise<{
  systemId: string | undefined;
  totalDeltas: number;
  materializedViews: number | undefined;
  uptime: number;
  storageType: string | undefined;
  cacheStats:
    | {
        hits: number;
        misses: number;
        evictions: number;
        hitRate: number;
      }
    | undefined;
}> {
  const stats = context.db.getStats();

  return {
    systemId: stats.systemId,
    totalDeltas: stats.totalDeltas,
    materializedViews: stats.materializedHyperViews,
    uptime: stats.uptime,
    storageType: stats.storageType,
    cacheStats: stats.cacheStats
  };
}

/**
 * Register a HyperSchema for use in queries
 */
export async function registerSchema(
  context: ToolContext,
  args: { schema: HyperSchema }
): Promise<{ schemaId: string }> {
  context.db.registerSchema(args.schema);

  return { schemaId: args.schema.id };
}

/**
 * Create a simple object with properties (convenience wrapper)
 */
export async function createObject(
  context: ToolContext,
  args: { objectId: string; properties: Record<string, string | number | boolean> }
): Promise<{ objectId: string; deltaIds: string[] }> {
  const deltaIds: string[] = [];

  // Create one delta per property
  for (const [key, value] of Object.entries(args.properties)) {
    const delta = context.db.createDelta(context.authorId, [
      {
        role: 'entity',
        target: { id: args.objectId, context: key }
      },
      {
        role: key,
        target: value
      }
    ]);

    await context.db.persistDelta(delta);
    deltaIds.push(delta.id);
  }

  return {
    objectId: args.objectId,
    deltaIds
  };
}

/**
 * Create a relationship between two objects
 */
export async function createRelationship(
  context: ToolContext,
  args: {
    fromId: string;
    fromRole: string;
    fromContext: string;
    toId: string;
    toRole: string;
    toContext: string;
  }
): Promise<{ delta: Delta }> {
  const delta = context.db.createDelta(context.authorId, [
    {
      role: args.fromRole,
      target: { id: args.fromId, context: args.fromContext }
    },
    {
      role: args.toRole,
      target: { id: args.toId, context: args.toContext }
    }
  ]);

  await context.db.persistDelta(delta);

  return { delta };
}

/**
 * Get all deltas targeting a specific object
 */
export async function getObjectDeltas(
  context: ToolContext,
  args: { objectId: string; includeNegated?: boolean }
): Promise<{ deltas: Delta[]; count: number }> {
  const deltas = context.db.queryDeltas({
    targetIds: [args.objectId],
    includeNegated: args.includeNegated || false
  });

  return {
    deltas,
    count: deltas.length
  };
}
