/**
 * Federation Protocol Messages
 *
 * WebSocket message types for delta synchronization between instances.
 */

import { Delta, DeltaFilter } from '../../core/types';
import { FederationConfig } from '../types';

/**
 * Message type discriminator
 */
export enum MessageType {
  // Connection handshake
  HELLO = 'hello',
  HELLO_ACK = 'hello_ack',

  // Delta synchronization
  DELTA = 'delta',
  DELTA_ACK = 'delta_ack',
  DELTA_NACK = 'delta_nack',

  // Initial sync
  SYNC_REQUEST = 'sync_request',
  SYNC_START = 'sync_start',
  SYNC_BATCH = 'sync_batch',
  SYNC_COMPLETE = 'sync_complete',

  // Control messages
  PAUSE = 'pause',
  RESUME = 'resume',
  PING = 'ping',
  PONG = 'pong',

  // Error handling
  ERROR = 'error'
}

/**
 * Base message structure
 */
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

/**
 * HELLO - Initial handshake from client to server
 */
export interface HelloMessage extends BaseMessage {
  type: MessageType.HELLO;
  systemId: string;
  config: FederationConfig;
  protocol: string; // Protocol version
}

/**
 * HELLO_ACK - Server acknowledges handshake
 */
export interface HelloAckMessage extends BaseMessage {
  type: MessageType.HELLO_ACK;
  systemId: string;
  linkId: string; // Unique ID for this federation link
  protocol: string;
}

/**
 * DELTA - Send a delta to remote instance
 */
export interface DeltaMessage extends BaseMessage {
  type: MessageType.DELTA;
  delta: Delta;
}

/**
 * DELTA_ACK - Acknowledge delta receipt
 */
export interface DeltaAckMessage extends BaseMessage {
  type: MessageType.DELTA_ACK;
  deltaId: string;
}

/**
 * DELTA_NACK - Reject delta (failed trust policy)
 */
export interface DeltaNackMessage extends BaseMessage {
  type: MessageType.DELTA_NACK;
  deltaId: string;
  reason: string;
}

/**
 * SYNC_REQUEST - Request initial sync
 */
export interface SyncRequestMessage extends BaseMessage {
  type: MessageType.SYNC_REQUEST;
  filter?: DeltaFilter;
  fromTimestamp?: number;
}

/**
 * SYNC_START - Begin initial sync
 */
export interface SyncStartMessage extends BaseMessage {
  type: MessageType.SYNC_START;
  totalDeltas: number;
  batchSize: number;
}

/**
 * SYNC_BATCH - Batch of deltas during initial sync
 */
export interface SyncBatchMessage extends BaseMessage {
  type: MessageType.SYNC_BATCH;
  deltas: Delta[];
  batchNumber: number;
  isLastBatch: boolean;
}

/**
 * SYNC_COMPLETE - Initial sync completed
 */
export interface SyncCompleteMessage extends BaseMessage {
  type: MessageType.SYNC_COMPLETE;
  deltasProcessed: number;
}

/**
 * PAUSE - Pause delta streaming
 */
export interface PauseMessage extends BaseMessage {
  type: MessageType.PAUSE;
}

/**
 * RESUME - Resume delta streaming
 */
export interface ResumeMessage extends BaseMessage {
  type: MessageType.RESUME;
}

/**
 * PING - Heartbeat request
 */
export interface PingMessage extends BaseMessage {
  type: MessageType.PING;
}

/**
 * PONG - Heartbeat response
 */
export interface PongMessage extends BaseMessage {
  type: MessageType.PONG;
}

/**
 * ERROR - Error message
 */
export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  code: string;
  message: string;
  fatal?: boolean; // If true, connection should be closed
}

/**
 * Union of all message types
 */
export type ProtocolMessage =
  | HelloMessage
  | HelloAckMessage
  | DeltaMessage
  | DeltaAckMessage
  | DeltaNackMessage
  | SyncRequestMessage
  | SyncStartMessage
  | SyncBatchMessage
  | SyncCompleteMessage
  | PauseMessage
  | ResumeMessage
  | PingMessage
  | PongMessage
  | ErrorMessage;

/**
 * Protocol version
 */
export const PROTOCOL_VERSION = 'rhizomedb-federation-v1';

/**
 * Default batch size for initial sync
 */
export const DEFAULT_SYNC_BATCH_SIZE = 100;
