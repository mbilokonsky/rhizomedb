/**
 * Federation Server
 *
 * WebSocket server for accepting incoming federation connections.
 */

import WebSocket, { WebSocketServer } from 'ws';
import { Server as HTTPServer } from 'http';
import { Delta, DeltaFilter } from '../../core/types';
import {
  MessageType,
  ProtocolMessage,
  HelloMessage,
  DeltaMessage,
  PROTOCOL_VERSION,
  DEFAULT_SYNC_BATCH_SIZE
} from '../protocol/messages';
import { encodeMessage, decodeMessage } from '../protocol/codec';
import { verifyDelta } from '../trust';
import { TrustPolicy } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Connected client information
 */
interface ConnectedClient {
  id: string;
  systemId: string;
  ws: WebSocket;
  config: {
    pushFilter?: DeltaFilter;
    pullFilter?: DeltaFilter;
    trustPolicy?: TrustPolicy;
    mode: 'push' | 'pull' | 'bidirectional';
  };
  stats: {
    deltasSent: number;
    deltasReceived: number;
    deltasRejected: number;
    connectedAt: number;
  };
  isPaused: boolean;
}

/**
 * Event handlers for federation server
 */
export interface FederationServerEventHandlers {
  onClientConnected?: (clientId: string, systemId: string) => void;
  onClientDisconnected?: (clientId: string) => void;
  onDeltaReceived?: (clientId: string, delta: Delta) => void;
  onDeltaRejected?: (clientId: string, deltaId: string, reason: string) => void;
  onSyncRequested?: (
    clientId: string,
    filter?: DeltaFilter,
    fromTimestamp?: number
  ) => Promise<Delta[]>;
  onError?: (error: Error) => void;
}

/**
 * Federation server configuration
 */
export interface FederationServerConfig {
  /** HTTP server to attach WebSocket server to */
  server?: HTTPServer;

  /** Port to listen on (if no HTTP server provided) */
  port?: number;

  /** Path for WebSocket endpoint */
  path?: string;

  /** Server-side trust policy for all clients */
  trustPolicy?: TrustPolicy;

  /** Maximum number of concurrent connections */
  maxConnections?: number;
}

/**
 * Federation WebSocket server
 */
export class FederationServer {
  private wss: WebSocketServer;
  private clients: Map<string, ConnectedClient> = new Map();
  private eventHandlers: FederationServerEventHandlers;
  private config: Required<FederationServerConfig>;

  constructor(
    private readonly systemId: string,
    config: FederationServerConfig = {},
    eventHandlers: FederationServerEventHandlers = {}
  ) {
    this.eventHandlers = eventHandlers;
    this.config = {
      server: config.server,
      port: config.port || 8080,
      path: config.path || '/federation',
      trustPolicy: config.trustPolicy,
      maxConnections: config.maxConnections || 1000
    } as Required<FederationServerConfig>;

    // Create WebSocket server
    if (this.config.server) {
      this.wss = new WebSocketServer({
        server: this.config.server,
        path: this.config.path
      });
    } else {
      this.wss = new WebSocketServer({
        port: this.config.port,
        path: this.config.path
      });
    }

    this.wss.on('connection', (ws: WebSocket) => this.handleConnection(ws));
    this.wss.on('error', (error: Error) => this.handleServerError(error));
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    // Check max connections
    if (this.clients.size >= this.config.maxConnections) {
      ws.close(1008, 'Max connections reached');
      return;
    }

    const clientId = uuidv4();

    // Setup connection handlers
    ws.on('message', (data: WebSocket.Data) =>
      this.handleMessage(clientId, data)
    );
    ws.on('close', () => this.handleDisconnect(clientId));
    ws.on('error', (error: Error) => this.handleClientError(clientId, error));

    // Store temporary client info (will be updated on HELLO)
    this.clients.set(clientId, {
      id: clientId,
      systemId: '',
      ws,
      config: { mode: 'bidirectional' },
      stats: {
        deltasSent: 0,
        deltasReceived: 0,
        deltasRejected: 0,
        connectedAt: Date.now()
      },
      isPaused: false
    });
  }

  /**
   * Handle incoming message from client
   */
  private async handleMessage(
    clientId: string,
    data: WebSocket.Data
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message = decodeMessage(data.toString());

      switch (message.type) {
        case MessageType.HELLO:
          await this.handleHello(client, message);
          break;

        case MessageType.DELTA:
          await this.handleDelta(client, message);
          break;

        case MessageType.SYNC_REQUEST:
          await this.handleSyncRequest(client, message);
          break;

        case MessageType.PAUSE:
          client.isPaused = true;
          break;

        case MessageType.RESUME:
          client.isPaused = false;
          break;

        case MessageType.PING:
          this.send(client, {
            type: MessageType.PONG,
            timestamp: Date.now()
          });
          break;

        case MessageType.PONG:
          // Heartbeat acknowledged
          break;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.sendError(client, 'MESSAGE_ERROR', err.message);
      this.eventHandlers.onError?.(err);
    }
  }

  /**
   * Handle HELLO message from client
   */
  private async handleHello(
    client: ConnectedClient,
    message: HelloMessage
  ): Promise<void> {
    // Verify protocol version
    if (message.protocol !== PROTOCOL_VERSION) {
      this.sendError(
        client,
        'PROTOCOL_MISMATCH',
        `Unsupported protocol: ${message.protocol}`,
        true
      );
      return;
    }

    // Update client info
    client.systemId = message.systemId;
    client.config = {
      pushFilter: message.config.pushFilter,
      pullFilter: message.config.pullFilter,
      trustPolicy: message.config.trustPolicy,
      mode: message.config.mode
    };

    // Send HELLO_ACK
    this.send(client, {
      type: MessageType.HELLO_ACK,
      timestamp: Date.now(),
      systemId: this.systemId,
      linkId: client.id,
      protocol: PROTOCOL_VERSION
    });

    this.eventHandlers.onClientConnected?.(client.id, client.systemId);
  }

  /**
   * Handle DELTA message from client
   */
  private async handleDelta(
    client: ConnectedClient,
    message: DeltaMessage
  ): Promise<void> {
    const delta = message.delta;

    // Verify trust policy
    const trusted = await verifyDelta(
      delta,
      client.config.trustPolicy || this.config.trustPolicy
    );

    if (!trusted) {
      client.stats.deltasRejected++;
      this.eventHandlers.onDeltaRejected?.(
        client.id,
        delta.id,
        'Failed trust policy verification'
      );

      this.send(client, {
        type: MessageType.DELTA_NACK,
        timestamp: Date.now(),
        deltaId: delta.id,
        reason: 'Failed trust policy verification'
      });
      return;
    }

    client.stats.deltasReceived++;
    this.eventHandlers.onDeltaReceived?.(client.id, delta);

    // Send acknowledgment
    this.send(client, {
      type: MessageType.DELTA_ACK,
      timestamp: Date.now(),
      deltaId: delta.id
    });
  }

  /**
   * Handle SYNC_REQUEST message from client
   */
  private async handleSyncRequest(
    client: ConnectedClient,
    message: { type: MessageType.SYNC_REQUEST; timestamp: number; filter?: DeltaFilter; fromTimestamp?: number }
  ): Promise<void> {
    if (!this.eventHandlers.onSyncRequested) {
      this.sendError(client, 'SYNC_NOT_SUPPORTED', 'Sync not supported');
      return;
    }

    try {
      // Get deltas from handler
      const deltas = await this.eventHandlers.onSyncRequested(
        client.id,
        message.filter,
        message.fromTimestamp
      );

      // Send SYNC_START
      this.send(client, {
        type: MessageType.SYNC_START,
        timestamp: Date.now(),
        totalDeltas: deltas.length,
        batchSize: DEFAULT_SYNC_BATCH_SIZE
      });

      // Send deltas in batches
      for (let i = 0; i < deltas.length; i += DEFAULT_SYNC_BATCH_SIZE) {
        const batch = deltas.slice(i, i + DEFAULT_SYNC_BATCH_SIZE);
        const batchNumber = Math.floor(i / DEFAULT_SYNC_BATCH_SIZE);
        const isLastBatch = i + DEFAULT_SYNC_BATCH_SIZE >= deltas.length;

        this.send(client, {
          type: MessageType.SYNC_BATCH,
          timestamp: Date.now(),
          deltas: batch,
          batchNumber,
          isLastBatch
        });

        client.stats.deltasSent += batch.length;
      }

      // Send SYNC_COMPLETE
      this.send(client, {
        type: MessageType.SYNC_COMPLETE,
        timestamp: Date.now(),
        deltasProcessed: deltas.length
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.sendError(client, 'SYNC_ERROR', err.message);
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.eventHandlers.onClientDisconnected?.(clientId);
      this.clients.delete(clientId);
    }
  }

  /**
   * Handle client error
   */
  private handleClientError(clientId: string, error: Error): void {
    this.eventHandlers.onError?.(error);
  }

  /**
   * Handle server error
   */
  private handleServerError(error: Error): void {
    this.eventHandlers.onError?.(error);
  }

  /**
   * Send a message to a client
   */
  private send(client: ConnectedClient, message: ProtocolMessage): void {
    if (client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const encoded = encodeMessage(message);
    client.ws.send(encoded);
  }

  /**
   * Send an error message to a client
   */
  private sendError(
    client: ConnectedClient,
    code: string,
    message: string,
    fatal = false
  ): void {
    this.send(client, {
      type: MessageType.ERROR,
      timestamp: Date.now(),
      code,
      message,
      fatal
    });

    if (fatal) {
      client.ws.close();
    }
  }

  /**
   * Broadcast a delta to all connected clients
   */
  async broadcastDelta(delta: Delta, excludeClientId?: string): Promise<void> {
    for (const [clientId, client] of this.clients.entries()) {
      if (clientId === excludeClientId) continue;
      if (client.isPaused) continue;
      if (!client.systemId) continue; // Not yet authenticated

      // Check if client should receive this delta based on mode
      if (client.config.mode === 'push') {
        continue; // Push mode = client sends only
      }

      // Apply pull filter if present
      if (client.config.pullFilter) {
        // TODO: Implement filter matching
        // For now, send to all
      }

      // Verify trust policy
      const trusted = await verifyDelta(
        delta,
        client.config.trustPolicy || this.config.trustPolicy
      );

      if (!trusted) {
        continue;
      }

      this.send(client, {
        type: MessageType.DELTA,
        timestamp: Date.now(),
        delta
      });

      client.stats.deltasSent++;
    }
  }

  /**
   * Get all connected clients
   */
  getClients(): Array<{
    id: string;
    systemId: string;
    stats: ConnectedClient['stats'];
  }> {
    return Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      systemId: client.systemId,
      stats: client.stats
    }));
  }

  /**
   * Get a specific client by ID
   */
  getClient(clientId: string): ConnectedClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Close the server
   */
  async close(): Promise<void> {
    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();

    // Close WebSocket server
    return new Promise<void>((resolve, reject) => {
      this.wss.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
