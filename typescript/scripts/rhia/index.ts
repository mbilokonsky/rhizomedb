/**
 * Rhia - Rhizomatic Historian & Archivist
 *
 * Rhia is a project historian who tracks the intellectual evolution of
 * RhizomeDB using RhizomeDB itself. She documents concepts, questions,
 * decisions, observations, and the connections between them.
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
