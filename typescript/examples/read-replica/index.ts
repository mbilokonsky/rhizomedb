/**
 * READ REPLICA INSTANCE
 *
 * Capabilities: READ-FOCUSED
 * - DeltaPersistence: Durable storage (LevelDB)
 * - StreamConsumption: Subscribe to deltas from canonical server
 * - QueryAPI: Expose read interface
 * - IndexMaintenance: Maintain materialized HyperViews for fast queries
 *
 * NOT included:
 * - DeltaAuthoring: Read-only; doesn't create deltas
 * - StreamProduction: Doesn't publish to other instances
 * - MutationAPI: No write interface
 * - Federation: Only receives from canonical server
 *
 * Use Case: Geographic replica for read-heavy workloads.
 * Reduces latency for users far from the canonical server.
 * Provides fault tolerance if canonical server goes down.
 */

import { RhizomeDB } from '../../src/storage/instance';
import { LevelDBStore } from '../../src/storage/leveldb';
import * as path from 'path';
import * as os from 'os';

async function main() {
  console.log('=== READ REPLICA INSTANCE ===\n');

  // Persistent storage for replica
  const dbPath = path.join(os.tmpdir(), 'rhizomedb-read-replica');
  const storage = new LevelDBStore(dbPath);

  // Configure as read-only replica
  const replica = new RhizomeDB({
    storage: 'leveldb',
    systemId: 'read-replica-us-west-1',
    cacheSize: 5000, // Large cache for read performance
    enableIndexing: true // Maintain indexes for fast queries
  });

  console.log(`Instance ID: ${replica.systemId}`);
  console.log(`Storage: LevelDB at ${dbPath}`);
  console.log('Capabilities: DeltaPersistence, StreamConsumption, QueryAPI\n');

  // In a real deployment, this replica would connect to the canonical
  // server and subscribe to all deltas (or filtered subset)
  console.log('Subscribing to canonical server deltas...');
  const unsubscribe = replica.subscribe(
    {}, // No filter = receive all deltas
    async (delta) => {
      console.log(`→ Received delta from canonical server: ${delta.id}`);
      // Delta is automatically persisted when received via subscription
    }
  );

  // Simulate receiving deltas from canonical server
  console.log('\n--- Simulating canonical server sync ---');

  // Delta 1: User creation
  const userDelta = replica.createDelta('canonical-server-001', [
    {
      localContext: 'user',
      target: { id: 'user_999' }
    },
    {
      localContext: 'name',
      target: 'Bob'
    },
    {
      localContext: 'email',
      target: 'bob@example.com'
    }
  ]);

  await replica.persistDelta(userDelta);
  console.log('✓ Synced user creation delta');

  // Delta 2: User update from different author
  const updateDelta = replica.createDelta('browser-client-123', [
    {
      localContext: 'user',
      target: { id: 'user_999' }
    },
    {
      localContext: 'status',
      target: 'active'
    }
  ]);

  await replica.persistDelta(updateDelta);
  console.log('✓ Synced user update delta');

  // Query the replicated data
  console.log('\n--- Serving read queries ---');

  const userView = replica.materialize({ id: 'user_999' });
  console.log('Query result for user_999:', userView);

  // Complex query: Get all deltas for this user
  const userDeltas = replica.getDeltasByFilter({
    targetIds: [{ id: 'user_999' }]
  });
  console.log(`\nFound ${userDeltas.length} deltas for user_999`);

  // Get deltas by author (useful for audit logs)
  const canonicalDeltas = replica.getDeltasByFilter({
    authors: ['canonical-server-001']
  });
  console.log(`Found ${canonicalDeltas.length} deltas authored by canonical server`);

  // Demonstrate eventual consistency
  console.log('\n--- Eventual Consistency ---');
  console.log('Replica is eventually consistent with canonical server.');
  console.log('Queries may lag behind writes on canonical server by:');
  console.log('  - Network latency');
  console.log('  - Processing time');
  console.log('  - Backpressure handling');

  // Cleanup
  unsubscribe();
  await storage.close();

  console.log('\n=== FEDERATION STATUS ===');
  console.log('❌ Automatic replication not yet implemented');
  console.log('When implemented, this instance would:');
  console.log('  - Establish persistent connection to canonical server');
  console.log('  - Subscribe to filtered delta stream (e.g., specific contexts)');
  console.log('  - Apply deltas in order with conflict-free merge');
  console.log('  - Expose read-only API endpoints');
  console.log('  - Provide geographic load balancing');
}

main().catch(console.error);
