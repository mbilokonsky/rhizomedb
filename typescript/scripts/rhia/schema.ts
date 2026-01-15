/**
 * Rhia's Schema - Entity definitions and delta creation functions
 *
 * Rhia (Rhizomatic Historian & Archivist) tracks the intellectual history
 * of RhizomeDB's development using RhizomeDB itself.
 *
 * Architecture:
 * - Entities (domain objects) have stable IDs and are query subjects
 * - Deltas annotate and relate entities but are not themselves query subjects
 * - This maintains a clean two-level model: entities + deltas
 *
 * Entity Types:
 * - concept: A named idea or topic being tracked
 * - question: An open question about the project
 * - decision: A decision that was made
 * - observation: A notable observation about patterns/evolution
 */

import { LevelDBStore } from '../../src/storage/leveldb-store';
import { Delta } from '../../src/core/types';

// Rhia's author ID
export const RHIA_AUTHOR = 'rhia';

// Entity type prefixes
export const EntityType = {
  CONCEPT: 'concept',
  QUESTION: 'question',
  DECISION: 'decision',
  OBSERVATION: 'observation'
} as const;

type EntityTypeValue = (typeof EntityType)[keyof typeof EntityType];

/**
 * Generate a new entity ID
 */
export function generateEntityId(type: EntityTypeValue): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// =============================================================================
// CONCEPT - A named idea or topic being tracked
// =============================================================================

/**
 * Create a new concept entity
 *
 * Creates an entity with:
 * - type: 'concept'
 * - name: the concept name
 * - description: what this concept is about
 */
export async function createConcept(
  db: LevelDBStore,
  name: string,
  description: string
): Promise<string> {
  const conceptId = generateEntityId(EntityType.CONCEPT);

  // Type assertion
  const typeDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'typed', target: { id: conceptId, context: 'type' } },
    { role: 'type', target: 'concept' }
  ]);

  // Name annotation
  const nameDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'named', target: { id: conceptId, context: 'name' } },
    { role: 'name', target: name }
  ]);

  // Description annotation
  const descDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'described', target: { id: conceptId, context: 'description' } },
    { role: 'description', target: description }
  ]);

  await db.persistDelta(typeDelta);
  await db.persistDelta(nameDelta);
  await db.persistDelta(descDelta);

  return conceptId;
}

/**
 * Update a concept's description
 */
export async function updateConceptDescription(
  db: LevelDBStore,
  conceptId: string,
  description: string
): Promise<string> {
  const delta = db.createDelta(RHIA_AUTHOR, [
    { role: 'described', target: { id: conceptId, context: 'description' } },
    { role: 'description', target: description }
  ]);

  await db.persistDelta(delta);
  return delta.id;
}

// =============================================================================
// QUESTION - An open question about the project
// =============================================================================

/**
 * Create a new question entity
 *
 * Creates an entity with:
 * - type: 'question'
 * - text: the question being asked
 * - status: 'open' (initial state)
 * - Relationship to concept(s) it relates to
 */
export async function createQuestion(
  db: LevelDBStore,
  text: string,
  conceptIds: string[],
  context?: string
): Promise<string> {
  const questionId = generateEntityId(EntityType.QUESTION);

  // Type assertion
  const typeDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'typed', target: { id: questionId, context: 'type' } },
    { role: 'type', target: 'question' }
  ]);

  // Question text
  const textDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'asked', target: { id: questionId, context: 'text' } },
    { role: 'text', target: text }
  ]);

  // Status (starts as open)
  const statusDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'statused', target: { id: questionId, context: 'status' } },
    { role: 'status', target: 'open' }
  ]);

  await db.persistDelta(typeDelta);
  await db.persistDelta(textDelta);
  await db.persistDelta(statusDelta);

  // Optional context for why this question came up
  if (context) {
    const contextDelta = db.createDelta(RHIA_AUTHOR, [
      { role: 'contextualized', target: { id: questionId, context: 'context' } },
      { role: 'context', target: context }
    ]);
    await db.persistDelta(contextDelta);
  }

  // Relate to concepts (relationship pattern)
  for (const conceptId of conceptIds) {
    const relationDelta = db.createDelta(RHIA_AUTHOR, [
      { role: 'question', target: { id: questionId, context: 'concepts' } },
      { role: 'concept', target: { id: conceptId, context: 'questions' } }
    ]);
    await db.persistDelta(relationDelta);
  }

  return questionId;
}

/**
 * Answer a question (adds answer to the question entity)
 */
export async function answerQuestion(
  db: LevelDBStore,
  questionId: string,
  answer: string,
  source?: string
): Promise<string> {
  const pointers: Delta['pointers'] = [
    { role: 'answered', target: { id: questionId, context: 'answer' } },
    { role: 'answer', target: answer }
  ];

  if (source) {
    pointers.push({ role: 'source', target: source });
  }

  const answerDelta = db.createDelta(RHIA_AUTHOR, pointers);

  // Update status to resolved
  const statusDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'statused', target: { id: questionId, context: 'status' } },
    { role: 'status', target: 'resolved' }
  ]);

  await db.persistDelta(answerDelta);
  await db.persistDelta(statusDelta);

  return answerDelta.id;
}

/**
 * Mark a question as dissolved (no longer relevant)
 */
export async function dissolveQuestion(
  db: LevelDBStore,
  questionId: string,
  reason: string
): Promise<string> {
  const statusDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'statused', target: { id: questionId, context: 'status' } },
    { role: 'status', target: 'dissolved' }
  ]);

  const reasonDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'explained', target: { id: questionId, context: 'dissolution_reason' } },
    { role: 'reason', target: reason }
  ]);

  await db.persistDelta(statusDelta);
  await db.persistDelta(reasonDelta);

  return statusDelta.id;
}

// =============================================================================
// DECISION - A decision that was made
// =============================================================================

/**
 * Create a new decision entity
 *
 * Creates an entity with:
 * - type: 'decision'
 * - summary: what was decided
 * - rationale: why it was decided
 * - Relationship to concept(s) it relates to
 * - Optional: resolves a question, supersedes another decision
 */
export async function createDecision(
  db: LevelDBStore,
  summary: string,
  rationale: string,
  conceptIds: string[],
  options?: {
    resolvesQuestionId?: string;
    supersedesDecisionId?: string;
  }
): Promise<string> {
  const decisionId = generateEntityId(EntityType.DECISION);

  // Type assertion
  const typeDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'typed', target: { id: decisionId, context: 'type' } },
    { role: 'type', target: 'decision' }
  ]);

  // Summary
  const summaryDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'summarized', target: { id: decisionId, context: 'summary' } },
    { role: 'summary', target: summary }
  ]);

  // Rationale
  const rationaleDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'explained', target: { id: decisionId, context: 'rationale' } },
    { role: 'rationale', target: rationale }
  ]);

  await db.persistDelta(typeDelta);
  await db.persistDelta(summaryDelta);
  await db.persistDelta(rationaleDelta);

  // Relate to concepts
  for (const conceptId of conceptIds) {
    const relationDelta = db.createDelta(RHIA_AUTHOR, [
      { role: 'decision', target: { id: decisionId, context: 'concepts' } },
      { role: 'concept', target: { id: conceptId, context: 'decisions' } }
    ]);
    await db.persistDelta(relationDelta);
  }

  // Optional: resolves a question
  if (options?.resolvesQuestionId) {
    const resolvesDelta = db.createDelta(RHIA_AUTHOR, [
      { role: 'resolver', target: { id: decisionId, context: 'resolves' } },
      { role: 'resolved', target: { id: options.resolvesQuestionId, context: 'resolved_by' } }
    ]);
    await db.persistDelta(resolvesDelta);

    // Also update the question's status
    await answerQuestion(
      db,
      options.resolvesQuestionId,
      `Resolved by decision: ${summary}`,
      decisionId
    );
  }

  // Optional: supersedes another decision
  if (options?.supersedesDecisionId) {
    const supersedesDelta = db.createDelta(RHIA_AUTHOR, [
      { role: 'successor', target: { id: decisionId, context: 'supersedes' } },
      { role: 'superseded', target: { id: options.supersedesDecisionId, context: 'superseded_by' } }
    ]);
    await db.persistDelta(supersedesDelta);
  }

  return decisionId;
}

// =============================================================================
// OBSERVATION - A notable observation about patterns/evolution
// =============================================================================

/**
 * Create a new observation entity
 *
 * Creates an entity with:
 * - type: 'observation'
 * - content: what was observed
 * - significance: how important this observation is
 * - Relationship to concept(s) it relates to
 */
export async function createObservation(
  db: LevelDBStore,
  content: string,
  conceptIds: string[],
  significance: 'minor' | 'notable' | 'pivotal' = 'notable'
): Promise<string> {
  const observationId = generateEntityId(EntityType.OBSERVATION);

  // Type assertion
  const typeDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'typed', target: { id: observationId, context: 'type' } },
    { role: 'type', target: 'observation' }
  ]);

  // Content
  const contentDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'observed', target: { id: observationId, context: 'content' } },
    { role: 'content', target: content }
  ]);

  // Significance
  const sigDelta = db.createDelta(RHIA_AUTHOR, [
    { role: 'rated', target: { id: observationId, context: 'significance' } },
    { role: 'significance', target: significance }
  ]);

  await db.persistDelta(typeDelta);
  await db.persistDelta(contentDelta);
  await db.persistDelta(sigDelta);

  // Relate to concepts
  for (const conceptId of conceptIds) {
    const relationDelta = db.createDelta(RHIA_AUTHOR, [
      { role: 'observation', target: { id: observationId, context: 'concepts' } },
      { role: 'concept', target: { id: conceptId, context: 'observations' } }
    ]);
    await db.persistDelta(relationDelta);
  }

  return observationId;
}

// =============================================================================
// CONNECTIONS - Relate concepts to each other
// =============================================================================

/**
 * Connect two concepts with a typed relationship
 *
 * Unlike other entities, connections don't need their own ID since the
 * relationship is fully expressed in a single delta. The delta ID serves
 * as the connection ID if needed.
 */
export async function connectConcepts(
  db: LevelDBStore,
  conceptA: string,
  conceptB: string,
  nature: 'supports' | 'tensions_with' | 'evolves_from' | 'depends_on',
  note?: string
): Promise<string> {
  const pointers: Delta['pointers'] = [
    { role: 'concept', target: { id: conceptA, context: 'connections' } },
    { role: 'concept', target: { id: conceptB, context: 'connections' } },
    { role: 'nature', target: nature }
  ];

  if (note) {
    pointers.push({ role: 'note', target: note });
  }

  const delta = db.createDelta(RHIA_AUTHOR, pointers);
  await db.persistDelta(delta);

  return delta.id;
}
