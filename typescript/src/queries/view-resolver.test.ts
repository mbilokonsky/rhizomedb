/**
 * Tests for View Resolution System
 */

import { RhizomeDB } from '../storage/instance';
import { createStandardSchema } from '../schemas/hyperview';
import {
  ViewResolver,
  mostRecent,
  firstWrite,
  allValues,
  trustedAuthor,
  consensus,
  average,
  minimum,
  maximum,
  extractPrimitive,
  createSimpleViewSchema
} from './view-resolver';
import { Delta, ViewSchema, PrimitiveSchemas, Pointer } from '../core/types';

describe('ViewResolver', () => {
  let db: RhizomeDB;
  let resolver: ViewResolver;

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory' });
    resolver = new ViewResolver();
  });

  describe('Resolution Strategies', () => {
    it('mostRecent should pick the latest delta', () => {
      const delta1 = db.createDelta('user1', [{ localContext: 'value', target: 'old' }]);
      const delta2 = db.createDelta('user1', [{ localContext: 'value', target: 'new' }]);

      // Manually set timestamps to ensure order
      delta1.timestamp = 1000;
      delta2.timestamp = 2000;

      const deltas = [delta1, delta2];
      const result = mostRecent(deltas);

      // Check that we got the delta with timestamp 2000
      expect(result?.timestamp).toBe(2000);
      const valuePointer = result?.pointers.find((p: Pointer) => p.localContext === 'value');
      expect(valuePointer?.target).toBe('new');
    });

    it('firstWrite should pick the earliest delta', () => {
      const deltas: Delta[] = [
        db.createDelta('user1', [{ localContext: 'value', target: 'old' }]),
        db.createDelta('user1', [{ localContext: 'value', target: 'new' }])
      ];

      deltas[0].timestamp = 1000;
      deltas[1].timestamp = 2000;

      const result = firstWrite(deltas);
      expect(result).toBe(deltas[0]);
    });

    it('allValues should return all deltas', () => {
      const deltas: Delta[] = [
        db.createDelta('user1', [{ localContext: 'value', target: 'one' }]),
        db.createDelta('user1', [{ localContext: 'value', target: 'two' }]),
        db.createDelta('user1', [{ localContext: 'value', target: 'three' }])
      ];

      const result = allValues(deltas);
      expect(result).toEqual(deltas);
    });

    it('trustedAuthor should prefer specific authors', () => {
      const deltas: Delta[] = [
        db.createDelta('untrusted', [{ localContext: 'name', target: 'Wrong Name' }]),
        db.createDelta('imdb_official', [{ localContext: 'name', target: 'Correct Name' }]),
        db.createDelta('random_user', [{ localContext: 'name', target: 'Another Wrong' }])
      ];

      deltas[0].timestamp = 3000;
      deltas[1].timestamp = 1000;
      deltas[2].timestamp = 2000;

      const strategy = trustedAuthor(['imdb_official', 'wikipedia']);
      const result = strategy(deltas) as Delta;

      expect(result.author).toBe('imdb_official');
      const namePointer = result.pointers.find(p => p.localContext === 'name');
      expect(namePointer?.target).toBe('Correct Name');
    });

    it('trustedAuthor should fallback to mostRecent if no trusted author', () => {
      const delta1 = db.createDelta('user1', [{ localContext: 'value', target: 'old' }]);
      const delta2 = db.createDelta('user2', [{ localContext: 'value', target: 'new' }]);

      delta1.timestamp = 1000;
      delta2.timestamp = 2000;

      const deltas = [delta1, delta2];
      const strategy = trustedAuthor(['trusted_user']);
      const result = strategy(deltas) as Delta;

      // Should fallback to most recent (timestamp 2000)
      expect(result.timestamp).toBe(2000);
      const valuePointer = result.pointers.find((p: Pointer) => p.localContext === 'value');
      expect(valuePointer?.target).toBe('new');
    });

    it('average should compute average of numeric values', () => {
      const deltas: Delta[] = [
        db.createDelta('user1', [{ localContext: 'rating', target: 5 }]),
        db.createDelta('user2', [{ localContext: 'rating', target: 3 }]),
        db.createDelta('user3', [{ localContext: 'rating', target: 4 }])
      ];

      const result = average(deltas);
      expect(result).toBe(4); // (5 + 3 + 4) / 3 = 4
    });

    it('minimum should return smallest numeric value', () => {
      const deltas: Delta[] = [
        db.createDelta('user1', [{ localContext: 'price', target: 100 }]),
        db.createDelta('user2', [{ localContext: 'price', target: 50 }]),
        db.createDelta('user3', [{ localContext: 'price', target: 75 }])
      ];

      const result = minimum(deltas);
      expect(result).toBe(50);
    });

    it('maximum should return largest numeric value', () => {
      const deltas: Delta[] = [
        db.createDelta('user1', [{ localContext: 'score', target: 100 }]),
        db.createDelta('user2', [{ localContext: 'score', target: 150 }]),
        db.createDelta('user3', [{ localContext: 'score', target: 125 }])
      ];

      const result = maximum(deltas);
      expect(result).toBe(150);
    });

    it('consensus should pick most common value', () => {
      const deltas: Delta[] = [
        db.createDelta('user1', [{ localContext: 'status', target: 'active' }]),
        db.createDelta('user2', [{ localContext: 'status', target: 'active' }]),
        db.createDelta('user3', [{ localContext: 'status', target: 'inactive' }])
      ];

      const result = consensus(deltas) as Delta;
      const statusPointer = result.pointers.find(p => p.localContext === 'status');
      expect(statusPointer?.target).toBe('active');
    });
  });

  describe('Value Extraction', () => {
    it('extractPrimitive should extract primitive by localContext', () => {
      const delta = db.createDelta('user', [
        { localContext: 'name', target: 'Alice' },
        { localContext: 'age', target: 30 }
      ]);

      const getName = extractPrimitive('name');
      const getAge = extractPrimitive('age');

      expect(getName(delta)).toBe('Alice');
      expect(getAge(delta)).toBe(30);
    });
  });

  describe('ViewResolver Integration', () => {
    it('should resolve a simple HyperView to a View', async () => {
      const personId = 'person_alice';

      // Create multiple name deltas (conflict)
      const delta1 = db.createDelta('user1', [
        { localContext: 'named', target: { id: personId }, targetContext: 'name' },
        { localContext: 'name', target: 'Alice' }
      ]);
      delta1.timestamp = 1000;

      const delta2 = db.createDelta('user2', [
        { localContext: 'named', target: { id: personId }, targetContext: 'name' },
        { localContext: 'name', target: 'Alice Smith' }
      ]);
      delta2.timestamp = 2000;

      await db.persistDelta(delta1);
      await db.persistDelta(delta2);

      // Create HyperView
      const personSchema = createStandardSchema('person', 'Person', {
        name: {
          schema: PrimitiveSchemas.String,
          when: (p) => PrimitiveSchemas.String.validate(p.target)
        }
      });
      const hyperView = db.applyHyperSchema(personId, personSchema);

      // Create ViewSchema
      const viewSchema: ViewSchema = {
        properties: {
          name: {
            source: 'name',
            extract: extractPrimitive('name'),
            resolve: mostRecent
          }
        }
      };

      // Resolve to View
      const view = resolver.resolveView(hyperView, viewSchema);

      expect(view.id).toBe(personId);
      expect(view.name).toBe('Alice Smith'); // Most recent wins
    });

    it('should handle multiple properties with different strategies', async () => {
      const productId = 'product_widget';

      // Create deltas for name (conflict - use mostRecent)
      const nameDelta1 = db.createDelta('user1', [
        { localContext: 'product', target: { id: productId }, targetContext: 'name' },
        { localContext: 'name', target: 'Widget' }
      ]);
      nameDelta1.timestamp = 1000;
      await db.persistDelta(nameDelta1);

      const nameDelta2 = db.createDelta('user2', [
        { localContext: 'product', target: { id: productId }, targetContext: 'name' },
        { localContext: 'name', target: 'Super Widget' }
      ]);
      nameDelta2.timestamp = 2000;
      await db.persistDelta(nameDelta2);

      // Create deltas for price (conflict - use minimum)
      await db.persistDelta(db.createDelta('seller1', [
        { localContext: 'product', target: { id: productId }, targetContext: 'price' },
        { localContext: 'price', target: 100 }
      ]));

      await db.persistDelta(db.createDelta('seller2', [
        { localContext: 'product', target: { id: productId }, targetContext: 'price' },
        { localContext: 'price', target: 85 }
      ]));

      // Create deltas for rating (conflict - use average)
      await db.persistDelta(db.createDelta('reviewer1', [
        { localContext: 'product', target: { id: productId }, targetContext: 'rating' },
        { localContext: 'rating', target: 5 }
      ]));

      await db.persistDelta(db.createDelta('reviewer2', [
        { localContext: 'product', target: { id: productId }, targetContext: 'rating' },
        { localContext: 'rating', target: 3 }
      ]));

      // Create HyperView
      const productSchema = createStandardSchema('product', 'Product');
      const hyperView = db.applyHyperSchema(productId, productSchema);

      // Create ViewSchema with different strategies
      const viewSchema: ViewSchema = {
        properties: {
          name: {
            source: 'name',
            extract: extractPrimitive('name'),
            resolve: mostRecent
          },
          price: {
            source: 'price',
            extract: extractPrimitive('price'),
            resolve: minimum
          },
          rating: {
            source: 'rating',
            extract: extractPrimitive('rating'),
            resolve: average
          }
        }
      };

      const view = resolver.resolveView(hyperView, viewSchema);

      expect(view.id).toBe(productId);
      expect(view.name).toBe('Super Widget'); // Most recent
      expect(view.price).toBe(85); // Minimum
      expect(view.rating).toBe(4); // Average of 5 and 3
    });

    it('should handle missing properties gracefully', async () => {
      const personId = 'person_bob';

      // Only create name, no age
      await db.persistDelta(db.createDelta('user', [
        { localContext: 'named', target: { id: personId }, targetContext: 'name' },
        { localContext: 'name', target: 'Bob' }
      ]));

      const personSchema = createStandardSchema('person', 'Person');
      const hyperView = db.applyHyperSchema(personId, personSchema);

      const viewSchema: ViewSchema = {
        properties: {
          name: {
            source: 'name',
            extract: extractPrimitive('name'),
            resolve: mostRecent
          },
          age: {
            source: 'age',
            extract: extractPrimitive('age'),
            resolve: mostRecent
          }
        }
      };

      const view = resolver.resolveView(hyperView, viewSchema);

      expect(view.id).toBe(personId);
      expect(view.name).toBe('Bob');
      expect(view.age).toBeUndefined(); // Missing property is undefined
    });

    it('should use trustedAuthor strategy correctly', async () => {
      const movieId = 'movie_matrix';

      // Create multiple budget assertions
      await db.persistDelta(db.createDelta('random_user', [
        { localContext: 'movie', target: { id: movieId }, targetContext: 'budget' },
        { localContext: 'budget', target: 50000000 }
      ]));

      await db.persistDelta(db.createDelta('imdb_official', [
        { localContext: 'movie', target: { id: movieId }, targetContext: 'budget' },
        { localContext: 'budget', target: 63000000 }
      ]));

      await db.persistDelta(db.createDelta('wikipedia', [
        { localContext: 'movie', target: { id: movieId }, targetContext: 'budget' },
        { localContext: 'budget', target: 65000000 }
      ]));

      const movieSchema = createStandardSchema('movie', 'Movie');
      const hyperView = db.applyHyperSchema(movieId, movieSchema);

      const viewSchema: ViewSchema = {
        properties: {
          budget: {
            source: 'budget',
            extract: extractPrimitive('budget'),
            resolve: trustedAuthor(['imdb_official', 'wikipedia'])
          }
        }
      };

      const view = resolver.resolveView(hyperView, viewSchema);

      expect(view.budget).toBe(63000000); // IMDB is first in trust list
    });

    it('should handle allValues strategy returning arrays', async () => {
      const personId = 'person_charlie';

      // Create multiple email addresses
      await db.persistDelta(db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'email' },
        { localContext: 'email', target: 'charlie@work.com' }
      ]));

      await db.persistDelta(db.createDelta('user', [
        { localContext: 'person', target: { id: personId }, targetContext: 'email' },
        { localContext: 'email', target: 'charlie@personal.com' }
      ]));

      const personSchema = createStandardSchema('person', 'Person');
      const hyperView = db.applyHyperSchema(personId, personSchema);

      const viewSchema: ViewSchema = {
        properties: {
          emails: {
            source: 'email',
            extract: extractPrimitive('email'),
            resolve: allValues
          }
        }
      };

      const view = resolver.resolveView(hyperView, viewSchema);

      expect(view.emails).toHaveLength(2);
      expect(view.emails).toContain('charlie@work.com');
      expect(view.emails).toContain('charlie@personal.com');
    });
  });

  describe('Helper Functions', () => {
    it('createSimpleViewSchema should create valid schema', () => {
      const schema = createSimpleViewSchema({
        name: { source: 'name', localContext: 'name', strategy: mostRecent },
        age: { source: 'age', localContext: 'age', strategy: mostRecent }
      });

      expect(schema.properties.name).toBeDefined();
      expect(schema.properties.age).toBeDefined();
      expect(schema.properties.name.source).toBe('name');
      expect(schema.properties.name.resolve).toBe(mostRecent);
    });
  });
});
