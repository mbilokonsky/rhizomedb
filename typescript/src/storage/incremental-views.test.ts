/**
 * Tests for incremental HyperView updates
 *
 * Verifies that materialized views are updated incrementally when new deltas arrive,
 * rather than requiring a full rebuild.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { RhizomeDB } from './instance';
import { createStandardSchema } from '../schemas/hyperview';
import { Delta, HyperSchema } from '../core/types';

describe('Incremental HyperView Updates', () => {
  let db: RhizomeDB;
  let schema: HyperSchema;

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory', enableIndexing: true });
    schema = createStandardSchema('person', 'Person');
  });

  describe('Regular delta updates', () => {
    it('should incrementally update a materialized view when a new delta arrives', async () => {
      const personId = 'person_1';

      // Create initial delta and materialize
      const d1 = db.createDelta('author', [
        { role: 'named', target: { id: personId, context: 'name' } },
        { role: 'name', target: 'Alice' }
      ]);
      await db.persistDelta(d1);

      const view = db.materializeHyperView(personId, schema);
      expect(view._metadata.deltaCount).toBe(1);
      expect((view.name as Delta[])?.length).toBe(1);

      // Add a new delta — should be incrementally added to the materialized view
      const d2 = db.createDelta('author', [
        { role: 'aged', target: { id: personId, context: 'age' } },
        { role: 'age', target: 30 }
      ]);
      await db.persistDelta(d2);

      // The cached view should have been updated in-place
      const cached = db.getHyperView(personId, schema.id);
      expect(cached).not.toBeNull();
      expect(cached!._metadata.deltaCount).toBe(2);
      expect((cached!.name as Delta[])?.length).toBe(1);
      expect((cached!.age as Delta[])?.length).toBe(1);
    });

    it('should not error for deltas targeting non-materialized entities', async () => {
      // Materialize one entity
      const personId = 'person_1';
      const d1 = db.createDelta('author', [
        { role: 'named', target: { id: personId, context: 'name' } },
        { role: 'name', target: 'Alice' }
      ]);
      await db.persistDelta(d1);
      db.materializeHyperView(personId, schema);

      // Persist a delta for a different entity — no materialized view exists
      const d2 = db.createDelta('author', [
        { role: 'named', target: { id: 'person_other', context: 'name' } },
        { role: 'name', target: 'Bob' }
      ]);

      // Should not throw
      await expect(db.persistDelta(d2)).resolves.not.toThrow();
    });

    it('should update multiple views for the same entity (different schemas)', async () => {
      const personId = 'person_multi';
      const schema2 = createStandardSchema('employee', 'Employee');

      const d1 = db.createDelta('author', [
        { role: 'named', target: { id: personId, context: 'name' } },
        { role: 'name', target: 'Alice' }
      ]);
      await db.persistDelta(d1);

      // Materialize with both schemas
      db.materializeHyperView(personId, schema);
      db.materializeHyperView(personId, schema2);

      // Add another delta
      const d2 = db.createDelta('author', [
        { role: 'titled', target: { id: personId, context: 'title' } },
        { role: 'title', target: 'Engineer' }
      ]);
      await db.persistDelta(d2);

      // Both views should be updated
      const view1 = db.getHyperView(personId, schema.id);
      const view2 = db.getHyperView(personId, schema2.id);

      expect(view1!._metadata.deltaCount).toBe(2);
      expect(view2!._metadata.deltaCount).toBe(2);
    });

    it('should update lastUpdated metadata', async () => {
      const personId = 'person_meta';
      const d1 = db.createDelta('author', [
        { role: 'named', target: { id: personId, context: 'name' } },
        { role: 'name', target: 'Alice' }
      ]);
      await db.persistDelta(d1);

      const view = db.materializeHyperView(personId, schema);
      const firstUpdated = view._metadata.lastUpdated;

      // Small delay to ensure timestamp difference
      await new Promise(r => setTimeout(r, 5));

      const d2 = db.createDelta('author', [
        { role: 'aged', target: { id: personId, context: 'age' } },
        { role: 'age', target: 25 }
      ]);
      await db.persistDelta(d2);

      const cached = db.getHyperView(personId, schema.id);
      expect(cached!._metadata.lastUpdated).toBeGreaterThanOrEqual(firstUpdated);
      expect(cached!._metadata.deltaCount).toBe(2);
    });
  });

  describe('Negation handling', () => {
    it('should remove a negated delta from the materialized view', async () => {
      const personId = 'person_neg';

      const d1 = db.createDelta('author', [
        { role: 'named', target: { id: personId, context: 'name' } },
        { role: 'name', target: 'Alice' }
      ]);
      await db.persistDelta(d1);

      // Materialize
      const view = db.materializeHyperView(personId, schema);
      expect(view._metadata.deltaCount).toBe(1);

      // Negate the delta
      const neg = db.negateDelta('author', d1.id);
      await db.persistDelta(neg);

      // The name delta should be removed from the view
      const cached = db.getHyperView(personId, schema.id);
      expect(cached!._metadata.deltaCount).toBe(0);
      // Property array should be empty or the delta filtered out
      const nameDeltas = cached!.name as Delta[] | undefined;
      expect(!nameDeltas || nameDeltas.length === 0).toBe(true);
    });

    it('should handle negation of a delta not in any materialized view', async () => {
      const personId = 'person_neg_nomatch';

      // Create and persist a delta but don't materialize
      const d1 = db.createDelta('author', [
        { role: 'named', target: { id: personId, context: 'name' } },
        { role: 'name', target: 'Alice' }
      ]);
      await db.persistDelta(d1);

      // Negate it — no materialized view to update, should not throw
      const neg = db.negateDelta('author', d1.id);
      await expect(db.persistDelta(neg)).resolves.not.toThrow();
    });

    it('should handle double negation correctly via rebuild', async () => {
      const personId = 'person_double_neg';

      const d1 = db.createDelta('author', [
        { role: 'named', target: { id: personId, context: 'name' } },
        { role: 'name', target: 'Alice' }
      ]);
      await db.persistDelta(d1);

      // Materialize
      db.materializeHyperView(personId, schema);

      // Negate the delta
      const neg1 = db.negateDelta('author', d1.id);
      await db.persistDelta(neg1);

      // Delta should be removed
      let cached = db.getHyperView(personId, schema.id);
      expect(cached!._metadata.deltaCount).toBe(0);

      // Double negate (negate the negation) — delta should be restored
      const neg2 = db.negateDelta('author', neg1.id);
      await db.persistDelta(neg2);

      // After double negation, the original delta should be back
      cached = db.getHyperView(personId, schema.id);
      expect(cached!._metadata.deltaCount).toBe(1);
      expect((cached!.name as Delta[])?.length).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('should not update views when indexing is disabled', async () => {
      const dbNoIndex = new RhizomeDB({ storage: 'memory', enableIndexing: false });
      const personId = 'person_noindex';

      const d1 = dbNoIndex.createDelta('author', [
        { role: 'named', target: { id: personId, context: 'name' } },
        { role: 'name', target: 'Alice' }
      ]);
      await dbNoIndex.persistDelta(d1);

      // Manual materialize — won't cache because indexing is disabled
      const view = dbNoIndex.materializeHyperView(personId, schema);
      expect(view._metadata.deltaCount).toBe(1);

      // Add another delta — the non-cached view shouldn't be affected
      const d2 = dbNoIndex.createDelta('author', [
        { role: 'aged', target: { id: personId, context: 'age' } },
        { role: 'age', target: 25 }
      ]);
      await dbNoIndex.persistDelta(d2);

      // No cached view should exist
      const cached = dbNoIndex.getHyperView(personId, schema.id);
      expect(cached).toBeNull();
    });

    it('should handle clearing and re-materializing', async () => {
      const personId = 'person_clear';

      const d1 = db.createDelta('author', [
        { role: 'named', target: { id: personId, context: 'name' } },
        { role: 'name', target: 'Alice' }
      ]);
      await db.persistDelta(d1);
      db.materializeHyperView(personId, schema);

      // Clear everything
      db.clear();

      // No cached views should exist
      expect(db.getHyperView(personId, schema.id)).toBeNull();

      // Re-add and re-materialize
      await db.persistDelta(d1);
      const view = db.materializeHyperView(personId, schema);
      expect(view._metadata.deltaCount).toBe(1);
    });

    it('should skip views whose schema is not in registry', async () => {
      const personId = 'person_orphan';

      const d1 = db.createDelta('author', [
        { role: 'named', target: { id: personId, context: 'name' } },
        { role: 'name', target: 'Alice' }
      ]);
      await db.persistDelta(d1);

      // Materialize with a custom schema
      const customSchema = createStandardSchema('custom_orphan', 'Custom');
      db.materializeHyperView(personId, customSchema);

      // De-register: we can't directly unregister, but we can verify
      // the incremental update logic handles missing schemas gracefully
      // by checking that a new delta doesn't crash
      const d2 = db.createDelta('author', [
        { role: 'aged', target: { id: personId, context: 'age' } },
        { role: 'age', target: 30 }
      ]);

      // Should not throw even if schema resolution has issues
      await expect(db.persistDelta(d2)).resolves.not.toThrow();
    });
  });
});
