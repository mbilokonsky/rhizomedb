/**
 * Federation Types
 *
 * Type definitions for RhizomeDB federation as specified in spec §8.
 */

import { Delta, DeltaFilter } from '../core/types';

/**
 * Federation configuration for connecting instances
 */
export interface FederationConfig {
  /** Which deltas to send to remote instance */
  pushFilter?: DeltaFilter;

  /** Which deltas to accept from remote instance */
  pullFilter?: DeltaFilter;

  /** Trust policy for verifying deltas */
  trustPolicy?: TrustPolicy;

  /** Sync mode: push only, pull only, or bidirectional */
  mode: 'push' | 'pull' | 'bidirectional';

  /** Initial sync strategy when connection is established */
  initialSync?: 'full' | 'from_timestamp' | 'none';

  /** Timestamp to sync from (for 'from_timestamp' initialSync) */
  syncFromTimestamp?: number;

  /** Reconnection settings */
  reconnect?: ReconnectConfig;
}

/**
 * Reconnection configuration
 */
export interface ReconnectConfig {
  /** Enable automatic reconnection */
  enabled: boolean;

  /** Maximum reconnection attempts (0 = infinite) */
  maxAttempts?: number;

  /** Initial delay in ms */
  initialDelay?: number;

  /** Maximum delay in ms */
  maxDelay?: number;

  /** Backoff multiplier */
  backoffMultiplier?: number;
}

/**
 * Trust policy for delta verification
 */
export interface TrustPolicy {
  /** List of trusted author IDs */
  trustedAuthors?: string[];

  /** List of trusted system IDs */
  trustedSystems?: string[];

  /** Custom verification function */
  verify?: (delta: Delta) => boolean | Promise<boolean>;
}

/**
 * Status of a federation link
 */
export type FederationLinkStatus =
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'paused'
  | 'disconnected'
  | 'error';

/**
 * Statistics for a federation link
 */
export interface FederationStats {
  /** Number of deltas sent to remote */
  deltasSent: number;

  /** Number of deltas received from remote */
  deltasReceived: number;

  /** Number of deltas rejected by trust policy */
  deltasRejected: number;

  /** Timestamp of last successful sync */
  lastSyncTimestamp: number;

  /** Timestamp when connection was established */
  connectedAt?: number;

  /** Total bytes sent */
  bytesSent?: number;

  /** Total bytes received */
  bytesReceived?: number;
}

/**
 * Federation link representing a connection to a remote instance
 */
export interface FederationLink {
  /** Unique ID for this link */
  readonly id: string;

  /** Remote instance system ID */
  readonly remoteSystemId: string;

  /** Remote instance URL */
  readonly remoteUrl: string;

  /** Current status */
  readonly status: FederationLinkStatus;

  /** Federation configuration */
  readonly config: FederationConfig;

  /** Link statistics */
  readonly stats: FederationStats;

  /** Last error (if status is 'error') */
  readonly lastError?: Error;

  /** Pause delta synchronization */
  pause(): void;

  /** Resume delta synchronization */
  resume(): void;

  /** Disconnect from remote instance */
  disconnect(): Promise<void>;

  /** Send a delta to remote instance */
  sendDelta(delta: Delta): Promise<void>;
}

/**
 * Federation event types
 */
export type FederationEvent =
  | { type: 'link:connecting'; linkId: string; remoteUrl: string }
  | { type: 'link:connected'; linkId: string; remoteSystemId: string }
  | { type: 'link:disconnected'; linkId: string; reason?: string }
  | { type: 'link:error'; linkId: string; error: Error }
  | { type: 'link:paused'; linkId: string }
  | { type: 'link:resumed'; linkId: string }
  | { type: 'delta:sent'; linkId: string; deltaId: string }
  | { type: 'delta:received'; linkId: string; deltaId: string }
  | { type: 'delta:rejected'; linkId: string; deltaId: string; reason: string }
  | { type: 'sync:started'; linkId: string }
  | { type: 'sync:completed'; linkId: string; deltasProcessed: number };

/**
 * Federation event handler
 */
export type FederationEventHandler = (event: FederationEvent) => void;

/**
 * Extended RhizomeDB instance with federation capabilities
 */
export interface FederatedInstance {
  /**
   * Connect to a remote instance
   * @param remoteUrl WebSocket URL of remote instance
   * @param config Federation configuration
   * @returns Federation link
   */
  connectToRemote(
    remoteUrl: string,
    config: FederationConfig
  ): Promise<FederationLink>;

  /**
   * Get all active federation links
   */
  getFederationLinks(): FederationLink[];

  /**
   * Get a specific federation link by ID
   */
  getFederationLink(linkId: string): FederationLink | undefined;

  /**
   * Disconnect from a remote instance
   */
  disconnectFromRemote(linkId: string): Promise<void>;

  /**
   * Listen to federation events
   */
  onFederationEvent(handler: FederationEventHandler): () => void;
}
