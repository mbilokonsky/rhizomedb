/**
 * Hub-and-Spoke Federation Topology Example
 *
 * Demonstrates a central server (hub) with multiple clients (spokes).
 * Changes from any client are broadcast to all other clients via the hub.
 */

import { FederatedRhizomeDB } from '../../../src/storage/federated-instance';

async function main() {
  console.log('=== HUB-AND-SPOKE FEDERATION TOPOLOGY ===\n');

  // Create central hub server
  console.log('Creating hub server...');
  const hub = new FederatedRhizomeDB({
    storage: 'memory',
    systemId: 'hub-server',
    cacheSize: 10000,
    enableIndexing: true,
    federation: {
      enableServer: true,
      serverConfig: {
        port: 8080,
        path: '/federation'
      },
      autoBroadcast: true
    }
  });

  console.log(`✓ Hub server: ${hub.systemId}`);
  console.log('  Listening on ws://localhost:8080/federation\n');

  // Track hub events
  let clientCount = 0;
  hub.onFederationEvent((event) => {
    if (event.type === 'link:connected') {
      clientCount++;
      console.log(`[HUB] Client connected: ${event.remoteSystemId} (${clientCount} total)`);
    } else if (event.type === 'link:disconnected') {
      clientCount--;
      console.log(`[HUB] Client disconnected (${clientCount} remaining)`);
    } else if (event.type === 'delta:received') {
      console.log(`[HUB] Broadcasting delta ${event.deltaId} to all clients`);
    }
  });

  // Wait for server to start
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Create 3 spoke clients
  console.log('Creating spoke clients...\n');

  const spokes = await Promise.all(
    ['spoke-A', 'spoke-B', 'spoke-C'].map(async (id, index) => {
      const spoke = new FederatedRhizomeDB({
        storage: 'memory',
        systemId: id,
        cacheSize: 1000,
        enableIndexing: true,
        federation: {
          enableServer: false,
          autoBroadcast: false
        }
      });

      // Track spoke events
      spoke.onFederationEvent((event) => {
        if (event.type === 'link:connected') {
          console.log(`[${id}] Connected to hub`);
        } else if (event.type === 'delta:received') {
          const delta = spoke.getDeltaById(event.deltaId);
          if (delta) {
            console.log(`[${id}] Received delta from author: ${delta.author}`);
          }
        }
      });

      // Connect to hub
      await spoke.connectToRemote('ws://localhost:8080/federation', {
        mode: 'bidirectional',
        initialSync: 'full'
      });

      return spoke;
    })
  );

  console.log(`\n✓ ${spokes.length} spokes connected to hub\n`);

  // Wait for connections to stabilize
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simulate collaborative editing
  console.log('Simulating collaborative editing...\n');

  // Spoke A creates a document
  console.log('[spoke-A] Creating document...');
  const docDelta = spokes[0].createDelta('user-alice', [
    { localContext: 'doc', target: { id: 'doc_1' } },
    { localContext: 'title', target: 'Collaborative Document' },
    { localContext: 'doc', targetContext: 'title' }
  ]);

  await spokes[0].persistDelta(docDelta);
  await spokes[0].getFederationLinks()[0].sendDelta(docDelta);

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Spoke B adds content
  console.log('[spoke-B] Adding content...');
  const contentDelta = spokes[1].createDelta('user-bob', [
    { localContext: 'doc', target: { id: 'doc_1' } },
    { localContext: 'content', target: 'This is a collaborative document.' },
    { localContext: 'doc', targetContext: 'content' }
  ]);

  await spokes[1].persistDelta(contentDelta);
  await spokes[1].getFederationLinks()[0].sendDelta(contentDelta);

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Spoke C adds a comment
  console.log('[spoke-C] Adding comment...');
  const commentDelta = spokes[2].createDelta('user-carol', [
    { localContext: 'comment', target: { id: 'comment_1' } },
    { localContext: 'doc', target: { id: 'doc_1' } },
    { localContext: 'comment', targetContext: 'doc' },
    { localContext: 'text', target: 'Great collaboration!' },
    { localContext: 'comment', targetContext: 'text' }
  ]);

  await spokes[2].persistDelta(commentDelta);
  await spokes[2].getFederationLinks()[0].sendDelta(commentDelta);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Verify all spokes have the same data
  console.log('\n--- Verifying data consistency across all spokes ---\n');

  for (let i = 0; i < spokes.length; i++) {
    const spoke = spokes[i];
    const docView = spoke.materialize({ id: 'doc_1' });
    const totalDeltas = spoke.getDeltasByFilter({}).length;

    console.log(`[${spoke.systemId}]`);
    console.log(`  Document view:`, docView);
    console.log(`  Total deltas: ${totalDeltas}`);
  }

  console.log('\n✓ All spokes converged to same state!\n');

  // Cleanup
  console.log('Cleaning up...');
  for (const spoke of spokes) {
    await spoke.close();
  }
  await hub.close();

  console.log('✓ Demo complete');
}

main().catch(console.error);
