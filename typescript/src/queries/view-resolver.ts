/**
 * View Resolution System
 * Based on RhizomeDB Specification §6
 *
 * Converts HyperViews (deltas organized by property) into Views (resolved domain objects)
 * by applying conflict resolution strategies.
 */

/* eslint-disable @typescript-eslint/restrict-template-expressions */

import {
  Delta,
  HyperView,
  View,
  ViewSchema,
  PropertyResolution,
  ResolutionStrategy,
  Pointer
} from '../core/types';
import { isDomainNodeReference } from '../core/validation';

// ============================================================================
// Resolution Strategies
// ============================================================================

/**
 * Take the most recent delta (highest timestamp)
 */
export const mostRecent: ResolutionStrategy = (deltas: Delta[]) => {
  if (deltas.length === 0) return null;
  return deltas.sort((a, b) => b.timestamp - a.timestamp)[0];
};

/**
 * Take the first write (lowest timestamp)
 */
export const firstWrite: ResolutionStrategy = (deltas: Delta[]) => {
  if (deltas.length === 0) return null;
  return deltas.sort((a, b) => a.timestamp - b.timestamp)[0];
};

/**
 * Return all values as an array
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
export const allValues: ResolutionStrategy = (deltas: Delta[]) => {
  return deltas;
};

/**
 * Create a trusted author strategy that prefers specific authors
 *
 * @param trustedAuthors - List of author IDs to trust, in priority order
 * @returns Resolution strategy that picks from trusted authors or falls back to most recent
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function trustedAuthor(trustedAuthors: string[]): ResolutionStrategy {
  return (deltas: Delta[]) => {
    if (deltas.length === 0) return null;

    // Try to find delta from trusted authors in priority order
    for (const author of trustedAuthors) {
      const trusted = deltas.find(d => d.author === author);
      if (trusted) return trusted;
    }

    // Fallback to most recent if no trusted author found
    return mostRecent(deltas);
  };
}

/**
 * Take majority value (most common assertion)
 * Useful for consensus-based resolution
 */
export const consensus: ResolutionStrategy = (deltas: Delta[]) => {
  if (deltas.length === 0) return null;

  // Extract values and count occurrences
  const valueCounts = new Map<string, { delta: Delta; count: number }>();

  for (const delta of deltas) {
    // Serialize delta to string for comparison (naive but works)
    const key = JSON.stringify(delta.pointers);
    const existing = valueCounts.get(key);

    if (existing) {
      existing.count++;
    } else {
      valueCounts.set(key, { delta, count: 1 });
    }
  }

  // Find the value with highest count
  let maxCount = 0;
  let majorityDelta: Delta | null = null;

  for (const { delta, count } of valueCounts.values()) {
    if (count > maxCount) {
      maxCount = count;
      majorityDelta = delta;
    }
  }

  return majorityDelta;
};

/**
 * For numeric values, compute average
 */
export const average: ResolutionStrategy = (deltas: Delta[]) => {
  if (deltas.length === 0) return null;

  // Extract numeric values
  const values: number[] = [];

  for (const delta of deltas) {
    for (const pointer of delta.pointers) {
      if (typeof pointer.target === 'number') {
        values.push(pointer.target);
      }
    }
  }

  if (values.length === 0) return null;

  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
};

/**
 * For numeric values, take minimum
 */
export const minimum: ResolutionStrategy = (deltas: Delta[]) => {
  if (deltas.length === 0) return null;

  let min: number | null = null;

  for (const delta of deltas) {
    for (const pointer of delta.pointers) {
      if (typeof pointer.target === 'number') {
        if (min === null || pointer.target < min) {
          min = pointer.target;
        }
      }
    }
  }

  return min;
};

/**
 * For numeric values, take maximum
 */
export const maximum: ResolutionStrategy = (deltas: Delta[]) => {
  if (deltas.length === 0) return null;

  let max: number | null = null;

  for (const delta of deltas) {
    for (const pointer of delta.pointers) {
      if (typeof pointer.target === 'number') {
        if (max === null || pointer.target > max) {
          max = pointer.target;
        }
      }
    }
  }

  return max;
};

/**
 * Prefer deltas from specific systems
 */
export function trustedSystem(trustedSystems: string[]): ResolutionStrategy {
  return (deltas: Delta[]) => {
    if (deltas.length === 0) return null;

    // Try to find delta from trusted systems in priority order
    for (const system of trustedSystems) {
      const trusted = deltas.find(d => d.system === system);
      if (trusted) return trusted;
    }

    // Fallback to most recent
    return mostRecent(deltas);
  };
}

// ============================================================================
// Value Extraction Helpers
// ============================================================================

/**
 * Extract a primitive value from a delta by localContext
 *
 * @param localContext - The localContext to search for
 * @returns Extraction function that finds the pointer and returns its target
 */
export function extractPrimitive(localContext: string): (delta: Delta) => any {
  return (delta: Delta) => {
    const pointer = delta.pointers.find(p => p.localContext === localContext);
    return pointer?.target;
  };
}

/**
 * Extract a domain object reference from a delta by localContext
 */
export function extractReference(localContext: string): (delta: Delta) => any {
  return (delta: Delta) => {
    const pointer = delta.pointers.find(p => p.localContext === localContext);
    if (!pointer) return null;

    if (isDomainNodeReference(pointer.target)) {
      return pointer.target;
    }

    // If target is a nested HyperView (from transformation), return it
    if (typeof pointer.target === 'object' && 'id' in pointer.target) {
      return pointer.target;
    }

    return null;
  };
}

/**
 * Extract all values with a specific localContext as an array
 */
export function extractArray(localContext: string): (delta: Delta) => any[] {
  return (delta: Delta) => {
    return delta.pointers.filter(p => p.localContext === localContext).map(p => p.target);
  };
}

/**
 * Extract nested HyperView from transformed pointer
 */
export function extractNestedView(localContext: string): (delta: Delta) => any {
  return (delta: Delta) => {
    const pointer = delta.pointers.find(p => p.localContext === localContext);
    if (!pointer) return null;

    // If target is a HyperView (has properties beyond just 'id')
    if (typeof pointer.target === 'object' && 'id' in pointer.target) {
      return pointer.target;
    }

    return null;
  };
}

// ============================================================================
// ViewResolver Class
// ============================================================================

/**
 * ViewResolver converts HyperViews into Views by applying conflict resolution
 */
export class ViewResolver {
  /**
   * Resolve a HyperView into a View using a ViewSchema
   *
   * @param hyperView - The HyperView to resolve
   * @param schema - The ViewSchema defining how to resolve
   * @returns Resolved View
   */
  resolveView(hyperView: HyperView, schema: ViewSchema): View {
    const view: View = { id: hyperView.id };

    for (const [property, config] of Object.entries(schema.properties)) {
      const deltas = hyperView[config.source] as Delta[] | undefined;

      if (!deltas || deltas.length === 0) {
        continue;
      }

      // Apply resolution strategy
      const resolved = config.resolve(deltas);

      if (resolved !== null && resolved !== undefined) {
        // Extract value from resolved delta(s)
        if (Array.isArray(resolved)) {
          // allValues strategy returns array of deltas
          view[property] = resolved.map(config.extract);
        } else if (typeof resolved === 'object' && 'id' in resolved) {
          // Single delta
          view[property] = config.extract(resolved as Delta);
        } else {
          // Already a raw value (from aggregation strategies like average)
          view[property] = resolved;
        }
      }
    }

    return view;
  }

  /**
   * Convenience method: resolve nested HyperViews recursively
   *
   * This walks through a HyperView and resolves any nested HyperViews found
   * in transformed pointers.
   */
  resolveViewRecursive(hyperView: HyperView, schema: ViewSchema): View {
    const view = this.resolveView(hyperView, schema);

    // Recursively resolve any nested HyperViews
    for (const key in view) {
      if (key === 'id') continue;

      const value = view[key];

      // Check if value is a nested HyperView (has 'id' property and other delta properties)
      if (this.isHyperView(value)) {
        // Would need the schema for the nested view - skip for now
        // In practice, GraphQL resolver handles this at query time
      } else if (Array.isArray(value)) {
        // Check array elements
        view[key] = value.map(item => {
          if (this.isHyperView(item)) {
            return item; // Would resolve recursively with appropriate schema
          }
          return item;
        });
      }
    }

    return view;
  }

  /**
   * Check if an object looks like a HyperView
   */
  private isHyperView(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      'id' in obj &&
      typeof obj.id === 'string' &&
      Object.keys(obj).length > 1
    );
  }
}

// ============================================================================
// Helper Functions for Creating ViewSchemas
// ============================================================================

/**
 * Create a simple ViewSchema for an object with primitive fields
 *
 * Example:
 *   createSimpleViewSchema({
 *     name: { source: 'name', localContext: 'name', strategy: mostRecent },
 *     age: { source: 'age', localContext: 'age', strategy: mostRecent }
 *   })
 */
export function createSimpleViewSchema(
  fields: Record<string, { source: string; localContext: string; strategy: ResolutionStrategy }>
): ViewSchema {
  const properties: ViewSchema['properties'] = {};

  for (const [fieldName, config] of Object.entries(fields)) {
    properties[fieldName] = {
      source: config.source,
      extract: extractPrimitive(config.localContext),
      resolve: config.strategy
    };
  }

  return { properties };
}

/**
 * Create a ViewSchema for an object with reference fields
 */
export function createViewSchemaWithReferences(
  primitiveFields: Record<
    string,
    { source: string; localContext: string; strategy: ResolutionStrategy }
  >,
  referenceFields: Record<
    string,
    { source: string; localContext: string; strategy: ResolutionStrategy }
  >
): ViewSchema {
  const properties: ViewSchema['properties'] = {};

  // Add primitive fields
  for (const [fieldName, config] of Object.entries(primitiveFields)) {
    properties[fieldName] = {
      source: config.source,
      extract: extractPrimitive(config.localContext),
      resolve: config.strategy
    };
  }

  // Add reference fields
  for (const [fieldName, config] of Object.entries(referenceFields)) {
    properties[fieldName] = {
      source: config.source,
      extract: extractNestedView(config.localContext),
      resolve: config.strategy
    };
  }

  return { properties };
}

// ============================================================================
// Export default resolver instance
// ============================================================================

export const defaultResolver = new ViewResolver();
