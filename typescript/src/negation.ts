/**
 * Delta negation utilities
 *
 * Implements delta negation semantics including double negation support.
 * Per RhizomeDB Specification:
 * - Negation is itself a delta and can be negated (double negation)
 * - Negation is time-sensitive: queries at timestamp < negation.timestamp see the original
 * - Atomic negation: cannot negate individual pointers, only entire deltas
 */

import { Delta } from './types';
import { isDomainNodeReference } from './validation';

/**
 * Represents the negation state of a delta
 */
export interface NegationState {
  /** The delta ID */
  deltaId: string;

  /** Is this delta negated (and not double-negated)? */
  isNegated: boolean;

  /** Timestamp of the negation (if negated) */
  negationTimestamp?: number;

  /** ID of the delta that negated this one */
  negatedBy?: string;

  /** Was this delta's negation itself negated? */
  wasDoubleNegated: boolean;
}

/**
 * Calculate negation states for all deltas
 *
 * This implements the full negation semantics including double negation.
 * A delta is considered negated if:
 * 1. There exists a negation delta pointing to it
 * 2. That negation delta is not itself negated (double negation check)
 *
 * @param deltas - All deltas to analyze
 * @param asOfTimestamp - Optional timestamp for time-travel queries
 * @returns Map from delta ID to negation state
 */
export function calculateNegationStates(
  deltas: Delta[],
  asOfTimestamp?: number
): Map<string, NegationState> {
  const states = new Map<string, NegationState>();

  // Initialize all deltas as not negated
  for (const delta of deltas) {
    states.set(delta.id, {
      deltaId: delta.id,
      isNegated: false,
      wasDoubleNegated: false
    });
  }

  // Build negation relationships: Map from target ID to negating delta IDs
  const negations = new Map<string, Delta[]>();

  for (const delta of deltas) {
    // Skip deltas that are in the future for time-travel queries
    if (asOfTimestamp !== undefined && delta.timestamp > asOfTimestamp) {
      continue;
    }

    for (const pointer of delta.pointers) {
      if (pointer.localContext === 'negates' && isDomainNodeReference(pointer.target)) {
        const targetId = pointer.target.id;
        if (!negations.has(targetId)) {
          negations.set(targetId, []);
        }
        negations.get(targetId)!.push(delta);
      }
    }
  }

  // Process negations iteratively to handle chains
  // We need to handle cases like: A negated by B, B negated by C, C negated by D, etc.
  let changed = true;
  let iterations = 0;
  const maxIterations = 100; // Prevent infinite loops

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const [targetId, negatingDeltas] of negations.entries()) {
      const state = states.get(targetId);
      if (!state) continue;

      // Find the most recent negation that is not itself negated
      let effectiveNegation: Delta | null = null;

      for (const negDelta of negatingDeltas) {
        const negState = states.get(negDelta.id);
        if (!negState || negState.isNegated) {
          // This negation is itself negated, skip it
          continue;
        }

        // This is an un-negated negation
        if (!effectiveNegation || negDelta.timestamp > effectiveNegation.timestamp) {
          effectiveNegation = negDelta;
        }
      }

      // Update state
      const wasNegated = state.isNegated;

      if (effectiveNegation) {
        state.isNegated = true;
        state.negationTimestamp = effectiveNegation.timestamp;
        state.negatedBy = effectiveNegation.id;

        // Check if this was previously negated but is now double-negated
        if (wasNegated && !state.wasDoubleNegated) {
          // Count total negations
          const unnegatedNegations = negatingDeltas.filter(d => {
            const s = states.get(d.id);
            return s && !s.isNegated;
          });

          if (unnegatedNegations.length % 2 === 0) {
            // Even number of negations = double negated (not negated)
            state.isNegated = false;
            state.wasDoubleNegated = true;
            changed = true;
          }
        }
      } else {
        // No effective negation
        state.isNegated = false;
        if (wasNegated) {
          state.wasDoubleNegated = true;
          changed = true;
        }
      }

      if (wasNegated !== state.isNegated) {
        changed = true;
      }
    }
  }

  return states;
}

/**
 * Get the set of delta IDs that are effectively negated
 *
 * This is a convenience function for filtering queries.
 *
 * @param deltas - All deltas to analyze
 * @param asOfTimestamp - Optional timestamp for time-travel queries
 * @returns Set of delta IDs that are negated
 */
export function getNegatedDeltaIds(deltas: Delta[], asOfTimestamp?: number): Set<string> {
  const states = calculateNegationStates(deltas, asOfTimestamp);
  const negatedIds = new Set<string>();

  for (const [id, state] of states.entries()) {
    if (state.isNegated) {
      negatedIds.add(id);
    }
  }

  return negatedIds;
}

/**
 * Check if a delta is effectively negated
 *
 * @param deltaId - The delta to check
 * @param deltas - All deltas to consider
 * @param asOfTimestamp - Optional timestamp for time-travel queries
 * @returns true if the delta is negated
 */
export function isNegated(deltaId: string, deltas: Delta[], asOfTimestamp?: number): boolean {
  const states = calculateNegationStates(deltas, asOfTimestamp);
  return states.get(deltaId)?.isNegated ?? false;
}
