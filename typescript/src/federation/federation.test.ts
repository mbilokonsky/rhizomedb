/**
 * Federation Integration Test
 *
 * Tests two in-memory RhizomeDB instances syncing via WebSocket.
 */

import { createServer, Server } from 'http';
import { RhizomeDB } from '../storage/instance';
import { FederationServer } from './server/server';
import { FederationConnection } from './client/connection';
import { MessageType, PROTOCOL_VERSION } from './protocol/messages';
import { encodeMessage, decodeMessage } from './protocol/codec';
import { Delta } from '../core/types';

// Helper to wait for a condition
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

describe('Federation: Server + Client', () => {
  let httpServer: Server;
  let serverInstance: RhizomeDB;
  let fedServer: FederationServer;
  let port: number;

  beforeEach(async () => {
    serverInstance = new RhizomeDB({ storage: 'memory', systemId: 'server-sys' });

    // Create HTTP server on random port
    httpServer = createServer();
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });
    const addr = httpServer.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;

    // Received deltas from clients
    const receivedDeltas: Delta[] = [];

    fedServer = new FederationServer('server-sys', {
      server: httpServer,
      path: '/federation'
    }, {
      onDeltaReceived: async (_clientId, delta) => {
        receivedDeltas.push(delta);
        await serverInstance.persistDelta(delta);
      },
      onSyncRequested: async (_clientId, _filter, _fromTimestamp) => {
        const deltas: Delta[] = [];
        for await (const d of serverInstance.scanDeltas()) {
          deltas.push(d);
        }
        return deltas;
      }
    });
  });

  afterEach(async () => {
    await fedServer.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  it('should establish connection and exchange HELLO/HELLO_ACK', async () => {
    const connection = new FederationConnection(
      'client-sys',
      `ws://localhost:${port}/federation`,
      {
        mode: 'bidirectional',
        initialSync: 'none',
        reconnect: { enabled: false }
      }
    );

    await connection.connect();

    // connect() awaits the HELLO/HELLO_ACK handshake
    expect(connection.status).toBe('connected');
    expect(connection.remoteSystemId).toBe('server-sys');

    await connection.disconnect();
  });

  it('should send a delta from client to server', async () => {
    const receivedOnServer: Delta[] = [];

    // Replace the event handler to track received deltas
    await fedServer.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });

    // Recreate server with tracking
    httpServer = createServer();
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });
    const addr = httpServer.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;

    fedServer = new FederationServer('server-sys', {
      server: httpServer,
      path: '/federation'
    }, {
      onDeltaReceived: async (_clientId, delta) => {
        receivedOnServer.push(delta);
      }
    });

    const connection = new FederationConnection(
      'client-sys',
      `ws://localhost:${port}/federation`,
      {
        mode: 'push',
        initialSync: 'none',
        reconnect: { enabled: false }
      }
    );

    await connection.connect();
    await waitFor(() => connection.status === 'connected');

    // Create and send a delta
    const clientDb = new RhizomeDB({ storage: 'memory', systemId: 'client-sys' });
    const delta = clientDb.createDelta('test-author', [
      { role: 'named', target: { id: 'alice', context: 'name' } },
      { role: 'name', target: 'Alice' }
    ]);

    await connection.sendDelta(delta);

    // Wait for server to receive
    await waitFor(() => receivedOnServer.length > 0, 3000);
    expect(receivedOnServer).toHaveLength(1);
    expect(receivedOnServer[0].id).toBe(delta.id);
    expect(receivedOnServer[0].author).toBe('test-author');

    await connection.disconnect();
  });

  it('should handle connection lifecycle (connect, pause, resume, disconnect)', async () => {
    const connection = new FederationConnection(
      'client-sys',
      `ws://localhost:${port}/federation`,
      {
        mode: 'bidirectional',
        initialSync: 'none',
        reconnect: { enabled: false }
      }
    );

    await connection.connect();
    await waitFor(() => connection.status === 'connected');
    expect(connection.status).toBe('connected');

    connection.pause();
    expect(connection.status).toBe('paused');

    connection.resume();
    expect(connection.status).toBe('connected');

    await connection.disconnect();
    expect(connection.status).toBe('disconnected');
  });
});

describe('Federation: Trust Policy Enforcement', () => {
  let httpServer: Server;
  let fedServer: FederationServer;
  let port: number;
  let rejectedDeltas: Array<{ deltaId: string; reason: string }>;

  beforeEach(async () => {
    rejectedDeltas = [];

    httpServer = createServer();
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });
    const addr = httpServer.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;

    fedServer = new FederationServer('server-sys', {
      server: httpServer,
      path: '/federation',
      trustPolicy: {
        trustedAuthors: ['trusted-author']
      }
    }, {
      onDeltaRejected: (_clientId, deltaId, reason) => {
        rejectedDeltas.push({ deltaId, reason });
      }
    });
  });

  afterEach(async () => {
    await fedServer.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  it('should reject deltas from untrusted authors', async () => {
    const connection = new FederationConnection(
      'client-sys',
      `ws://localhost:${port}/federation`,
      {
        mode: 'push',
        initialSync: 'none',
        reconnect: { enabled: false }
      }
    );

    await connection.connect();
    await waitFor(() => connection.status === 'connected');

    const clientDb = new RhizomeDB({ storage: 'memory', systemId: 'client-sys' });
    const untrustedDelta = clientDb.createDelta('untrusted-author', [
      { role: 'test', target: 'value' }
    ]);

    await connection.sendDelta(untrustedDelta);

    // Wait for rejection
    await waitFor(() => rejectedDeltas.length > 0, 3000);
    expect(rejectedDeltas).toHaveLength(1);
    expect(rejectedDeltas[0].deltaId).toBe(untrustedDelta.id);

    await connection.disconnect();
  });
});
