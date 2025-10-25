/**
 * Federation Client Connection
 *
 * Manages WebSocket connection to a remote RhizomeDB instance.
 */

import WebSocket from 'ws';
import { Delta } from '../../core/types';
import {
  FederationConfig,
  FederationLink,
  FederationLinkStatus,
  FederationStats,
  ReconnectConfig
} from '../types';
import {
  MessageType,
  ProtocolMessage,
  HelloMessage,
  DeltaMessage,
  PROTOCOL_VERSION
} from '../protocol/messages';
import { encodeMessage, decodeMessage } from '../protocol/codec';
import { verifyDelta } from '../trust';
import { v4 as uuidv4 } from 'uuid';

/**
 * Event handlers for federation connection
 */
export interface ConnectionEventHandlers {
  onConnected?: (remoteSystemId: string) => void;
  onDisconnected?: (reason?: string) => void;
  onError?: (error: Error) => void;
  onDeltaReceived?: (delta: Delta) => void;
  onDeltaRejected?: (deltaId: string, reason: string) => void;
  onSyncStarted?: () => void;
  onSyncCompleted?: (deltasProcessed: number) => void;
}

/**
 * Federation connection implementing FederationLink interface
 */
export class FederationConnection implements FederationLink {
  public readonly id: string;
  public readonly remoteUrl: string;
  public readonly config: FederationConfig;

  private ws: WebSocket | null = null;
  private _remoteSystemId: string = '';
  private _status: FederationLinkStatus = 'disconnected';
  private _stats: FederationStats;
  private _lastError?: Error;
  private eventHandlers: ConnectionEventHandlers;
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private isPaused = false;
  private pendingDeltas: Delta[] = [];
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(
    public readonly localSystemId: string,
    remoteUrl: string,
    config: FederationConfig,
    eventHandlers: ConnectionEventHandlers = {}
  ) {
    this.id = uuidv4();
    this.remoteUrl = remoteUrl;
    this.config = {
      ...config,
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        ...config.reconnect
      }
    };
    this.eventHandlers = eventHandlers;
    this._stats = {
      deltasSent: 0,
      deltasReceived: 0,
      deltasRejected: 0,
      lastSyncTimestamp: 0
    };
  }

  /**
   * Get remote system ID
   */
  get remoteSystemId(): string {
    return this._remoteSystemId;
  }

  /**
   * Get current connection status
   */
  get status(): FederationLinkStatus {
    return this._status;
  }

  /**
   * Get connection statistics
   */
  get stats(): FederationStats {
    return { ...this._stats };
  }

  /**
   * Get last error
   */
  get lastError(): Error | undefined {
    return this._lastError;
  }

  /**
   * Connect to remote instance
   */
  async connect(): Promise<void> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return;
    }

    this._status = 'connecting';
    this._lastError = undefined;

    try {
      this.ws = new WebSocket(this.remoteUrl);

      // Setup WebSocket event handlers
      this.ws.on('open', () => this.handleOpen());
      this.ws.on('message', (data: WebSocket.Data) => this.handleMessage(data));
      this.ws.on('close', (code: number, reason: Buffer) =>
        this.handleClose(code, reason.toString())
      );
      this.ws.on('error', (error: Error) => this.handleError(error));

      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        const onConnected = () => {
          clearTimeout(timeout);
          resolve();
        };

        const onError = (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        };

        this.eventHandlers.onConnected = onConnected;
        const originalOnError = this.eventHandlers.onError;
        this.eventHandlers.onError = (error) => {
          onError(error);
          originalOnError?.(error);
        };
      });
    } catch (error) {
      this._status = 'error';
      this._lastError = error instanceof Error ? error : new Error(String(error));
      throw this._lastError;
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    // Send HELLO message
    const hello: HelloMessage = {
      type: MessageType.HELLO,
      timestamp: Date.now(),
      systemId: this.localSystemId,
      config: this.config,
      protocol: PROTOCOL_VERSION
    };

    this.send(hello);
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(data: WebSocket.Data): Promise<void> {
    try {
      const message = decodeMessage(data.toString());

      switch (message.type) {
        case MessageType.HELLO_ACK:
          this._remoteSystemId = message.systemId;
          this._status = 'connected';
          this._stats.connectedAt = Date.now();
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.eventHandlers.onConnected?.(message.systemId);

          // Handle initial sync
          if (this.config.initialSync && this.config.initialSync !== 'none') {
            await this.requestInitialSync();
          }

          // Send any pending deltas
          await this.flushPendingDeltas();
          break;

        case MessageType.DELTA:
          await this.handleDeltaMessage(message);
          break;

        case MessageType.DELTA_ACK:
          // Delta acknowledged by remote
          break;

        case MessageType.DELTA_NACK:
          this._stats.deltasRejected++;
          this.eventHandlers.onDeltaRejected?.(message.deltaId, message.reason);
          break;

        case MessageType.SYNC_START:
          this._status = 'syncing';
          this.eventHandlers.onSyncStarted?.();
          break;

        case MessageType.SYNC_BATCH:
          for (const delta of message.deltas) {
            await this.handleDelta(delta);
          }
          if (message.isLastBatch) {
            this._status = 'connected';
          }
          break;

        case MessageType.SYNC_COMPLETE:
          this._status = 'connected';
          this.eventHandlers.onSyncCompleted?.(message.deltasProcessed);
          break;

        case MessageType.PING:
          this.send({ type: MessageType.PONG, timestamp: Date.now() });
          break;

        case MessageType.PONG:
          // Heartbeat acknowledged
          break;

        case MessageType.ERROR:
          const error = new Error(message.message);
          this._lastError = error;
          this.eventHandlers.onError?.(error);
          if (message.fatal) {
            this.disconnect();
          }
          break;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this._lastError = err;
      this.eventHandlers.onError?.(err);
    }
  }

  /**
   * Handle DELTA message from remote
   */
  private async handleDeltaMessage(message: DeltaMessage): Promise<void> {
    await this.handleDelta(message.delta);

    // Send acknowledgment
    this.send({
      type: MessageType.DELTA_ACK,
      timestamp: Date.now(),
      deltaId: message.delta.id
    });
  }

  /**
   * Handle a delta (verify trust policy and pass to handler)
   */
  private async handleDelta(delta: Delta): Promise<void> {
    // Verify trust policy
    const trusted = await verifyDelta(delta, this.config.trustPolicy);

    if (!trusted) {
      this._stats.deltasRejected++;
      this.eventHandlers.onDeltaRejected?.(
        delta.id,
        'Failed trust policy verification'
      );

      // Send NACK
      this.send({
        type: MessageType.DELTA_NACK,
        timestamp: Date.now(),
        deltaId: delta.id,
        reason: 'Failed trust policy verification'
      });
      return;
    }

    this._stats.deltasReceived++;
    this._stats.lastSyncTimestamp = Date.now();
    this.eventHandlers.onDeltaReceived?.(delta);
  }

  /**
   * Request initial sync from remote
   */
  private async requestInitialSync(): Promise<void> {
    this.send({
      type: MessageType.SYNC_REQUEST,
      timestamp: Date.now(),
      filter: this.config.pullFilter,
      fromTimestamp: this.config.syncFromTimestamp
    });
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(code: number, reason: string): void {
    this.stopHeartbeat();

    const wasConnected = this._status === 'connected';
    this._status = 'disconnected';

    this.eventHandlers.onDisconnected?.(reason);

    // Attempt reconnection if enabled
    if (
      wasConnected &&
      this.config.reconnect?.enabled &&
      !this.isPaused
    ) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(error: Error): void {
    this._status = 'error';
    this._lastError = error;
    this.eventHandlers.onError?.(error);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    const reconnectConfig = this.config.reconnect!;

    if (
      reconnectConfig.maxAttempts &&
      reconnectConfig.maxAttempts > 0 &&
      this.reconnectAttempts >= reconnectConfig.maxAttempts
    ) {
      // Max attempts reached
      return;
    }

    const delay = Math.min(
      reconnectConfig.initialDelay! *
        Math.pow(reconnectConfig.backoffMultiplier!, this.reconnectAttempts),
      reconnectConfig.maxDelay!
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(() => {
        // Error handled in connect()
      });
    }, delay);
  }

  /**
   * Send a message to remote instance
   */
  private send(message: ProtocolMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const encoded = encodeMessage(message);
    this.ws.send(encoded);

    if (message.type === MessageType.DELTA) {
      this._stats.deltasSent++;
      this._stats.bytesSent = (this._stats.bytesSent || 0) + encoded.length;
    }
  }

  /**
   * Send a delta to remote instance
   */
  async sendDelta(delta: Delta): Promise<void> {
    if (this._status !== 'connected') {
      // Queue delta for later
      this.pendingDeltas.push(delta);
      return;
    }

    if (this.isPaused) {
      return;
    }

    this.send({
      type: MessageType.DELTA,
      timestamp: Date.now(),
      delta
    });
  }

  /**
   * Flush pending deltas
   */
  private async flushPendingDeltas(): Promise<void> {
    while (this.pendingDeltas.length > 0) {
      const delta = this.pendingDeltas.shift()!;
      await this.sendDelta(delta);
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: MessageType.PING, timestamp: Date.now() });
    }, 30000); // 30 second heartbeat
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Pause delta synchronization
   */
  pause(): void {
    this.isPaused = true;
    this._status = 'paused';
    this.send({ type: MessageType.PAUSE, timestamp: Date.now() });
  }

  /**
   * Resume delta synchronization
   */
  resume(): void {
    this.isPaused = false;
    this._status = 'connected';
    this.send({ type: MessageType.RESUME, timestamp: Date.now() });
    this.flushPendingDeltas();
  }

  /**
   * Disconnect from remote instance
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this._status = 'disconnected';
  }
}
