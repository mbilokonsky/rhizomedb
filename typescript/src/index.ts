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

// Export instance implementation
export { RhizomeDB } from './instance';

// Re-export for convenience
export { RhizomeDB as default } from './instance';
