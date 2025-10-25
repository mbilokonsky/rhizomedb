/**
 * Federation Manager
 *
 * Manages both incoming and outgoing federation connections for a RhizomeDB instance.
 */

import { Delta, DeltaFilter } from '../core/types';
import { RhizomeDB } from '../storage/instance';
import { FederationServer, FederationServerConfig } from './server/server';
import { FederationConnection } from './client/connection';
import {
  FederatedInstance,
  FederationConfig,
  FederationLink,
  FederationEvent,
  FederationEventHandler
} from './types';

/**
 * Federation manager configuration
 */
export interface FederationManagerConfig {
  /** Enable federation server for incoming connections */
  enableServer?: boolean;

  /** Server configuration */
  serverConfig?: FederationServerConfig;

  /** Auto-broadcast local deltas to connected instances */
  autoBroadcast?: boolean;
}

/**
 * Federation manager for RhizomeDB instance
 */
export class FederationManager implements FederatedInstance {
  private server?: FederationServer;
  private connections: Map<string, FederationConnection> = new Map();
  private eventHandlers: Set<FederationEventHandler> = new Set();
  private unsubscribe?: () => void;

  constructor(
    private instance: RhizomeDB,
    private config: FederationManagerConfig = {}
  ) {
    // Initialize server if enabled
    if (config.enableServer) {
      this.initializeServer();
    }

    // Subscribe to local deltas for auto-broadcast
    if (config.autoBroadcast) {
      this.subscribeToLocalDeltas();
    }
  }

  /**
   * Initialize federation server
   */
  private initializeServer(): void {
    this.server = new FederationServer(
      this.instance.systemId,
      this.config.serverConfig,
      {
        onClientConnected: (clientId, systemId) => {
          this.emitEvent({
            type: 'link:connected',
            linkId: clientId,
            remoteSystemId: systemId
          });
        },
        onClientDisconnected: (clientId) => {
          this.emitEvent({
            type: 'link:disconnected',
            linkId: clientId
          });
        },
        onDeltaReceived: async (clientId, delta) => {
          // Apply delta to local instance
          await this.instance.persistDelta(delta);
          this.emitEvent({
            type: 'delta:received',
            linkId: clientId,
            deltaId: delta.id
          });
        },
        onDeltaRejected: (clientId, deltaId, reason) => {
          this.emitEvent({
            type: 'delta:rejected',
            linkId: clientId,
            deltaId,
            reason
          });
        },
        onSyncRequested: async (clientId, filter, fromTimestamp) => {
          // Get deltas for initial sync
          return this.getInitialSyncDeltas(filter, fromTimestamp);
        },
        onError: (error) => {
          console.error('[FederationManager] Server error:', error);
        }
      }
    );
  }

  /**
   * Subscribe to local deltas for broadcasting
   */
  private subscribeToLocalDeltas(): void {
    const subscription = this.instance.subscribe({}, async (delta) => {
      // Broadcast to all connected clients (server)
      if (this.server) {
        await this.server.broadcastDelta(delta);
      }

      // Send to all outgoing connections (client)
      for (const connection of this.connections.values()) {
        if (
          connection.config.mode === 'push' ||
          connection.config.mode === 'bidirectional'
        ) {
          // Apply push filter if present
          if (connection.config.pushFilter) {
            // TODO: Implement filter matching
            // For now, send all
          }

          await connection.sendDelta(delta);
          this.emitEvent({
            type: 'delta:sent',
            linkId: connection.id,
            deltaId: delta.id
          });
        }
      }
    });

    // Store unsubscribe function
    this.unsubscribe = () => subscription.unsubscribe();
  }

  /**
   * Get deltas for initial sync
   */
  private async getInitialSyncDeltas(
    filter?: DeltaFilter,
    fromTimestamp?: number
  ): Promise<Delta[]> {
    const deltas: Delta[] = [];

    // Collect all deltas matching filter
    for await (const delta of this.instance.scanDeltas(filter)) {
      // Filter by timestamp if specified
      if (fromTimestamp && delta.timestamp < fromTimestamp) {
        continue;
      }
      deltas.push(delta);
    }

    // Sort by timestamp (oldest first)
    deltas.sort((a, b) => a.timestamp - b.timestamp);

    return deltas;
  }

  /**
   * Connect to a remote instance
   */
  async connectToRemote(
    remoteUrl: string,
    config: FederationConfig
  ): Promise<FederationLink> {
    const connection = new FederationConnection(
      this.instance.systemId,
      remoteUrl,
      config,
      {
        onConnected: (remoteSystemId) => {
          this.emitEvent({
            type: 'link:connected',
            linkId: connection.id,
            remoteSystemId
          });

          // Start sync if bidirectional or pull mode
          if (config.mode === 'pull' || config.mode === 'bidirectional') {
            this.emitEvent({
              type: 'sync:started',
              linkId: connection.id
            });
          }
        },
        onDisconnected: (reason) => {
          this.emitEvent({
            type: 'link:disconnected',
            linkId: connection.id,
            reason
          });
        },
        onError: (error) => {
          this.emitEvent({
            type: 'link:error',
            linkId: connection.id,
            error
          });
        },
        onDeltaReceived: async (delta) => {
          // Apply delta to local instance
          await this.instance.persistDelta(delta);
          this.emitEvent({
            type: 'delta:received',
            linkId: connection.id,
            deltaId: delta.id
          });
        },
        onDeltaRejected: (deltaId, reason) => {
          this.emitEvent({
            type: 'delta:rejected',
            linkId: connection.id,
            deltaId,
            reason
          });
        },
        onSyncStarted: () => {
          this.emitEvent({
            type: 'sync:started',
            linkId: connection.id
          });
        },
        onSyncCompleted: (deltasProcessed) => {
          this.emitEvent({
            type: 'sync:completed',
            linkId: connection.id,
            deltasProcessed
          });
        }
      }
    );

    // Connect to remote
    this.emitEvent({
      type: 'link:connecting',
      linkId: connection.id,
      remoteUrl
    });

    await connection.connect();

    // Store connection
    this.connections.set(connection.id, connection);

    return connection;
  }

  /**
   * Get all federation links
   */
  getFederationLinks(): FederationLink[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get a specific federation link
   */
  getFederationLink(linkId: string): FederationLink | undefined {
    return this.connections.get(linkId);
  }

  /**
   * Disconnect from a remote instance
   */
  async disconnectFromRemote(linkId: string): Promise<void> {
    const connection = this.connections.get(linkId);
    if (!connection) {
      throw new Error(`Federation link not found: ${linkId}`);
    }

    await connection.disconnect();
    this.connections.delete(linkId);
  }

  /**
   * Listen to federation events
   */
  onFederationEvent(handler: FederationEventHandler): () => void {
    this.eventHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  /**
   * Emit a federation event
   */
  private emitEvent(event: FederationEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[FederationManager] Event handler error:', error);
      }
    }
  }

  /**
   * Get server (if enabled)
   */
  getServer(): FederationServer | undefined {
    return this.server;
  }

  /**
   * Close federation manager
   */
  async close(): Promise<void> {
    // Unsubscribe from local deltas
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    // Disconnect all client connections
    await Promise.all(
      Array.from(this.connections.values()).map((conn) => conn.disconnect())
    );
    this.connections.clear();

    // Close server
    if (this.server) {
      await this.server.close();
    }
  }
}
