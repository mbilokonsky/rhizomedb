/**
 * Schema Resolver
 *
 * Resolves HyperViews of schema definitions (stored as deltas) back into
 * executable HyperSchema objects.
 *
 * Extracted from schemas-as-deltas.test.ts into a reusable library module.
 */

import {
  Delta,
  HyperSchema,
  HyperView,
  SelectionFunction,
  TransformationRules
} from '../core/types';
import { selectByTargetContext } from './hyperview';
import { isDomainNodeReference } from '../core/validation';

/**
 * Built-in selection pattern registry.
 * Maps pattern IDs to selection functions.
 */
const BUILT_IN_SELECTORS: Record<string, SelectionFunction> = {
  select_by_target_context: selectByTargetContext
};

/**
 * Create the meta-schema that queries schemas.
 *
 * This is the bootstrap schema - it's hardcoded and not itself represented as deltas.
 * It allows us to query schema-deltas to get schema-HyperViews.
 */
export function createMetaHyperSchema(): HyperSchema {
  return {
    id: 'meta_hyperschema',
    name: 'MetaHyperSchema',
    select: selectByTargetContext,
    transform: {}
  };
}

/**
 * Resolve a HyperView of a schema into an executable HyperSchema.
 *
 * Converts: HyperView (deltas organized by property) -> HyperSchema (executable object)
 *
 * @param hyperView - A HyperView of a schema entity (produced by applying the meta-schema)
 * @returns An executable HyperSchema object
 */
export function resolveHyperSchemaFromDeltas(hyperView: HyperView): HyperSchema {
  const schemaId = hyperView.id;

  const name = extractName(hyperView);
  const select = resolveSelectionFunction(hyperView);
  const transform = resolveTransformationRules(hyperView);

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
    return hyperView.id;
  }

  const nameDelta = nameDeltas[0];
  const namePointer = nameDelta.pointers.find(p => p.role === 'name');

  return (namePointer?.target as string) || hyperView.id;
}

/**
 * Resolve selection function from HyperView
 */
function resolveSelectionFunction(hyperView: HyperView): SelectionFunction {
  const selectDeltas = hyperView.select as Delta[] | undefined;
  if (!selectDeltas || selectDeltas.length === 0) {
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

  // Default
  return selectByTargetContext;
}

/**
 * Build transformation rules from HyperView
 */
function resolveTransformationRules(hyperView: HyperView): TransformationRules {
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
