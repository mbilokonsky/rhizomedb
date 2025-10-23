/**
 * RhizomeDB - A rhizomatic database using immutable delta-CRDTs
 *
 * @packageDocumentation
 */

// Export all types
export * from './types';

// Export validation utilities
export * from './validation';

// Export HyperView construction
export * from './hyperview';

// Export View Resolution
export * from './view-resolver';

// Export Time-Travel Queries
export * from './time-travel';

// Export Schema Validation
export * from './schema-validator';

// Export Subscription Backpressure
export * from './subscription-backpressure';

// Export Delta Indexing
export * from './delta-indexes';

// Export instance implementation
export { RhizomeDB } from './instance';

// Re-export for convenience
export { RhizomeDB as default } from './instance';
