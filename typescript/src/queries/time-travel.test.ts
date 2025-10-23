/**
 * Tests for Time-Travel Query API
 */

import { RhizomeDB } from '../storage/instance';
import { TimeTravelDB, enableTimeTravel } from './time-travel';
import { createStandardSchema } from '../schemas/hyperview';
import { PrimitiveSchemas } from '../core/types';

describe('Time-Travel Queries', () => {
  let db: RhizomeDB;
  let timeDB: TimeTravelDB;

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory' });
    timeDB = enableTimeTravel(db);
  });

  describe('queryAt', () => {
    it('should query object state at specific timestamp', async () => {
      const personId = 'person_alice';
      const schema = createStandardSchema('person', 'Person');

      // Create initial name at t=1000
      const delta1 = db.createDelta('user', [
        { localContext: 'named', target: { id: personId }, targetContext: 'name' },
        { localContext: 'name', target: 'Alice' }
      ]);
      delta1.timestamp = 1000;
      await db.persistDelta(delta1);

      // Update name at t=2000
      const delta2 = db.createDelta('user', [
        { localContext: 'named', target: { id: personId }, targetContext: 'name' },
        { localContext: 'name', target: 'Alice Smith' }
      ]);
      delta2.timestamp = 2000;
      await db.persistDelta(delta2);

      // Query at t=1500 (after first delta, before second)
      const viewAt1500 = timeDB.queryAt(personId, schema, 1500);
      expect(viewAt1500.id).toBe(personId);
      expect(viewAt1500.name).toHaveLength(1);

      // Query at t=2500 (after both deltas)
      const viewAt2500 = timeDB.queryAt(personId, schema, 2500);
      expect(viewAt2500.id).toBe(personId);
      expect(viewAt2500.name).toHaveLength(2);
    });

    it('should respect negations at query time', async () => {
      const personId = 'person_bob';
      const schema = createStandardSchema('person', 'Person');

      // Create age at t=1000
      const delta1 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'age' },
        { localContext: 'age', target: 30 }
      ]);
      delta1.timestamp = 1000;
      await db.persistDelta(delta1);

      // Query at t=1500 (delta exists)
      const viewAt1500 = timeDB.queryAt(personId, schema, 1500);
      // Should have the delta
      expect(viewAt1500.age).toBeDefined();
      expect(viewAt1500.age).toHaveLength(1);

      // Negate it at t=2000
      const negation = db.negateDelta('user', delta1.id);
      negation.timestamp = 2000;
      await db.persistDelta(negation);

      // Query at t=2500 (delta is negated)
      const viewAt2500 = timeDB.queryAt(personId, schema, 2500);
      expect(viewAt2500.age).toBeUndefined();
    });
  });

  describe('getSnapshot', () => {
    it('should provide database statistics at a timestamp', async () => {
      // Create deltas at different times
      const delta1 = db.createDelta('user1', [{ localContext: 'test', target: 'value1' }]);
      delta1.timestamp = 1000;
      await db.persistDelta(delta1);

      const delta2 = db.createDelta('user2', [{ localContext: 'test', target: 'value2' }]);
      delta2.timestamp = 2000;
      await db.persistDelta(delta2);

      const delta3 = db.createDelta('user3', [{ localContext: 'test', target: 'value3' }]);
      delta3.timestamp = 3000;
      await db.persistDelta(delta3);

      // Snapshot at t=1500
      const snapshot1500 = timeDB.getSnapshot(1500);
      expect(snapshot1500.deltaCount).toBe(1);

      // Snapshot at t=2500
      const snapshot2500 = timeDB.getSnapshot(2500);
      expect(snapshot2500.deltaCount).toBe(2);

      // Snapshot at t=3500
      const snapshot3500 = timeDB.getSnapshot(3500);
      expect(snapshot3500.deltaCount).toBe(3);
    });

    it('should count negated deltas correctly', async () => {
      const delta1 = db.createDelta('user', [{ localContext: 'test', target: 'value' }]);
      delta1.timestamp = 1000;
      await db.persistDelta(delta1);

      const negation = db.negateDelta('user', delta1.id);
      negation.timestamp = 2000;
      await db.persistDelta(negation);

      // Before negation
      const snapshot1500 = timeDB.getSnapshot(1500);
      expect(snapshot1500.negatedCount).toBe(0);

      // After negation
      const snapshot2500 = timeDB.getSnapshot(2500);
      expect(snapshot2500.negatedCount).toBe(1);
    });
  });

  describe('getObjectTimeline', () => {
    it('should return all timestamps for an object', async () => {
      const personId = 'person_charlie';

      // Create multiple deltas at different times
      const delta1 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'name' },
        { localContext: 'name', target: 'Charlie' }
      ]);
      delta1.timestamp = 1000;
      await db.persistDelta(delta1);

      const delta2 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'age' },
        { localContext: 'age', target: 25 }
      ]);
      delta2.timestamp = 2000;
      await db.persistDelta(delta2);

      const delta3 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'age' },
        { localContext: 'age', target: 26 }
      ]);
      delta3.timestamp = 3000;
      await db.persistDelta(delta3);

      const timeline = timeDB.getObjectTimeline(personId);

      expect(timeline).toEqual([1000, 2000, 3000]);
    });
  });

  describe('replayObject', () => {
    it('should replay object evolution over time', async () => {
      const personId = 'person_dave';
      const schema = createStandardSchema('person', 'Person');

      // Create history
      const delta1 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'name' },
        { localContext: 'name', target: 'Dave' }
      ]);
      delta1.timestamp = 1000;
      await db.persistDelta(delta1);

      const delta2 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'age' },
        { localContext: 'age', target: 30 }
      ]);
      delta2.timestamp = 2000;
      await db.persistDelta(delta2);

      const delta3 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'age' },
        { localContext: 'age', target: 31 }
      ]);
      delta3.timestamp = 3000;
      await db.persistDelta(delta3);

      // Replay
      const replay = timeDB.replayObject(personId, schema);

      expect(replay).toHaveLength(3);
      expect(replay[0].timestamp).toBe(1000);
      expect(replay[1].timestamp).toBe(2000);
      expect(replay[2].timestamp).toBe(3000);

      // First snapshot: only name
      expect(replay[0].hyperView.name).toBeDefined();
      expect(replay[0].hyperView.age).toBeUndefined();

      // Second snapshot: name + first age
      expect(replay[1].hyperView.name).toBeDefined();
      expect(replay[1].hyperView.age).toBeDefined();
      expect(replay[1].hyperView.age).toHaveLength(1);

      // Third snapshot: name + both ages
      expect(replay[2].hyperView.name).toBeDefined();
      expect(replay[2].hyperView.age).toHaveLength(2);
    });
  });

  describe('trackPropertyChanges', () => {
    it('should track when a property changed', async () => {
      const personId = 'person_eve';

      // Create multiple age updates
      const delta1 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'age' },
        { localContext: 'age', target: 20 }
      ]);
      delta1.timestamp = 1000;
      await db.persistDelta(delta1);

      const delta2 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'age' },
        { localContext: 'age', target: 21 }
      ]);
      delta2.timestamp = 2000;
      await db.persistDelta(delta2);

      const delta3 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'age' },
        { localContext: 'age', target: 22 }
      ]);
      delta3.timestamp = 3000;
      await db.persistDelta(delta3);

      const changes = timeDB.trackPropertyChanges(personId, 'age');

      expect(changes).toHaveLength(3);
      expect(changes[0].timestamp).toBe(1000);
      expect(changes[1].timestamp).toBe(2000);
      expect(changes[2].timestamp).toBe(3000);
    });
  });

  describe('compareSnapshots', () => {
    it('should compare object state at two timestamps', async () => {
      const personId = 'person_frank';
      const schema = createStandardSchema('person', 'Person');

      // Initial state
      const delta1 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'name' },
        { localContext: 'name', target: 'Frank' }
      ]);
      delta1.timestamp = 1000;
      await db.persistDelta(delta1);

      // Add age
      const delta2 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'age' },
        { localContext: 'age', target: 40 }
      ]);
      delta2.timestamp = 2000;
      await db.persistDelta(delta2);

      // Add email
      const delta3 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'email' },
        { localContext: 'email', target: 'frank@example.com' }
      ]);
      delta3.timestamp = 3000;
      await db.persistDelta(delta3);

      // Compare t=1500 to t=3500
      const comparison = timeDB.compareSnapshots(personId, schema, 1500, 3500);

      expect(comparison.deltasAdded).toBe(2); // age and email added
      expect(comparison.properties).toContain('name');
      expect(comparison.properties).toContain('age');
      expect(comparison.properties).toContain('email');

      expect(comparison.before.age).toBeUndefined();
      expect(comparison.after.age).toBeDefined();
    });
  });

  describe('findOrigin', () => {
    it('should find the first delta for an object', async () => {
      const personId = 'person_george';

      // Create deltas at different times
      const delta2 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'age' },
        { localContext: 'age', target: 50 }
      ]);
      delta2.timestamp = 2000;
      await db.persistDelta(delta2);

      const delta1 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'name' },
        { localContext: 'name', target: 'George' }
      ]);
      delta1.timestamp = 1000;
      await db.persistDelta(delta1);

      const delta3 = db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'email' },
        { localContext: 'email', target: 'george@example.com' }
      ]);
      delta3.timestamp = 3000;
      await db.persistDelta(delta3);

      const origin = timeDB.findOrigin(personId);

      expect(origin).not.toBeNull();
      expect(origin?.timestamp).toBe(1000);
    });
  });

  describe('getStatsAt', () => {
    it('should provide database statistics at a specific time', async () => {
      // Create deltas from different authors/systems
      const delta1 = db.createDelta('user1', [{ localContext: 'test', target: 'value1' }]);
      delta1.timestamp = 1000;
      await db.persistDelta(delta1);

      const delta2 = db.createDelta('user2', [{ localContext: 'test', target: 'value2' }]);
      delta2.timestamp = 2000;
      await db.persistDelta(delta2);

      const stats = timeDB.getStatsAt(1500);

      expect(stats.totalDeltas).toBe(1);
      expect(stats.activeDeltas).toBe(1);
      expect(stats.uniqueAuthors.size).toBe(1);
      expect(stats.uniqueAuthors.has('user1')).toBe(true);
    });
  });
});
