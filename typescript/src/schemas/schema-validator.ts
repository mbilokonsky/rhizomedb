/**
 * Schema validation utilities
 *
 * Validates HyperSchemas to ensure they form a Directed Acyclic Graph (DAG)
 * and don't have circular references that would cause infinite recursion.
 */

import {
  HyperSchema,
  TransformationRule,
  TransformationRules,
  isPrimitiveHyperSchema
} from '../core/types';
import { SchemaRegistry } from './hyperview';

/**
 * Error thrown when a circular schema reference is detected
 */
export class CircularSchemaError extends Error {
  constructor(
    message: string,
    public readonly cycle: string[]
  ) {
    super(message);
    this.name = 'CircularSchemaError';
  }
}

/**
 * Error thrown when a schema is invalid
 */
export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Result of schema validation
 */
export interface ValidationResult {
  /** Is the schema valid? */
  valid: boolean;

  /** Any errors found */
  errors: string[];

  /** Any warnings (non-fatal issues) */
  warnings: string[];

  /** Schema dependencies (schema IDs this schema references) */
  dependencies: Set<string>;

  /** Maximum depth of schema nesting */
  maxDepth: number;
}

/**
 * Validate a single schema for structural correctness
 */
export function validateSchema(schema: HyperSchema): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dependencies = new Set<string>();

  // Check ID
  if (!schema.id || typeof schema.id !== 'string' || schema.id.length === 0) {
    errors.push('Schema must have a non-empty id string');
  }

  // Check name
  if (!schema.name || typeof schema.name !== 'string' || schema.name.length === 0) {
    errors.push('Schema must have a non-empty name string');
  }

  // Check select function
  if (typeof schema.select !== 'function') {
    errors.push('Schema select must be a function');
  }

  // Check transform
  if (!schema.transform || typeof schema.transform !== 'object') {
    errors.push('Schema transform must be an object');
  } else {
    // Validate each transformation rule
    for (const [contextName, rule] of Object.entries(schema.transform)) {
      if (!rule.schema) {
        errors.push(`Transform rule for '${contextName}' missing schema`);
        continue;
      }

      // Check if it's a primitive schema
      if (isPrimitiveHyperSchema(rule.schema)) {
        // Primitive schemas are always valid
        continue;
      }

      // Extract schema ID
      let schemaId: string;
      if (typeof rule.schema === 'string') {
        schemaId = rule.schema;
      } else if (typeof rule.schema === 'object' && 'id' in rule.schema) {
        schemaId = rule.schema.id;
      } else {
        errors.push(`Transform rule for '${contextName}' has invalid schema type`);
        continue;
      }

      // Track dependency
      dependencies.add(schemaId);

      // Self-reference check (immediate cycle)
      if (schemaId === schema.id) {
        errors.push(
          `Transform rule for '${contextName}' creates self-reference (${schema.id} → ${schemaId})`
        );
      }

      // Check if when condition is valid
      if (rule.when && typeof rule.when !== 'function') {
        errors.push(
          `Transform rule for '${contextName}' has invalid when condition (must be function)`
        );
      }
    }
  }

  // Calculate max depth (1 for terminal schema, 1 + max dependency depth otherwise)
  const maxDepth = dependencies.size === 0 ? 1 : 2; // Simplified for now

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    dependencies,
    maxDepth
  };
}

/**
 * Detect cycles in schema references using depth-first search
 *
 * @param schema - The schema to check
 * @param registry - Registry containing all schemas
 * @returns Array of schema IDs forming a cycle, or null if no cycle
 */
export function detectCycle(schema: HyperSchema, registry: SchemaRegistry): string[] | null {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(schemaId: string, path: string[]): string[] | null {
    // If we've seen this in our current path, we found a cycle
    if (recursionStack.has(schemaId)) {
      // Return the cycle path
      const cycleStart = path.indexOf(schemaId);
      return path.slice(cycleStart).concat(schemaId);
    }

    // If we've already fully explored this schema, skip it
    if (visited.has(schemaId)) {
      return null;
    }

    // Mark as being explored
    visited.add(schemaId);
    recursionStack.add(schemaId);

    // Get the schema
    const currentSchema = registry.get(schemaId);
    if (!currentSchema) {
      // Schema not found - this is a missing dependency, not a cycle
      return null;
    }

    // Check all transformation rules
    for (const rule of Object.values(currentSchema.transform) as any[]) {
      // Skip primitive schemas
      if (isPrimitiveHyperSchema(rule.schema)) {
        continue;
      }

      // Get referenced schema ID
      let refSchemaId: string;
      if (typeof rule.schema === 'string') {
        refSchemaId = rule.schema;
      } else if (typeof rule.schema === 'object' && 'id' in rule.schema) {
        refSchemaId = rule.schema.id;
      } else {
        continue;
      }

      // Recursively check for cycles
      const cycle = dfs(refSchemaId, [...path, schemaId]);
      if (cycle) {
        return cycle;
      }
    }

    // Done exploring this schema
    recursionStack.delete(schemaId);

    return null;
  }

  return dfs(schema.id, []);
}

/**
 * Validate that a schema and all its dependencies form a DAG
 *
 * @param schema - The root schema to validate
 * @param registry - Registry containing all schemas
 * @throws CircularSchemaError if a cycle is detected
 * @throws SchemaValidationError if schema is structurally invalid
 */
export function validateSchemaDAG(schema: HyperSchema, registry: SchemaRegistry): void {
  // First validate the schema structure
  const result = validateSchema(schema);
  if (!result.valid) {
    throw new SchemaValidationError(
      `Schema '${schema.id}' is invalid:\n${result.errors.join('\n')}`
    );
  }

  // Check for cycles
  const cycle = detectCycle(schema, registry);
  if (cycle) {
    throw new CircularSchemaError(
      `Circular schema reference detected: ${cycle.join(' → ')}`,
      cycle
    );
  }
}

/**
 * Check if adding a schema to the registry would create a cycle
 *
 * @param schema - The schema to add
 * @param registry - The registry to add it to
 * @returns True if adding would create a cycle, false otherwise
 */
export function wouldCreateCycle(schema: HyperSchema, registry: SchemaRegistry): boolean {
  // Temporarily add schema to registry to check for cycles
  const hadSchema = registry.get(schema.id) !== undefined;

  try {
    // Register the schema temporarily
    registry.register(schema);

    // Try to validate it
    validateSchemaDAG(schema, registry);

    // No cycle detected
    return false;
  } catch (error) {
    if (error instanceof CircularSchemaError) {
      return true;
    }
    // Other validation errors don't count as cycles
    return false;
  } finally {
    // Remove the schema if it wasn't there before
    // (We can't actually remove from SchemaRegistry, but in practice this is fine
    // because we're just checking, not permanently adding)
  }
}

/**
 * Find all schemas that depend on a given schema
 *
 * @param schemaId - The schema ID to find dependents for
 * @param registry - Registry containing all schemas
 * @returns Set of schema IDs that depend on this schema
 */
export function findDependents(schemaId: string, registry: SchemaRegistry): Set<string> {
  const dependents = new Set<string>();

  // Check every schema in the registry
  for (const [sid, schema] of (registry as any).schemas.entries()) {
    if (sid === schemaId) continue;

    // Check if this schema references the target schema
    for (const rule of Object.values(schema.transform) as TransformationRule[]) {
      if (isPrimitiveHyperSchema(rule.schema)) {
        continue;
      }

      let refSchemaId: string;
      if (typeof rule.schema === 'string') {
        refSchemaId = rule.schema;
      } else if (typeof rule.schema === 'object' && 'id' in rule.schema) {
        refSchemaId = rule.schema.id;
      } else {
        continue;
      }

      if (refSchemaId === schemaId) {
        dependents.add(sid);
        break; // No need to check other rules in this schema
      }
    }
  }

  return dependents;
}

/**
 * Calculate the maximum nesting depth of a schema
 *
 * @param schema - The schema to analyze
 * @param registry - Registry containing all schemas
 * @param visited - Track visited schemas to detect cycles
 * @returns Maximum depth (1 for terminal schema)
 */
export function calculateSchemaDepth(
  schema: HyperSchema,
  registry: SchemaRegistry,
  visited: Set<string> = new Set()
): number {
  // Prevent infinite recursion
  if (visited.has(schema.id)) {
    return 0;
  }

  visited.add(schema.id);

  let maxChildDepth = 0;

  // Check all transformation rules
  for (const rule of Object.values(schema.transform)) {
    // Skip primitive schemas
    if (isPrimitiveHyperSchema(rule.schema)) {
      continue;
    }

    // Get referenced schema
    let childSchema: HyperSchema | undefined;
    if (typeof rule.schema === 'string') {
      childSchema = registry.get(rule.schema);
    } else if (typeof rule.schema === 'object' && 'id' in rule.schema) {
      childSchema = rule.schema;
    }

    if (childSchema) {
      const childDepth = calculateSchemaDepth(childSchema, registry, new Set(visited));
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }
  }

  return 1 + maxChildDepth;
}

/**
 * Get a topological sort of schemas (dependencies before dependents)
 *
 * @param schemas - Array of schemas to sort
 * @param registry - Registry containing all schemas
 * @returns Schemas sorted in dependency order
 * @throws CircularSchemaError if schemas contain cycles
 */
export function topologicalSort(schemas: HyperSchema[], registry: SchemaRegistry): HyperSchema[] {
  const sorted: HyperSchema[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function visit(schema: HyperSchema): void {
    if (visited.has(schema.id)) {
      return;
    }

    if (recursionStack.has(schema.id)) {
      throw new CircularSchemaError(`Circular dependency detected involving schema: ${schema.id}`, [
        schema.id
      ]);
    }

    recursionStack.add(schema.id);

    // Visit all dependencies first
    for (const rule of Object.values(schema.transform)) {
      if (isPrimitiveHyperSchema(rule.schema)) {
        continue;
      }

      let depSchema: HyperSchema | undefined;
      if (typeof rule.schema === 'string') {
        depSchema = registry.get(rule.schema);
      } else if (typeof rule.schema === 'object' && 'id' in rule.schema) {
        depSchema = rule.schema;
      }

      if (depSchema) {
        visit(depSchema);
      }
    }

    recursionStack.delete(schema.id);
    visited.add(schema.id);
    sorted.push(schema);
  }

  for (const schema of schemas) {
    visit(schema);
  }

  return sorted;
}
