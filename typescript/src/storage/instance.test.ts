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
          localContext: 'named',
          target: { id: 'person_1', context: 'name' }
        },
        {
          localContext: 'name',
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
      expect(negation.pointers[0].localContext).toBe('negates');
      expect(negation.pointers[0].target).toEqual({ id: targetDeltaId, context: 'negated_by' });
      expect(negation.pointers[1].localContext).toBe('reason');
      expect(negation.pointers[1].target).toBe('Test reason');
    });
  });

  describe('Delta Persistence', () => {
    it('should persist and retrieve deltas', async () => {
      const delta = db.createDelta('author_1', [
        {
          localContext: 'test',
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
        { localContext: 'test', target: { id: 'obj_1', context: 'prop' } }
      ]);
      const delta2 = db.createDelta('author_2', [
        { localContext: 'test', target: { id: 'obj_2', context: 'prop' } }
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

      const delta = db.createDelta('author_1', [{ localContext: 'test', target: 'value' }]);
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

      const delta1 = db.createDelta('author_1', [{ localContext: 'test', target: 'value' }]);
      const delta2 = db.createDelta('author_2', [{ localContext: 'test', target: 'value' }]);

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

      const delta1 = db.createDelta('author_1', [{ localContext: 'test', target: 'value' }]);
      await db.persistDelta(delta1);

      sub.pause();

      const delta2 = db.createDelta('author_1', [{ localContext: 'test', target: 'value' }]);
      await db.persistDelta(delta2);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(received).toHaveLength(1);

      sub.resume();

      const delta3 = db.createDelta('author_1', [{ localContext: 'test', target: 'value' }]);
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
          localContext: 'named',
          target: { id: personId, context: 'name' }
        },
        {
          localContext: 'name',
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
          localContext: 'named',
          target: { id: authorId, context: 'name' }
        },
        {
          localContext: 'name',
          target: 'Alice Johnson'
        }
      ]);

      // Create post
      const postDelta = db.createDelta('system', [
        {
          localContext: 'post',
          target: { id: postId, context: 'title' }
        },
        {
          localContext: 'title',
          target: 'Test Post'
        }
      ]);

      // Link author to post
      const authorshipDelta = db.createDelta('system', [
        {
          localContext: 'post',
          target: { id: postId, context: 'author' }
        },
        {
          localContext: 'author',
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

      const authorPointer = authorDeltas[0].pointers.find(p => p.localContext === 'author');
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
          localContext: 'named',
          target: { id: personId, context: 'name' }
        },
        {
          localContext: 'name',
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
          localContext: 'named',
          target: { id: personId, context: 'name' }
        },
        {
          localContext: 'name',
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

  describe('Statistics', () => {
    it('should track instance statistics', async () => {
      const delta1 = db.createDelta('author_1', [{ localContext: 'test', target: 'value' }]);
      const delta2 = db.createDelta('author_1', [{ localContext: 'test', target: 'value' }]);

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
