/**
 * Shared delta filter matching logic
 *
 * Extracted from subscription implementations so it can be reused
 * in federation push/pull filter matching.
 */

import { Delta, DeltaFilter } from './types';
import { isDomainNodeReference, isReference } from './validation';

/**
 * Check if a delta matches a DeltaFilter.
 *
 * This is a pure function that tests a single delta against filter criteria.
 * It does NOT handle negation filtering (that requires access to the full delta set).
 */
export function deltaMatchesFilter(delta: Delta, filter: DeltaFilter): boolean {
  if (filter.ids && !filter.ids.includes(delta.id)) {
    return false;
  }

  if (filter.authors && !filter.authors.includes(delta.author)) {
    return false;
  }

  if (filter.systems && !filter.systems.includes(delta.system)) {
    return false;
  }

  if (filter.timestampRange) {
    const { start, end } = filter.timestampRange;
    if (start !== undefined && delta.timestamp < start) {
      return false;
    }
    if (end !== undefined && delta.timestamp > end) {
      return false;
    }
  }

  if (filter.targetIds) {
    const hasMatchingTarget = delta.pointers.some(
      (p) => isDomainNodeReference(p.target) && filter.targetIds!.includes(p.target.id)
    );
    if (!hasMatchingTarget) {
      return false;
    }
  }

  if (filter.targetContexts) {
    const hasMatchingContext = delta.pointers.some(
      (p) =>
        isReference(p.target) &&
        p.target.context &&
        filter.targetContexts!.includes(p.target.context)
    );
    if (!hasMatchingContext) {
      return false;
    }
  }

  if (filter.predicate && !filter.predicate(delta)) {
    return false;
  }

  return true;
}
