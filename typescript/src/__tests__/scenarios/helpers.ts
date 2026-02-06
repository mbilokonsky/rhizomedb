/**
 * Shared helpers for scenario tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { createServer, Server } from 'http';
import { RhizomeDB } from '../../storage/instance';
import { FederationManager } from '../../federation/manager';
import { FederationEvent, TrustPolicy } from '../../federation/types';
import { Delta, HyperSchema, HyperView, PropertyResolution } from '../../core/types';
import { createStandardSchema, constructHyperView, SchemaRegistry, selectByTargetContext } from '../../schemas/hyperview';
import { ViewResolver, mostRecent, firstWrite, allValues, trustedAuthor, extractPrimitive } from '../../queries/view-resolver';
import { TimeTravelDB, enableTimeTravel } from '../../queries/time-travel';
import { getNegatedDeltaIds } from '../../queries/negation';

// ============================================================================
// Instance Creation
// ============================================================================

export interface TestInstance {
  db: RhizomeDB;
  manager: FederationManager;
  httpServer: Server;
  port: number;
  events: FederationEvent[];
}

export async function createFederatedInstance(
  systemId: string,
  options?: { trustPolicy?: TrustPolicy }
): Promise<TestInstance> {
  const db = new RhizomeDB({ storage: 'memory', systemId });
  const httpServer = createServer();
  await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
  const addr = httpServer.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;

  const manager = new FederationManager(db, {
    enableServer: true,
    serverConfig: {
      server: httpServer,
      path: '/federation',
      trustPolicy: options?.trustPolicy
    },
    autoBroadcast: true
  });

  const events: FederationEvent[] = [];
  manager.onFederationEvent((event) => events.push(event));

  return { db, manager, httpServer, port, events };
}

export async function teardownInstance(instance: TestInstance): Promise<void> {
  try { await instance.manager.close(); } catch { /* ignore */ }
  try {
    await new Promise<void>((resolve) => {
      instance.httpServer.close(() => resolve());
      setTimeout(resolve, 2000);
    });
  } catch { /* ignore */ }
}

export async function connectInstances(
  a: TestInstance,
  b: TestInstance,
  options?: { initialSync?: 'full' | 'none' | 'from_timestamp' }
): Promise<void> {
  const link = await b.manager.connectToRemote(
    `ws://localhost:${a.port}/federation`,
    {
      mode: 'bidirectional',
      initialSync: options?.initialSync ?? 'none',
      reconnect: { enabled: false }
    }
  );
  expect(link.status).toBe('connected');
}

// ============================================================================
// Delta Creation
// ============================================================================

/** Create an annotation delta (object + primitive value) */
export function annotate(
  db: RhizomeDB,
  entityId: string,
  property: string,
  value: string | number | boolean,
  author: string,
  timestamp?: number
): Delta {
  const delta = db.createDelta(author, [
    { role: `${property}d`, target: { id: entityId, context: property } },
    { role: property, target: value }
  ]);
  if (timestamp !== undefined) delta.timestamp = timestamp;
  return delta;
}

/** Create a relationship delta (object + object) */
export function relate(
  db: RhizomeDB,
  roleA: string,
  entityA: string,
  contextA: string,
  roleB: string,
  entityB: string,
  contextB: string,
  author: string,
  timestamp?: number
): Delta {
  const delta = db.createDelta(author, [
    { role: roleA, target: { id: entityA, context: contextA } },
    { role: roleB, target: { id: entityB, context: contextB } }
  ]);
  if (timestamp !== undefined) delta.timestamp = timestamp;
  return delta;
}

// ============================================================================
// View Resolution
// ============================================================================

/** Build HyperView for an entity using all deltas in the database */
export function buildHyperView(
  db: RhizomeDB,
  entityId: string,
  schema?: HyperSchema,
  queryTimestamp?: number
): HyperView {
  const s = schema ?? createStandardSchema('_query', 'Query');
  const registry = new SchemaRegistry();
  registry.register(s);

  const allDeltas = db.queryDeltas({ includeNegated: true });
  const deltasArray = Array.isArray(allDeltas) ? allDeltas : [];

  return constructHyperView(entityId, s, deltasArray, registry, queryTimestamp);
}

/** Resolve an entity to a simple key-value View using mostRecent */
export function resolveEntity(
  db: RhizomeDB,
  entityId: string,
  queryTimestamp?: number
): Record<string, any> {
  const hyperView = buildHyperView(db, entityId, undefined, queryTimestamp);
  return resolveHyperView(hyperView, mostRecent);
}

/** Resolve an entity using a specific resolution strategy */
export function resolveEntityWith(
  db: RhizomeDB,
  entityId: string,
  strategy: (deltas: Delta[]) => any,
  queryTimestamp?: number
): Record<string, any> {
  const hyperView = buildHyperView(db, entityId, undefined, queryTimestamp);
  return resolveHyperView(hyperView, strategy);
}

/** Resolve a HyperView to a plain object */
export function resolveHyperView(
  hyperView: HyperView,
  strategy: (deltas: Delta[]) => any
): Record<string, any> {
  const properties: Record<string, PropertyResolution> = {};

  for (const [key, value] of Object.entries(hyperView)) {
    if (key === 'id' || key === '_metadata' || !Array.isArray(value)) continue;
    properties[key] = {
      source: key,
      extract: (delta: Delta) => {
        for (const p of delta.pointers) {
          if (typeof p.target === 'string' || typeof p.target === 'number' || typeof p.target === 'boolean') {
            return p.target;
          }
        }
        return null;
      },
      resolve: strategy
    };
  }

  if (Object.keys(properties).length === 0) {
    return { id: hyperView.id };
  }

  const resolver = new ViewResolver();
  return resolver.resolveView(hyperView, { properties });
}

/** Get all values for a specific property of an entity */
export function allValuesFor(
  db: RhizomeDB,
  entityId: string,
  property: string,
  queryTimestamp?: number
): any[] {
  const hyperView = buildHyperView(db, entityId, undefined, queryTimestamp);
  const deltas = hyperView[property] as Delta[] | undefined;
  if (!deltas || deltas.length === 0) return [];

  return deltas.map((delta) => {
    for (const p of delta.pointers) {
      if (typeof p.target === 'string' || typeof p.target === 'number' || typeof p.target === 'boolean') {
        return p.target;
      }
    }
    return null;
  }).filter((v) => v !== null);
}

/** Get all relationship targets for a specific property */
export function relatedIds(
  db: RhizomeDB,
  entityId: string,
  property: string,
  throughRole: string,
  queryTimestamp?: number
): string[] {
  const hyperView = buildHyperView(db, entityId, undefined, queryTimestamp);
  const deltas = hyperView[property] as Delta[] | undefined;
  if (!deltas || deltas.length === 0) return [];

  const ids: string[] = [];
  for (const delta of deltas) {
    for (const p of delta.pointers) {
      if (p.role === throughRole && typeof p.target === 'object' && 'id' in p.target) {
        ids.push(p.target.id);
      }
    }
  }
  return ids;
}

// ============================================================================
// Async Helpers
// ============================================================================

export function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 50
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, interval);
      }
    };
    check();
  });
}

export function countEntityDeltas(db: RhizomeDB, entityId: string): number {
  const deltas = db.queryDeltas({ targetIds: [entityId], includeNegated: true });
  return Array.isArray(deltas) ? deltas.length : 0;
}

// Re-exports for convenience
export {
  RhizomeDB,
  Delta,
  HyperSchema,
  HyperView,
  createStandardSchema,
  constructHyperView,
  SchemaRegistry,
  selectByTargetContext,
  ViewResolver,
  mostRecent,
  firstWrite,
  allValues,
  trustedAuthor,
  extractPrimitive,
  TimeTravelDB,
  enableTimeTravel,
  getNegatedDeltaIds
};
