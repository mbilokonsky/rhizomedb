/**
 * Trust Policy Implementation
 *
 * Provides delta verification based on trust policies (spec §8.2).
 */

import { Delta } from '../core/types';
import { TrustPolicy } from './types';

/**
 * Verify a delta against a trust policy
 *
 * @param delta The delta to verify
 * @param policy The trust policy to apply
 * @returns Promise resolving to true if delta is trusted, false otherwise
 */
export async function verifyDelta(
  delta: Delta,
  policy?: TrustPolicy
): Promise<boolean> {
  // No policy means trust everything
  if (!policy) {
    return true;
  }

  // Check trusted authors
  if (policy.trustedAuthors && policy.trustedAuthors.length > 0) {
    if (!policy.trustedAuthors.includes(delta.author)) {
      return false;
    }
  }

  // Check trusted systems
  if (policy.trustedSystems && policy.trustedSystems.length > 0) {
    if (!policy.trustedSystems.includes(delta.system)) {
      return false;
    }
  }

  // Apply custom verification function
  if (policy.verify) {
    const result = await policy.verify(delta);
    if (!result) {
      return false;
    }
  }

  return true;
}

/**
 * Create a permissive trust policy that accepts all deltas
 */
export function createPermissiveTrustPolicy(): TrustPolicy {
  return {};
}

/**
 * Create a restrictive trust policy that only accepts deltas from specific authors
 */
export function createAuthorTrustPolicy(trustedAuthors: string[]): TrustPolicy {
  return { trustedAuthors };
}

/**
 * Create a restrictive trust policy that only accepts deltas from specific systems
 */
export function createSystemTrustPolicy(trustedSystems: string[]): TrustPolicy {
  return { trustedSystems };
}

/**
 * Create a trust policy with custom verification logic
 */
export function createCustomTrustPolicy(
  verify: (delta: Delta) => boolean | Promise<boolean>
): TrustPolicy {
  return { verify };
}

/**
 * Combine multiple trust policies (delta must pass ALL policies)
 */
export function combineTrustPolicies(...policies: TrustPolicy[]): TrustPolicy {
  return {
    verify: async (delta: Delta) => {
      for (const policy of policies) {
        const trusted = await verifyDelta(delta, policy);
        if (!trusted) {
          return false;
        }
      }
      return true;
    }
  };
}
