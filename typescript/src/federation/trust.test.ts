/**
 * Trust Policy Tests
 */

import { Delta } from '../core/types';
import {
  verifyDelta,
  createPermissiveTrustPolicy,
  createAuthorTrustPolicy,
  createSystemTrustPolicy,
  createCustomTrustPolicy,
  combineTrustPolicies
} from './trust';

function makeDelta(overrides: Partial<Delta> = {}): Delta {
  return {
    id: 'delta-1',
    timestamp: Date.now(),
    author: 'author-1',
    system: 'system-1',
    pointers: [{ role: 'test', target: 'value' }],
    ...overrides
  };
}

describe('Trust Policy: verifyDelta', () => {
  it('should trust all deltas when no policy is provided', async () => {
    const delta = makeDelta();
    expect(await verifyDelta(delta)).toBe(true);
    expect(await verifyDelta(delta, undefined)).toBe(true);
  });

  it('should trust all deltas with permissive policy', async () => {
    const policy = createPermissiveTrustPolicy();
    const delta = makeDelta();
    expect(await verifyDelta(delta, policy)).toBe(true);
  });
});

describe('Trust Policy: author-based', () => {
  it('should trust deltas from trusted authors', async () => {
    const policy = createAuthorTrustPolicy(['alice', 'bob']);
    expect(await verifyDelta(makeDelta({ author: 'alice' }), policy)).toBe(true);
    expect(await verifyDelta(makeDelta({ author: 'bob' }), policy)).toBe(true);
  });

  it('should reject deltas from untrusted authors', async () => {
    const policy = createAuthorTrustPolicy(['alice']);
    expect(await verifyDelta(makeDelta({ author: 'eve' }), policy)).toBe(false);
  });
});

describe('Trust Policy: system-based', () => {
  it('should trust deltas from trusted systems', async () => {
    const policy = createSystemTrustPolicy(['sys-a', 'sys-b']);
    expect(await verifyDelta(makeDelta({ system: 'sys-a' }), policy)).toBe(true);
  });

  it('should reject deltas from untrusted systems', async () => {
    const policy = createSystemTrustPolicy(['sys-a']);
    expect(await verifyDelta(makeDelta({ system: 'sys-unknown' }), policy)).toBe(false);
  });
});

describe('Trust Policy: custom', () => {
  it('should apply custom sync verification', async () => {
    const policy = createCustomTrustPolicy((delta) => delta.pointers.length > 0);
    expect(await verifyDelta(makeDelta({ pointers: [{ role: 'r', target: 'v' }] }), policy)).toBe(true);
    expect(await verifyDelta(makeDelta({ pointers: [] }), policy)).toBe(false);
  });

  it('should apply custom async verification', async () => {
    const policy = createCustomTrustPolicy(async (delta) => {
      return delta.author.startsWith('trusted-');
    });
    expect(await verifyDelta(makeDelta({ author: 'trusted-agent' }), policy)).toBe(true);
    expect(await verifyDelta(makeDelta({ author: 'untrusted' }), policy)).toBe(false);
  });
});

describe('Trust Policy: combined', () => {
  it('should require all policies to pass', async () => {
    const authorPolicy = createAuthorTrustPolicy(['alice']);
    const systemPolicy = createSystemTrustPolicy(['sys-a']);
    const combined = combineTrustPolicies(authorPolicy, systemPolicy);

    // Both match
    expect(await verifyDelta(makeDelta({ author: 'alice', system: 'sys-a' }), combined)).toBe(true);

    // Author matches, system doesn't
    expect(await verifyDelta(makeDelta({ author: 'alice', system: 'sys-b' }), combined)).toBe(false);

    // System matches, author doesn't
    expect(await verifyDelta(makeDelta({ author: 'bob', system: 'sys-a' }), combined)).toBe(false);

    // Neither matches
    expect(await verifyDelta(makeDelta({ author: 'bob', system: 'sys-b' }), combined)).toBe(false);
  });

  it('should pass when combining with permissive policy', async () => {
    const permissive = createPermissiveTrustPolicy();
    const authorPolicy = createAuthorTrustPolicy(['alice']);
    const combined = combineTrustPolicies(permissive, authorPolicy);

    expect(await verifyDelta(makeDelta({ author: 'alice' }), combined)).toBe(true);
    expect(await verifyDelta(makeDelta({ author: 'bob' }), combined)).toBe(false);
  });
});
