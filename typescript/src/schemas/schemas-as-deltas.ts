/**
 * Production implementation for representing HyperSchemas as deltas
 *
 * This module enables schemas to be stored as data (deltas) rather than code,
 * allowing for dynamic schema evolution, versioning, and provenance tracking.
 */

import {
  Delta,
  HyperSchema,
  HyperView,
  SelectionFunction,
  TransformationRules,
  TransformationRule
} from '../core/types';
import { selectByTargetContext } from './hyperview';
import { isDomainNodeReference } from '../core/validation';
import type { RhizomeDB } from '../storage/instance';

/**
 * Built-in selection pattern registry
 *
 * Maps selection pattern IDs to actual selection functions.
 * New patterns can be registered at runtime.
 */
export const BUILT_IN_SELECTORS: Record<string, SelectionFunction> = {
  select_by_target_context: selectByTargetContext
};

/**
 * Register a new selection pattern
 *
 * @param patternId - Unique identifier for this pattern
 * @param selector - The selection function to register
 */
export function registerSelectionPattern(patternId: string, selector: SelectionFunction): void {
  BUILT_IN_SELECTORS[patternId] = selector;
}

/**
 * The Meta-Schema - Bootstrap schema for querying schema-defining deltas
 *
 * This is the one hardcoded schema that isn't stored as deltas.
 * It allows us to query schema deltas to construct HyperViews of schemas.
 */
export function createMetaHyperSchema(): HyperSchema {
  return {
    id: 'meta_hyperschema',
    name: 'MetaHyperSchema',
    select: selectByTargetContext,
    transform: {} // Terminal - schemas don't nest within meta-schema view
  };
}

/**
 * Resolve a HyperView of a schema into an executable HyperSchema
 *
 * This is the key function that converts schema-as-data (HyperView)
 * into schema-as-code (HyperSchema with executable functions).
 *
 * @param hyperView - HyperView of a schema (from applying meta-schema to schema deltas)
 * @param db - RhizomeDB instance (needed to resolve schema references)
 * @returns Executable HyperSchema
 */
export function resolveHyperSchemaView(hyperView: HyperView, db: RhizomeDB): HyperSchema {
  const schemaId = hyperView.id;

  // Extract name
  const name = extractName(hyperView);

  // Resolve selection function
  const select = resolveSelectionFunction(hyperView);

  // Build transformation rules
  const transform = resolveTransformationRules(hyperView, db);

  return {
    id: schemaId,
    name,
    select,
    transform
  };
}

/**
 * Extract schema name from HyperView
 */
function extractName(hyperView: HyperView): string {
  const nameDeltas = hyperView.name as Delta[] | undefined;
  if (!nameDeltas || nameDeltas.length === 0) {
    return hyperView.id; // Fallback to ID if no name
  }

  const nameDelta = nameDeltas[0]; // Take most recent (or use conflict resolution)
  const namePointer = nameDelta.pointers.find(p => p.role === 'name');

  return (namePointer?.target as string) || hyperView.id;
}

/**
 * Resolve selection function from HyperView
 */
function resolveSelectionFunction(hyperView: HyperView): SelectionFunction {
  const selectDeltas = hyperView.select as Delta[] | undefined;
  if (!selectDeltas || selectDeltas.length === 0) {
    // Default to select_by_target_context if not specified
    return selectByTargetContext;
  }

  const selectDelta = selectDeltas[0];

  // Look for pattern reference (built-in selector)
  const patternPointer = selectDelta.pointers.find(p => p.role === 'pattern');
  if (patternPointer && isDomainNodeReference(patternPointer.target)) {
    const patternId = patternPointer.target.id;
    const builtIn = BUILT_IN_SELECTORS[patternId];
    if (builtIn) {
      return builtIn;
    }
  }

  // Look for custom logic (e.g., JSONLogic - future enhancement)
  const logicPointer = selectDelta.pointers.find(p => p.role === 'logic');
  if (logicPointer && typeof logicPointer.target === 'string') {
    // TODO: Parse JSONLogic and create selection function
    // For now, fallback to default
    return selectByTargetContext;
  }

  // Default
  return selectByTargetContext;
}

/**
 * Build transformation rules from HyperView
 */
function resolveTransformationRules(hyperView: HyperView, db: RhizomeDB): TransformationRules {
  const transformDeltas = hyperView.transform as Delta[] | undefined;
  if (!transformDeltas || transformDeltas.length === 0) {
    return {};
  }

  const rules: TransformationRules = {};

  for (const delta of transformDeltas) {
    // Check if this is a JSON-encoded rules object (from terminal schema)
    const rulesPointer = delta.pointers.find(p => p.role === 'rules');
    if (rulesPointer && typeof rulesPointer.target === 'string') {
      try {
        const parsedRules = JSON.parse(rulesPointer.target) as TransformationRules;
        Object.assign(rules, parsedRules);
        continue;
      } catch {
        // Not valid JSON, skip
        continue;
      }
    }

    // Otherwise, extract individual transformation rule
    const onContextPointer = delta.pointers.find(p => p.role === 'on-context');
    const applySchemaPointer = delta.pointers.find(p => p.role === 'apply-schema');

    if (onContextPointer && applySchemaPointer) {
      const contextName = onContextPointer.target as string;

      if (isDomainNodeReference(applySchemaPointer.target)) {
        rules[contextName] = {
          schema: applySchemaPointer.target.id,
          when: pointer => isDomainNodeReference(pointer.target)
        };
      }
    }
  }

  return rules;
}

/**
 * Helper: Create a simple named entity schema as deltas
 *
 * @param db - RhizomeDB instance
 * @param schemaId - Unique ID for this schema
 * @param schemaName - Human-readable name
 */
export async function createTerminalSchemaAsDeltas(
  db: RhizomeDB,
  schemaId: string,
  schemaName: string
): Promise<void> {
  // Schema name
  await db.persistDelta(
    db.createDelta('system', [
      { role: 'schema', target: { id: schemaId, context: 'name' } },
      { role: 'name', target: schemaName }
    ])
  );

  // Selection pattern (use built-in)
  await db.persistDelta(
    db.createDelta('system', [
      { role: 'schema', target: { id: schemaId, context: 'select' } },
      { role: 'pattern', target: { id: 'select_by_target_context' } }
    ])
  );

  // No transformation rules (terminal schema)
  await db.persistDelta(
    db.createDelta('system', [
      { role: 'schema', target: { id: schemaId, context: 'transform' } },
      { role: 'rules', target: '{}' }
    ])
  );
}

/**
 * Helper: Add a transformation rule to an existing schema
 *
 * @param db - RhizomeDB instance
 * @param schemaId - ID of schema to modify
 * @param contextName - Property name this rule applies to
 * @param targetSchemaId - Schema to apply to nested objects
 */
export async function addTransformationRule(
  db: RhizomeDB,
  schemaId: string,
  contextName: string,
  targetSchemaId: string
): Promise<Delta> {
  const delta = db.createDelta('system', [
    { role: 'schema', target: { id: schemaId, context: 'transform' } },
    { role: 'on-context', target: contextName },
    { role: 'apply-schema', target: { id: targetSchemaId } }
  ]);

  await db.persistDelta(delta);
  return delta;
}

/**
 * Helper: Query all registered schemas
 *
 * @param db - RhizomeDB instance
 * @returns Array of schema IDs
 */
export function getAllSchemaIds(db: RhizomeDB): string[] {
  const schemaDeltas = db.queryDeltas({
    filter: delta =>
      delta.pointers.some(
        p => p.role === 'schema' && isDomainNodeReference(p.target)
      )
  });

  const schemaIds = new Set<string>();
  for (const delta of schemaDeltas) {
    const schemaPointer = delta.pointers.find(
      p => p.role === 'schema' && isDomainNodeReference(p.target)
    );
    if (schemaPointer && isDomainNodeReference(schemaPointer.target)) {
      schemaIds.add(schemaPointer.target.id);
    }
  }

  return Array.from(schemaIds);
}
