/**
 * Rhia's HyperSchemas - Formal schema definitions for entity types
 *
 * These schemas define how to construct HyperViews from deltas,
 * following the spec §5 algorithm.
 */

import { Delta, HyperSchema } from '../../src/core/types';
import {
  SchemaRegistry,
  createStandardSchema,
  selectByTargetContext
} from '../../src/schemas/hyperview';

// =============================================================================
// Schema Registry
// =============================================================================

export const rhiaSchemaRegistry = new SchemaRegistry();

// =============================================================================
// Entity HyperSchemas
// =============================================================================

/**
 * Concept HyperSchema
 *
 * Selects deltas that target a concept entity, organizing by context:
 * - type: entity type assertion
 * - name: concept name
 * - description: concept description
 * - questions: related questions (relationship)
 * - decisions: related decisions (relationship)
 * - observations: related observations (relationship)
 * - connections: connections to other concepts
 *
 * Note: We don't expand nested references to avoid cycles. Related entities
 * are queried separately when needed.
 */
export const ConceptHyperSchema: HyperSchema = createStandardSchema(
  'rhia:concept',
  'Concept',
  {}  // Don't expand nested references - query them separately to avoid cycles
);

/**
 * Question HyperSchema
 *
 * Selects deltas targeting a question entity:
 * - type: entity type
 * - text: question text
 * - status: open/resolved/dissolved
 * - context: why the question arose
 * - answer: the answer (if resolved)
 * - concepts: related concepts (not expanded to avoid cycles)
 */
export const QuestionHyperSchema: HyperSchema = createStandardSchema(
  'rhia:question',
  'Question',
  {}  // Don't expand concept references - would cause cycles
);

/**
 * Decision HyperSchema
 *
 * Selects deltas targeting a decision entity:
 * - type: entity type
 * - summary: what was decided
 * - rationale: why it was decided
 * - concepts: related concepts (not expanded to avoid cycles)
 * - resolves: question this resolves (optional)
 * - supersedes: decision this supersedes (optional)
 */
export const DecisionHyperSchema: HyperSchema = createStandardSchema(
  'rhia:decision',
  'Decision',
  {}  // Don't expand references - would cause cycles
);

/**
 * Observation HyperSchema
 *
 * Selects deltas targeting an observation entity:
 * - type: entity type
 * - content: what was observed
 * - significance: minor/notable/pivotal
 * - concepts: related concepts (not expanded to avoid cycles)
 */
export const ObservationHyperSchema: HyperSchema = createStandardSchema(
  'rhia:observation',
  'Observation',
  {}  // Don't expand concept references - would cause cycles
);

// =============================================================================
// Register all schemas
// =============================================================================

rhiaSchemaRegistry.register(ConceptHyperSchema);
rhiaSchemaRegistry.register(QuestionHyperSchema);
rhiaSchemaRegistry.register(DecisionHyperSchema);
rhiaSchemaRegistry.register(ObservationHyperSchema);

// =============================================================================
// Type-specific selection functions
// =============================================================================

/**
 * Find all entity IDs of a specific type by scanning for type assertions
 */
export function selectEntitiesByType(
  deltas: Delta[],
  entityType: string
): string[] {
  const entityIds = new Set<string>();

  for (const delta of deltas) {
    // Look for type assertion pattern: typed/type with target = entityType
    const typePointer = delta.pointers.find(
      (p) => p.role === 'type' && p.target === entityType
    );

    if (typePointer) {
      // Find the typed pointer that tells us which entity this types
      const typedPointer = delta.pointers.find((p) => p.role === 'typed');
      if (
        typedPointer &&
        typeof typedPointer.target === 'object' &&
        'id' in typedPointer.target
      ) {
        entityIds.add(typedPointer.target.id);
      }
    }
  }

  return [...entityIds];
}
