/**
 * Rhia's Query Functions - Retrieve and organize knowledge from the rhizome
 *
 * These functions query the rhizome for entities and their relationships,
 * returning structured views suitable for Rhia's responses.
 */

import { LevelDBStore } from '../../src/storage/leveldb-store';
import { Delta } from '../../src/core/types';
import { EntityType, RHIA_AUTHOR } from './schema';

// =============================================================================
// Types for query results
// =============================================================================

export interface ConceptView {
  id: string;
  name: string;
  description: string;
  questions: QuestionSummary[];
  decisions: DecisionSummary[];
  observations: ObservationSummary[];
  connections: ConnectionSummary[];
}

export interface QuestionSummary {
  id: string;
  text: string;
  status: 'open' | 'resolved' | 'dissolved';
  answer?: string;
  context?: string;
}

export interface DecisionSummary {
  id: string;
  summary: string;
  rationale: string;
  timestamp: number;
  supersedes?: string;
  resolves?: string;
}

export interface ObservationSummary {
  id: string;
  content: string;
  significance: 'minor' | 'notable' | 'pivotal';
  timestamp: number;
}

export interface ConnectionSummary {
  otherConceptId: string;
  otherConceptName?: string;
  nature: string;
  note?: string;
}

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Get all deltas targeting a specific entity
 */
async function getDeltasForEntity(db: LevelDBStore, entityId: string): Promise<Delta[]> {
  const deltas = await db.queryDeltas({
    targetIds: [entityId]
  });
  return deltas;
}

/**
 * Extract the latest primitive value for a given context from deltas
 */
function getLatestValue(deltas: Delta[], context: string): string | undefined {
  const relevant = deltas
    .filter(d => d.pointers.some(p =>
      typeof p.target === 'object' &&
      'context' in p.target &&
      p.target.context === context
    ))
    .sort((a, b) => b.timestamp - a.timestamp);

  if (relevant.length === 0) return undefined;

  // Find the primitive value in the delta (the non-reference pointer)
  for (const pointer of relevant[0].pointers) {
    if (typeof pointer.target === 'string' || typeof pointer.target === 'number') {
      return String(pointer.target);
    }
  }
  return undefined;
}

/**
 * Extract all values for a given context (for multi-valued properties)
 */
function getAllValues(deltas: Delta[], context: string): Array<{ value: string; timestamp: number }> {
  const results: Array<{ value: string; timestamp: number }> = [];

  for (const delta of deltas) {
    const hasContext = delta.pointers.some(p =>
      typeof p.target === 'object' &&
      'context' in p.target &&
      p.target.context === context
    );

    if (hasContext) {
      for (const pointer of delta.pointers) {
        if (typeof pointer.target === 'string') {
          results.push({ value: pointer.target, timestamp: delta.timestamp });
        }
      }
    }
  }

  return results.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Extract related entity IDs from relationship deltas
 */
function getRelatedEntityIds(deltas: Delta[], context: string, entityId: string): string[] {
  const ids: string[] = [];

  for (const delta of deltas) {
    const hasContext = delta.pointers.some(p =>
      typeof p.target === 'object' &&
      'context' in p.target &&
      p.target.context === context
    );

    if (hasContext) {
      for (const pointer of delta.pointers) {
        if (
          typeof pointer.target === 'object' &&
          'id' in pointer.target &&
          pointer.target.id !== entityId
        ) {
          ids.push(pointer.target.id);
        }
      }
    }
  }

  return [...new Set(ids)]; // Deduplicate
}

// =============================================================================
// Query functions
// =============================================================================

/**
 * List all concepts
 */
export async function listConcepts(db: LevelDBStore): Promise<Array<{ id: string; name: string }>> {
  const concepts: Array<{ id: string; name: string }> = [];
  const seenIds = new Set<string>();

  for await (const delta of db.scanDeltas()) {
    // Look for type='concept' deltas
    const typePointer = delta.pointers.find(p => p.role === 'type' && p.target === 'concept');
    if (typePointer) {
      const typedPointer = delta.pointers.find(p => p.role === 'typed');
      if (typedPointer && typeof typedPointer.target === 'object' && 'id' in typedPointer.target) {
        const conceptId = typedPointer.target.id;
        if (!seenIds.has(conceptId)) {
          seenIds.add(conceptId);
          // Get the name
          const conceptDeltas = await getDeltasForEntity(db, conceptId);
          const name = getLatestValue(conceptDeltas, 'name') || conceptId;
          concepts.push({ id: conceptId, name });
        }
      }
    }
  }

  return concepts;
}

/**
 * Get a concept by name (fuzzy match)
 */
export async function findConceptByName(
  db: LevelDBStore,
  searchName: string
): Promise<string | undefined> {
  const concepts = await listConcepts(db);
  const lowerSearch = searchName.toLowerCase();

  // Exact match first
  const exact = concepts.find(c => c.name.toLowerCase() === lowerSearch);
  if (exact) return exact.id;

  // Partial match
  const partial = concepts.find(c => c.name.toLowerCase().includes(lowerSearch));
  return partial?.id;
}

/**
 * Get full view of a concept with all related entities
 */
export async function getConceptView(db: LevelDBStore, conceptId: string): Promise<ConceptView | null> {
  const deltas = await getDeltasForEntity(db, conceptId);
  if (deltas.length === 0) return null;

  const name = getLatestValue(deltas, 'name') || conceptId;
  const description = getLatestValue(deltas, 'description') || '';

  // Get related questions
  const questionIds = getRelatedEntityIds(deltas, 'questions', conceptId);
  const questions: QuestionSummary[] = [];
  for (const qId of questionIds) {
    const q = await getQuestionSummary(db, qId);
    if (q) questions.push(q);
  }

  // Get related decisions
  const decisionIds = getRelatedEntityIds(deltas, 'decisions', conceptId);
  const decisions: DecisionSummary[] = [];
  for (const dId of decisionIds) {
    const d = await getDecisionSummary(db, dId);
    if (d) decisions.push(d);
  }

  // Get related observations
  const observationIds = getRelatedEntityIds(deltas, 'observations', conceptId);
  const observations: ObservationSummary[] = [];
  for (const oId of observationIds) {
    const o = await getObservationSummary(db, oId);
    if (o) observations.push(o);
  }

  // Get connections to other concepts
  const connections = await getConceptConnections(db, conceptId);

  return {
    id: conceptId,
    name,
    description,
    questions,
    decisions,
    observations,
    connections
  };
}

/**
 * Get summary of a question
 */
export async function getQuestionSummary(
  db: LevelDBStore,
  questionId: string
): Promise<QuestionSummary | null> {
  const deltas = await getDeltasForEntity(db, questionId);
  if (deltas.length === 0) return null;

  const text = getLatestValue(deltas, 'text') || '';
  const status = (getLatestValue(deltas, 'status') || 'open') as QuestionSummary['status'];
  const answer = getLatestValue(deltas, 'answer');
  const context = getLatestValue(deltas, 'context');

  return { id: questionId, text, status, answer, context };
}

/**
 * Get summary of a decision
 */
export async function getDecisionSummary(
  db: LevelDBStore,
  decisionId: string
): Promise<DecisionSummary | null> {
  const deltas = await getDeltasForEntity(db, decisionId);
  if (deltas.length === 0) return null;

  const summary = getLatestValue(deltas, 'summary') || '';
  const rationale = getLatestValue(deltas, 'rationale') || '';

  // Get timestamp from the earliest delta (creation time)
  const timestamp = Math.min(...deltas.map(d => d.timestamp));

  // Check for supersedes relationship
  const supersedes = getRelatedEntityIds(deltas, 'supersedes', decisionId)[0];
  const resolves = getRelatedEntityIds(deltas, 'resolves', decisionId)[0];

  return { id: decisionId, summary, rationale, timestamp, supersedes, resolves };
}

/**
 * Get summary of an observation
 */
export async function getObservationSummary(
  db: LevelDBStore,
  observationId: string
): Promise<ObservationSummary | null> {
  const deltas = await getDeltasForEntity(db, observationId);
  if (deltas.length === 0) return null;

  const content = getLatestValue(deltas, 'content') || '';
  const significance = (getLatestValue(deltas, 'significance') || 'notable') as ObservationSummary['significance'];
  const timestamp = Math.min(...deltas.map(d => d.timestamp));

  return { id: observationId, content, significance, timestamp };
}

/**
 * Get connections for a concept
 */
export async function getConceptConnections(
  db: LevelDBStore,
  conceptId: string
): Promise<ConnectionSummary[]> {
  const connections: ConnectionSummary[] = [];
  const deltas = await getDeltasForEntity(db, conceptId);

  for (const delta of deltas) {
    // Look for connection deltas (have 'nature' role)
    const naturePointer = delta.pointers.find(p => p.role === 'nature');
    if (!naturePointer || typeof naturePointer.target !== 'string') continue;

    // Find the other concept in this connection
    for (const pointer of delta.pointers) {
      if (
        pointer.role === 'concept' &&
        typeof pointer.target === 'object' &&
        'id' in pointer.target &&
        pointer.target.id !== conceptId
      ) {
        const otherConceptId = pointer.target.id;

        // Try to get the other concept's name
        const otherDeltas = await getDeltasForEntity(db, otherConceptId);
        const otherName = getLatestValue(otherDeltas, 'name');

        const notePointer = delta.pointers.find(p => p.role === 'note');
        const note = typeof notePointer?.target === 'string' ? notePointer.target : undefined;

        connections.push({
          otherConceptId,
          otherConceptName: otherName,
          nature: naturePointer.target,
          note
        });
      }
    }
  }

  return connections;
}

/**
 * List all open questions
 */
export async function listOpenQuestions(db: LevelDBStore): Promise<QuestionSummary[]> {
  const questions: QuestionSummary[] = [];
  const seenIds = new Set<string>();

  for await (const delta of db.scanDeltas()) {
    // Look for type='question' deltas
    const typePointer = delta.pointers.find(p => p.role === 'type' && p.target === 'question');
    if (typePointer) {
      const typedPointer = delta.pointers.find(p => p.role === 'typed');
      if (typedPointer && typeof typedPointer.target === 'object' && 'id' in typedPointer.target) {
        const questionId = typedPointer.target.id;
        if (!seenIds.has(questionId)) {
          seenIds.add(questionId);
          const q = await getQuestionSummary(db, questionId);
          if (q && q.status === 'open') {
            questions.push(q);
          }
        }
      }
    }
  }

  return questions;
}

/**
 * List recent decisions
 */
export async function listRecentDecisions(
  db: LevelDBStore,
  limit: number = 10
): Promise<DecisionSummary[]> {
  const decisions: DecisionSummary[] = [];
  const seenIds = new Set<string>();

  for await (const delta of db.scanDeltas()) {
    // Look for type='decision' deltas
    const typePointer = delta.pointers.find(p => p.role === 'type' && p.target === 'decision');
    if (typePointer) {
      const typedPointer = delta.pointers.find(p => p.role === 'typed');
      if (typedPointer && typeof typedPointer.target === 'object' && 'id' in typedPointer.target) {
        const decisionId = typedPointer.target.id;
        if (!seenIds.has(decisionId)) {
          seenIds.add(decisionId);
          const d = await getDecisionSummary(db, decisionId);
          if (d) decisions.push(d);
        }
      }
    }
  }

  // Sort by timestamp descending and limit
  return decisions
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Search across all entities for a term
 */
export async function search(
  db: LevelDBStore,
  term: string
): Promise<{
  concepts: Array<{ id: string; name: string }>;
  questions: QuestionSummary[];
  decisions: DecisionSummary[];
  observations: ObservationSummary[];
}> {
  const lowerTerm = term.toLowerCase();

  const allConcepts = await listConcepts(db);
  const concepts = allConcepts.filter(c => c.name.toLowerCase().includes(lowerTerm));

  const questions: QuestionSummary[] = [];
  const decisions: DecisionSummary[] = [];
  const observations: ObservationSummary[] = [];

  // Scan for matching questions, decisions, observations
  const seenIds = new Set<string>();

  for await (const delta of db.scanDeltas()) {
    // Check for text content matching the term
    for (const pointer of delta.pointers) {
      if (typeof pointer.target === 'string' && pointer.target.toLowerCase().includes(lowerTerm)) {
        // Find what entity this delta belongs to
        for (const p of delta.pointers) {
          if (typeof p.target === 'object' && 'id' in p.target) {
            const entityId = p.target.id;
            if (seenIds.has(entityId)) continue;
            seenIds.add(entityId);

            if (entityId.startsWith('question-')) {
              const q = await getQuestionSummary(db, entityId);
              if (q) questions.push(q);
            } else if (entityId.startsWith('decision-')) {
              const d = await getDecisionSummary(db, entityId);
              if (d) decisions.push(d);
            } else if (entityId.startsWith('observation-')) {
              const o = await getObservationSummary(db, entityId);
              if (o) observations.push(o);
            }
            break;
          }
        }
        break;
      }
    }
  }

  return { concepts, questions, decisions, observations };
}
