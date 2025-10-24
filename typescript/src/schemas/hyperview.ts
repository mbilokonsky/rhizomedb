/**
 * HyperView construction algorithm
 * Based on RhizomeDB Specification §5
 */

import {
  Delta,
  HyperSchema,
  HyperView,
  Pointer,
  DomainNodeReference,
  isPrimitiveHyperSchema
} from '../core/types';
import { isDomainNodeReference } from '../core/validation';

/**
 * Schema registry for lazy resolution of schema references
 */
export class SchemaRegistry {
  private schemas: Map<string, HyperSchema> = new Map();
  private validateOnRegister: boolean;

  constructor(options?: { validateOnRegister?: boolean }) {
    this.validateOnRegister = options?.validateOnRegister ?? false;
  }

  /**
   * Register a schema
   *
   * @param schema - The schema to register
   * @param options - Registration options
   * @throws CircularSchemaError if validation is enabled and schema creates a cycle
   */
  register(schema: HyperSchema, options?: { skipValidation?: boolean }): void {
    const skipValidation = options?.skipValidation ?? !this.validateOnRegister;

    if (!skipValidation) {
      // Import here to avoid circular dependency
      const { validateSchemaDAG } = require('./schema-validator');
      validateSchemaDAG(schema, this);
    }

    this.schemas.set(schema.id, schema);
  }

  /**
   * Get a schema by ID
   */
  get(id: string): HyperSchema | undefined {
    return this.schemas.get(id);
  }

  /**
   * Resolve a schema reference (either HyperSchema or string ID)
   */
  resolve(schemaOrId: HyperSchema | string): HyperSchema {
    if (typeof schemaOrId === 'string') {
      const schema = this.get(schemaOrId);
      if (!schema) {
        throw new Error(`Schema not found: ${schemaOrId}`);
      }
      return schema;
    }
    return schemaOrId;
  }

  /**
   * Enable or disable validation on registration
   */
  setValidation(enabled: boolean): void {
    this.validateOnRegister = enabled;
  }
}

/**
 * Find all negation deltas in a set of deltas
 *
 * @param allDeltas - All deltas to search
 * @param queryTimestamp - Only consider negations at or before this timestamp
 * @returns Set of delta IDs that have been negated
 */
export function findNegations(allDeltas: Delta[], queryTimestamp: number): Set<string> {
  const negations = new Set<string>();

  for (const delta of allDeltas) {
    // Skip deltas created after query timestamp
    if (delta.timestamp > queryTimestamp) {
      continue;
    }

    // Look for negation pointers
    for (const pointer of delta.pointers) {
      if (pointer.localContext === 'negates' && isDomainNodeReference(pointer.target)) {
        negations.add(pointer.target.id);
      }
    }
  }

  return negations;
}

/**
 * Construct a HyperView from deltas
 *
 * Based on the algorithm in §5.2 of the specification.
 *
 * @param objectId - The domain object ID to construct a view for
 * @param schema - The HyperSchema defining how to construct the view
 * @param allDeltas - All available deltas
 * @param schemaRegistry - Registry for resolving schema references
 * @param queryTimestamp - Timestamp for time-travel queries (defaults to now)
 * @returns The constructed HyperView
 */
export function constructHyperView(
  objectId: string,
  schema: HyperSchema,
  allDeltas: Delta[],
  schemaRegistry: SchemaRegistry,
  queryTimestamp: number = Date.now()
): HyperView {
  // Step 1: Find negation deltas
  const negations = findNegations(allDeltas, queryTimestamp);

  // Step 2: Select relevant deltas and organize by property
  const hyperView: HyperView = { id: objectId };

  for (const delta of allDeltas) {
    // Skip negated deltas
    if (negations.has(delta.id)) {
      continue;
    }

    // Skip deltas created after query timestamp (for time-travel)
    if (delta.timestamp > queryTimestamp) {
      continue;
    }

    // Apply selection function
    const result = schema.select(objectId, delta);
    if (result === false) {
      continue;
    }

    // Determine which properties to add this delta to
    const properties = result === true ? ['_default'] : result;

    // Step 3: Transform pointers according to transformation rules
    const transformedDelta: Delta = {
      ...delta,
      pointers: delta.pointers.map(pointer => {
        const rule = schema.transform[pointer.localContext];

        // No transformation rule, or rule doesn't apply
        if (!rule || (rule.when && !rule.when(pointer, delta))) {
          return pointer;
        }

        // Don't transform primitives
        if (!isDomainNodeReference(pointer.target)) {
          return pointer;
        }

        // Don't transform if the schema is a PrimitiveHyperSchema (primitives don't nest)
        if (typeof rule.schema !== 'string' && isPrimitiveHyperSchema(rule.schema)) {
          return pointer;
        }

        // Don't transform if target is the same as current object (avoid infinite recursion)
        if (pointer.target.id === objectId) {
          return pointer;
        }

        // Recursively construct nested HyperView
        const nestedSchema = schemaRegistry.resolve(rule.schema);
        const nestedHyperView = constructHyperView(
          pointer.target.id,
          nestedSchema,
          allDeltas,
          schemaRegistry,
          queryTimestamp
        );

        // Replace target with HyperView
        return {
          ...pointer,
          target: nestedHyperView as any // Type system limitation - target becomes HyperView
        };
      })
    };

    // Step 4: Add transformed delta to appropriate properties
    for (const property of properties) {
      if (!hyperView[property]) {
        hyperView[property] = [];
      }
      (hyperView[property] as Delta[]).push(transformedDelta);
    }
  }

  return hyperView;
}

/**
 * Create a simple selection function that selects by targetContext
 *
 * This is the most common pattern - include deltas that target this object
 * and organize them by their targetContext.
 */
export function selectByTargetContext(objectId: string, delta: Delta): boolean | string[] {
  const properties: string[] = [];

  for (const pointer of delta.pointers) {
    if (
      isDomainNodeReference(pointer.target) &&
      pointer.target.id === objectId &&
      pointer.targetContext
    ) {
      properties.push(pointer.targetContext);
    }
  }

  return properties.length > 0 ? properties : false;
}

/**
 * Create a HyperSchema using the standard selectByTargetContext pattern
 *
 * @param id - Schema ID
 * @param name - Schema name
 * @param transform - Transformation rules (optional)
 * @returns A HyperSchema
 */
export function createStandardSchema(
  id: string,
  name: string,
  transform: HyperSchema['transform'] = {}
): HyperSchema {
  return {
    id,
    name,
    select: selectByTargetContext,
    transform
  };
}
