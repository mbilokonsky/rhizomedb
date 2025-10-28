/**
 * Tests for delta negation including double negation support
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { RhizomeDB } from '../storage/instance';
import { calculateNegationStates, getNegatedDeltaIds, isNegated } from './negation';
import { Delta } from '../core/types';

describe('Delta Negation', () => {
  let db: RhizomeDB;

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory' });
  });

  describe('Basic Negation', () => {
    it('should mark a delta as negated when negated', async () => {
      const originalDelta = db.createDelta('alice', [{ role: 'name', target: 'Alice' }]);
      await db.persistDelta(originalDelta);

      const negation = db.negateDelta('bob', originalDelta.id, 'Incorrect');
      await db.persistDelta(negation);

      const negatedIds = getNegatedDeltaIds(db.queryDeltas({ includeNegated: true }));
      expect(negatedIds.has(originalDelta.id)).toBe(true);
      expect(negatedIds.has(negation.id)).toBe(false); // Negation itself is not negated
    });

    it('should exclude negated deltas from queries by default', async () => {
      const delta1 = db.createDelta('alice', [{ role: 'name', target: 'Alice' }]);
      const delta2 = db.createDelta('alice', [{ role: 'age', target: 30 }]);
      await db.persistDelta(delta1);
      await db.persistDelta(delta2);

      // Negate delta1
      const negation = db.negateDelta('bob', delta1.id);
      await db.persistDelta(negation);

      // Query without includeNegated
      const results = db.queryDeltas({});
      expect(results.find(d => d.id === delta1.id)).toBeUndefined();
      expect(results.find(d => d.id === delta2.id)).toBeDefined();
      expect(results.find(d => d.id === negation.id)).toBeDefined();
    });

    it('should include negated deltas when includeNegated is true', async () => {
      const originalDelta = db.createDelta('alice', [{ role: 'name', target: 'Alice' }]);
      await db.persistDelta(originalDelta);

      const negation = db.negateDelta('bob', originalDelta.id);
      await db.persistDelta(negation);

      const results = db.queryDeltas({ includeNegated: true });
      expect(results.find(d => d.id === originalDelta.id)).toBeDefined();
      expect(results.find(d => d.id === negation.id)).toBeDefined();
    });
  });

  describe('Double Negation', () => {
    it('should restore a delta when its negation is negated', async () => {
      // Create original delta
      const original = db.createDelta('alice', [{ role: 'name', target: 'Alice' }]);
      await db.persistDelta(original);

      // Negate it
      const negation1 = db.negateDelta('bob', original.id, 'First negation');
      await db.persistDelta(negation1);

      // Verify it's negated
      let results = db.queryDeltas({});
      expect(results.find(d => d.id === original.id)).toBeUndefined();

      // Negate the negation (double negation)
      const negation2 = db.negateDelta('charlie', negation1.id, 'Restoring original');
      await db.persistDelta(negation2);

      // Original should be visible again
      results = db.queryDeltas({});
      expect(results.find(d => d.id === original.id)).toBeDefined();
      expect(results.find(d => d.id === negation1.id)).toBeUndefined(); // First negation is negated
    });

    it('should handle triple negation correctly', async () => {
      const original = db.createDelta('alice', [{ role: 'value', target: 42 }]);
      await db.persistDelta(original);

      // First negation
      const neg1 = db.negateDelta('bob', original.id);
      await db.persistDelta(neg1);
      expect(db.queryDeltas({}).find(d => d.id === original.id)).toBeUndefined();

      // Second negation (double negation - restores original)
      const neg2 = db.negateDelta('charlie', neg1.id);
      await db.persistDelta(neg2);
      expect(db.queryDeltas({}).find(d => d.id === original.id)).toBeDefined();

      // Third negation (negates original again)
      const neg3 = db.negateDelta('dave', original.id);
      await db.persistDelta(neg3);
      expect(db.queryDeltas({}).find(d => d.id === original.id)).toBeUndefined();
    });

    it('should calculate negation states correctly for complex chains', () => {
      const delta1 = db.createDelta('alice', [{ role: 'test', target: '1' }]);
      const delta2 = db.createDelta('bob', [{ role: 'test', target: '2' }]);
      const neg1 = db.negateDelta('charlie', delta1.id); // Negates delta1
      const neg2 = db.negateDelta('dave', neg1.id); // Negates neg1 (restores delta1)
      const neg3 = db.negateDelta('eve', delta2.id); // Negates delta2

      const allDeltas = [delta1, delta2, neg1, neg2, neg3];
      const states = calculateNegationStates(allDeltas);

      expect(states.get(delta1.id)!.isNegated).toBe(false); // Restored by double negation
      expect(states.get(delta1.id)!.wasDoubleNegated).toBe(true);
      expect(states.get(delta2.id)!.isNegated).toBe(true); // Negated once
      expect(states.get(neg1.id)!.isNegated).toBe(true); // Negated by neg2
      expect(states.get(neg2.id)!.isNegated).toBe(false); // Not negated
      expect(states.get(neg3.id)!.isNegated).toBe(false); // Not negated
    });
  });

  describe('Time-Travel with Negation', () => {
    it('should respect negation timestamps in time-travel queries', () => {
      const t1 = 1000;
      const t2 = 2000;
      const t3 = 3000;

      const original = db.createDelta('alice', [{ role: 'value', target: 'test' }]);
      original.timestamp = t1;

      const negation = db.negateDelta('bob', original.id);
      negation.timestamp = t2;

      // Before negation: delta is visible
      let negatedIds = getNegatedDeltaIds([original, negation], t1);
      expect(negatedIds.has(original.id)).toBe(false);

      // After negation: delta is negated
      negatedIds = getNegatedDeltaIds([original, negation], t2);
      expect(negatedIds.has(original.id)).toBe(true);

      // Future time: still negated
      negatedIds = getNegatedDeltaIds([original, negation], t3);
      expect(negatedIds.has(original.id)).toBe(true);
    });

    it('should handle double negation with timestamps', () => {
      const t1 = 1000;
      const t2 = 2000;
      const t3 = 3000;

      const original = db.createDelta('alice', [{ role: 'value', target: 'test' }]);
      original.timestamp = t1;

      const neg1 = db.negateDelta('bob', original.id);
      neg1.timestamp = t2;

      const neg2 = db.negateDelta('charlie', neg1.id);
      neg2.timestamp = t3;

      // At t1: not negated
      expect(isNegated(original.id, [original, neg1, neg2], t1)).toBe(false);

      // At t2: negated
      expect(isNegated(original.id, [original, neg1, neg2], t2)).toBe(true);

      // At t3: restored by double negation
      expect(isNegated(original.id, [original, neg1, neg2], t3)).toBe(false);
    });
  });

  describe('Negation State Calculation', () => {
    it('should provide detailed negation state information', () => {
      const original = db.createDelta('alice', [{ role: 'test', target: 'value' }]);
      const negation = db.negateDelta('bob', original.id, 'Wrong value');

      const states = calculateNegationStates([original, negation]);

      const originalState = states.get(original.id)!;
      expect(originalState.isNegated).toBe(true);
      expect(originalState.negatedBy).toBe(negation.id);
      expect(originalState.negationTimestamp).toBe(negation.timestamp);
      expect(originalState.wasDoubleNegated).toBe(false);

      const negationState = states.get(negation.id)!;
      expect(negationState.isNegated).toBe(false);
      expect(negationState.wasDoubleNegated).toBe(false);
    });

    it('should detect double negation in state', () => {
      const original = db.createDelta('alice', [{ role: 'test', target: 'value' }]);
      const neg1 = db.negateDelta('bob', original.id);
      const neg2 = db.negateDelta('charlie', neg1.id);

      const states = calculateNegationStates([original, neg1, neg2]);

      const originalState = states.get(original.id)!;
      expect(originalState.isNegated).toBe(false); // Restored
      expect(originalState.wasDoubleNegated).toBe(true);
    });
  });

  describe('Integration with RhizomeDB', () => {
    it('should correctly filter negated deltas in real queries', async () => {
      // Create a user
      const user = db.createDelta('system', [
        { role: 'type', target: 'user' },
        { role: 'name', target: 'Alice' }
      ]);
      await db.persistDelta(user);

      // User changes their name
      const nameUpdate = db.createDelta('alice', [{ role: 'name', target: 'Alicia' }]);
      await db.persistDelta(nameUpdate);

      // Admin negates the name update (policy violation)
      const negation = db.negateDelta('admin', nameUpdate.id, 'Name change not allowed');
      await db.persistDelta(negation);

      // User's second attempt at name change
      const nameUpdate2 = db.createDelta('alice', [{ role: 'name', target: 'Ali' }]);
      await db.persistDelta(nameUpdate2);

      // Query all deltas
      const results = db.queryDeltas({});

      // Should have: user, negation, nameUpdate2
      // Should NOT have: nameUpdate (negated)
      expect(results.find(d => d.id === user.id)).toBeDefined();
      expect(results.find(d => d.id === nameUpdate.id)).toBeUndefined();
      expect(results.find(d => d.id === negation.id)).toBeDefined();
      expect(results.find(d => d.id === nameUpdate2.id)).toBeDefined();
    });

    it('should handle concurrent negations correctly', async () => {
      const original = db.createDelta('alice', [{ role: 'value', target: 42 }]);
      await db.persistDelta(original);

      // Two people try to negate at the same time (same timestamp)
      const neg1 = db.negateDelta('bob', original.id, 'Reason 1');
      const neg2 = db.negateDelta('charlie', original.id, 'Reason 2');
      neg1.timestamp = 2000;
      neg2.timestamp = 2000;

      await db.persistDelta(neg1);
      await db.persistDelta(neg2);

      // Original should be negated (by most recent negation)
      const results = db.queryDeltas({});
      expect(results.find(d => d.id === original.id)).toBeUndefined();
    });
  });
});
