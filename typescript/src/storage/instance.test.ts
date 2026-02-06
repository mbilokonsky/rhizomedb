/**
 * Tests for RhizomeDB instance
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { RhizomeDB } from './instance';
import { createStandardSchema } from '../schemas/hyperview';
import { Delta, HyperSchema, Pointer } from '../core/types';

describe('RhizomeDB', () => {
  let db: RhizomeDB;

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory' });
  });

  describe('Delta Creation', () => {
    it('should create a delta with valid structure', () => {
      const pointers: Pointer[] = [
        {
          role: 'named',
          target: { id: 'person_1', context: 'name' }
        },
        {
          role: 'name',
          target: 'Alice'
        }
      ];

      const delta = db.createDelta('author_1', pointers);

      expect(delta.id).toBeDefined();
      expect(delta.timestamp).toBeGreaterThan(0);
      expect(delta.author).toBe('author_1');
      expect(delta.system).toBe(db.systemId);
      expect(delta.pointers).toEqual(pointers);
    });

    it('should create a negation delta', () => {
      const targetDeltaId = 'delta_to_negate';
      const negation = db.negateDelta('author_1', targetDeltaId, 'Test reason');

      expect(negation.pointers).toHaveLength(2);
      expect(negation.pointers[0].role).toBe('negates');
      expect(negation.pointers[0].target).toEqual({ id: targetDeltaId, context: 'negated_by' });
      expect(negation.pointers[1].role).toBe('reason');
      expect(negation.pointers[1].target).toBe('Test reason');
    });
  });

  describe('Delta Persistence', () => {
    it('should persist and retrieve deltas', async () => {
      const delta = db.createDelta('author_1', [
        {
          role: 'test',
          target: 'value'
        }
      ]);

      await db.persistDelta(delta);

      const retrieved = await db.getDeltas([delta.id]);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0]).toEqual(delta);
    });

    it('should query deltas by filter', async () => {
      const delta1 = db.createDelta('author_1', [
        { role: 'test', target: { id: 'obj_1', context: 'prop' } }
      ]);
      const delta2 = db.createDelta('author_2', [
        { role: 'test', target: { id: 'obj_2', context: 'prop' } }
      ]);

      await db.persistDelta(delta1);
      await db.persistDelta(delta2);

      const results = db.queryDeltas({ authors: ['author_1'] });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(delta1.id);
    });
  });

  describe('Streaming', () => {
    it('should subscribe to delta stream', async () => {
      const received: Delta[] = [];

      db.subscribe({}, delta => {
        received.push(delta);
      });

      const delta = db.createDelta('author_1', [{ role: 'test', target: 'value' }]);
      await db.persistDelta(delta);

      // Wait for async handler
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(received).toHaveLength(1);
      expect(received[0].id).toBe(delta.id);
    });

    it('should filter subscriptions', async () => {
      const received: Delta[] = [];

      db.subscribe({ authors: ['author_1'] }, delta => {
        received.push(delta);
      });

      const delta1 = db.createDelta('author_1', [{ role: 'test', target: 'value' }]);
      const delta2 = db.createDelta('author_2', [{ role: 'test', target: 'value' }]);

      await db.persistDelta(delta1);
      await db.persistDelta(delta2);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(received).toHaveLength(1);
      expect(received[0].id).toBe(delta1.id);
    });

    it('should pause and resume subscriptions', async () => {
      const received: Delta[] = [];

      const sub = db.subscribe({}, delta => {
        received.push(delta);
      });

      const delta1 = db.createDelta('author_1', [{ role: 'test', target: 'value' }]);
      await db.persistDelta(delta1);

      sub.pause();

      const delta2 = db.createDelta('author_1', [{ role: 'test', target: 'value' }]);
      await db.persistDelta(delta2);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(received).toHaveLength(1);

      sub.resume();

      const delta3 = db.createDelta('author_1', [{ role: 'test', target: 'value' }]);
      await db.persistDelta(delta3);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(received).toHaveLength(2);
    });
  });

  describe('HyperView Construction', () => {
    it('should construct a simple HyperView', async () => {
      // Create a person with a name
      const personId = 'person_alice';
      const nameDelta = db.createDelta('author_1', [
        {
          role: 'named',
          target: { id: personId, context: 'name' }
        },
        {
          role: 'name',
          target: 'Alice Johnson'
        }
      ]);

      await db.persistDelta(nameDelta);

      // Create a simple schema
      const schema = createStandardSchema('person', 'Person');

      const hyperView = db.applyHyperSchema(personId, schema);

      expect(hyperView.id).toBe(personId);
      expect(hyperView.name).toBeDefined();
      expect(Array.isArray(hyperView.name)).toBe(true);
      expect((hyperView.name as Delta[]).length).toBe(1);
      expect((hyperView.name as Delta[])[0].id).toBe(nameDelta.id);
    });

    it('should handle nested HyperViews', async () => {
      const authorId = 'author_alice';
      const postId = 'post_001';

      // Create author name
      const authorNameDelta = db.createDelta('system', [
        {
          role: 'named',
          target: { id: authorId, context: 'name' }
        },
        {
          role: 'name',
          target: 'Alice Johnson'
        }
      ]);

      // Create post
      const postDelta = db.createDelta('system', [
        {
          role: 'post',
          target: { id: postId, context: 'title' }
        },
        {
          role: 'title',
          target: 'Test Post'
        }
      ]);

      // Link author to post
      const authorshipDelta = db.createDelta('system', [
        {
          role: 'post',
          target: { id: postId, context: 'author' }
        },
        {
          role: 'author',
          target: { id: authorId, context: 'posts' }
        }
      ]);

      await db.persistDelta(authorNameDelta);
      await db.persistDelta(postDelta);
      await db.persistDelta(authorshipDelta);

      // Create schemas
      const personSchema = createStandardSchema('person', 'Person');
      const postSchema = createStandardSchema('post', 'Post', {
        author: {
          schema: personSchema,
          when: p => typeof p.target === 'object' && 'id' in p.target
        }
      });

      db.registerSchema(personSchema);
      db.registerSchema(postSchema);

      const hyperView = db.applyHyperSchema(postId, postSchema);

      expect(hyperView.id).toBe(postId);
      expect(hyperView.title).toBeDefined();
      expect(hyperView.author).toBeDefined();

      const authorDeltas = hyperView.author as Delta[];
      expect(authorDeltas.length).toBe(1);

      const authorPointer = authorDeltas[0].pointers.find(p => p.role === 'author');
      expect(authorPointer).toBeDefined();

      // The author target should be a nested HyperView
      const nestedAuthor = authorPointer!.target as any;
      expect(nestedAuthor.id).toBe(authorId);
      expect(nestedAuthor.name).toBeDefined();
    });

    it('should exclude negated deltas', async () => {
      const personId = 'person_bob';

      // Create a name
      const nameDelta = db.createDelta('author_1', [
        {
          role: 'named',
          target: { id: personId, context: 'name' }
        },
        {
          role: 'name',
          target: 'Bob'
        }
      ]);

      // Negate it
      const negation = db.negateDelta('author_1', nameDelta.id, 'Wrong person');

      await db.persistDelta(nameDelta);
      await db.persistDelta(negation);

      const schema = createStandardSchema('person', 'Person');
      const hyperView = db.applyHyperSchema(personId, schema);

      expect(hyperView.id).toBe(personId);
      expect(hyperView.name).toBeUndefined();
    });
  });

  describe('Materialized HyperViews', () => {
    it('should materialize and cache HyperViews', async () => {
      const personId = 'person_charlie';
      const nameDelta = db.createDelta('author_1', [
        {
          role: 'named',
          target: { id: personId, context: 'name' }
        },
        {
          role: 'name',
          target: 'Charlie'
        }
      ]);

      await db.persistDelta(nameDelta);

      const schema = createStandardSchema('person', 'Person');
      const materialized = db.materializeHyperView(personId, schema);

      expect(materialized.id).toBe(personId);
      expect(materialized._metadata.lastUpdated).toBeGreaterThan(0);
      expect(materialized._metadata.deltaCount).toBe(1);

      // Should be cached
      const cached = db.getHyperView(personId);
      expect(cached).toBeDefined();
      expect(cached!.id).toBe(personId);
    });
  });

  describe('Convenience Methods', () => {
    it('resolve() should return resolved entity properties', async () => {
      const personId = 'person_resolve';
      await db.annotate(personId, 'name', 'Alice', 'author_1');
      await db.annotate(personId, 'age', 30, 'author_1');

      const view = db.resolve(personId);
      expect(view.id).toBe(personId);
      expect(view.name).toBe('Alice');
      expect(view.age).toBe(30);
    });

    it('resolve() should return only id for unknown entity', () => {
      const view = db.resolve('nonexistent');
      expect(view).toEqual({ id: 'nonexistent' });
    });

    it('resolve() should use custom strategy', async () => {
      const personId = 'person_strategy';
      const d1 = await db.annotate(personId, 'name', 'Alice', 'author_1', 1000);
      const d2 = await db.annotate(personId, 'name', 'Bob', 'author_1', 2000);

      // firstWrite strategy: pick earliest
      const { firstWrite } = require('../queries/view-resolver');
      const view = db.resolve(personId, firstWrite);
      expect(view.name).toBe('Alice');
    });

    it('resolve() should support time-travel via queryTimestamp', async () => {
      const personId = 'person_timetravel';
      await db.annotate(personId, 'name', 'Alice', 'author_1', 1000);
      await db.annotate(personId, 'name', 'Bob', 'author_1', 2000);

      const pastView = db.resolve(personId, undefined, 1500);
      expect(pastView.name).toBe('Alice');

      const presentView = db.resolve(personId);
      expect(presentView.name).toBe('Bob');
    });

    it('allValuesFor() should return all values for a property', async () => {
      const personId = 'person_allvals';
      await db.annotate(personId, 'name', 'Alice', 'author_1', 1000);
      await db.annotate(personId, 'name', 'Bob', 'author_2', 2000);

      const names = db.allValuesFor(personId, 'name');
      expect(names).toHaveLength(2);
      expect(names).toContain('Alice');
      expect(names).toContain('Bob');
    });

    it('allValuesFor() should return empty for unknown property', async () => {
      const personId = 'person_novals';
      await db.annotate(personId, 'name', 'Alice', 'author_1');

      expect(db.allValuesFor(personId, 'age')).toEqual([]);
    });

    it('relatedIds() should return related entity IDs', async () => {
      const folderId = 'folder_1';
      const fileId = 'file_1';
      const fileId2 = 'file_2';

      await db.relate('parent', folderId, 'children', 'child', fileId, 'parent', 'author_1');
      await db.relate('parent', folderId, 'children', 'child', fileId2, 'parent', 'author_1');

      const childIds = db.relatedIds(folderId, 'children', 'child');
      expect(childIds).toHaveLength(2);
      expect(childIds).toContain(fileId);
      expect(childIds).toContain(fileId2);
    });

    it('relatedIds() should return empty for unknown property', () => {
      expect(db.relatedIds('entity_1', 'children', 'child')).toEqual([]);
    });

    it('annotate() should create and persist a delta', async () => {
      const entityId = 'entity_annotate';
      const delta = await db.annotate(entityId, 'name', 'Test', 'author_1');

      expect(delta.id).toBeDefined();
      expect(delta.pointers).toHaveLength(2);
      expect(delta.pointers[0].role).toBe('named');
      expect(delta.pointers[1].target).toBe('Test');

      // Should be persisted
      const retrieved = await db.getDeltas([delta.id]);
      expect(retrieved).toHaveLength(1);
    });

    it('annotate() should support explicit timestamp', async () => {
      const delta = await db.annotate('entity_ts', 'name', 'Test', 'author_1', 42000);
      expect(delta.timestamp).toBe(42000);
    });

    it('relate() should create and persist a relationship delta', async () => {
      const delta = await db.relate('parent', 'folder_1', 'children', 'child', 'file_1', 'parent', 'author_1');

      expect(delta.id).toBeDefined();
      expect(delta.pointers).toHaveLength(2);
      expect(delta.pointers[0]).toEqual({ role: 'parent', target: { id: 'folder_1', context: 'children' } });
      expect(delta.pointers[1]).toEqual({ role: 'child', target: { id: 'file_1', context: 'parent' } });

      const retrieved = await db.getDeltas([delta.id]);
      expect(retrieved).toHaveLength(1);
    });

    it('relate() should support explicit timestamp', async () => {
      const delta = await db.relate('a', 'e1', 'ctx', 'b', 'e2', 'ctx2', 'author_1', 99000);
      expect(delta.timestamp).toBe(99000);
    });
  });

  describe('Statistics', () => {
    it('should track instance statistics', async () => {
      const delta1 = db.createDelta('author_1', [{ role: 'test', target: 'value' }]);
      const delta2 = db.createDelta('author_1', [{ role: 'test', target: 'value' }]);

      await db.persistDelta(delta1);
      await db.persistDelta(delta2);

      db.subscribe({}, () => {});

      const stats = db.getStats();

      expect(stats.totalDeltas).toBe(2);
      expect(stats.activeSubscriptions).toBe(1);
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
