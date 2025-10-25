/**
 * BROWSER CLIENT INSTANCE
 *
 * Capabilities: SUBSET
 * - DeltaAuthoring: Create new deltas
 * - StreamConsumption: Subscribe to delta streams from server
 * - QueryAPI: Read interface for UI
 * - (Optional) DeltaPersistence: In-memory only for offline support
 *
 * NOT included:
 * - StreamProduction: Doesn't publish to other instances
 * - IndexMaintenance: Lightweight; doesn't maintain complex views
 * - Federation: Doesn't sync with other clients directly
 *
 * Use Case: Interactive web application that creates deltas locally
 * and syncs with a canonical server (when federation is implemented).
 * Uses in-memory storage for fast access, suitable for client-side use.
 */

import { RhizomeDB } from '../../src/storage/instance';

async function main() {
  console.log('=== BROWSER CLIENT INSTANCE ===\n');

  // Lightweight in-memory instance for browser
  const client = new RhizomeDB({
    storage: 'memory',
    systemId: 'browser-client-001',
    cacheSize: 500, // Smaller cache for client
    enableIndexing: true // Enable for local queries
  });

  console.log(`Instance ID: ${client.systemId}`);
  console.log('Storage: In-Memory (ephemeral)');
  console.log('Capabilities: DeltaAuthoring, StreamConsumption, QueryAPI\n');

  // Example: User interaction creates a delta
  const userId = 'client-user-456';

  console.log('User action: Updating profile...');
  const profileDelta = client.createDelta(userId, [
    {
      localContext: 'profile',
      target: { id: 'profile_456' }
    },
    {
      localContext: 'bio',
      target: 'Software engineer interested in distributed systems'
    },
    {
      localContext: 'profile',
      targetContext: 'bio'
    },
    {
      localContext: 'theme',
      target: 'dark'
    },
    {
      localContext: 'profile',
      targetContext: 'theme'
    }
  ]);

  console.log('Created delta:', {
    id: profileDelta.id,
    author: profileDelta.author,
    operations: profileDelta.operations.length
  });

  // In a real browser client, this delta would be:
  // 1. Persisted locally (in-memory or IndexedDB)
  // 2. Sent to canonical server via WebSocket/HTTP
  // 3. Acknowledged when server confirms receipt
  await client.persistDelta(profileDelta);
  console.log('✓ Delta stored locally\n');

  // Subscribe to updates from server (when federation works)
  console.log('Setting up subscription for server updates...');
  client.subscribe(
    { targetIds: [{ id: 'profile_456' }] },
    (delta) => {
      console.log('→ Received update from server:', {
        id: delta.id,
        author: delta.author,
        system: delta.system
      });
      // In real app: Update UI reactively
    }
  );

  // Query local state for UI rendering
  const profileView = client.materialize({ id: 'profile_456' });
  console.log('\nRendering profile in UI:', profileView);

  // Simulate receiving a delta from another user via server
  console.log('\n--- Simulating server sync ---');
  const serverDelta = client.createDelta('another-user-789', [
    {
      localContext: 'comment',
      target: { id: 'comment_101' }
    },
    {
      localContext: 'text',
      target: 'Great profile!'
    },
    {
      localContext: 'comment',
      targetContext: 'text'
    },
    {
      localContext: 'comment',
      target: { id: 'profile_456' },
      targetContext: 'comments'
    }
  ]);

  // This delta would come from the server in a real scenario
  await client.persistDelta(serverDelta);
  console.log('✓ Received and applied delta from server');

  const updatedProfile = client.materialize({ id: 'profile_456' });
  console.log('Updated profile view:', updatedProfile);

  console.log('\n=== FEDERATION STATUS ===');
  console.log('❌ Server sync not yet implemented');
  console.log('When implemented, this instance would:');
  console.log('  - Connect to canonical server via WebSocket');
  console.log('  - Send local deltas to server');
  console.log('  - Receive relevant deltas from server');
  console.log('  - Handle offline mode with sync on reconnect');
  console.log('  - Apply server trust policies');
}

main().catch(console.error);
