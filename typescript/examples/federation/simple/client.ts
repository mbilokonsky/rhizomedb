/**
 * Simple Federation Client Example
 *
 * Demonstrates a basic federated RhizomeDB client that:
 * - Connects to a remote server
 * - Receives deltas from the server
 * - Sends local deltas to the server
 */

import { FederatedRhizomeDB } from '../../../src/storage/federated-instance';

async function main() {
  console.log('=== FEDERATION CLIENT EXAMPLE ===\n');

  // Create a federated instance (no server, just client)
  const client = new FederatedRhizomeDB({
    storage: 'memory',
    systemId: 'federation-client-001',
    cacheSize: 1000,
    enableIndexing: true,
    federation: {
      enableServer: false,
      autoBroadcast: false // We'll control when to send deltas
    }
  });

  console.log(`Client ID: ${client.systemId}`);

  // Listen to federation events
  client.onFederationEvent((event) => {
    switch (event.type) {
      case 'link:connecting':
        console.log(`→ Connecting to ${event.remoteUrl}...`);
        break;
      case 'link:connected':
        console.log(`✓ Connected to server: ${event.remoteSystemId}\n`);
        break;
      case 'link:disconnected':
        console.log(`← Disconnected from server`);
        break;
      case 'sync:started':
        console.log('→ Initial sync started...');
        break;
      case 'sync:completed':
        console.log(`✓ Initial sync completed (${event.deltasProcessed} deltas)\n`);
        break;
      case 'delta:received':
        console.log(`  Received delta: ${event.deltaId}`);

        // Query the updated data
        const productView = client.materialize({ id: 'prod_1' });
        if (productView && Object.keys(productView).length > 0) {
          console.log('  Product view:', productView);
        }
        break;
      case 'delta:sent':
        console.log(`  Sent delta: ${event.deltaId}`);
        break;
    }
  });

  // Connect to server
  console.log('Connecting to federation server...\n');

  try {
    const link = await client.connectToRemote('ws://localhost:8080/federation', {
      mode: 'bidirectional',
      initialSync: 'full', // Get all existing deltas
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
      }
    });

    console.log(`Federation link established: ${link.id}\n`);

    // Wait a bit for initial sync
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create a local delta and send it to server
    console.log('Creating local delta...\n');

    const reviewDelta = client.createDelta('client-user-123', [
      { localContext: 'review', target: { id: 'review_1' } },
      { localContext: 'product', target: { id: 'prod_1' } },
      { localContext: 'review', targetContext: 'product' },
      { localContext: 'rating', target: '5' },
      { localContext: 'review', targetContext: 'rating' },
      { localContext: 'comment', target: 'Great product!' },
      { localContext: 'review', targetContext: 'comment' }
    ]);

    await client.persistDelta(reviewDelta);
    await link.sendDelta(reviewDelta);

    console.log('✓ Sent review to server\n');

    // Keep client running to receive updates
    console.log('Client running. Waiting for server updates...');
    console.log('Press Ctrl+C to stop\n');

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nDisconnecting from server...');
      await client.close();
      console.log('Client closed.');
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to connect to server:', error);
    console.error('\nMake sure the server is running first:');
    console.error('  npx ts-node examples/federation/simple/server.ts');
    process.exit(1);
  }
}

main().catch(console.error);
