#!/usr/bin/env npx ts-node
/**
 * CLI: federation-connect
 *
 * Connect to a remote federation server and sync deltas.
 * This is a long-running process.
 *
 * Input: {"url": "ws://host:port/federation", "mode?": "bidirectional", "initialSync?": "full"}
 * Output (first line): {"status": "connected", "linkId": string, "remoteSystemId": string}
 * Subsequent lines on stderr: federation events as JSON lines
 */

import { parseInput, openStore, output, fail, run, requireField } from './common';
import { FederationManager } from '../src/federation/manager';
import { FederationConfig } from '../src/federation/types';

run(async () => {
  const input = await parseInput();
  const url = requireField(input, 'url') as string;
  const mode = (input.mode as FederationConfig['mode']) || 'bidirectional';
  const initialSync = (input.initialSync as FederationConfig['initialSync']) || 'full';

  const store = await openStore();

  // Create federation manager (no server, client only)
  const manager = new FederationManager(store, {
    enableServer: false,
    autoBroadcast: true
  });

  // Log federation events to stderr as JSON lines
  manager.onFederationEvent((event) => {
    process.stderr.write(JSON.stringify(event) + '\n');
  });

  // Connect to remote
  const link = await manager.connectToRemote(url, {
    mode,
    initialSync,
    reconnect: {
      enabled: true,
      maxAttempts: 0, // Infinite retries
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2
    }
  });

  // Output connection info (agents read this first line)
  output({
    status: 'connected',
    linkId: link.id,
    remoteSystemId: link.remoteSystemId,
    mode,
    initialSync
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    process.stderr.write(JSON.stringify({ type: 'client:stopping' }) + '\n');
    await manager.close();
    await store.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
});
