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

## 📊 Simple Queries

### Query a Single Movie

**Query:**
```graphql
query {
  Movie(id: "movie_matrix") {
    id
    title
    year
    runtime
    director {
      id
      name
    }
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
      "runtime": 136,
      "director": {
        "id": "person_wachowski_lana",
        "name": "Lana Wachowski"
      }
    }
  }
}
```

---

### Query a Person

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

### Movie with Full Cast Information

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
      "director": {
        "id": "person_jackson_peter",
        "name": "Peter Jackson",
        "birthYear": 1961
      }
    }
  }
}
```

---

### Trilogy with All Movies

**Query:**
```graphql
query {
  Trilogy(id: "trilogy_john_wick") {
    id
    name
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
    "Trilogy": {
      "id": "trilogy_john_wick",
      "name": "John Wick Series",
      "movie": [
        {
          "id": "movie_john_wick",
          "title": "John Wick",
          "year": 2014,
          "runtime": 101
        },
        {
          "id": "movie_john_wick_2",
          "title": "John Wick: Chapter 2",
          "year": 2017,
          "runtime": 122
        },
        {
          "id": "movie_john_wick_3",
          "title": "John Wick: Chapter 3 - Parabellum",
          "year": 2019,
          "runtime": 130
        }
      ]
    }
  }
}
```

---

## 🔍 Multi-Level Nested Queries

### Actor's Roles Across Multiple Films

**Query:**
```graphql
query {
  Role(id: "role_avengers_fury") {
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
      director {
        id
        name
      }
    }
  }
}
```

**Result:**
```json
{
  "data": {
    "Role": {
      "id": "role_avengers_fury",
      "character": "Nick Fury",
      "actor": {
        "id": "person_jackson_samuel",
        "name": "Samuel L. Jackson",
        "birthYear": 1948
      },
      "movie": {
        "id": "movie_avengers",
        "title": "The Avengers",
        "year": 2012,
        "director": {
          "id": "person_whedon_joss",
          "name": "Joss Whedon"
        }
      }
    }
  }
}
```

---

## ✍️ Mutations: Creating Data

### Create a New Person

**Mutation:**
```graphql
mutation {
  createPerson(
    id: "person_nolan_christopher"
    author: "admin"
    data: "{\"name\":\"Christopher Nolan\",\"birthYear\":1970}"
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

**Mutation:**
```graphql
mutation {
  createMovie(
    id: "movie_inception"
    author: "admin"
    data: "{\"title\":\"Inception\",\"year\":2010,\"runtime\":148}"
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

## 🔄 Delta Negation: Correcting Mistakes

### Making a Correction

Let's say we entered the wrong runtime for a movie. In RhizomeDB, we don't delete—we **negate** the incorrect delta and add a new one.

**Step 1: Create incorrect data**
```graphql
mutation {
  createDelta(
    author: "admin"
    pointers: "[{\"localContext\":\"runtime\",\"target\":{\"id\":\"movie_matrix\"},\"targetContext\":\"runtime\"},{\"localContext\":\"runtime\",\"target\":120}]"
  )
}
```

**Step 2: Negate the incorrect delta**
```graphql
mutation {
  negateDelta(
    author: "admin"
    targetDeltaId: "delta-abc-123"
    reason: "Incorrect runtime - should be 136 minutes"
  )
}
```

**Step 3: Add correct data**
```graphql
mutation {
  createDelta(
    author: "admin"
    pointers: "[{\"localContext\":\"runtime\",\"target\":{\"id\":\"movie_matrix\"},\"targetContext\":\"runtime\"},{\"localContext\":\"runtime\",\"target\":136}]"
  )
}
```

**Result:** Queries now return the correct runtime (136), but the full history is preserved!

---

## 🕐 Time-Travel Queries

Query the database as it existed at any point in time:

**Query the database at a specific timestamp:**
```graphql
query {
  Movie(id: "movie_matrix", timestamp: 1609459200000) {
    id
    title
    runtime  # Returns the value as it was at this timestamp
  }
}
```

**Use case:** Audit trails, debugging, "what did the user see when they made this decision?"

---

## 🎯 Real-World Query Examples

### Find All Movies Directed by Peter Jackson

Using the underlying delta query API:

```typescript
const jacksonMovies = db.queryDeltas({
  targetIds: ['person_jackson_peter'],
  predicate: (delta) =>
    delta.pointers.some(p => p.localContext === 'director')
});
```

**Results:** 7 films
- The Lord of the Rings trilogy (2001-2003)
- The Hobbit trilogy (2012-2014)
- King Kong (2005)

---

### Find All Movies from the 2000s

```typescript
const movies2000s = db.queryDeltas({
  predicate: (delta) => {
    const yearPointer = delta.pointers.find(p => p.localContext === 'year');
    return yearPointer?.target >= 2000 && yearPointer?.target < 2010;
  }
});
```

**Results:** 8+ films including Matrix sequels, LOTR trilogy, Star Wars prequels

---

### Find Actors Who Appeared in Multiple Franchises

```typescript
// Query for actors with roles in 3+ different movies
const prolificActors = new Map();

for (const role of allRoles) {
  const actorId = extractActorId(role);
  const movieId = extractMovieId(role);

  if (!prolificActors.has(actorId)) {
    prolificActors.set(actorId, new Set());
  }
  prolificActors.get(actorId).add(movieId);
}

const multiFilmActors = Array.from(prolificActors.entries())
  .filter(([_, movies]) => movies.size >= 3);
```

**Example Results:**
- **Keanu Reeves**: Matrix trilogy (3) + John Wick trilogy (3) + Speed + Point Break = 8 films
- **Ian McKellen**: LOTR trilogy (3) + Hobbit trilogy (3) + X-Men trilogy (3) = 9 films
- **Orlando Bloom**: LOTR trilogy (3) + Hobbit trilogy (3) + Pirates trilogy (3) = 9 films

---

## 📡 Real-Time Subscriptions

Subscribe to database changes in real-time:

```graphql
subscription {
  deltaCreated(filter: "{\"authors\":[\"admin\"]}") {
    id
    timestamp
    author
    pointers {
      localContext
      target
    }
  }
}
```

**Use case:** Live dashboards, collaborative editing, event sourcing

---

## 🏗️ Architecture Highlights

### Delta Structure

Every piece of data is an immutable delta:

```typescript
{
  id: "delta-abc-123",
  timestamp: 1609459200000,
  author: "admin",
  system: "rhizomedb-instance-1",
  pointers: [
    {
      localContext: "title",
      target: { id: "movie_matrix" },
      targetContext: "title"
    },
    {
      localContext: "title",
      target: "The Matrix"
    }
  ]
}
```

**Every delta includes:**
- Unique ID
- Timestamp (for time-travel)
- Author (for provenance)
- System (for federation)
- Pointers (the actual data/relationships)

---

### HyperSchemas

Schemas define how deltas are selected and transformed into views:

```typescript
const movieSchema: HyperSchema = {
  id: 'movie_schema',
  name: 'Movie',
  select: selectByTargetContext,  // Selection function
  transform: {                      // Transformation rules
    director: {
      schema: 'person_schema',      // Nested schema
      when: (p) => isDomainNodeReference(p.target)
    }
  }
};
```

**Key insight:** Schemas are themselves stored as deltas! (Meta-circular representation)

---

### Storage Options

**In-Memory (Development/Testing):**
```typescript
const db = new RhizomeDB({
  systemId: 'my-app',
  storage: 'memory'
});
```

**LevelDB (Production):**
```typescript
const db = new LevelDBStore({
  systemId: 'my-app',
  storage: 'leveldb',
  dbPath: './data/rhizomedb'
});
```

Both implement the same interface—swap storage backends without code changes!

---

## 📊 Dataset Statistics

Our movie database fixture includes:

| Metric | Count |
|--------|-------|
| **Movies** | 62+ |
| **People** | 150+ |
| **Roles** | 280+ |
| **Trilogies** | 10 |
| **Total Deltas** | 1,379 |
| **Time Span** | 1977-2019 |

**Franchises included:**
- The Matrix trilogy
- Star Wars saga (6 films)
- Lord of the Rings trilogy
- The Hobbit trilogy
- Indiana Jones trilogy
- John Wick trilogy
- X-Men trilogy
- Pirates of the Caribbean trilogy
- Avengers films
- Plus standalone classics!

---

## 🚀 Getting Started

```bash
# Install dependencies
cd typescript
npm install

# Run tests (includes movie database examples)
npm test

# See the fixture
cat src/movie-database.fixture.ts
```

---

## 🎓 Key Concepts

### Immutability
Every assertion creates a new delta. Nothing is ever modified or deleted.

### Provenance
Every delta knows who created it, when, and on which system.

### Time-Travel
Query the database at any historical timestamp.

### Negation Over Deletion
Mistakes are corrected by negating incorrect deltas, preserving full history.

### Hypergraph Structure
Deltas are hyperedges that can connect multiple objects simultaneously.

### Schema Flexibility
Add new schemas, modify transformation rules—all stored as queryable deltas.

---

## 💡 Use Cases

✅ **Audit Trails** - Full provenance and history built-in
✅ **Collaborative Editing** - CRDTs ensure conflict-free merges
✅ **Event Sourcing** - Deltas are events, HyperViews are projections
✅ **Temporal Queries** - "Show me what the user saw at 3pm yesterday"
✅ **Distributed Systems** - Native federation support
✅ **Data Lineage** - Track data transformations across time

---

## 🔗 Learn More

- [Specification](../spec/spec.md) - Complete technical specification
- [README](../README.md) - Project overview and concepts
- [Tests](./src/movie-database.test.ts) - Comprehensive examples

---

**Built with [RhizomeDB](https://github.com/mbilokonsky/rhizomedb)** 🌱

*A rhizomatic database using immutable delta-CRDTs as hyperedges.*
