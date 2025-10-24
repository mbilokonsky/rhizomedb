/**
 * Tests for LevelDB-backed RhizomeDB instance
 */

/* eslint-disable @typescript-eslint/require-await */

import * as fs from 'fs';
import * as path from 'path';
import { LevelDBStore } from './leveldb-store';
import { Delta, DeltaFilter, Pointer, HyperSchema } from '../core/types';
import { selectByTargetContext } from '../schemas/hyperview';

// Helper to create temporary database path
function createTempDbPath(): string {
  const tmpDir = '/tmp/rhizomedb-test';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  return path.join(tmpDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

// Helper to clean up database
function cleanupDb(dbPath: string) {
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { recursive: true, force: true });
  }
}

describe('LevelDBStore', () => {
  let db: LevelDBStore;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = createTempDbPath();
    db = new LevelDBStore({
      systemId: 'test-system',
      storage: 'leveldb',
      dbPath
    });
    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    await db.close();
    cleanupDb(dbPath);
  });

  describe('Delta Creation', () => {
    it('should create a valid delta', () => {
      const pointers: Pointer[] = [{ localContext: 'name', target: 'Alice' }];

      const delta = db.createDelta('user-1', pointers);

      expect(delta.id).toBeDefined();
      expect(delta.timestamp).toBeGreaterThan(0);
      expect(delta.author).toBe('user-1');
      expect(delta.system).toBe('test-system');
      expect(delta.pointers).toEqual(pointers);
    });

    it('should create a negation delta', () => {
      const targetDeltaId = 'delta-123';
      const reason = 'Data correction';

      const negation = db.negateDelta('user-1', targetDeltaId, reason);

      expect(negation.pointers).toHaveLength(2);
      expect(negation.pointers[0].localContext).toBe('negates');
      expect(negation.pointers[0].target).toEqual({ id: targetDeltaId });
      expect(negation.pointers[1].localContext).toBe('reason');
      expect(negation.pointers[1].target).toBe(reason);
    });
  });

  describe('Delta Persistence', () => {
    it('should persist and retrieve a delta', async () => {
      const delta = db.createDelta('user-1', [{ localContext: 'name', target: 'Bob' }]);

      await db.persistDelta(delta);

      const retrieved = await db.getDeltas([delta.id]);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0]).toEqual(delta);
    });

    it('should persist multiple deltas', async () => {
      const delta1 = db.createDelta('user-1', [{ localContext: 'name', target: 'Alice' }]);
      const delta2 = db.createDelta('user-2', [{ localContext: 'name', target: 'Bob' }]);

      await db.persistDeltas([delta1, delta2]);

      const retrieved = await db.getDeltas([delta1.id, delta2.id]);
      expect(retrieved).toHaveLength(2);
    });

    it('should filter deltas by author', async () => {
      const delta1 = db.createDelta('alice', [{ localContext: 'action', target: 'login' }]);
      const delta2 = db.createDelta('bob', [{ localContext: 'action', target: 'logout' }]);
      const delta3 = db.createDelta('alice', [{ localContext: 'action', target: 'update' }]);

      await db.persistDeltas([delta1, delta2, delta3]);

      const filter: DeltaFilter = { authors: ['alice'] };
      const results = await db.queryDeltas(filter);

      expect(results).toHaveLength(2);
      expect(results.every(d => d.author === 'alice')).toBe(true);
    });

    it('should filter deltas by timestamp range', async () => {
      const now = Date.now();
      const delta1 = db.createDelta('user-1', [{ localContext: 'event', target: 'early' }]);
      delta1.timestamp = now - 1000;

      const delta2 = db.createDelta('user-1', [{ localContext: 'event', target: 'middle' }]);
      delta2.timestamp = now;

      const delta3 = db.createDelta('user-1', [{ localContext: 'event', target: 'late' }]);
      delta3.timestamp = now + 1000;

      await db.persistDeltas([delta1, delta2, delta3]);

      const filter: DeltaFilter = {
        timestampRange: { start: now - 500, end: now + 500 }
      };
      const results = await db.queryDeltas(filter);

      expect(results).toHaveLength(1);
      expect(results[0].pointers[0].target).toBe('middle');
    });

    it('should filter deltas by target ID', async () => {
      const personId = 'person_123';
      const delta1 = db.createDelta('user-1', [
        { localContext: 'name', target: { id: personId }, targetContext: 'named' },
        { localContext: 'name', target: 'Alice' }
      ]);
      const delta2 = db.createDelta('user-1', [
        { localContext: 'name', target: { id: 'person_456' }, targetContext: 'named' },
        { localContext: 'name', target: 'Bob' }
      ]);

      await db.persistDeltas([delta1, delta2]);

      const filter: DeltaFilter = { targetIds: [personId] };
      const results = await db.queryDeltas(filter);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(delta1.id);
    });
  });

  describe('Streaming', () => {
    it('should subscribe to delta stream', async () => {
      const receivedDeltas: Delta[] = [];
      const filter: DeltaFilter = {};

      db.subscribe(filter, async delta => {
        receivedDeltas.push(delta);
      });

      const delta = db.createDelta('user-1', [{ localContext: 'event', target: 'test' }]);
      await db.persistDelta(delta);

      // Wait for async propagation
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedDeltas).toHaveLength(1);
      expect(receivedDeltas[0].id).toBe(delta.id);
    });

    it('should filter subscription by author', async () => {
      const receivedDeltas: Delta[] = [];
      const filter: DeltaFilter = { authors: ['alice'] };

      db.subscribe(filter, async delta => {
        receivedDeltas.push(delta);
      });

      const delta1 = db.createDelta('alice', [{ localContext: 'event', target: 'match' }]);
      const delta2 = db.createDelta('bob', [{ localContext: 'event', target: 'no-match' }]);

      await db.persistDeltas([delta1, delta2]);

      // Wait for async propagation
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedDeltas).toHaveLength(1);
      expect(receivedDeltas[0].author).toBe('alice');
    });

    it('should support pause and resume', async () => {
      const receivedDeltas: Delta[] = [];
      const filter: DeltaFilter = {};

      const subscription = db.subscribe(filter, async delta => {
        receivedDeltas.push(delta);
      });

      const delta1 = db.createDelta('user-1', [{ localContext: 'event', target: 'first' }]);
      await db.persistDelta(delta1);

      // Wait for async propagation
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(receivedDeltas).toHaveLength(1);

      // Pause subscription
      subscription.pause();

      const delta2 = db.createDelta('user-1', [{ localContext: 'event', target: 'second' }]);
      await db.persistDelta(delta2);

      // Wait and verify no new delta received
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(receivedDeltas).toHaveLength(1);

      // Resume subscription
      subscription.resume();

      const delta3 = db.createDelta('user-1', [{ localContext: 'event', target: 'third' }]);
      await db.persistDelta(delta3);

      // Wait for async propagation
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(receivedDeltas).toHaveLength(2);
    });
  });

  describe('HyperView Construction', () => {
    it('should construct a simple HyperView', async () => {
      const personId = 'person_alice';
      const schema: HyperSchema = {
        id: 'person_schema',
        name: 'Person',
        select: selectByTargetContext,
        transform: {}
      };

      // Create deltas for a person
      const delta1 = db.createDelta('system', [
        { localContext: 'named', target: { id: personId }, targetContext: 'name' },
        { localContext: 'name', target: 'Alice' }
      ]);
      const delta2 = db.createDelta('system', [
        { localContext: 'aged', target: { id: personId }, targetContext: 'age' },
        { localContext: 'age', target: 30 }
      ]);

      await db.persistDeltas([delta1, delta2]);

      const hyperView = await db.applyHyperSchema(personId, schema);

      expect(hyperView.id).toBe(personId);
      expect(hyperView.name).toHaveLength(1);
      expect(hyperView.age).toHaveLength(1);
    });

    it('should handle negation in HyperViews', async () => {
      const objectId = 'obj_123';
      const schema: HyperSchema = {
        id: 'test_schema',
        name: 'Test',
        select: selectByTargetContext,
        transform: {}
      };

      // Create a delta
      const delta1 = db.createDelta('user-1', [
        { localContext: 'value', target: { id: objectId }, targetContext: 'value' },
        { localContext: 'value', target: 'original' }
      ]);
      await db.persistDelta(delta1);

      // Negate it
      const negation = db.negateDelta('user-1', delta1.id, 'correction');
      await db.persistDelta(negation);

      // Create new value
      const delta2 = db.createDelta('user-1', [
        { localContext: 'value', target: { id: objectId }, targetContext: 'value' },
        { localContext: 'value', target: 'corrected' }
      ]);
      await db.persistDelta(delta2);

      const hyperView = await db.applyHyperSchema(objectId, schema);

      expect(hyperView.value).toHaveLength(1);
      expect((hyperView.value as Delta[])[0].id).toBe(delta2.id);
    });
  });

  describe('Materialized HyperViews', () => {
    it('should materialize and cache HyperViews', async () => {
      const personId = 'person_bob';
      const schema: HyperSchema = {
        id: 'person_schema',
        name: 'Person',
        select: selectByTargetContext,
        transform: {}
      };

      const delta = db.createDelta('system', [
        { localContext: 'named', target: { id: personId }, targetContext: 'name' },
        { localContext: 'name', target: 'Bob' }
      ]);
      await db.persistDelta(delta);

      const view1 = await db.materializeHyperView(personId, schema);
      expect(view1.id).toBe(personId);
      expect(view1._metadata.deltaCount).toBeGreaterThan(0);
      expect(view1._metadata.lastUpdated).toBeGreaterThan(0);

      // Request again - should return cached version
      const view2 = await db.materializeHyperView(personId, schema);
      expect(view2._metadata.lastUpdated).toBe(view1._metadata.lastUpdated);
    });

    it('should invalidate cached views', async () => {
      const personId = 'person_charlie';
      const schema: HyperSchema = {
        id: 'person_schema',
        name: 'Person',
        select: selectByTargetContext,
        transform: {}
      };

      const delta = db.createDelta('system', [
        { localContext: 'named', target: { id: personId }, targetContext: 'name' },
        { localContext: 'name', target: 'Charlie' }
      ]);
      await db.persistDelta(delta);

      const view1 = await db.materializeHyperView(personId, schema);
      const timestamp1 = view1._metadata.lastUpdated;

      // Invalidate cache
      db.invalidateView(personId, schema.id);

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Request again - should regenerate
      const view2 = await db.materializeHyperView(personId, schema);
      expect(view2._metadata.lastUpdated).toBeGreaterThanOrEqual(timestamp1);
    });
  });

  describe('Statistics', () => {
    it('should track instance statistics', async () => {
      const delta1 = db.createDelta('user-1', [{ localContext: 'event', target: 'test1' }]);
      const delta2 = db.createDelta('user-2', [{ localContext: 'event', target: 'test2' }]);

      await db.persistDeltas([delta1, delta2]);

      const stats = await db.getStats();

      expect(stats.systemId).toBe('test-system');
      expect(stats.totalDeltas).toBe(2);
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
      expect(stats.storageType).toBe('leveldb');
    });
  });

  describe('Scanning', () => {
    it('should scan all deltas', async () => {
      const delta1 = db.createDelta('user-1', [{ localContext: 'event', target: 'first' }]);
      const delta2 = db.createDelta('user-2', [{ localContext: 'event', target: 'second' }]);
      const delta3 = db.createDelta('user-3', [{ localContext: 'event', target: 'third' }]);

      await db.persistDeltas([delta1, delta2, delta3]);

      const scanned: Delta[] = [];
      for await (const delta of db.scanDeltas()) {
        scanned.push(delta);
      }

      expect(scanned).toHaveLength(3);
    });

    it('should scan with filter', async () => {
      const delta1 = db.createDelta('alice', [{ localContext: 'event', target: 'first' }]);
      const delta2 = db.createDelta('bob', [{ localContext: 'event', target: 'second' }]);
      const delta3 = db.createDelta('alice', [{ localContext: 'event', target: 'third' }]);

      await db.persistDeltas([delta1, delta2, delta3]);

      const filter: DeltaFilter = { authors: ['alice'] };
      const scanned: Delta[] = [];
      for await (const delta of db.scanDeltas(filter)) {
        scanned.push(delta);
      }

      expect(scanned).toHaveLength(2);
      expect(scanned.every(d => d.author === 'alice')).toBe(true);
    });
  });

  describe('Persistence Across Sessions', () => {
    it('should persist data across database close/open', async () => {
      const delta = db.createDelta('user-1', [{ localContext: 'test', target: 'persistent-data' }]);
      await db.persistDelta(delta);

      // Close the database
      await db.close();

      // Reopen with same path
      const db2 = new LevelDBStore({
        systemId: 'test-system-2',
        storage: 'leveldb',
        dbPath
      });

      // Retrieve the delta
      const retrieved = await db2.getDeltas([delta.id]);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe(delta.id);
      expect(retrieved[0].pointers[0].target).toBe('persistent-data');

      await db2.close();
    });
  });
});
