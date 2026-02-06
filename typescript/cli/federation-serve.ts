#!/usr/bin/env npx ts-node
/**
 * CLI: federation-serve
 *
 * Start a federation server backed by the local .rhizome store.
 * This is a long-running process.
 *
 * Input: {"port?": 8080, "path?": "/federation"}
 * Output (first line): {"status": "listening", "port": number, "systemId": string}
 * Subsequent lines on stderr: federation events as JSON lines
 */

import { createServer } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { parseInput, openStore, output, fail, run, getRhizomeDir } from './common';
import { FederationManager } from '../src/federation/manager';
import { LevelDBStore } from '../src/storage/leveldb-store';

run(async () => {
  const input = await parseInput();
  const port = typeof input.port === 'number' ? input.port : 8080;
  const wsPath = typeof input.path === 'string' ? input.path : '/federation';

  const store = await openStore();

  // Create HTTP server
  const httpServer = createServer();

  // Create federation manager with server enabled
  const manager = new FederationManager(store, {
    enableServer: true,
    serverConfig: {
      server: httpServer,
      path: wsPath
    },
    autoBroadcast: true
  });

  // Log federation events to stderr as JSON lines
  manager.onFederationEvent((event) => {
    process.stderr.write(JSON.stringify(event) + '\n');
  });

  // Write federation config to .rhizome/federation.json
  const rhizomeDir = getRhizomeDir();
  const federationConfig = {
    server: {
      port,
      path: wsPath,
      systemId: store.systemId,
      startedAt: Date.now()
    },
    connections: []
  };
  fs.writeFileSync(
    path.join(rhizomeDir, 'federation.json'),
    JSON.stringify(federationConfig, null, 2),
    'utf-8'
  );

  // Start listening
  await new Promise<void>((resolve) => {
    httpServer.listen(port, () => resolve());
  });

  // Output status (agents read this first line)
  output({
    status: 'listening',
    port,
    path: wsPath,
    systemId: store.systemId
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    process.stderr.write(JSON.stringify({ type: 'server:stopping' }) + '\n');
    await manager.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
    await store.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
});
