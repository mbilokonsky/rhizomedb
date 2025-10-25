/**
 * Trust Policy Example
 *
 * Demonstrates how to use trust policies to control which deltas
 * are accepted from remote instances.
 */

import { FederatedRhizomeDB } from '../../../src/storage/federated-instance';
import {
  createAuthorTrustPolicy,
  createSystemTrustPolicy,
  createCustomTrustPolicy,
  combineTrustPolicies
} from '../../../src/federation/trust';

async function main() {
  console.log('=== TRUST POLICY EXAMPLE ===\n');

  // Create a server with system-level trust policy
  console.log('Creating server with trust policy...');
  const server = new FederatedRhizomeDB({
    storage: 'memory',
    systemId: 'trusted-server',
    cacheSize: 5000,
    enableIndexing: true,
    federation: {
      enableServer: true,
      serverConfig: {
        port: 8080,
        path: '/federation',
        // Server-wide trust policy: only accept from trusted systems
        trustPolicy: createSystemTrustPolicy(['trusted-client-1', 'trusted-client-2'])
      },
      autoBroadcast: true
    }
  });

  console.log(`✓ Server: ${server.systemId}`);
  console.log('  Trust policy: Only systems [trusted-client-1, trusted-client-2]\n');

  // Track accepted and rejected deltas
  let accepted = 0;
  let rejected = 0;

  server.onFederationEvent((event) => {
    if (event.type === 'delta:received') {
      accepted++;
      console.log(`✓ Accepted delta ${event.deltaId}`);
    } else if (event.type === 'delta:rejected') {
      rejected++;
      console.log(`✗ Rejected delta ${event.deltaId}: ${event.reason}`);
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Client 1: Trusted system
  console.log('Creating trusted client...');
  const trustedClient = new FederatedRhizomeDB({
    storage: 'memory',
    systemId: 'trusted-client-1',
    cacheSize: 1000,
    enableIndexing: true
  });

  await trustedClient.connectToRemote('ws://localhost:8080/federation', {
    mode: 'push',
    initialSync: 'none'
  });

  console.log(`✓ Trusted client: ${trustedClient.systemId}\n`);

  // Client 2: Untrusted system
  console.log('Creating untrusted client...');
  const untrustedClient = new FederatedRhizomeDB({
    storage: 'memory',
    systemId: 'untrusted-client-999',
    cacheSize: 1000,
    enableIndexing: true
  });

  await untrustedClient.connectToRemote('ws://localhost:8080/federation', {
    mode: 'push',
    initialSync: 'none'
  });

  console.log(`✓ Untrusted client: ${untrustedClient.systemId}\n`);

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Send deltas from trusted client
  console.log('--- Sending delta from trusted client ---');
  const trustedDelta = trustedClient.createDelta('alice', [
    { localContext: 'data', target: { id: 'item_1' } },
    { localContext: 'value', target: 'trusted data' },
    { localContext: 'data', targetContext: 'value' }
  ]);

  await trustedClient.persistDelta(trustedDelta);
  await trustedClient.getFederationLinks()[0].sendDelta(trustedDelta);

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Send deltas from untrusted client
  console.log('\n--- Sending delta from untrusted client ---');
  const untrustedDelta = untrustedClient.createDelta('mallory', [
    { localContext: 'data', target: { id: 'item_2' } },
    { localContext: 'value', target: 'untrusted data' },
    { localContext: 'data', targetContext: 'value' }
  ]);

  await untrustedClient.persistDelta(untrustedDelta);
  await untrustedClient.getFederationLinks()[0].sendDelta(untrustedDelta);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check server state
  console.log('\n--- Server State ---');
  console.log(`Deltas accepted: ${accepted}`);
  console.log(`Deltas rejected: ${rejected}`);
  console.log(`Total deltas: ${server.getDeltasByFilter({}).length}\n`);

  // Demonstrate author-based trust policy
  console.log('--- Author-Based Trust Policy ---');

  const authorTrustClient = new FederatedRhizomeDB({
    storage: 'memory',
    systemId: 'author-trust-client',
    cacheSize: 1000,
    enableIndexing: true
  });

  // Only accept deltas from specific authors
  await authorTrustClient.connectToRemote('ws://localhost:8080/federation', {
    mode: 'pull',
    initialSync: 'none',
    trustPolicy: createAuthorTrustPolicy(['alice', 'bob'])
  });

  console.log('Client with author trust policy: only accepts from [alice, bob]\n');

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Demonstrate custom trust policy
  console.log('--- Custom Trust Policy ---');

  const customTrustClient = new FederatedRhizomeDB({
    storage: 'memory',
    systemId: 'custom-trust-client',
    cacheSize: 1000,
    enableIndexing: true
  });

  // Custom policy: only accept deltas with specific context
  const customPolicy = createCustomTrustPolicy((delta) => {
    return delta.pointers.some((p) => p.localContext === 'verified');
  });

  await customTrustClient.connectToRemote('ws://localhost:8080/federation', {
    mode: 'pull',
    initialSync: 'none',
    trustPolicy: customPolicy
  });

  console.log('Client with custom trust policy: only accepts deltas with "verified" context\n');

  // Demonstrate combined trust policies
  console.log('--- Combined Trust Policies ---');

  const combinedTrustClient = new FederatedRhizomeDB({
    storage: 'memory',
    systemId: 'combined-trust-client',
    cacheSize: 1000,
    enableIndexing: true
  });

  // Combine multiple policies: must pass ALL
  const combinedPolicy = combineTrustPolicies(
    createAuthorTrustPolicy(['alice']),
    createSystemTrustPolicy(['trusted-client-1'])
  );

  await combinedTrustClient.connectToRemote('ws://localhost:8080/federation', {
    mode: 'pull',
    initialSync: 'none',
    trustPolicy: combinedPolicy
  });

  console.log('Client with combined trust policy:');
  console.log('  - Author must be "alice"');
  console.log('  - System must be "trusted-client-1"\n');

  // Cleanup
  console.log('--- Cleanup ---');
  await trustedClient.close();
  await untrustedClient.close();
  await authorTrustClient.close();
  await customTrustClient.close();
  await combinedTrustClient.close();
  await server.close();

  console.log('✓ Demo complete');
}

main().catch(console.error);
