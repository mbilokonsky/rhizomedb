/**
 * Federation Module
 *
 * Provides instance-to-instance delta synchronization for RhizomeDB.
 */

// Core types
export * from './types';

// Trust policies
export * from './trust';

// Protocol
export * from './protocol/messages';
export * from './protocol/codec';

// Client connection
export { FederationConnection } from './client/connection';

// Server
export { FederationServer, FederationServerConfig } from './server/server';

// Manager
export { FederationManager, FederationManagerConfig } from './manager';
