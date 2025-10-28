# Fixtures Module

Test fixtures and sample data for RhizomeDB testing and demos.

## Files

### `movie-database.fixture.ts`
Comprehensive movie database fixture with films, people, and relationships.

**Purpose:** Demonstrate RhizomeDB capabilities with realistic, interconnected data.

**Data Included:**
- **Films**: Matrix trilogy, Star Wars saga, Lord of the Rings trilogy, + expanded filmography
- **People**: Actors, directors, producers (Keanu Reeves, Lana Wachowski, Peter Jackson, etc.)
- **Relationships**: Acted-in, directed, produced
- **Metadata**: Titles, release years, roles

**Total Size:** ~1,379 deltas representing rich interconnected graph

**Exports:**
- `seedMovieDatabase(db)` - Seeds database with full dataset
- `movieSchemas` - Pre-configured schemas for films and people
- Type definitions for movies, people, roles

**Schemas Provided:**

1. **`filmSchema`** - Schema for film objects
   ```typescript
   {
     id: 'film-schema',
     select: (objectId, delta) => // deltas pointing to this film
     transform: {
       actor: { schema: 'person-schema' },    // Expand actor references
       director: { schema: 'person-schema' }, // Expand director references
       producer: { schema: 'person-schema' }  // Expand producer references
     }
   }
   ```

2. **`personSchema`** - Schema for person objects
   ```typescript
   {
     id: 'person-schema',
     select: (objectId, delta) => // deltas pointing to this person
     transform: {
       film: { schema: 'film-schema' }  // Expand film references
     }
   }
   ```

**Usage:**

```typescript
import { RhizomeDB } from '../storage/instance';
import { seedMovieDatabase, movieSchemas } from '../fixtures/movie-database.fixture';

// Create database
const db = new RhizomeDB({ storage: 'memory' });

// Register schemas
db.registerSchema(movieSchemas.filmSchema);
db.registerSchema(movieSchemas.personSchema);

// Seed data
await seedMovieDatabase(db);

// Query the data
const matrixDeltas = db.queryDeltas({
  predicate: (delta) =>
    delta.pointers.some(p =>
      p.role === 'title' &&
      p.target === 'The Matrix'
    )
});

// Get film view
const matrixView = db.applyHyperSchema('film-the-matrix', movieSchemas.filmSchema);
// {
//   id: 'film-the-matrix',
//   actors: [deltas pointing to actors],
//   directors: [deltas pointing to directors],
//   default: [title delta, year delta, etc.]
// }

// Get person view
const keanuView = db.applyHyperSchema('person-keanu-reeves', movieSchemas.personSchema);
// {
//   id: 'person-keanu-reeves',
//   films: [deltas for films they acted in],
//   default: [name delta, etc.]
// }
```

**Data Structure:**

Films:
```typescript
{
  id: 'film-the-matrix',
  title: 'The Matrix',
  year: 1999,
  actors: ['person-keanu-reeves', 'person-carrie-anne-moss', ...],
  directors: ['person-lana-wachowski', 'person-lilly-wachowski'],
  // ... more relationships
}
```

People:
```typescript
{
  id: 'person-keanu-reeves',
  name: 'Keanu Reeves',
  films: [
    { filmId: 'film-the-matrix', role: 'Neo' },
    { filmId: 'film-the-matrix-reloaded', role: 'Neo' },
    // ... more films
  ]
}
```

**Movies Included:**

*Matrix Trilogy:*
- The Matrix (1999)
- The Matrix Reloaded (2003)
- The Matrix Revolutions (2003)

*Star Wars Original Trilogy:*
- Star Wars (1977)
- The Empire Strikes Back (1980)
- Return of the Jedi (1983)

*Lord of the Rings:*
- The Fellowship of the Ring (2001)
- The Two Towers (2002)
- The Return of the King (2003)

*Expanded Filmography:*
- Additional films for realistic network effects
- Demonstrates schema relationships at scale

**Statistics:**
- ~30+ films
- ~50+ people
- ~1,379 deltas total
- Rich interconnected graph structure

**Use Cases:**

1. **Testing:**
   ```typescript
   test('query films by year range', async () => {
     const db = new RhizomeDB({ storage: 'memory' });
     await seedMovieDatabase(db);

     const films2000s = db.queryDeltas({
       predicate: (d) =>
         d.pointers.some(p =>
           p.role === 'year' &&
           typeof p.target === 'number' &&
           p.target >= 2000 && p.target < 2010
         )
     });

     expect(films2000s.length).toBeGreaterThan(0);
   });
   ```

2. **Demos:**
   ```typescript
   // Demo GraphQL API
   const db = new RhizomeDB({ storage: 'memory' });
   await seedMovieDatabase(db);

   const schema = createRhizomeGraphQLSchema(db);
   const server = new ApolloServer({ schema });
   // Now have rich data to query
   ```

3. **Performance Testing:**
   ```typescript
   // Benchmark query performance
   const db = new RhizomeDB({
     storage: 'memory',
     enableIndexing: true
   });
   await seedMovieDatabase(db);

   console.time('query by author');
   db.queryDeltas({ authors: ['system'] });
   console.timeEnd('query by author');
   ```

4. **Schema Testing:**
   ```typescript
   // Test complex schema transformations
   const db = new RhizomeDB({ storage: 'memory' });
   await seedMovieDatabase(db);

   const filmView = db.applyHyperSchema('film-the-matrix', filmSchema);
   // Verify nested expansions work correctly
   ```

**Testing:**
`movie-database.test.ts` - 4 tests:
- Seeds database successfully
- Queries films correctly
- Applies film schema
- Applies person schema

**Data Integrity:**
- All references are valid (no dangling pointers)
- Bidirectional relationships (actor → film, film → actor)
- Consistent author/system IDs
- Realistic timestamps

**Extending the Fixture:**

Add more movies:
```typescript
export async function seedMovieDatabase(db: RhizomeDB) {
  // Existing seeding...

  // Add new film
  const newFilm = db.createDelta('system', [
    { role: 'type', target: 'film' },
    { role: 'title', target: 'New Movie' },
    { role: 'year', target: 2024 }
  ]);
  await db.persistDelta(newFilm);

  // Add relationships
  const actorRelation = db.createDelta('system', [
    { role: 'actor', target: { id: 'person-new-actor' } },
    { role: 'film', target: { id: 'film-new-movie', context: 'films' } }
  ]);
  await db.persistDelta(actorRelation);
}
```

## Best Practices

**For Testing:**
- Use fixture for integration tests, not unit tests
- Reset database between tests
- Don't modify fixture data in tests (create separate deltas)

**For Demos:**
- Explain the data structure first
- Show simple queries before complex ones
- Demonstrate schema relationships
- Highlight negation and time-travel features

**For Benchmarks:**
- Use consistent seed data
- Measure both indexed and non-indexed queries
- Test with varying data sizes
- Profile view materialization

## Performance

Seeding performance:
- ~1,379 deltas
- Memory storage: ~50ms
- LevelDB storage: ~500ms

Query performance (with indexes):
- Find film by title: O(1)
- Find person by name: O(1)
- Find all films by actor: O(k) where k = films
- Complex graph traversal: O(n) where n = related deltas

## Future Enhancements

Potential additions:
- TV shows and episodes
- More films and people
- Ratings and reviews
- Box office data
- Streaming availability
- Multiple languages
- Genre classifications
- Awards and nominations

This fixture provides a solid foundation for testing and demonstrating RhizomeDB's graph database capabilities with real-world relational data.
