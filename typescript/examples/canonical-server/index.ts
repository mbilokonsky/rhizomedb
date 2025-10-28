/**
 * CANONICAL SERVER INSTANCE
 *
 * Capabilities: ALL
 * - DeltaAccess: Read deltas
 * - DeltaAuthoring: Create new deltas
 * - DeltaPersistence: Durable storage (LevelDB)
 * - StreamConsumption: Subscribe to delta streams
 * - StreamProduction: Publish deltas to subscribers
 * - IndexMaintenance: Maintain materialized HyperViews
 * - MutationAPI: Expose write interface
 * - QueryAPI: Expose read interface
 * - Federation: (NOT YET IMPLEMENTED) Sync with other instances
 *
 * Use Case: Primary source of truth for a RhizomeDB deployment.
 * Can serve as the authoritative instance that browser clients and
 * replicas sync with (once federation is implemented).
 */

import { RhizomeDB } from '../../src/storage/instance';
import { LevelDBStore } from '../../src/storage/leveldb';
import * as path from 'path';
import * as os from 'os';

async function main() {
  console.log('=== CANONICAL SERVER INSTANCE ===\n');

  // Create a persistent LevelDB store
  const dbPath = path.join(os.tmpdir(), 'rhizomedb-canonical-server');
  const storage = new LevelDBStore(dbPath);

  // Initialize the canonical server with all capabilities enabled
  const server = new RhizomeDB({
    storage: 'leveldb',
    systemId: 'canonical-server-001',
    cacheSize: 10000,
    enableIndexing: true,
    validateSchemas: true
  });

  console.log(`Instance ID: ${server.systemId}`);
  console.log(`Storage: LevelDB at ${dbPath}`);
  console.log('Capabilities: ALL (except Federation - not yet implemented)\n');

  // Example: Author and persist a delta
  const authorId = 'server-author-1';

  const delta = server.createDelta(authorId, [
    {
      localContext: 'user',
      target: { id: 'user_123' }
    },
    {
      localContext: 'name',
      target: 'Alice'
    }
  ]);

  console.log('Created delta:', {
    id: delta.id,
    author: delta.author,
    system: delta.system,
    operations: delta.operations.length
  });

  await server.persistDelta(delta);
  console.log('✓ Delta persisted to LevelDB\n');

  // Subscribe to deltas (StreamProduction)
  console.log('Setting up subscription...');
  const unsubscribe = server.subscribe(
    { authors: [authorId] },
    (receivedDelta) => {
      console.log('→ Subscription received delta:', receivedDelta.id);
    }
  );

  // Query the materialized HyperView (IndexMaintenance)
  const userId = { id: 'user_123' };
  const userView = server.materialize(userId);
  console.log('\nMaterialized HyperView for user_123:', userView);

  // Query deltas by filter (DeltaAccess)
  const deltas = server.getDeltasByFilter({ targetIds: [userId] });
  console.log(`\nQueried ${deltas.length} delta(s) targeting user_123`);

  // Cleanup
  unsubscribe();
  await storage.close();

  console.log('\n=== FEDERATION STATUS ===');
  console.log('❌ Federation not yet implemented');
  console.log('When implemented, this instance would:');
  console.log('  - Accept connections from browser clients');
  console.log('  - Sync with read replicas');
  console.log('  - Bridge to other canonical servers');
  console.log('  - Apply trust policies for delta verification');
}

main().catch(console.error);
