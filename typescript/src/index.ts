/**
 * RhizomeDB - A rhizomatic database using immutable delta-CRDTs
 *
 * @packageDocumentation
 */

// ============================================================================
// Core - Foundational types and validation
// ============================================================================
export * from './core/types';
export * from './core/validation';

// ============================================================================
// Storage - Storage implementations and indexing
// ============================================================================
export { RhizomeDB } from './storage/instance';
export { LevelDBStore } from './storage/leveldb-store';
export * from './storage/delta-indexes';

// ============================================================================
// Schemas - Schema functionality
// ============================================================================
export * from './schemas/hyperview';
export * from './schemas/schema-validator';
export * from './schemas/schema-versioning';

// ============================================================================
// Queries - Query and view resolution
// ============================================================================
export * from './queries/view-resolver';
export * from './queries/time-travel';
export * from './queries/negation';

// ============================================================================
// Streaming - Subscription and backpressure
// ============================================================================
export * from './streaming/subscription-backpressure';

// ============================================================================
// Integrations - External API integrations
// ============================================================================
export * from './integrations/graphql';

// ============================================================================
// Default export
// ============================================================================
export { RhizomeDB as default } from './storage/instance';
