/**
 * Tests for MaterializedHyperView schema tracking fix
 */

import { RhizomeDB } from './instance';
import { createStandardSchema } from './hyperview';
import { PrimitiveSchemas } from './types';

describe('MaterializedHyperView Schema Tracking', () => {
  let db: RhizomeDB;

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory', enableIndexing: true });
  });

  it('should store schema ID in materialized view', async () => {
    const personId = 'person_alice';
    const schema = createStandardSchema('person_schema', 'Person');

    // Create person data
    await db.persistDelta(db.createDelta('user', [
      { localContext: 'named', target: { id: personId }, targetContext: 'name' },
      { localContext: 'name', target: 'Alice' }
    ]));

    // Materialize
    const view = db.materializeHyperView(personId, schema);

    // Should have schema ID
    expect(view._schemaId).toBe('person_schema');
  });

  it('should allow rebuilding view using stored schema', async () => {
    const personId = 'person_bob';
    const schema = createStandardSchema('person_schema', 'Person');

    // Create and materialize
    await db.persistDelta(db.createDelta('user', [
      { localContext: 'named', target: { id: personId }, targetContext: 'name' },
      { localContext: 'name', target: 'Bob' }
    ]));

    const view = db.materializeHyperView(personId, schema);
    expect(view._deltaCount).toBe(1);

    // Add more data
    await db.persistDelta(db.createDelta('user', [
      { localContext: 'person', target: { id: personId }, targetContext: 'age' },
      { localContext: 'age', target: 30 }
    ]));

    // Rebuild should use stored schema
    const rebuilt = db.rebuildHyperView(personId);
    expect(rebuilt._schemaId).toBe('person_schema');
    expect(rebuilt._deltaCount).toBe(2);
  });

  it('should support multiple schemas for the same object', async () => {
    const personId = 'person_charlie';

    // Create data
    await db.persistDelta(db.createDelta('user', [
      { localContext: 'named', target: { id: personId }, targetContext: 'name' },
      { localContext: 'name', target: 'Charlie' }
    ]));

    await db.persistDelta(db.createDelta('user', [
      { localContext: 'person', target: { id: personId }, targetContext: 'email' },
      { localContext: 'email', target: 'charlie@example.com' }
    ]));

    // Materialize with two different schemas
    const basicSchema = createStandardSchema('person_basic', 'PersonBasic');
    const fullSchema = createStandardSchema('person_full', 'PersonFull');

    const basicView = db.materializeHyperView(personId, basicSchema);
    const fullView = db.materializeHyperView(personId, fullSchema);

    // Both should be cached separately
    expect(basicView._schemaId).toBe('person_basic');
    expect(fullView._schemaId).toBe('person_full');

    // Should be able to retrieve specific views
    const retrieved1 = db.getHyperView(personId, 'person_basic');
    const retrieved2 = db.getHyperView(personId, 'person_full');

    expect(retrieved1?._schemaId).toBe('person_basic');
    expect(retrieved2?._schemaId).toBe('person_full');
  });

  it('should get any view if no schema specified', async () => {
    const personId = 'person_dave';
    const schema = createStandardSchema('person_schema', 'Person');

    await db.persistDelta(db.createDelta('user', [
      { localContext: 'named', target: { id: personId }, targetContext: 'name' },
      { localContext: 'name', target: 'Dave' }
    ]));

    const view = db.materializeHyperView(personId, schema);

    // Should be able to retrieve without specifying schema
    const retrieved = db.getHyperView(personId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(personId);
    expect(retrieved?._schemaId).toBe('person_schema');
  });

  it('should throw error when rebuilding non-existent view', () => {
    expect(() => {
      db.rebuildHyperView('nonexistent_id');
    }).toThrow('No materialized view found');
  });

  it('should throw error when schema not found for rebuild', async () => {
    const personId = 'person_eve';
    const schema = createStandardSchema('person_schema', 'Person');

    await db.persistDelta(db.createDelta('user', [
      { localContext: 'named', target: { id: personId }, targetContext: 'name' },
      { localContext: 'name', target: 'Eve' }
    ]));

    const view = db.materializeHyperView(personId, schema);

    // Manually corrupt the schema ID
    view._schemaId = 'nonexistent_schema';

    // Manually update the cache
    db['materializedViews'].set(`${personId}:nonexistent_schema`, view);

    expect(() => {
      db.rebuildHyperView(personId, 'nonexistent_schema');
    }).toThrow('Schema not found');
  });

  it('should update view correctly after delta addition', async () => {
    const personId = 'person_frank';
    const schema = createStandardSchema('person_schema', 'Person', {
      name: {
        schema: PrimitiveSchemas.String,
        when: (p) => PrimitiveSchemas.String.validate(p.target)
      }
    });

    // Initial data
    await db.persistDelta(db.createDelta('user', [
      { localContext: 'named', target: { id: personId }, targetContext: 'name' },
      { localContext: 'name', target: 'Frank' }
    ]));

    const view = db.materializeHyperView(personId, schema);
    expect(view._deltaCount).toBe(1);

    // Add more data
    const newDelta = db.createDelta('user', [
      { localContext: 'person', target: { id: personId }, targetContext: 'age' },
      { localContext: 'age', target: 40 }
    ]);
    await db.persistDelta(newDelta);

    // Update the view
    db.updateHyperView(view, newDelta);

    // Should have updated count
    expect(view._deltaCount).toBe(2);
    expect(view._schemaId).toBe('person_schema');
  });
});
