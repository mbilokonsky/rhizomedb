# RhizomeDB Demo: GraphQL + Movie Database

> **A demonstration of RhizomeDB's capabilities using a real-world movie database with 62+ films, 150+ people, and 1,379 immutable deltas.**

---

## 🌟 What Makes RhizomeDB Special?

RhizomeDB is a **rhizomatic database** built on immutable delta-CRDTs represented as hyperedges. Unlike traditional databases:

- ✨ **Immutable by Design** - Every assertion is an immutable delta with full provenance
- 🕐 **Time-Travel Queries** - Query the database at any point in its history
- 🔄 **Delta Negation** - Correct mistakes without deletion via negation deltas
- 🔗 **HyperGraph Structure** - Deltas are hyperedges connecting domain objects
- 📊 **GraphQL Native** - Automatic GraphQL API generation from HyperSchemas
- 🏛️ **Schemas as Data** - Schemas are themselves queryable deltas (meta-circular!)

---

## 📊 Simple GraphQL Queries

### Query a Single Movie
[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L504-L527)

**Query:**
```graphql
query {
  Movie(id: "movie_matrix") {
    id
    title
    year
    runtime
  }
}
```

**Result:**
```json
{
  "data": {
    "Movie": {
      "id": "movie_matrix",
      "title": "The Matrix",
      "year": 1999,
      "runtime": 136
    }
  }
}
```

---

### Query a Person
[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L529-L550)

**Query:**
```graphql
query {
  Person(id: "person_reeves_keanu") {
    id
    name
    birthYear
  }
}
```

**Result:**
```json
{
  "data": {
    "Person": {
      "id": "person_reeves_keanu",
      "name": "Keanu Reeves",
      "birthYear": 1964
    }
  }
}
```

---

## 🎬 Complex Nested Queries

### Movie with Nested Director
[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L552-L585)

**Query:**
```graphql
query {
  Movie(id: "movie_lotr_fellowship") {
    id
    title
    year
    runtime
    director {
      id
      name
      birthYear
    }
  }
}
```

**Result:**
```json
{
  "data": {
    "Movie": {
      "id": "movie_lotr_fellowship",
      "title": "The Lord of the Rings: The Fellowship of the Ring",
      "year": 2001,
      "runtime": 178,
      "director": [{
        "id": "person_jackson_peter",
        "name": "Peter Jackson",
        "birthYear": 1961
      }]
    }
  }
}
```

> **Note:** Domain object references (like `director`) return arrays to support multi-valued relationships. Single-valued fields return an array with one element.

---

### Role with Nested Actor and Movie
[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L587-L626)

**Query:**
```graphql
query {
  Role(id: "role_matrix_neo") {
    id
    character
    actor {
      id
      name
      birthYear
    }
    movie {
      id
      title
      year
      runtime
    }
  }
}
```

**Result:**
```json
{
  "data": {
    "Role": {
      "id": "role_matrix_neo",
      "character": "Neo",
      "actor": [{
        "id": "person_reeves_keanu",
        "name": "Keanu Reeves",
        "birthYear": 1964
      }],
      "movie": [{
        "id": "movie_matrix",
        "title": "The Matrix",
        "year": 1999,
        "runtime": 136
      }]
    }
  }
}
```

---

## 📚 Querying Collections

### Query a Trilogy
[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L628-L647)

**Query:**
```graphql
query {
  Trilogy(id: "trilogy_matrix") {
    id
    name
  }
}
```

**Result:**
```json
{
  "data": {
    "Trilogy": {
      "id": "trilogy_matrix",
      "name": "The Matrix Trilogy"
    }
  }
}
```

---

### Query Multiple Movies at Once
[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L649-L677)

**Query:**
```graphql
query {
  Movies(ids: ["movie_matrix", "movie_matrix_reloaded"]) {
    id
    title
    year
    runtime
  }
}
```

**Result:**
```json
{
  "data": {
    "Movies": [
      {
        "id": "movie_matrix",
        "title": "The Matrix",
        "year": 1999,
        "runtime": 136
      },
      {
        "id": "movie_matrix_reloaded",
        "title": "The Matrix Reloaded",
        "year": 2003,
        "runtime": 138
      }
    ]
  }
}
```

---

## ✍️ Mutations: Creating Data

### Create a New Person
[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L679-L710)

**Mutation:**
```graphql
mutation {
  createPerson(
    id: "person_nolan_christopher"
    author: "admin"
    input: { name: "Christopher Nolan", birthYear: 1970 }
  ) {
    id
    name
    birthYear
  }
}
```

**Result:**
```json
{
  "data": {
    "createPerson": {
      "id": "person_nolan_christopher",
      "name": "Christopher Nolan",
      "birthYear": 1970
    }
  }
}
```

---

### Create a New Movie
[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L712-L739)

**Mutation:**
```graphql
mutation {
  createMovie(
    id: "movie_inception"
    author: "admin"
    input: { title: "Inception", year: 2010, runtime: 148 }
  ) {
    id
    title
    year
    runtime
  }
}
```

**Result:**
```json
{
  "data": {
    "createMovie": {
      "id": "movie_inception",
      "title": "Inception",
      "year": 2010,
      "runtime": 148
    }
  }
}
```

---

### Update a Movie (with Automatic Delta Negation)
[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L741-L790)

**Mutation:**
```graphql
mutation {
  updateMovie(
    id: "movie_inception"
    author: "admin"
    input: { title: "Inception (Director's Cut)" }
  ) {
    id
    title
  }
}
```

**Result:**
```json
{
  "data": {
    "updateMovie": {
      "id": "movie_inception",
      "title": "Inception (Director's Cut)"
    }
  }
}
```

**What happens behind the scenes:**
1. RhizomeDB finds the existing delta for the `title` property
2. Automatically creates a negation delta for the old value
3. Creates a new delta with the updated value
4. Returns the updated object

This preserves full history while ensuring clean, conflict-free updates!

---

## 🔄 Delta Negation: Correcting Mistakes

### Negate a Delta
[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L792-L821)

In RhizomeDB, we don't delete data—we **negate** incorrect deltas.

**Step 1: Create a delta**
```graphql
mutation {
  createDelta(
    author: "admin"
    pointers: "[{\"localContext\":\"test\",\"target\":\"testvalue\"}]"
  )
}
```

**Step 2: Negate it**
```graphql
mutation {
  negateDelta(
    author: "admin"
    targetDeltaId: "delta-abc-123"
    reason: "Test negation"
  )
}
```

**Result:** The delta is negated, preserving full history while correcting the error.

---

## 🎯 Advanced Delta Queries

### Find All Movies from a Specific Year
[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L117-L137)

Using the delta query API:

```typescript
const movies1999 = db.queryDeltas({
  predicate: (delta) => {
    const yearPointer = delta.pointers.find(p => p.localContext === 'year');
    return yearPointer?.target === 1999;
  }
});
```

**Results:** Returns The Matrix, Star Wars Episode I, and other 1999 releases.

---

### Find All Movies by a Director
[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L149-L167)

```typescript
const jacksonMovies = db.queryDeltas({
  targetIds: ['person_jackson_peter']
});

const movieIds = jacksonMovies
  .filter(d => d.pointers.some(p => p.localContext === 'director'))
  .map(d => extractMovieId(d));
```

**Results:** 7 films (3 LOTR + 3 Hobbit + King Kong 2005)

---

### Find Longest Running Movies
[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L380-L404)

```typescript
const runtimeDeltas = db.queryDeltas({
  predicate: (delta) => delta.pointers.some(p => p.localContext === 'runtime')
});

const movieRuntimes = runtimeDeltas.map(extractRuntime).sort((a, b) => b - a);
```

**Results:** LOTR: Return of the King (201 minutes) is the longest film in the dataset.

---

### Demonstrate Delta Negation for Corrections
[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L431-L466)

```typescript
// Add incorrect data
const wrongDelta = db.createDelta('user', [
  { localContext: 'budget', target: { id: 'movie_matrix' }, targetContext: 'budget' },
  { localContext: 'budget', target: 1000000 } // Wrong!
]);
await db.persistDelta(wrongDelta);

// Negate it
const negation = db.negateDelta('user', wrongDelta.id, 'Incorrect budget');
await db.persistDelta(negation);

// Add correct data
const correctDelta = db.createDelta('user', [
  { localContext: 'budget', target: { id: 'movie_matrix' }, targetContext: 'budget' },
  { localContext: 'budget', target: 63000000 } // Correct!
]);
await db.persistDelta(correctDelta);
```

**Result:** Queries now return the correct budget, but the full history is preserved!

---

## 📦 Database Statistics

[Tested in movie-database.test.ts](typescript/src/movie-database.test.ts#L49-L55) and [movie-database.test.ts](typescript/src/movie-database.test.ts#L218-L224)

The movie database contains:
- **62+ movies** spanning 1977-2019
- **150+ people** (actors, directors, writers, producers)
- **280+ roles** connecting actors to movies
- **10 trilogies** (Matrix, Star Wars, LOTR, Hobbit, etc.)
- **1,379 immutable deltas** representing all assertions

---

## 🏗️ How It Works

### HyperSchemas Define Structure

RhizomeDB uses **HyperSchemas** to define how data is structured and validated. Schemas specify both **domain object** relationships and **primitive field** types:

```typescript
const movieSchema: HyperSchema = {
  id: 'movie_schema',
  name: 'Movie',
  select: selectByTargetContext,
  transform: {
    // Primitive fields with type validation
    title: {
      schema: PrimitiveSchemas.String,
      when: (p) => PrimitiveSchemas.String.validate(p.target)
    },
    year: {
      schema: PrimitiveSchemas.Integer.Year,
      when: (p) => PrimitiveSchemas.Integer.Year.validate(p.target)
    },
    runtime: {
      schema: PrimitiveSchemas.Integer,
      when: (p) => PrimitiveSchemas.Integer.validate(p.target)
    },

    // Domain object relationships
    director: {
      schema: 'person_schema',
      when: (p) => typeof p.target === 'object' && 'id' in p.target
    }
  }
};
```

### PrimitiveHyperSchemas

RhizomeDB includes **type-safe primitive schemas** with chained validation:

```typescript
// Base primitive types
PrimitiveSchemas.String      // Any string
PrimitiveSchemas.Integer     // Any integer
PrimitiveSchemas.Boolean     // Any boolean

// Constrained variants
PrimitiveSchemas.String.EmailAddress  // Validated email string
PrimitiveSchemas.Integer.Year         // Year between 1800-2100
```

Each primitive schema provides:
- **GraphQL type mapping** - Automatic GraphQL type inference
- **Runtime validation** - Values that don't match are filtered out
- **Type narrowing** - Build from base types (string → email, integer → year)

### GraphQL Schema Auto-Generated

```typescript
const gqlSchema = createGraphQLSchema({
  db,
  schemas: new Map([
    ['movie_schema', movieSchema],
    ['person_schema', personSchema]
  ]),
  enableMutations: true
});
```

### Deltas Are Hyperedges

Every assertion is an immutable delta with:
- **Author** - Who made this assertion
- **Timestamp** - When it was made
- **Pointers** - Hyperedge connections to domain objects and values
- **System ID** - Which system/database created it

---

## 🎉 Recent Additions

### Improved Mutation API
[Implemented in graphql.ts](typescript/src/graphql.ts#L267-L471)

RhizomeDB now features a clean, native GraphQL mutation API:

**✨ What's New:**

1. **Native GraphQL Input Types** - No more escaped JSON strings!
   ```graphql
   # Before
   createPerson(data: "{\"name\":\"Chris Nolan\"}")

   # After
   createPerson(input: { name: "Chris Nolan", birthYear: 1970 })
   ```

2. **Automatic Delta Negation on Updates** - Update mutations automatically handle overwrites:
   ```graphql
   updateMovie(id: "movie_inception", input: { title: "New Title" })
   ```
   Behind the scenes:
   - Finds existing delta for `title`
   - Creates negation delta (preserving history)
   - Creates new delta with new value

3. **Type-Safe Mutations** - GraphQL validates your input at query time

### PrimitiveHyperSchemas
[Implemented in types.ts](typescript/src/types.ts#L411-L496)

RhizomeDB now includes a comprehensive type system for primitive values:

**✨ What's New:**

1. **Metadata-Driven Field Discovery** - Fields are defined in schemas, not inferred from data
   ```typescript
   // Primitives are explicitly defined in transform rules
   transform: {
     year: {
       schema: PrimitiveSchemas.Integer.Year,
       when: (p) => PrimitiveSchemas.Integer.Year.validate(p.target)
     }
   }
   ```

2. **Chained Type Narrowing** - Build specific types from base primitives
   ```typescript
   PrimitiveSchemas.String            // Base: any string
   PrimitiveSchemas.String.EmailAddress  // Narrowed: validated emails
   PrimitiveSchemas.Integer           // Base: any integer
   PrimitiveSchemas.Integer.Year      // Narrowed: 1800-2100
   ```

3. **Automatic GraphQL Integration** - Primitive schemas automatically generate GraphQL types

4. **Multi-Valued Relationships** - Domain references return arrays to support one-to-many relationships
   ```graphql
   # Trilogy with multiple movies
   Trilogy(id: "trilogy_matrix") {
     name
     movie {  # Returns array of 3 movies
       title
       year
     }
   }
   ```

---

## 📖 Learn More

- **Test Suite**: See `typescript/src/movie-database.test.ts` for all examples
- **Fixture Data**: See `typescript/src/movie-database.fixture.ts` for the complete dataset
- **Core GraphQL**: See `typescript/src/graphql.test.ts` for GraphQL integration tests
- **Specification**: See `SPECIFICATION.md` for the complete technical specification

---

**Built with ❤️ using RhizomeDB - The Rhizomatic Database**
