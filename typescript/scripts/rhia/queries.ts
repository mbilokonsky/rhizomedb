/**
 * Rhia's Query Functions - Using formal HyperView/View system
 *
 * These functions query the rhizome using the spec-compliant HyperView
 * construction (§5) and View resolution (§6) algorithms.
 */

import { LevelDBStore } from '../../src/storage/leveldb-store';
import { Delta, HyperView, View } from '../../src/core/types';
import { constructHyperView } from '../../src/schemas/hyperview';
import { ViewResolver, mostRecent, allValues } from '../../src/queries/view-resolver';

import {
  rhiaSchemaRegistry,
  ConceptHyperSchema,
  QuestionHyperSchema,
  DecisionHyperSchema,
  ObservationHyperSchema,
  MeetingHyperSchema,
  selectEntitiesByType
} from './hyperschemas';

import {
  ConceptViewSchema,
  QuestionViewSchema,
  DecisionViewSchema,
  ObservationViewSchema,
  MeetingViewSchema
} from './viewschemas';

// =============================================================================
// Types for query results (unchanged for backward compatibility)
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
  askedBy?: string;      // team member who asked
  answeredBy?: string;   // team member who answered
}

export interface DecisionSummary {
  id: string;
  summary: string;
  rationale: string;
  timestamp: number;
  supersedes?: string;
  resolves?: string;
  proposedBy?: string;   // team member who proposed
  decidedBy?: string;    // team member who made the decision
}

export interface ObservationSummary {
  id: string;
  content: string;
  significance: 'minor' | 'notable' | 'pivotal';
  timestamp: number;
  observedBy?: string;   // team member who made the observation
}

export interface MeetingSummary {
  id: string;
  title: string;
  date: string;
  summary?: string;
  facilitatedBy?: string;  // team member who ran the meeting
  participantIds: string[];
  decisionIds: string[];
  timestamp: number;
}

export interface ConnectionSummary {
  otherConceptId: string;
  otherConceptName?: string;
  nature: string;
  note?: string;
}

// =============================================================================
// Resolver instance
// =============================================================================

const resolver = new ViewResolver();

// =============================================================================
// Helper: Load all deltas from storage
// =============================================================================

async function loadAllDeltas(db: LevelDBStore): Promise<Delta[]> {
  const deltas: Delta[] = [];
  for await (const delta of db.scanDeltas()) {
    deltas.push(delta);
  }
  return deltas;
}

// =============================================================================
// Helper: Get related entity IDs from a HyperView property
// =============================================================================

function getRelatedIds(hyperView: HyperView, property: string, excludeId: string): string[] {
  const deltas = hyperView[property] as Delta[] | undefined;
  if (!deltas) return [];

  const ids = new Set<string>();
  for (const delta of deltas) {
    for (const pointer of delta.pointers) {
      if (
        typeof pointer.target === 'object' &&
        'id' in pointer.target &&
        pointer.target.id !== excludeId
      ) {
        ids.add(pointer.target.id);
      }
    }
  }
  return [...ids];
}

// =============================================================================
// Helper: Get timestamp from HyperView (earliest delta = creation time)
// =============================================================================

function getCreationTimestamp(hyperView: HyperView): number {
  let earliest = Date.now();
  for (const key of Object.keys(hyperView)) {
    if (key === 'id' || key === '_metadata') continue;
    const deltas = hyperView[key] as Delta[] | undefined;
    if (deltas) {
      for (const delta of deltas) {
        if (delta.timestamp < earliest) {
          earliest = delta.timestamp;
        }
      }
    }
  }
  return earliest;
}

// =============================================================================
// Query functions using HyperView/View system
// =============================================================================

/**
 * List all concepts using HyperView construction
 */
export async function listConcepts(db: LevelDBStore): Promise<Array<{ id: string; name: string }>> {
  const allDeltas = await loadAllDeltas(db);
  const conceptIds = selectEntitiesByType(allDeltas, 'concept');

  const concepts: Array<{ id: string; name: string }> = [];

  for (const conceptId of conceptIds) {
    const hyperView = constructHyperView(
      conceptId,
      ConceptHyperSchema,
      allDeltas,
      rhiaSchemaRegistry
    );

    const view = resolver.resolveView(hyperView, ConceptViewSchema);
    concepts.push({
      id: conceptId,
      name: (view.name as string) || conceptId
    });
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
  const exact = concepts.find((c) => c.name.toLowerCase() === lowerSearch);
  if (exact) return exact.id;

  // Partial match
  const partial = concepts.find((c) => c.name.toLowerCase().includes(lowerSearch));
  return partial?.id;
}

/**
 * Get full view of a concept with all related entities
 */
export async function getConceptView(
  db: LevelDBStore,
  conceptId: string
): Promise<ConceptView | null> {
  const allDeltas = await loadAllDeltas(db);

  // Construct HyperView for the concept
  const hyperView = constructHyperView(
    conceptId,
    ConceptHyperSchema,
    allDeltas,
    rhiaSchemaRegistry
  );

  // Check if we found any deltas for this concept
  const hasDeltas = Object.keys(hyperView).some(
    (k) => k !== 'id' && k !== '_metadata' && Array.isArray(hyperView[k]) && (hyperView[k] as Delta[]).length > 0
  );
  if (!hasDeltas) return null;

  // Resolve to View
  const view = resolver.resolveView(hyperView, ConceptViewSchema);

  // Get related entities
  const questionIds = getRelatedIds(hyperView, 'questions', conceptId);
  const decisionIds = getRelatedIds(hyperView, 'decisions', conceptId);
  const observationIds = getRelatedIds(hyperView, 'observations', conceptId);

  // Fetch related entity summaries
  const questions: QuestionSummary[] = [];
  for (const qId of questionIds) {
    const q = await getQuestionSummary(db, qId);
    if (q) questions.push(q);
  }

  const decisions: DecisionSummary[] = [];
  for (const dId of decisionIds) {
    const d = await getDecisionSummary(db, dId);
    if (d) decisions.push(d);
  }

  const observations: ObservationSummary[] = [];
  for (const oId of observationIds) {
    const o = await getObservationSummary(db, oId);
    if (o) observations.push(o);
  }

  // Get connections
  const connections = await getConceptConnections(db, conceptId);

  return {
    id: conceptId,
    name: (view.name as string) || conceptId,
    description: (view.description as string) || '',
    questions,
    decisions,
    observations,
    connections
  };
}

/**
 * Get summary of a question using HyperView/View
 */
export async function getQuestionSummary(
  db: LevelDBStore,
  questionId: string
): Promise<QuestionSummary | null> {
  const allDeltas = await loadAllDeltas(db);

  const hyperView = constructHyperView(
    questionId,
    QuestionHyperSchema,
    allDeltas,
    rhiaSchemaRegistry
  );

  const hasDeltas = Object.keys(hyperView).some(
    (k) => k !== 'id' && k !== '_metadata' && Array.isArray(hyperView[k]) && (hyperView[k] as Delta[]).length > 0
  );
  if (!hasDeltas) return null;

  const view = resolver.resolveView(hyperView, QuestionViewSchema);

  return {
    id: questionId,
    text: (view.text as string) || '',
    status: ((view.status as string) || 'open') as QuestionSummary['status'],
    answer: view.answer as string | undefined,
    context: view.context as string | undefined,
    askedBy: view.askedBy as string | undefined,
    answeredBy: view.answeredBy as string | undefined
  };
}

/**
 * Get summary of a decision using HyperView/View
 */
export async function getDecisionSummary(
  db: LevelDBStore,
  decisionId: string
): Promise<DecisionSummary | null> {
  const allDeltas = await loadAllDeltas(db);

  const hyperView = constructHyperView(
    decisionId,
    DecisionHyperSchema,
    allDeltas,
    rhiaSchemaRegistry
  );

  const hasDeltas = Object.keys(hyperView).some(
    (k) => k !== 'id' && k !== '_metadata' && Array.isArray(hyperView[k]) && (hyperView[k] as Delta[]).length > 0
  );
  if (!hasDeltas) return null;

  const view = resolver.resolveView(hyperView, DecisionViewSchema);
  const timestamp = getCreationTimestamp(hyperView);

  // Get relationship IDs
  const supersedes = getRelatedIds(hyperView, 'supersedes', decisionId)[0];
  const resolves = getRelatedIds(hyperView, 'resolves', decisionId)[0];

  return {
    id: decisionId,
    summary: (view.summary as string) || '',
    rationale: (view.rationale as string) || '',
    timestamp,
    supersedes,
    resolves,
    proposedBy: view.proposedBy as string | undefined,
    decidedBy: view.decidedBy as string | undefined
  };
}

/**
 * Get summary of an observation using HyperView/View
 */
export async function getObservationSummary(
  db: LevelDBStore,
  observationId: string
): Promise<ObservationSummary | null> {
  const allDeltas = await loadAllDeltas(db);

  const hyperView = constructHyperView(
    observationId,
    ObservationHyperSchema,
    allDeltas,
    rhiaSchemaRegistry
  );

  const hasDeltas = Object.keys(hyperView).some(
    (k) => k !== 'id' && k !== '_metadata' && Array.isArray(hyperView[k]) && (hyperView[k] as Delta[]).length > 0
  );
  if (!hasDeltas) return null;

  const view = resolver.resolveView(hyperView, ObservationViewSchema);
  const timestamp = getCreationTimestamp(hyperView);

  return {
    id: observationId,
    content: (view.content as string) || '',
    significance: ((view.significance as string) || 'notable') as ObservationSummary['significance'],
    timestamp,
    observedBy: view.observedBy as string | undefined
  };
}

/**
 * Get connections for a concept
 */
export async function getConceptConnections(
  db: LevelDBStore,
  conceptId: string
): Promise<ConnectionSummary[]> {
  const allDeltas = await loadAllDeltas(db);
  const connections: ConnectionSummary[] = [];

  // Build concept's HyperView to find connection deltas
  const hyperView = constructHyperView(
    conceptId,
    ConceptHyperSchema,
    allDeltas,
    rhiaSchemaRegistry
  );

  const connectionDeltas = hyperView['connections'] as Delta[] | undefined;
  if (!connectionDeltas) return [];

  for (const delta of connectionDeltas) {
    // Find nature and other concept
    const naturePointer = delta.pointers.find((p) => p.role === 'nature');
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

        // Get other concept's name via HyperView/View
        const otherHyperView = constructHyperView(
          otherConceptId,
          ConceptHyperSchema,
          allDeltas,
          rhiaSchemaRegistry
        );
        const otherView = resolver.resolveView(otherHyperView, ConceptViewSchema);
        const otherName = otherView.name as string | undefined;

        const notePointer = delta.pointers.find((p) => p.role === 'note');
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
  const allDeltas = await loadAllDeltas(db);
  const questionIds = selectEntitiesByType(allDeltas, 'question');

  const questions: QuestionSummary[] = [];

  for (const questionId of questionIds) {
    const q = await getQuestionSummary(db, questionId);
    if (q && q.status === 'open') {
      questions.push(q);
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
  const allDeltas = await loadAllDeltas(db);
  const decisionIds = selectEntitiesByType(allDeltas, 'decision');

  const decisions: DecisionSummary[] = [];

  for (const decisionId of decisionIds) {
    const d = await getDecisionSummary(db, decisionId);
    if (d) decisions.push(d);
  }

  // Sort by timestamp descending and limit
  return decisions.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
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
  const allDeltas = await loadAllDeltas(db);

  // Get all concepts and filter by name
  const allConcepts = await listConcepts(db);
  const concepts = allConcepts.filter((c) => c.name.toLowerCase().includes(lowerTerm));

  // Search questions
  const questionIds = selectEntitiesByType(allDeltas, 'question');
  const questions: QuestionSummary[] = [];
  for (const qId of questionIds) {
    const q = await getQuestionSummary(db, qId);
    if (q && (q.text.toLowerCase().includes(lowerTerm) || q.answer?.toLowerCase().includes(lowerTerm))) {
      questions.push(q);
    }
  }

  // Search decisions
  const decisionIds = selectEntitiesByType(allDeltas, 'decision');
  const decisions: DecisionSummary[] = [];
  for (const dId of decisionIds) {
    const d = await getDecisionSummary(db, dId);
    if (
      d &&
      (d.summary.toLowerCase().includes(lowerTerm) || d.rationale.toLowerCase().includes(lowerTerm))
    ) {
      decisions.push(d);
    }
  }

  // Search observations
  const observationIds = selectEntitiesByType(allDeltas, 'observation');
  const observations: ObservationSummary[] = [];
  for (const oId of observationIds) {
    const o = await getObservationSummary(db, oId);
    if (o && o.content.toLowerCase().includes(lowerTerm)) {
      observations.push(o);
    }
  }

  return { concepts, questions, decisions, observations };
}

// =============================================================================
// Advanced queries using time-travel
// =============================================================================

/**
 * Get concept view at a specific point in time
 */
export async function getConceptViewAtTime(
  db: LevelDBStore,
  conceptId: string,
  timestamp: number
): Promise<ConceptView | null> {
  const allDeltas = await loadAllDeltas(db);

  // Construct HyperView with time-travel
  const hyperView = constructHyperView(
    conceptId,
    ConceptHyperSchema,
    allDeltas,
    rhiaSchemaRegistry,
    timestamp // Time-travel query!
  );

  const hasDeltas = Object.keys(hyperView).some(
    (k) => k !== 'id' && k !== '_metadata' && Array.isArray(hyperView[k]) && (hyperView[k] as Delta[]).length > 0
  );
  if (!hasDeltas) return null;

  const view = resolver.resolveView(hyperView, ConceptViewSchema);

  // For time-travel, we'd need to also filter related entities by timestamp
  // For now, just return the basic concept view
  return {
    id: conceptId,
    name: (view.name as string) || conceptId,
    description: (view.description as string) || '',
    questions: [],
    decisions: [],
    observations: [],
    connections: []
  };
}

/**
 * Get the history of changes to a concept
 */
export async function getConceptHistory(
  db: LevelDBStore,
  conceptId: string
): Promise<Array<{ timestamp: number; property: string; value: string }>> {
  const allDeltas = await loadAllDeltas(db);

  const hyperView = constructHyperView(
    conceptId,
    ConceptHyperSchema,
    allDeltas,
    rhiaSchemaRegistry
  );

  const history: Array<{ timestamp: number; property: string; value: string }> = [];

  for (const [property, value] of Object.entries(hyperView)) {
    if (property === 'id' || property === '_metadata') continue;
    const deltas = value as Delta[];
    if (!Array.isArray(deltas)) continue;

    for (const delta of deltas) {
      // Extract the value from this delta
      for (const pointer of delta.pointers) {
        if (typeof pointer.target === 'string' || typeof pointer.target === 'number') {
          history.push({
            timestamp: delta.timestamp,
            property,
            value: String(pointer.target)
          });
        }
      }
    }
  }

  return history.sort((a, b) => a.timestamp - b.timestamp);
}

// =============================================================================
// Meeting queries
// =============================================================================

/**
 * Get summary of a meeting using HyperView/View
 */
export async function getMeetingSummary(
  db: LevelDBStore,
  meetingId: string
): Promise<MeetingSummary | null> {
  const allDeltas = await loadAllDeltas(db);

  const hyperView = constructHyperView(
    meetingId,
    MeetingHyperSchema,
    allDeltas,
    rhiaSchemaRegistry
  );

  const hasDeltas = Object.keys(hyperView).some(
    (k) => k !== 'id' && k !== '_metadata' && Array.isArray(hyperView[k]) && (hyperView[k] as Delta[]).length > 0
  );
  if (!hasDeltas) return null;

  const view = resolver.resolveView(hyperView, MeetingViewSchema);
  const timestamp = getCreationTimestamp(hyperView);

  // Get participant IDs
  const participantIds = getRelatedIds(hyperView, 'participants', meetingId);

  // Get decision IDs
  const decisionIds = getRelatedIds(hyperView, 'decisions', meetingId);

  return {
    id: meetingId,
    title: (view.title as string) || '',
    date: (view.date as string) || '',
    summary: view.summary as string | undefined,
    facilitatedBy: view.facilitatedBy as string | undefined,
    participantIds,
    decisionIds,
    timestamp
  };
}

/**
 * List all meetings
 */
export async function listMeetings(db: LevelDBStore): Promise<MeetingSummary[]> {
  const allDeltas = await loadAllDeltas(db);
  const meetingIds = selectEntitiesByType(allDeltas, 'meeting');

  const meetings: MeetingSummary[] = [];

  for (const meetingId of meetingIds) {
    const m = await getMeetingSummary(db, meetingId);
    if (m) meetings.push(m);
  }

  // Sort by date descending
  return meetings.sort((a, b) => {
    const dateA = new Date(a.date).getTime() || 0;
    const dateB = new Date(b.date).getTime() || 0;
    return dateB - dateA;
  });
}

/**
 * List recent meetings
 */
export async function listRecentMeetings(
  db: LevelDBStore,
  limit: number = 10
): Promise<MeetingSummary[]> {
  const meetings = await listMeetings(db);
  return meetings.slice(0, limit);
}

/**
 * Get meetings for a specific team member
 */
export async function getMeetingsForMember(
  db: LevelDBStore,
  memberId: string
): Promise<MeetingSummary[]> {
  const allMeetings = await listMeetings(db);
  return allMeetings.filter(
    (m) => m.participantIds.includes(memberId) || m.facilitatedBy === memberId
  );
}
