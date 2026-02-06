/**
 * Federation Stress Scenarios
 *
 * Seven scenarios that exercise federation end-to-end:
 *   1. Two Agents, One Entity (multi-writer convergence)
 *   2. Contradiction Resolution (conflicting claims)
 *   3. Network Partition and Heal (resilience)
 *   4. Trust Boundary Enforcement (security)
 *   5. Bulk Convergence (scale - movie database)
 *   6. Retraction Propagation (negation across federation)
 *   7. Time-Travel Across Systems (temporal consistency)
 */

import { createServer, Server } from 'http';
import { RhizomeDB } from '../../storage/instance';
import { FederationManager } from '../manager';
import { FederationServer } from '../server/server';
import { FederationConnection } from '../client/connection';
import { FederationEvent, TrustPolicy } from '../types';
import { Delta, HyperView, PropertyResolution } from '../../core/types';
import { createStandardSchema, constructHyperView, SchemaRegistry } from '../../schemas/hyperview';
import { ViewResolver, mostRecent, allValues } from '../../queries/view-resolver';
import { seedMovieDatabase } from '../../fixtures/movie-database.fixture';

// All tests in this file need longer timeouts for federation setup/teardown
jest.setTimeout(15000);

// ============================================================================
// Test Helpers
// ============================================================================

interface TestInstance {
  db: RhizomeDB;
  manager: FederationManager;
  httpServer: Server;
  port: number;
  events: FederationEvent[];
}

async function createTestInstance(
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

async function teardown(instance: TestInstance): Promise<void> {
  try {
    await instance.manager.close();
  } catch {
    // Ignore errors during cleanup
  }
  try {
    await new Promise<void>((resolve) => {
      instance.httpServer.close(() => resolve());
      // Force resolve after 2s if server doesn't close
      setTimeout(resolve, 2000);
    });
  } catch {
    // Ignore errors during cleanup
  }
}

function waitFor(
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

/** Connect instance B to instance A bidirectionally */
async function connectInstances(
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
  // connectToRemote awaits the HELLO/HELLO_ACK handshake,
  // so by the time it returns, the link is connected.
  expect(link.status).toBe('connected');
}

/** Count deltas about a specific entity in a db */
function countEntityDeltas(db: RhizomeDB, entityId: string): number {
  const deltas = db.queryDeltas({
    targetIds: [entityId],
    includeNegated: true
  });
  return Array.isArray(deltas) ? deltas.length : 0;
}

/** Resolve an entity to a View using the standard pattern */
function resolveEntity(
  db: RhizomeDB,
  entityId: string,
  queryTimestamp?: number
): Record<string, unknown> {
  const schema = createStandardSchema('_query', 'Query');
  const registry = new SchemaRegistry();
  registry.register(schema);

  const allDeltas = db.queryDeltas({ includeNegated: true });
  const deltasArray = Array.isArray(allDeltas) ? allDeltas : [];

  const hyperView = constructHyperView(
    entityId,
    schema,
    deltasArray,
    registry,
    queryTimestamp
  );

  // Auto-detect properties and resolve
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
      resolve: mostRecent
    };
  }

  if (Object.keys(properties).length === 0) {
    return { id: entityId };
  }

  const resolver = new ViewResolver();
  return resolver.resolveView(hyperView, { properties });
}

/** Same as resolveEntity but with allValues strategy */
function resolveEntityAllValues(
  db: RhizomeDB,
  entityId: string,
  property: string
): unknown[] {
  const schema = createStandardSchema('_query', 'Query');
  const registry = new SchemaRegistry();
  registry.register(schema);

  const allDeltas = db.queryDeltas({ includeNegated: true });
  const deltasArray = Array.isArray(allDeltas) ? allDeltas : [];
  const hyperView = constructHyperView(entityId, schema, deltasArray, registry);

  const deltas = hyperView[property] as Delta[] | undefined;
  if (!deltas || deltas.length === 0) return [];

  // Extract primitive values from each delta
  return deltas.map((delta) => {
    for (const p of delta.pointers) {
      if (typeof p.target === 'string' || typeof p.target === 'number' || typeof p.target === 'boolean') {
        return p.target;
      }
    }
    return null;
  }).filter((v) => v !== null);
}

/** Create a claim delta (same pattern as cli/claim.ts) */
function createClaim(
  db: RhizomeDB,
  entity: string,
  property: string,
  value: string | number | boolean,
  author: string
): Delta {
  const role = property + 'd'; // past-participle convention
  return db.createDelta(author, [
    { role, target: { id: entity, context: property } },
    { role: property, target: value }
  ]);
}

// ============================================================================
// Scenario 1: Two Agents, One Entity
// ============================================================================

describe('Scenario 1: Two Agents, One Entity', () => {
  let instanceA: TestInstance;
  let instanceB: TestInstance;

  beforeEach(async () => {
    instanceA = await createTestInstance('system-a');
    instanceB = await createTestInstance('system-b');
    await connectInstances(instanceA, instanceB);
  });

  afterEach(async () => {
    await teardown(instanceB);
    await teardown(instanceA);
  });

  it('should converge when two agents write different properties', async () => {
    // Agent A claims entity.name
    const deltaName = createClaim(instanceA.db, 'entity-1', 'name', 'Alice', 'agent-a');
    await instanceA.db.persistDelta(deltaName);

    // Wait for sync to B
    await waitFor(() => countEntityDeltas(instanceB.db, 'entity-1') >= 1);

    // Agent B claims entity.age
    const deltaAge = createClaim(instanceB.db, 'entity-1', 'age', 30, 'agent-b');
    await instanceB.db.persistDelta(deltaAge);

    // Wait for sync to A
    await waitFor(() => countEntityDeltas(instanceA.db, 'entity-1') >= 2);
    // Also wait for B to have both
    await waitFor(() => countEntityDeltas(instanceB.db, 'entity-1') >= 2);

    // Both instances should see both properties
    const viewA = resolveEntity(instanceA.db, 'entity-1');
    const viewB = resolveEntity(instanceB.db, 'entity-1');

    expect(viewA.name).toBe('Alice');
    expect(viewA.age).toBe(30);
    expect(viewB.name).toBe('Alice');
    expect(viewB.age).toBe(30);
  });

  it('should propagate retractions', async () => {
    // Claim name and age
    const deltaName = createClaim(instanceA.db, 'entity-1', 'name', 'Alice', 'agent-a');
    await instanceA.db.persistDelta(deltaName);
    const deltaAge = createClaim(instanceA.db, 'entity-1', 'age', 30, 'agent-a');
    await instanceA.db.persistDelta(deltaAge);

    // Wait for sync
    await waitFor(() => countEntityDeltas(instanceB.db, 'entity-1') >= 2);

    // Retract name from A
    const negation = instanceA.db.negateDelta('agent-a', deltaName.id);
    await instanceA.db.persistDelta(negation);

    // Wait for negation to arrive at B
    await waitFor(() => {
      const viewB = resolveEntity(instanceB.db, 'entity-1');
      return viewB.name === undefined;
    });

    // B should see age but not name
    const viewB = resolveEntity(instanceB.db, 'entity-1');
    expect(viewB.name).toBeUndefined();
    expect(viewB.age).toBe(30);
  });
});

// ============================================================================
// Scenario 2: Contradiction Resolution
// ============================================================================

describe('Scenario 2: Contradiction Resolution', () => {
  let instanceA: TestInstance;
  let instanceB: TestInstance;

  beforeEach(async () => {
    instanceA = await createTestInstance('system-a');
    instanceB = await createTestInstance('system-b');
    await connectInstances(instanceA, instanceB);
  });

  afterEach(async () => {
    await teardown(instanceB);
    await teardown(instanceA);
  });

  it('should preserve both values and let resolution strategy decide', async () => {
    // A claims entity.name = "Alice"
    const delta1 = createClaim(instanceA.db, 'entity-1', 'name', 'Alice', 'agent-a');
    await instanceA.db.persistDelta(delta1);

    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 10));

    // B claims entity.name = "Alicia"
    const delta2 = createClaim(instanceB.db, 'entity-1', 'name', 'Alicia', 'agent-b');
    await instanceB.db.persistDelta(delta2);

    // Wait for bidirectional sync
    await waitFor(() => countEntityDeltas(instanceA.db, 'entity-1') >= 2);
    await waitFor(() => countEntityDeltas(instanceB.db, 'entity-1') >= 2);

    // With allValues: both instances see both values
    const valuesA = resolveEntityAllValues(instanceA.db, 'entity-1', 'name');
    const valuesB = resolveEntityAllValues(instanceB.db, 'entity-1', 'name');

    expect(valuesA.sort()).toEqual(['Alice', 'Alicia']);
    expect(valuesB.sort()).toEqual(['Alice', 'Alicia']);

    // With mostRecent: both instances agree on the latest
    const viewA = resolveEntity(instanceA.db, 'entity-1');
    const viewB = resolveEntity(instanceB.db, 'entity-1');

    // Both should resolve to the same value (whichever has later timestamp)
    expect(viewA.name).toBe(viewB.name);
    // The later one should be "Alicia" since we added a delay
    expect(viewA.name).toBe('Alicia');
  });
});

// ============================================================================
// Scenario 3: Network Partition and Heal
// ============================================================================

describe('Scenario 3: Network Partition and Heal', () => {
  let instanceA: TestInstance;
  let instanceB: TestInstance;

  beforeEach(async () => {
    instanceA = await createTestInstance('system-a');
    instanceB = await createTestInstance('system-b');
  });

  afterEach(async () => {
    await teardown(instanceB);
    await teardown(instanceA);
  });

  it('should sync all deltas after reconnection', async () => {
    // Connect and verify
    await connectInstances(instanceA, instanceB);

    // Create a shared delta first
    const sharedDelta = createClaim(instanceA.db, 'entity-0', 'name', 'Shared', 'agent-a');
    await instanceA.db.persistDelta(sharedDelta);
    await waitFor(() => countEntityDeltas(instanceB.db, 'entity-0') >= 1);

    // DISCONNECT: close all connections from B
    const links = instanceB.manager.getFederationLinks();
    for (const link of links) {
      await instanceB.manager.disconnectFromRemote(link.id);
    }

    // A writes 5 deltas while disconnected
    for (let i = 1; i <= 5; i++) {
      const d = createClaim(instanceA.db, `partition-a-${i}`, 'value', `from-a-${i}`, 'agent-a');
      await instanceA.db.persistDelta(d);
    }

    // B writes 3 deltas while disconnected
    for (let i = 1; i <= 3; i++) {
      const d = createClaim(instanceB.db, `partition-b-${i}`, 'value', `from-b-${i}`, 'agent-b');
      await instanceB.db.persistDelta(d);
    }

    // RECONNECT: B connects to A with full initial sync
    await connectInstances(instanceA, instanceB, { initialSync: 'full' });

    // Wait for sync to complete
    await waitFor(
      () => instanceB.events.some((e) => e.type === 'sync:completed'),
      10000
    );

    // Also broadcast B's deltas to A
    // B's autoBroadcast should have sent its deltas when it connected
    // But the deltas written during partition were before the subscription
    // So we need full sync in the other direction too.
    // In practice, both sides need to do initial sync.

    // Verify B has A's partition deltas (via initial sync)
    for (let i = 1; i <= 5; i++) {
      const view = resolveEntity(instanceB.db, `partition-a-${i}`);
      expect(view.value).toBe(`from-a-${i}`);
    }

    // Verify B still has its own deltas
    for (let i = 1; i <= 3; i++) {
      const view = resolveEntity(instanceB.db, `partition-b-${i}`);
      expect(view.value).toBe(`from-b-${i}`);
    }
  });
});

// ============================================================================
// Scenario 4: Trust Boundary Enforcement
// ============================================================================

describe('Scenario 4: Trust Boundary Enforcement', () => {
  let instanceA: TestInstance;
  let instanceB: TestInstance;

  beforeEach(async () => {
    // A only trusts "trusted-agent"
    instanceA = await createTestInstance('system-a', {
      trustPolicy: { trustedAuthors: ['trusted-agent'] }
    });
    instanceB = await createTestInstance('system-b');
  });

  afterEach(async () => {
    await teardown(instanceB);
    await teardown(instanceA);
  });

  it('should reject deltas from untrusted authors', async () => {
    // B creates deltas from both trusted and untrusted authors
    const trustedDelta = createClaim(instanceB.db, 'entity-1', 'name', 'Trusted', 'trusted-agent');
    await instanceB.db.persistDelta(trustedDelta);

    const untrustedDelta = createClaim(instanceB.db, 'entity-2', 'name', 'Untrusted', 'untrusted-agent');
    await instanceB.db.persistDelta(untrustedDelta);

    // Connect B to A (B pushes to A)
    const connection = new FederationConnection(
      'system-b',
      `ws://localhost:${instanceA.port}/federation`,
      {
        mode: 'push',
        initialSync: 'none',
        reconnect: { enabled: false }
      }
    );

    await connection.connect();
    await waitFor(() => connection.status === 'connected');

    // Send both deltas
    await connection.sendDelta(trustedDelta);
    await connection.sendDelta(untrustedDelta);

    // Wait for processing
    await new Promise((r) => setTimeout(r, 500));

    // A should only have the trusted delta
    const deltasA = instanceA.db.queryDeltas({ includeNegated: true });
    const deltasArray = Array.isArray(deltasA) ? deltasA : [];
    const authors = deltasArray.map((d) => d.author);

    expect(authors).toContain('trusted-agent');
    expect(authors).not.toContain('untrusted-agent');

    // Verify rejection events on A
    const rejections = instanceA.events.filter((e) => e.type === 'delta:rejected');
    expect(rejections.length).toBeGreaterThanOrEqual(1);

    await connection.disconnect();
  });
});

// ============================================================================
// Scenario 5: Bulk Convergence (Movie Database)
// ============================================================================

describe('Scenario 5: Bulk Convergence', () => {
  let instanceA: TestInstance;
  let instanceB: TestInstance;

  beforeEach(async () => {
    instanceA = await createTestInstance('system-a');
    instanceB = await createTestInstance('system-b');
  });

  afterEach(async () => {
    await teardown(instanceB);
    await teardown(instanceA);
  });

  it('should sync the entire movie database via federation', async () => {
    // Seed movie database into A
    await seedMovieDatabase(instanceA.db, { includeExpanded: false });

    const statsA = instanceA.db.getStats();
    expect(statsA.totalDeltas).toBeGreaterThan(100);

    // Connect B with full initial sync
    const syncStart = Date.now();
    await connectInstances(instanceA, instanceB, { initialSync: 'full' });

    // Wait for sync to complete
    await waitFor(
      () => instanceB.events.some((e) => e.type === 'sync:completed'),
      15000
    );
    const syncDuration = Date.now() - syncStart;

    // B should have the same number of deltas
    const statsB = instanceB.db.getStats();
    expect(statsB.totalDeltas).toBe(statsA.totalDeltas);

    // Query a specific movie on both instances
    const matrixA = resolveEntity(instanceA.db, 'movie_matrix');
    const matrixB = resolveEntity(instanceB.db, 'movie_matrix');

    expect(matrixA.title).toBe('The Matrix');
    expect(matrixB.title).toBe('The Matrix');
    expect(matrixA.year).toBe(matrixB.year);

    // Performance check: sync should complete reasonably fast
    expect(syncDuration).toBeLessThan(15000);
  }, 30000); // Extended timeout
});

// ============================================================================
// Scenario 6: Retraction Propagation
// ============================================================================

describe('Scenario 6: Retraction Propagation', () => {
  let instanceA: TestInstance;
  let instanceB: TestInstance;

  beforeEach(async () => {
    instanceA = await createTestInstance('system-a');
    instanceB = await createTestInstance('system-b');
  });

  afterEach(async () => {
    await teardown(instanceB);
    await teardown(instanceA);
  });

  it('should propagate retractions bidirectionally', async () => {
    // A creates 10 claims about "bob"
    const deltas: Delta[] = [];
    const properties = [
      'name', 'age', 'email', 'city', 'country',
      'job', 'company', 'hobby', 'color', 'food'
    ];
    const values = [
      'Bob', 42, 'bob@example.com', 'NYC', 'USA',
      'Engineer', 'Acme', 'Chess', 'Blue', 'Pizza'
    ];

    for (let i = 0; i < 10; i++) {
      const d = createClaim(instanceA.db, 'bob', properties[i], values[i], 'agent-a');
      await instanceA.db.persistDelta(d);
      deltas.push(d);
    }

    // Connect and do full initial sync
    await connectInstances(instanceA, instanceB, { initialSync: 'full' });
    await waitFor(
      () => instanceB.events.some((e) => e.type === 'sync:completed'),
      10000
    );

    // Verify B has all 10 properties
    let viewB = resolveEntity(instanceB.db, 'bob');
    expect(viewB.name).toBe('Bob');
    expect(viewB.age).toBe(42);
    expect(viewB.food).toBe('Pizza');

    // A retracts 5 claims (first 5 properties)
    for (let i = 0; i < 5; i++) {
      const neg = instanceA.db.negateDelta('agent-a', deltas[i].id);
      await instanceA.db.persistDelta(neg);
    }

    // Wait for retractions to propagate to B
    await waitFor(() => {
      viewB = resolveEntity(instanceB.db, 'bob');
      return viewB.name === undefined;
    }, 5000);

    // B should now see only the last 5 properties
    viewB = resolveEntity(instanceB.db, 'bob');
    expect(viewB.name).toBeUndefined();
    expect(viewB.age).toBeUndefined();
    expect(viewB.email).toBeUndefined();
    expect(viewB.city).toBeUndefined();
    expect(viewB.country).toBeUndefined();
    expect(viewB.job).toBe('Engineer');
    expect(viewB.company).toBe('Acme');
    expect(viewB.hobby).toBe('Chess');
    expect(viewB.color).toBe('Blue');
    expect(viewB.food).toBe('Pizza');

    // Now B retracts 3 more (job, company, hobby)
    for (let i = 5; i < 8; i++) {
      const neg = instanceB.db.negateDelta('agent-b', deltas[i].id);
      await instanceB.db.persistDelta(neg);
    }

    // Wait for retractions to propagate to A
    await waitFor(() => {
      const viewA = resolveEntity(instanceA.db, 'bob');
      return viewA.job === undefined;
    }, 5000);

    // Both should now see only color and food
    const finalA = resolveEntity(instanceA.db, 'bob');
    const finalB = resolveEntity(instanceB.db, 'bob');

    expect(finalA.color).toBe('Blue');
    expect(finalA.food).toBe('Pizza');
    expect(finalA.job).toBeUndefined();
    expect(finalB.color).toBe('Blue');
    expect(finalB.food).toBe('Pizza');
    expect(finalB.job).toBeUndefined();
  }, 20000);

  it('should handle double negation (negating a negation restores)', async () => {
    // Connect first so broadcasts reach B
    await connectInstances(instanceA, instanceB);

    // A claims entity.name = "Alice"
    const original = createClaim(instanceA.db, 'entity-1', 'name', 'Alice', 'agent-a');
    await instanceA.db.persistDelta(original);

    await waitFor(() => countEntityDeltas(instanceB.db, 'entity-1') >= 1);

    // A negates the claim
    const negation = instanceA.db.negateDelta('agent-a', original.id);
    await instanceA.db.persistDelta(negation);

    // Wait for negation to propagate
    await waitFor(() => {
      const view = resolveEntity(instanceB.db, 'entity-1');
      return view.name === undefined;
    });

    // A negates the negation (double negation = restoration)
    const doubleNeg = instanceA.db.negateDelta('agent-a', negation.id);
    await instanceA.db.persistDelta(doubleNeg);

    // Wait for double negation to propagate
    await waitFor(() => {
      const view = resolveEntity(instanceB.db, 'entity-1');
      return view.name === 'Alice';
    });

    const view = resolveEntity(instanceB.db, 'entity-1');
    expect(view.name).toBe('Alice');
  });
});

// ============================================================================
// Scenario 7: Time-Travel Across Systems
// ============================================================================

describe('Scenario 7: Time-Travel Across Systems', () => {
  let instanceA: TestInstance;
  let instanceB: TestInstance;

  beforeEach(async () => {
    instanceA = await createTestInstance('system-a');
    instanceB = await createTestInstance('system-b');
    await connectInstances(instanceA, instanceB);
  });

  afterEach(async () => {
    await teardown(instanceB);
    await teardown(instanceA);
  });

  it('should produce consistent time-travel snapshots from federated data', async () => {
    // We need controlled timestamps. Create deltas with explicit timestamps
    // by directly constructing them rather than using createDelta()

    const baseTime = Date.now();
    const t1 = baseTime + 100;
    const t2 = baseTime + 200;
    const t3 = baseTime + 300;
    const t4 = baseTime + 400;

    // t1: System A creates entity.name = "Alice"
    const delta1: Delta = {
      id: 'delta-t1',
      timestamp: t1,
      author: 'agent-a',
      system: 'system-a',
      pointers: [
        { role: 'named', target: { id: 'entity-1', context: 'name' } },
        { role: 'name', target: 'Alice' }
      ]
    };
    await instanceA.db.persistDelta(delta1);
    await waitFor(() => countEntityDeltas(instanceB.db, 'entity-1') >= 1);

    // t2: System B creates entity.age = 30
    const delta2: Delta = {
      id: 'delta-t2',
      timestamp: t2,
      author: 'agent-b',
      system: 'system-b',
      pointers: [
        { role: 'aged', target: { id: 'entity-1', context: 'age' } },
        { role: 'age', target: 30 }
      ]
    };
    await instanceB.db.persistDelta(delta2);
    await waitFor(() => countEntityDeltas(instanceA.db, 'entity-1') >= 2);

    // t3: System A updates entity.name = "Alicia"
    const delta3: Delta = {
      id: 'delta-t3',
      timestamp: t3,
      author: 'agent-a',
      system: 'system-a',
      pointers: [
        { role: 'named', target: { id: 'entity-1', context: 'name' } },
        { role: 'name', target: 'Alicia' }
      ]
    };
    await instanceA.db.persistDelta(delta3);
    await waitFor(() => countEntityDeltas(instanceB.db, 'entity-1') >= 3);

    // t4: System B updates entity.age = 31
    const delta4: Delta = {
      id: 'delta-t4',
      timestamp: t4,
      author: 'agent-b',
      system: 'system-b',
      pointers: [
        { role: 'aged', target: { id: 'entity-1', context: 'age' } },
        { role: 'age', target: 31 }
      ]
    };
    await instanceB.db.persistDelta(delta4);
    await waitFor(() => countEntityDeltas(instanceA.db, 'entity-1') >= 4);
    await waitFor(() => countEntityDeltas(instanceB.db, 'entity-1') >= 4);

    // Time-travel assertions on both instances

    // At t1+50: name="Alice", no age
    const viewAt1A = resolveEntity(instanceA.db, 'entity-1', t1 + 50);
    const viewAt1B = resolveEntity(instanceB.db, 'entity-1', t1 + 50);
    expect(viewAt1A.name).toBe('Alice');
    expect(viewAt1A.age).toBeUndefined();
    expect(viewAt1B.name).toBe('Alice');
    expect(viewAt1B.age).toBeUndefined();

    // At t2+50: name="Alice", age=30
    const viewAt2A = resolveEntity(instanceA.db, 'entity-1', t2 + 50);
    const viewAt2B = resolveEntity(instanceB.db, 'entity-1', t2 + 50);
    expect(viewAt2A.name).toBe('Alice');
    expect(viewAt2A.age).toBe(30);
    expect(viewAt2B.name).toBe('Alice');
    expect(viewAt2B.age).toBe(30);

    // At t3+50: name="Alicia" (mostRecent picks later), age=30
    const viewAt3A = resolveEntity(instanceA.db, 'entity-1', t3 + 50);
    const viewAt3B = resolveEntity(instanceB.db, 'entity-1', t3 + 50);
    expect(viewAt3A.name).toBe('Alicia');
    expect(viewAt3A.age).toBe(30);
    expect(viewAt3B.name).toBe('Alicia');
    expect(viewAt3B.age).toBe(30);

    // At t4+50: name="Alicia", age=31
    const viewAt4A = resolveEntity(instanceA.db, 'entity-1', t4 + 50);
    const viewAt4B = resolveEntity(instanceB.db, 'entity-1', t4 + 50);
    expect(viewAt4A.name).toBe('Alicia');
    expect(viewAt4A.age).toBe(31);
    expect(viewAt4B.name).toBe('Alicia');
    expect(viewAt4B.age).toBe(31);
  });
});
