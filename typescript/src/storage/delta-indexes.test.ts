/**
 * Tests for delta indexing system
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-floating-promises */

import { RhizomeDB } from './instance';
import { DeltaIndexes } from './delta-indexes';
import { Delta } from '../core/types';

describe('DeltaIndexes', () => {
  let indexes: DeltaIndexes;

  beforeEach(() => {
    indexes = new DeltaIndexes();
  });

  describe('Index Management', () => {
    it('should add deltas to all relevant indexes', () => {
      const db = new RhizomeDB({ storage: 'memory' });
      const delta = db.createDelta('user1', [
        { localContext: 'name', target: 'Alice' },
        { localContext: 'friend', target: { id: 'user2', context: 'friends' } }
      ]);

      indexes.addDelta(delta);

      // Check target ID index
      const byTargetId = indexes.getDeltaIdsByTargetId('user2');
      expect(byTargetId.has(delta.id)).toBe(true);

      // Check target context index
      const byContext = indexes.getDeltaIdsByTargetContext('friends');
      expect(byContext.has(delta.id)).toBe(true);

      // Check author index
      const byAuthor = indexes.getDeltaIdsByAuthor('user1');
      expect(byAuthor.has(delta.id)).toBe(true);

      // Check system index
      const bySystem = indexes.getDeltaIdsBySystem(delta.system);
      expect(bySystem.has(delta.id)).toBe(true);
    });

    it('should remove deltas from all indexes', () => {
      const db = new RhizomeDB({ storage: 'memory' });
      const delta = db.createDelta('user1', [
        { localContext: 'friend', target: { id: 'user2', context: 'friends' } }
      ]);

      indexes.addDelta(delta);
      expect(indexes.getDeltaIdsByTargetId('user2').has(delta.id)).toBe(true);

      indexes.removeDelta(delta);
      expect(indexes.getDeltaIdsByTargetId('user2').has(delta.id)).toBe(false);
    });

    it('should handle timestamp range queries', () => {
      const db = new RhizomeDB({ storage: 'memory' });
      const now = Date.now();

      const delta1 = db.createDelta('user1', [{ localContext: 'test', target: 'value1' }]);
      delta1.timestamp = now - 1000;

      const delta2 = db.createDelta('user1', [{ localContext: 'test', target: 'value2' }]);
      delta2.timestamp = now;

      const delta3 = db.createDelta('user1', [{ localContext: 'test', target: 'value3' }]);
      delta3.timestamp = now + 1000;

      indexes.addDelta(delta1);
      indexes.addDelta(delta2);
      indexes.addDelta(delta3);

      // Query range: only delta2 should be in range (now - 500, now + 500)
      const inRange = indexes.getDeltaIdsByTimestampRange(now - 500, now + 500);
      expect(inRange.has(delta1.id)).toBe(false); // Too old
      expect(inRange.has(delta2.id)).toBe(true); // In range
      expect(inRange.has(delta3.id)).toBe(false); // Too new

      // Query wider range: should include all
      const allInRange = indexes.getDeltaIdsByTimestampRange(now - 2000, now + 2000);
      expect(allInRange.has(delta1.id)).toBe(true);
      expect(allInRange.has(delta2.id)).toBe(true);
      expect(allInRange.has(delta3.id)).toBe(true);
    });
  });

  describe('Query Optimization', () => {
    it('should return intersection of multiple index queries', () => {
      const db = new RhizomeDB({ storage: 'memory' });

      const delta1 = db.createDelta('alice', [
        { localContext: 'tag', target: { id: 'tag1', context: 'tagged' } }
      ]);

      const delta2 = db.createDelta('bob', [
        { localContext: 'tag', target: { id: 'tag1', context: 'tagged' } }
      ]);

      const delta3 = db.createDelta('alice', [
        { localContext: 'tag', target: { id: 'tag2', context: 'tagged' } }
      ]);

      indexes.addDelta(delta1);
      indexes.addDelta(delta2);
      indexes.addDelta(delta3);

      // Query for alice + tag1
      const candidates = indexes.queryDeltaIds({
        authors: ['alice'],
        targetIds: ['tag1']
      });

      expect(candidates).not.toBeNull();
      expect(candidates!.has(delta1.id)).toBe(true);
      expect(candidates!.has(delta2.id)).toBe(false); // Wrong author
      expect(candidates!.has(delta3.id)).toBe(false); // Wrong target
    });

    it('should return null when no indexed fields in filter', () => {
      const candidates = indexes.queryDeltaIds({
        predicate: (delta: Delta) => true
      });

      expect(candidates).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      const db = new RhizomeDB({ storage: 'memory' });

      const delta1 = db.createDelta('alice', [
        { localContext: 'friend', target: { id: 'bob', context: 'friends' } }
      ]);

      const delta2 = db.createDelta('bob', [
        { localContext: 'friend', target: { id: 'alice', context: 'friends' } }
      ]);

      indexes.addDelta(delta1);
      indexes.addDelta(delta2);

      const stats = indexes.getStats();
      expect(stats.targetIdIndexSize).toBe(2); // bob and alice as targets
      expect(stats.targetContextIndexSize).toBe(1); // friends
      expect(stats.authorIndexSize).toBe(2); // alice and bob
      expect(stats.systemIndexSize).toBe(1); // same system
      expect(stats.timestampIndexSize).toBe(2); // 2 deltas
      expect(stats.estimatedMemory).toBeGreaterThan(0);
    });
  });

  describe('Integration with RhizomeDB', () => {
    it('should automatically index deltas on persist', async () => {
      const db = new RhizomeDB({ storage: 'memory' });

      const delta = db.createDelta('alice', [
        { localContext: 'name', target: 'Alice' },
        { localContext: 'friend', target: { id: 'bob', context: 'friends' } }
      ]);

      await db.persistDelta(delta);

      // Query should use indexes
      const results = db.queryDeltas({ authors: ['alice'] });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(delta.id);
    });

    it('should optimize multi-criteria queries', async () => {
      const db = new RhizomeDB({ storage: 'memory', enableIndexing: true });

      // Create some test data
      for (let i = 0; i < 100; i++) {
        const delta = db.createDelta(`user${i % 10}`, [
          { localContext: 'tag', target: { id: `tag${i % 5}`, context: 'tagged' } }
        ]);
        await db.persistDelta(delta);
      }

      // Query with multiple filters
      const results = db.queryDeltas({
        authors: ['user0', 'user1'],
        targetIds: ['tag0'],
        targetContexts: ['tagged']
      });

      // Should only get deltas matching all criteria
      expect(results.length).toBeGreaterThan(0);
      results.forEach(delta => {
        expect(['user0', 'user1']).toContain(delta.author);
        expect(
          delta.pointers.some(
            p => typeof p.target === 'object' && 'id' in p.target && p.target.id === 'tag0'
          )
        ).toBe(true);
      });
    });

    it('should include index stats in instance stats', () => {
      const db = new RhizomeDB({ storage: 'memory', enableIndexing: true });

      const delta = db.createDelta('alice', [{ localContext: 'friend', target: { id: 'bob' } }]);
      db.persistDelta(delta);

      const stats = db.getStats();
      expect(stats.indexStats).toBeDefined();
      expect(stats.indexStats!.authorIndexSize).toBeGreaterThan(0);
    });
  });
});
