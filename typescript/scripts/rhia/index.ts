/**
 * Rhia - Rhizomatic Historian & Archivist
 *
 * Rhia is a project historian who tracks the intellectual evolution of
 * RhizomeDB using RhizomeDB itself. She documents concepts, questions,
 * decisions, observations, and the connections between them.
 *
 * Architecture:
 * - HyperSchemas (hyperschemas.ts): Define how to construct HyperViews from deltas
 * - ViewSchemas (viewschemas.ts): Define how to resolve HyperViews to Views
 * - Queries (queries.ts): Use the formal HyperView/View system for all queries
 * - Schema (schema.ts): Delta creation functions for entities
 *
 * @example
 * ```typescript
 * import { createConcept, createDecision, getConceptView } from './rhia';
 *
 * const conceptId = await createConcept(db, 'ordering', 'How sequences are handled');
 * await createDecision(db, 'Order is view-level', 'Data layer is parallel', [conceptId]);
 *
 * const view = await getConceptView(db, conceptId);
 * ```
 */

export * from './schema';
export * from './queries';
export * from './hyperschemas';
export * from './viewschemas';
