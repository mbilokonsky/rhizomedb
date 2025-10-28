/**
 * Simple Federation Server Example
 *
 * Demonstrates a basic federated RhizomeDB server that:
 * - Accepts incoming connections from clients
 * - Broadcasts local deltas to connected clients
 * - Receives and persists deltas from clients
 */

import { FederatedRhizomeDB } from '../../../src/storage/federated-instance';

async function main() {
  console.log('=== FEDERATION SERVER EXAMPLE ===\n');

  // Create a federated instance with server enabled
  const server = new FederatedRhizomeDB({
    storage: 'memory',
    systemId: 'federation-server-001',
    cacheSize: 5000,
    enableIndexing: true,
    federation: {
      enableServer: true,
      serverConfig: {
        port: 8080,
        path: '/federation'
      },
      autoBroadcast: true // Automatically broadcast local deltas
    }
  });

  console.log(`Server ID: ${server.systemId}`);
  console.log('Listening on: ws://localhost:8080/federation');
  console.log('Auto-broadcast: enabled\n');

  // Listen to federation events
  server.onFederationEvent((event) => {
    switch (event.type) {
      case 'link:connected':
        console.log(
          `→ Client connected: ${event.remoteSystemId} (${event.linkId})`
        );
        break;
      case 'link:disconnected':
        console.log(`← Client disconnected: ${event.linkId}`);
        break;
      case 'delta:received':
        console.log(`  Received delta ${event.deltaId} from ${event.linkId}`);
        break;
      case 'delta:sent':
        console.log(`  Sent delta ${event.deltaId} to ${event.linkId}`);
        break;
    }
  });

  // Create some initial data
  console.log('Creating initial data...\n');

  const product1Delta = server.createDelta('server-admin', [
    { role: 'product', target: { id: 'prod_1' } },
    { role: 'name', target: 'Widget Pro' },
    { role: 'price', target: '99.99' }
  ]);

  await server.persistDelta(product1Delta);
  console.log('✓ Created product: Widget Pro\n');

  // Simulate periodic updates
  console.log('Server running. Creating updates every 5 seconds...');
  console.log('Press Ctrl+C to stop\n');

  let counter = 0;
  const interval = setInterval(async () => {
    counter++;

    const updateDelta = server.createDelta('server-admin', [
      { role: 'product', target: { id: 'prod_1' } },
      { role: 'stock', target: String(100 - counter) }
    ]);

    await server.persistDelta(updateDelta);
    console.log(`[${new Date().toISOString()}] Stock updated: ${100 - counter}`);

    // Stop after 10 updates for demo
    if (counter >= 10) {
      clearInterval(interval);
      console.log('\nDemo complete. Server still running...');
    }
  }, 5000);

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down server...');
    clearInterval(interval);
    await server.close();
    console.log('Server closed.');
    process.exit(0);
  });
}

main().catch(console.error);
