/**
 * Federated RhizomeDB Instance
 *
 * Extends RhizomeDB with federation capabilities (spec §8).
 */

import { RhizomeDB } from './instance';
import { RhizomeConfig } from '../core/types';
import {
  FederatedInstance,
  FederationConfig,
  FederationLink,
  FederationEventHandler
} from '../federation/types';
import {
  FederationManager,
  FederationManagerConfig
} from '../federation/manager';

/**
 * Configuration for federated RhizomeDB instance
 */
export interface FederatedRhizomeConfig extends RhizomeConfig {
  /** Federation configuration */
  federation?: FederationManagerConfig;
}

/**
 * RhizomeDB instance with federation support
 *
 * Extends the base RhizomeDB instance with the ability to connect to
 * and synchronize with remote instances.
 */
export class FederatedRhizomeDB extends RhizomeDB implements FederatedInstance {
  private federationManager: FederationManager;

  constructor(config: FederatedRhizomeConfig) {
    super(config);

    // Initialize federation manager
    this.federationManager = new FederationManager(this, config.federation);
  }

  /**
   * Connect to a remote instance
   *
   * @param remoteUrl WebSocket URL of remote instance
   * @param config Federation configuration
   * @returns Federation link
   */
  async connectToRemote(
    remoteUrl: string,
    config: FederationConfig
  ): Promise<FederationLink> {
    return this.federationManager.connectToRemote(remoteUrl, config);
  }

  /**
   * Get all active federation links
   */
  getFederationLinks(): FederationLink[] {
    return this.federationManager.getFederationLinks();
  }

  /**
   * Get a specific federation link by ID
   */
  getFederationLink(linkId: string): FederationLink | undefined {
    return this.federationManager.getFederationLink(linkId);
  }

  /**
   * Disconnect from a remote instance
   */
  async disconnectFromRemote(linkId: string): Promise<void> {
    return this.federationManager.disconnectFromRemote(linkId);
  }

  /**
   * Listen to federation events
   */
  onFederationEvent(handler: FederationEventHandler): () => void {
    return this.federationManager.onFederationEvent(handler);
  }

  /**
   * Get the federation manager
   */
  getFederationManager(): FederationManager {
    return this.federationManager;
  }

  /**
   * Close the instance and all federation connections
   */
  async close(): Promise<void> {
    await this.federationManager.close();
  }
}

/**
 * Create a federated RhizomeDB instance
 *
 * Convenience function for creating a federated instance.
 */
export function createFederatedInstance(
  config: FederatedRhizomeConfig
): FederatedRhizomeDB {
  return new FederatedRhizomeDB(config);
}
