# rhizomedb

A rhizomatic database using immutable delta-CRDTs as hyperedges in a hypergraph that treats state as a side-effect assembled at query-time. This repository contains the specification and a reference implementation in TypeScript.

> **Note**: For aspirational long-term goals and speculative use cases, see [docs/long_term_vision.md](docs/long_term_vision.md). This README focuses on the core technical architecture. 

## A rhizowhat now?
A _rhizome_ is a plant whose root structure expands horizontally, not vertically. The result is that a rhizomatic plant - like grass, or bamboo - may have many different "shoots" that appear to those of us above the ground to be individual different plants. Just under the surface, though, all of those many different blades of grass are just different _views_ of the same complex invisible structure. Philosophers Deleuze and Guattari borrowed this concept when developing their radical process-oriented philosophy - but you don't need to read _A Thousand Plateaus_ to understand the point that a rhizome is a single unified structure that to an observer appears as many distinct structures.

This is what I'm calling a _rhizomatic database_ because on the surface you may interact with it as if it were any other database, a source of _domain objects_ with _state_ that you can read and write at will. But behind the scenes, the implementation diverges radically from traditional database design. There *is no state* at a fundamental level, or least not in the sense that we usually think of it. Instead, each instance of this database represents a single _hypergraph_ where _hyper edges_ create rich semantic relationships between nodes. Those nodes - the domain objects you're keeping track of in the database, and primitive values that populate terminal values - *only exist* once they've been referenced by at least one delta. State is literally created by referring to it, and has no independent existence outside of a given set of deltas that reference it.

## Definitions, Properties and Goals
This database is doing things pretty differently from what you might expect. For instance, it is both *fully relational* and *NoSQL*. It rejects traditional database constraints around consistency and coherence by supporting arbitrarily many concurrent values for any given property - even if they seem to contract! No more last-write-wins, instead we hold everything in superposition and resolve it into meaningful state at query time. Sometimes, if I squint, I start to understand this thing as a latent space - but let's stay focused here.

The core engine is an *append-only* *stream* of *immutable* *context-free* *fully relational* *deltas*. Let's unpack what that means:
  * *append-only* means that once written a delta may not be deleted. Every write is ~forever, and if you want to undo a delta you must submit a new negation delta that targets it.
  * *stream* means that within a given system deltas are ingested over time and written to a stream that consumers can subscribe to. Each time a new delta comes in, anyone in this system - or outside of it, with access! - can be notified and react.
  * *immutable* means that a delta has no mutable state - once it is created it may not be changed.
  * *context-free* means that a "delta" in this sense is not aware of the state of the system. It is not a change from some fixed state `s1` into some new state `s2`, it is agnostic as to the context against which it is applied. _There is no state_.
  * *fully-relational* means that even though we're not using SQL or tables we're still *conserving the fundamental guarantees of [Codd's relational algebra](https://en.wikipedia.org/wiki/Relational_algebra)*. I think.
  * *deltas* are the atomic units of this data store. A delta represents an assertion with a unique identifier `id` created at time `t` by author `a` on system `s` which contains pointers `p`. 

"Like sure, okay," you may be thinking. "It's an event-sourced data store using delta-CRDTs to assemble state at query time across a partitioned space, what, like it's hard?" But it also:
  * natively supports time-travel, meaning you may execute any query against some past timestamp to see how it would have resolved in the past, and you may replay state over time to see how it evolved.
  * is platform-and-language agnostic, because the primitives involved are quite simple and trivial to implement on servers, in clients and in arbitrarily unexpected places
  * exposes a novel tripartite ontology - you know how in most database there's "the database layer" and then there's "the application layer", and as a programmer you query the database layer for stateful objects you can use in your application? We complicate that a bit.
  * doesn't impose a single source of truth, meaning different users querying the same database may end up with different results to the same query
  * treats state as a side-effect, because the rhizome itself is always in a superposition of possible states - so _state_ state emerges only by resolving a query into a hyperview and then into a view

If we've done our job correctly, downstream consumers of this database won't actually have to understand most of that -- they'll be able to access it using GraphQL or a similar interface. But it allows behind-the-scenes superpowers:
  * Full provenance on every delta, meaning that for every claim made you know where it came from and when.
  * Dynamic schemas and hyperschemas, meaning that everything is "just data" and the only "baked-in" schema is the Delta Schema itself. Everything else is up for grabs and can be evolved.
  * Fork/Merge structured data between different instances, making collaboration trivial without needing to agree on a schema up front.

## Technical Details
This is... a lot. So we're going to start simple, and we're going to build this up one level of abstraction at a time. Below we're going to talk about:

1. The Delta Schema
2. The Tripartite Schema Structure
3. Mutation
4. Streaming

As we go this document will evolve to embed source code and tests rather than hand-written code-fences making bold claims. 

Ready? Ok, let's dig in.

### Delta Schema
At the root of this project is the concept of a "Delta". A delta is several things at once: it is an event, dispatched by an instance of this database to represent a new assertion being made about reality. It is a hyperedge in a hypergraph, connecting two or more "things" together in a way that encodes the nature of the relationship between them. And it is a CRDT, meaning it has certain properties that make it trivial to combine it with other deltas in order to assemble complex structures. A delta looks like this:

```typescript
interface Delta {
  // A unique identifier for this specific delta
  // Currently: UUID (subject to revision - may use content-addressing or other schemes)
  id: string

  // A timestamp identifying the moment at which this delta was first created
  timestamp: number

  // The UUID of the person or process that created this delta
  // NOTE: Currently spoofable - verification mechanism needed before production use
  author: string

  // The UUID of the specific instance rhizomedb in which this delta was created
  // NOTE: Currently spoofable - verification mechanism needed before production use
  system: string

  // This is the magic: pointers reference different domain nodes or primitives with specific context
  // Primitive types: string | number | boolean
  // (No null or undefined - absence is represented by lack of deltas)
  // (No array primitives - use multiple pointers instead)
  pointers: {
    localContext: string
    target: DomainNodeReference | Primitive
    targetContext?: string
  }[]
}
```

#### Pointer Context Fields: localContext and targetContext

Here's a complete example delta asserting a containment relationship:

```typescript
{
  id: "delta_001",
  timestamp: 1000,
  author: "user_alice",
  system: "instance_primary",
  pointers: [
    {
      localContext: 'parent',
      target: { id: 'some_container' },
      targetContext: 'children'
    },
    {
      localContext: 'child',
      target: { id: 'some_contained_thing' },
      targetContext: 'parent'
    }
  ]
}
```

Each pointer has three fields that together define the semantics of the relationship:

**`localContext`**: From this delta's perspective, what is this pointer targeting?
- The first pointer is targeting a **parent**
- The second pointer is targeting a **child**
- Together, this delta is asserting a parent/child relationship between `some_container` and `some_contained_thing`

**`targetContext`**: Where should this delta be organized when querying the target object?
- When we query `some_container`, this delta should appear under its **children** property
- When we query `some_contained_thing`, this delta should appear under its **parent** property
- This creates navigable bidirectional relationships

**`target`**: The thing being referenced (either a domain object `{ id }` or a primitive value)

**Primitives and targetContext:**

When targeting primitive values, `targetContext` is often omitted:

```typescript
{
  id: "delta_002",
  timestamp: 1001,
  author: "user_alice",
  system: "instance_primary",
  pointers: [
    {
      localContext: 'sized',
      target: { id: 'item_1' },
      targetContext: 'size'
    },
    {
      localContext: 'size',
      target: 3  // primitive number
      // no targetContext - it would be something like 'thingsThatAreThisSize', which is rarely useful
    }
  ]
}
```

**Semantics and interpretation:**

These context fields define **what the delta means**. They are the core semantics of the assertion being made. While a given HyperSchema may choose to interpret or organize these semantics differently when constructing a HyperView, the delta's meaning is established by its contexts and targets.

**Naming divergence:**

Different users or systems may use different terminology for the same concept ('parent'/'container', 'child'/'contents'). Within a single system, this can be largely mitigated by:
- **Defined mutations**: Route all writes through mutation functions that enforce consistent vocabulary
- **Tooling and linters**: Detect and flag inconsistent context naming
- **Schema definitions**: Document the expected context values for your domain

In federated scenarios, naming divergence becomes more challenging and may require explicit vocabulary mapping or advanced resolution strategies (see Open Questions).

#### Delta Atomicity and Modeling

A crucial principle: **deltas are atomic**. You must accept or negate an entire delta - you cannot partially accept some pointers and reject others. This means **the granularity of what can be independently retracted is determined when you create the delta**, not when you negate it.

This makes delta design a meaningful modeling decision that encodes the semantic boundaries of your facts:

**Independent facts** should be separate deltas:
- A person's `name`, `birthdate`, and `nationality` are independent - any one could be wrong while the others are correct
- Create three separate deltas so each can be independently negated

**Inseparable facts** should be one delta:
- A purchase's `seller`, `buyer`, `item`, `price`, and `timestamp` are semantically bound - changing any one of these would make it a *different purchase*
- Create one delta with all these pointers, because the assertion is "this specific transaction occurred with these exact parameters"

The rule of thumb: if you can't imagine one piece of information being wrong while the rest remains valid, they belong in the same delta.

This atomicity has implications:
- **Data quality**: Fine-grained deltas allow precise corrections
- **Audit trails**: Coarse-grained deltas preserve the semantic unity of complex assertions
- **Conflict resolution**: The delta structure determines what constitutes a "conflicting claim"

To understand deltas you have to understand pointers. Let's say you're using this system to model some domain -- the IMDB database, maybe. Your *domain objects* are things like `Actor`, `Director`, or `Movie. In traditional relational databases you'll generally define tables to represent your domain objects, and you'd normalize them. So you might have a `People` table, with columns for `id` and `name` and `birthday` and the like, and then maybe a `Movies` column, which would include columns like `id` and `title` and `release_year`. Then you'd create tables like `Cast` with columns like `movie_id`, `person_id`, and `character_name`, where those first two columns reference specific rows in `Movies` and `People`. You might have a `Directors` table that referenced `movie_id` and `person_id` -- the same columns, but different semantics! So a row in the `Cast` table implies that the person references played the character named in the movie referenced, but a row in the `Directors` table implies that the person referenced directed the movie referenced, etc. This is a very brief and high-level summary of how traditional database work - you need to define all of these tables and relationships in advance, and then you can use that set of schemas to keep track of your data in a way that allows it to be efficiently written and queried.

When we talk about "domain objects", we're talking about the things represented across those tables. So things like `keanu_reeves` or `the_matrix` or `keanu_reeves_as_neo_in_the_matrix` or whatever ways you want to slice up the data, "domain objects" are the things *inside of* the tables. A traditional database uses a bunch of complexity to ensure that you can easily manage your set of domain objects. Using a traditional database is all about reading and writing domain objects. Domain objects - as expressed in rows across tables - are the primary *thing* that a traditional database uses. A database stores *state*, and *state* is the specifically canonically true configuration of domain objects at a given point in time.

In a rhizomatic database, on the other hand, *domain objects don't exist* except as the intersection of all deltas that reference a given ID. We don't have tables, and we don't handle schemas as fixed definitions of columns with rigid foreign key joins and constraints that have to all be set up in advance. Instead, if you wanted to represent keanu reeves, you might do that by creating a bunch of deltas:

<details>
<summary>Example: Deltas representing Keanu Reeves (click to expand)</summary>

```typescript
const author: string = "uuid_representing_me"
const system: string = "uuid_representing_this_database_instance"
const keanu: string = "uuid_representing_keanu_reeves"
const the_matrix: string = "uuid_representing_the_matrix"

// Keanu Reeves also created a comic book series called "brzrkr" you'll see why I'm using this below
const brzrkr: string = "uuid_representing_brzrkr"

const deltas = [
  {
    id: "delta1",
    timestamp: t1,
    author,
    system,
    pointers: [{
      localContext: 'actor',
      target: { id: keanu },
      targetContext: 'appearedIn'
    },{
      localContext: 'movie',
      target: { id: the_matrix },
      targetContext: 'cast'
    },{
      localContext: 'characterName',
      target: 'Neo'
    }]
  }, {
    id: "delta2",
    timestamp: t2,
    author,
    system,
    pointers: [{
      localContext: 'creator',
      target: { id: keanu },
      targetContext: 'projects'
    },{
      localContext: 'creation',
      target: { id: brzrkr },
      targetContext: 'createdBy'
    }]
  }
]
```

</details>

So if I have those two deltas in my local database store, and I do a query to extract the domain object with the id `keanu`, what do I get back? Well, I get back those two deltas! You can see how, if you think about it for a moment, you *could* convert those deltas into a domain object that looks something like this:

```typescript
{
  id: keanu,                            // this is a UUID
  appearedIn: {
    movie: { id: the_matrix },         // note this is still a UUID, given what we have above, but         
    characterName: "Neo"              // this is a primitive string
  },
  projects: [
    {
      id: brzrkr,                    // similarly, this is still a UUID, we don't have any other properties around it
    }                   
  ]
}
```

That's... not *quite* usable in an application, but it's interesting, right? But what's *more* interesting is that *without adding any new deltas anywhere* you could *also* query the database for a domain object with the id `the_matrix`. You can see how you could get back something like this:

```typescript
{
  id: the_matrix,
  cast: [
    {
      actor: { id: keanu },
      characterName: "Neo"
    }
  ]
}
```

And if you really wanted to get wild you could even start nesting this stuff arbitrarily, right? Like you could just as easily imagine querying for the domain object with the id `the_matrix` and getting back something that looked more like this:

```typescript
{
  id: the_matrix,
  cast: [
    {
      actor: {
        id: keanu,
        projects: [
          {
            id: brzrkr,
            createdBy: { id: keanu }        // hmm, this is a circular reference. More about this below.
          }
        ]
      },
      characterName: "Neo"
  ]
}
```

**Note on circular references and termination**: You might be worried about infinite recursion here - `brzrkr.createdBy` points back to `keanu`, who appears as an ancestor in this object. But this is actually a *circular reference*, not a *circular expansion*. The `{ id: keanu }` here is just an ID reference, not a fully expanded object with `keanu.projects.brzrkr.createdBy.projects...` forever.

**How HyperSchemas prevent infinite recursion:**

HyperSchemas control expansion depth through their **transformation rules**. For each pointer in a selected delta:
- **If a transformation rule matches** → apply the specified HyperSchema and expand the target into a nested HyperView
- **If no transformation rule matches** → leave the target as a simple reference `{ id: ... }`

This means expansion stops naturally when you hit pointers that the schema doesn't explicitly transform. For example:
- The `Movie` HyperSchema might say: "transform actor pointers using `NamedEntity` schema"
- The `NamedEntity` HyperSchema might say: "don't transform any pointers" (terminal schema)
- When we encounter an actor, we expand it via `NamedEntity`, which includes their name
- But `NamedEntity` doesn't transform the `brzrkr.createdBy` pointer, so it stays as `{ id: keanu }`
- Recursion naturally terminates

**DAG requirement**: HyperSchemas must form a directed acyclic graph - no schema can invoke itself through a chain of transformations. But the *data* can absolutely have circular references. The distinction:
- **Data circles are fine**: Keanu created brzrkr, brzrkr was created by Keanu
- **Schema circles are forbidden**: `Movie` → `Actor` → `NamedEntity` (stops) ✓, but `Movie` → `Actor` → `Movie` ✗

The schema defines how deep to expand and where to stop. This prevents infinite recursion while preserving the ability to reference the same objects from multiple places.

Do you see how with two deltas we can support a bunch of different equally valid views? The "rhizome" is the deeply interconnected knot of concepts stored in the references between pointers of deltas with any given instance's stream. But how do we reliably get the specific shapes we want out of the rhizome? How does it know whether or not to include `keanu.projects` when Keanu is referenced as an actor within the cast of the matrix? You can see how our deltas can make *whatever associations they want*, so we can't know in advance what deltas will show up in our system. You can imagine writing a query tier that just grabs all the deltas associated with a given key and munges them together according to some rules you give it, but that won't really scale well as the system grows - and besides, structure is helpful! We don't want to have to define rigid schemas in advance, but we do like schemas! In fact, we like them so much that we've got three tiers of them!

### Schemas as Data

Before we dive into those schema tiers, there's a crucial philosophical principle that underpins this entire system: **everything except the Delta schema itself is composed of deltas**.

The `Delta` interface you saw above is the only "baked-in" schema in the entire system. Everything else - HyperSchemas, View schemas, indexes, even queries and functions - are themselves just domain objects represented by deltas. This creates a beautiful bootstrap where:

**The DeltaSchema is hardcoded** - it's the axiom, the fundamental building block that everything else is built on top of.

**Everything else is data** - HyperSchemas that define how to query the database are themselves queryable. Indexes that speed up access are themselves stored as deltas. Functions that compute derived values are deltas that reference other deltas.

This has profound implications:

**Schema sync is automatic** - When two database instances federate and exchange deltas, they're not just syncing data - they're syncing the schemas that define how to interpret that data. If you create a new `MovieSchema` and share deltas with another instance, that instance automatically receives your schema definition.

**Schema evolution is trivial** - Want to add a new field to the `Movie` HyperSchema? Just append new deltas that extend the schema definition. Old queries continue to work, new queries can use the new fields.

**Schema conflicts resolve like data conflicts** - Two people define different `MovieSchema` definitions? The same conflict resolution strategies we use for data (trusted authors, timestamps, surfacing conflicts) apply to schemas too.

**Schema discovery is queryable** - "Show me all HyperSchemas that reference the `Actor` schema" is just a query over deltas. The entire schema registry is introspectable.

**Reactive schemas** - When a schema changes (new deltas extend it), any materialized HyperViews or indexes using that schema can detect the change and rebuild themselves.

This "schemas as data" principle is what makes the system truly evolvable and federated. There's no central schema authority, no migration scripts, no version conflicts. Schemas flow through the system just like any other data, with the same provenance, the same conflict resolution, and the same eventual consistency guarantees. The exact delta structure for representing schemas will be defined during implementation.

Now, with that foundation in place, let's look at those three schema tiers we mentioned.

### Why HyperViews?

Before we explain *what* the three schema tiers are, let's understand *why* we need them - specifically, why HyperViews are crucial to making this system tractable.

#### The Tractability Problem

An unbounded stream of deltas is fundamentally intractable to query directly. Imagine you have millions of deltas in your system. When you want to query for "The Matrix", which deltas do you look at? All of them? How do you know when you're done? What about nested objects - if you want the directors' names, do you search through all deltas again?

Without some way to bound the search space, every query becomes a full scan of the entire delta stream. This doesn't scale.

#### HyperSchemas Define Relevance Closure

This is where HyperSchemas come in. A HyperSchema doesn't just define "what shape should this object have" - it defines **the closure of relevance** for a domain object. When you apply a HyperSchema to a domain object, you're computing exactly which deltas are relevant:

1. **Deltas directly targeting the root object** - deltas with pointers targeting our domain object
2. **Deltas targeting referenced objects** - when we transform a pointer's target by applying another HyperSchema, we include those deltas too
3. **Deltas targeting deltas** - negations, retractions, or modifications of included deltas

This creates a **bounded subset** of the delta stream. The HyperSchema tells us exactly where to look and when to stop looking.

#### HyperViews as a Staging Area

HyperViews solve another critical problem: they **partially apply** the view resolution function.

Without HyperViews, building a view would look like this:
```
View = resolve(allDeltas, query)  // Intractable - too much data, too complex
```

With HyperViews, we split this into two steps:
```
HyperView = filter_and_transform(allDeltas, hyperSchema)  // Bounded by relevance closure
View = resolve_conflicts(hyperView)                       // Simple conflict resolution on pre-filtered data
```

The HyperView has already:
- Filtered down to relevant deltas
- Organized them by property
- Applied nested schemas recursively
- Stopped at appropriate termination points

The View resolver only needs to:
- Handle conflict resolution (pick one value from multiple deltas)
- Extract primitive values
- Format for the consumer (GraphQL, REST, etc.)

This separation of concerns makes both operations tractable and composable.

#### HyperViews as Indexes

Here's where it gets really powerful: **an index IS a materialized HyperView**.

When you want to speed up queries, you typically create indexes. In RhizomeDB, creating an index means:

1. Define a HyperSchema that captures what you want to index
2. Scan the delta stream once to build initial HyperViews
3. Subscribe to the delta stream for updates
4. For each new delta, check: "Does this match any selection operation in my HyperSchema?"
   - Does it target an indexed object? → Update that object's HyperView
   - Does it target a nested object in an indexed object? → Update the parent's HyperView
   - Does it negate a delta in an indexed object? → Update that object's HyperView

The HyperSchema automatically defines the maintenance logic for the index. The relevance closure tells you exactly when to update the index.

#### One Abstraction, Multiple Purposes

By making HyperViews a first-class concept, we get:

- **Ad-hoc queries**: Apply a HyperSchema on demand to answer a query
- **Materialized indexes**: Pre-compute and maintain HyperViews for fast access
- **View templates**: Define how data should be shaped for different consumers
- **Schema boundaries**: Clear delineation of what's "in scope" for a given query

The same abstraction serves all these purposes. Define a HyperSchema once, and you can use it for live queries, persistent indexes, or as a template for view resolution.

This is why HyperViews are central to the system - they make an otherwise intractable problem (querying an unbounded delta stream) tractable, composable, and efficient.

### Tripartite Schema Structure
Our system uses three layers of representation, for reasons that will become apparent. We have deltas, hyperviews, and views. The first and third ones are fairly straightforward.

*Deltas* are just what you see above, nothing fancy - the schema is straightforward, and every delta adheres to it.

*Views* are what we might find exposed by GraphQL. A view is a representation of a domain object, and is backed by a schema. Your graphQL schema might define a `movie` as something like the following - this is pseudocode but I hope the meaning is clear:

```typescript
Actor = {
  name: string
  roles: Role[]
}

Director = {
  name: string
  films: Movie[]
}

Role = {
  actor: Actor,
  characterName: string,
  movie: Movie
}

Movie = {
  id: string,
  title: string,
  directorName: Director,
  releaseYear: string,
  cast: Role[]
}
```

If you've ever used GraphQL, though, you know that your actual *query* can draw from the graph expressed by the schema, but it requires you to terminate every selected property in a string. So you actually *can't* write a query where you pick a movie, and the cast includes a role has an actor that contains a role that has has the Movie you started with, etc. In fact, your query *must* terminate in primitive values for all properties - this is how GraphQL prevents you from "returning the whole graph" with a simple query. We're dealing with a similar challenge in the rhizomatic database, but the indirection of having deltas requires a slightly different approach.

In our case, a *HyperSchema* defines a *HyperView*. A hyperview represents a domain object, but the properties of that object don't contain values directly - instead, each property resolves to an array of deltas that have targeted our domain object using that property's name as the `targetContext`. It also specifies the *HyperSchema* to apply to the `target` of the pointers on those nested deltas that are not targeting the parent. This is easier to show by example, but first we're going to need to add a few more deltas to flesh this out.

<details>
<summary>Additional deltas for names and directors (click to expand)</summary>

```typescript
const lily: string = 'UUID of Lily Wachowski'
const lana: string = 'UUID of Lana Wachowski'

const additional_deltas = [
  {
    id: "delta3",
    timestamp: t3,
    author,
    system,
    pointers: [{
      localContext: 'named',
      target: { id: keanu },
      targetContext: 'name'
    },{
      localContext: 'name',
      target: 'Keanu Reeves'
    }]
  },
  {
    id: "delta4",
    timestamp: t4,
    author,
    system,
    pointers: [{
      localContext: 'named',
      target: { id: lily },
      targetContext: 'name'
    },{
      localContext: 'name',
      target: 'Lily Wachowski'
    }]
  },
  {
    id: "delta5",
    timestamp: t5,
    author,
    system,
    pointers: [{
      localContext: 'named',
      target: { id: lana },
      targetContext: 'name'
    },{
      localContext: 'name',
      target: 'Lana Wachowski'
    }]
  },
  {
    id: "delta6",
    timestamp: t6,
    author,
    system,
    pointers: [{
      localContext: 'movie',
      target: { id: the_matrix },
      targetContext: 'directed_by'
    },{
      localContext: 'director',
      target: { id: lily },
      targetContext: 'films_directed'
    },
    {
      localContext: 'director',
      target: { id: lana },
      targetContext: 'films_directed'
    }]
  },
]
```

</details>

There, we've added a 'name' to our `keanu` object, and we've introduced deltas that assign names to Lily and Lana Wachowski, as well as a delta that establishes them as the directors of The Matrix. 

Now, let's identify the following `HyperSchema` objects, and let's use natural language to keep this a bit more accessible:

  * The `NamedEntity` HyperSchema is used to create an object `namedEntity`, and takes a domain object id `n`
    * its job is to select each delta `d` in the system that contains a pointer where `{ localContext: "named", target: { id: n } }`.
    * If `d` also contains a pointer such that `{ localContext: 'name', target: string }`, embed `d` under the `namedEntity.name`.
  * The `Movie` HyperSchema is used to create an object `movie`, and takes a domain object id `m`
    * it will identify each delta `d` in the system that contain a pointer `p` where `{ localContext: 'movie', target: m }`
    * if `p.targetContext` is 'directed_by', embed this delta under `m.directed_by` AND
      * for each reamining pointer `p` on `d`, if `p.localContext` is 'director' then replace `p.target` with `NamedEntity(p.target)`
    * if `p.targetContext` is 'cast', embed this delta under `m.cast` AND
      * for each remaining pointer `p` on `d`, if `p.localContext` is 'actor' then replace `p.target` with `NamedEntity(p.target)`

#### HyperSchema Semantics

The examples above use `targetContext` and `localContext` as convenient conventions, but let's be explicit about what HyperSchemas *actually* are at an abstract level.

**A HyperSchema is fundamentally two operations:**

1. **Selection Function**: `(domainObjectId, allDeltas) → relevantDeltas[]`
   - Determines which deltas from the entire stream are relevant to this domain object
   - In our examples: "deltas where a pointer has `target.id === domainObjectId AND targetContext === propertyName`"
   - But could also select by: author, timestamp, system, signatures, or any arbitrary predicate
   - This defines the **relevance boundary** for the HyperView

2. **Transformation Rules**: `(delta, pointer) → transformedPointer`
   - For each delta that passed selection, determine how to transform its pointers
   - In our examples: "if `pointer.localContext === 'actor'`, apply `ActorSchema` to `pointer.target`"
   - But could also transform based on: `targetContext`, timestamp, author, or complex logic
   - Transformed pointers become nested HyperViews; untransformed pointers remain as `{ id }` or primitives

**Important constraints:**

- **DAG Requirement**: HyperSchemas must form a directed acyclic graph - no circular dependencies
  - `Movie` references `NamedEntity` ✓
  - `NamedEntity` references nothing ✓
  - If `Movie` referenced `Actor` and `Actor` referenced `Movie` ✗ (cycle!)
  - Termination happens naturally when you hit a schema that doesn't transform targets

- **Graceful Degradation**: HyperSchemas handle messy data elegantly
  - Delta doesn't match any selection rule? Ignored (not included in HyperView)
  - Pointer doesn't match any transformation rule? Passed through as `{ id }` or primitive
  - Missing properties? Simply absent from the HyperView
  - This makes schemas resilient to incomplete or evolving data

- **Conventions vs. Constraints**: The `targetContext`/`localContext` pattern is a useful convention, not a hard requirement
  - Makes schemas readable and predictable
  - But the system supports arbitrary selection and transformation logic
  - You could filter by author trust levels, apply schemas based on temporal rules, etc.

**Why this matters:**

By abstracting HyperSchemas as selection + transformation, we keep the door open for advanced use cases:
- **Temporal schemas / Time-travel**: "Show me how this looked at time T" (filter deltas by `timestamp <= T` in the selection function)
  - This is how time-travel queries work: simply add timestamp filtering to HyperView construction
  - Query the system as of any past moment by filtering which deltas are considered
  - Negations are also time-sensitive: a delta negated at T2 would appear in queries at T1 but not at T3
- **Trust-based schemas**: "Only include data from verified sources" (filter by author)
- **Permission schemas**: "Filter based on who's querying" (context-aware selection)
- **Computed schemas**: "Apply different transformations based on delta relationships"

The examples we're showing use the simplest, most common pattern. But the abstraction is more powerful than the examples suggest.

**Connection to Relational Algebra:**

One of the early goals for this project was to prove that it's relationally complete - that is, it can express any operation from [Codd's relational algebra](https://en.wikipedia.org/wiki/Relational_algebra). While we haven't yet produced a formal proof, the HyperSchema abstraction suggests a clear mapping:

- **Selection (σ)**: HyperSchema selection functions filter deltas by predicates
  - `σ_{author='trusted'}(Deltas)` → "select only deltas from trusted authors"
  - This is exactly what our selection function does

- **Projection (π)**: HyperSchemas choose which properties to include
  - `π_{name, cast}(Movie)` → "project only name and cast properties"
  - By defining which targetContexts to expand, we project specific attributes

- **Join (⋈)**: Delta pointers ARE materialized joins
  - `Movie ⋈_{movie.id = cast.movie_id} Cast` in SQL
  - Becomes a delta with pointers linking movie and cast objects
  - **The innovation**: Joins are stored as hyperedges, not computed on read

- **Union (∪), Intersection (∩), Difference (−)**: Set operations over deltas
  - Multiple deltas for the same property = union of assertions
  - Selection functions can implement: "deltas matching A ∪ deltas matching B"

If we can prove that HyperSchemas can express arbitrary compositions of these operations, we'll have shown the system is relationally complete. This remains an open research question, but the abstraction is promising. The key insight is that we're implementing relational operations on **materialized joins** (deltas as hyperedges) rather than computed joins, which is a novel approach to achieving relational completeness.

Do you see what we're doing? A `HyperObject` represents a domain object, but its properties always resolve an *array* of deltas. Those deltas have one `pointer` pointing "up" to the domain object, and one or more additional pointers pointing "down" to either other domain objects or to primitives. So if we do something like `Movie(the_matrix)` it will return a complex object that looks like this:

<details>
<summary>Full matrixHyperview example (click to expand)</summary>

```typescript
const matrixHyperview = {
  id: the_matrix,
  directed_by: [
    {
      id: "delta6",
      timestamp: t6,
      author,
      system,
      pointers: [{
        localContext: 'movie',
        target: { id: the_matrix },
        targetContext: 'directed_by'
      },{
        localContext: 'director',
        target: {
          id: lily,
          name: [
            {
              id: "delta4",
              timestamp: t4,
              author,
              system,
              pointers: [{
                localContext: 'named',
                target: { id: lily },
                targetContext: 'name'
              },{
                localContext: 'name',
                target: 'Lily Wachowski'
              }]
            }
          ]
        },
        targetContext: 'films_directed'
      },
      {
        localContext: 'director',
        target: {
          id: lana,
          name: [
            {
              id: "delta5",
              timestamp: t5,
              author,
              system,
              pointers: [{
                localContext: 'named',
                target: { id: lana },
                targetContext: 'name'
              },{
                localContext: 'name',
                target: 'Lana Wachowski'
              }]
            }
          ]
        },
        targetContext: 'films_directed'
      }]
    }
  ],
  cast: [
    {
      id: "delta1",
      timestamp: t1,
      author,
      system,
      pointers: [{
        localContext: 'actor',
        target: {
          id: keanu,
          name: [
            {
              id: "delta3",
              timestamp: t3,
              author,
              system,
              pointers: [{
                localContext: 'named',
                target: { id: keanu },
                targetContext: 'name'
              },{
                localContext: 'name',
                target: 'Keanu Reeves'
              }]
            }
          ]
        },
        targetContext: 'appearedIn'
      },{
        localContext: 'movie',
        target: { id: the_matrix },
        targetContext: 'cast'
      },{
        localContext: 'characterName',
        target: 'Neo'
      }]
    }
  ]
}
```

</details>

We've now got all information that the system has about "The Matrix" as projected through the `Movie` HyperSchema. What this means is we have the property `movie.directed_by`, which resolves to two deltas, each of which targets a different director. Each of those targets is in turn projected through the `NamedEntity` HyperSchema, which selects only those deltas which make a claim about the respective directors' names. Then we have a `movie.cast` property, which includes all deltas (well, all one, in this case) asserting cast membership in the matrix. One `target` of one `pointer` on that delta is Keanu, and our logic dictates that the `NamedEntity` be applied to him as well. So we include all one deltas that assert his name.

This object is *large* and *complex* and you can imagine how you could go many layers deep, alernating DomainObject => Delta[] => DomainObject[] => Delta[] and using the property names on the Domain Objects and the target/local context on the delta pointers to impose a meaningful structure. And just like GraphQL requires that your query terminate in primitives, so too can our HyperSchema require that each property of the outermost nested DomainObject be projected through a HyperSchema like `NamedEntity` that doesn't replace the `target` on any pointer with any kind of additional layer. Why is this useful?

Because from this `HyperView` you can implement a `Schema` (back to graphQL, for instance) where each property's `resolver` can be implemented by traversing the corresponding property on the `HyperView` and extracting `target` data from the nested deltas. What if there are multiple competing deltas asserting different things for the value of some property? No problem! Sometimes, you'll want to resolve directly into an array of values. Sometimes you'll want to take the `max` or `min` value. Sometimes you'll want to privilege claims made by `author: a` over claims made by `author: b`, or vice versa. Sometimes you'll want to compute the average. Every `Schema` can make its own decisions about how to resolve a situation where it receives multiple deltas for a given property. This is a feature, not a bug!

#### Conflict Resolution in Practice

Let's see a concrete example. Imagine two different deltas making claims about Keanu's name:

```typescript
// First delta - correct spelling
{
  id: "delta3",
  timestamp: 1000,
  author: "imdb_official",
  system,
  pointers: [{
    localContext: 'named',
    target: { id: keanu },
    targetContext: 'name'
  },{
    localContext: 'name',
    target: 'Keanu Reeves'
  }]
}

// Second delta - misspelling
{
  id: "delta7",
  timestamp: 2000,
  author: "random_user",
  system,
  pointers: [{
    localContext: 'named',
    target: { id: keanu },
    targetContext: 'name'
  },{
    localContext: 'name',
    target: 'Keanu Reaves'  // misspelled
  }]
}
```

When we apply the `NamedEntity` HyperSchema to Keanu, we get a HyperView that includes *both* deltas:

```typescript
{
  id: keanu,
  name: [
    {
      id: "delta3",
      timestamp: 1000,
      author: "imdb_official",
      system,
      pointers: [/* ... */]
    },
    {
      id: "delta7",
      timestamp: 2000,
      author: "random_user",
      system,
      pointers: [/* ... */]
    }
  ]
}
```

Now when we implement a View resolver, we have multiple strategies available:

```typescript
// Strategy 1: Take the most recent
const name = hyperView.name
  .sort((a, b) => b.timestamp - a.timestamp)[0]
  .pointers.find(p => p.localContext === 'name').target
// Result: "Keanu Reaves" (most recent, but wrong!)

// Strategy 2: Trust specific authors
const trustedAuthors = ["imdb_official", "wikipedia"]
const name = hyperView.name
  .find(delta => trustedAuthors.includes(delta.author))
  .pointers.find(p => p.localContext === 'name').target
// Result: "Keanu Reeves" (correct!)

// Strategy 3: Return all possibilities and let the application decide
const names = hyperView.name
  .map(delta => delta.pointers.find(p => p.localContext === 'name').target)
// Result: ["Keanu Reeves", "Keanu Reaves"] (surface the conflict)

// Strategy 4: Use an LLM to resolve semantic conflicts
const name = await llmResolver(hyperView.name, {
  prompt: "Which of these names is the correct spelling?"
})
// Result: "Keanu Reeves" (AI-assisted resolution)
```

Different parts of your application can use different strategies for the same data. Your admin interface might show all conflicts (Strategy 3), while your public API uses trusted authors (Strategy 2). A data quality dashboard could flag conflicts for human review. A machine learning pipeline might use timestamps. **The HyperView preserves all the information, and View resolvers make context-appropriate decisions.**

This is why we say "this is a feature, not a bug" - the system doesn't force a single resolution strategy on you. It preserves the full provenance and lets you choose how to handle conflicts based on your use case.

#### Complete Round-Trip Example

Let's synthesize everything we've covered by walking through a simple example showing all three layers: Deltas → HyperView → View.

**Scenario**: We want to represent a person named "Alice" and retrieve their name.

<details>
<summary>Step 1: Deltas (click to expand)</summary>

```typescript
// The raw delta asserting Alice's name
const delta_alice_name = {
  id: "delta_001",
  timestamp: 1000,
  author: "user_bob",
  system: "instance_primary",
  pointers: [{
    localContext: 'named',
    target: { id: 'alice_uuid' },
    targetContext: 'name'
  }, {
    localContext: 'name',
    target: 'Alice Smith'
  }]
}
```

This delta lives in our stream. By itself, it's just an assertion connecting an entity ID to a name value.

</details>

**Step 2: HyperView** - Apply the `PersonSchema` to `alice_uuid`:

The `PersonSchema` defines:
- Selection: "Include deltas where a pointer targets this person via 'name' targetContext"
- Transformation: "Don't transform the name pointer (it's already a primitive)"

Applying this schema produces:

```typescript
const aliceHyperView = {
  id: 'alice_uuid',
  name: [
    {
      id: "delta_001",
      timestamp: 1000,
      author: "user_bob",
      system: "instance_primary",
      pointers: [{
        localContext: 'named',
        target: { id: 'alice_uuid' },
        targetContext: 'name'
      }, {
        localContext: 'name',
        target: 'Alice Smith'
      }]
    }
  ]
}
```

The HyperView has:
- Filtered the stream to only relevant deltas (just `delta_001`)
- Organized them by property (`name`)
- Left primitives as-is (no further transformation needed)

**Step 3: View** - Resolve the HyperView into a simple object:

A View resolver implements conflict resolution and extracts values:

```typescript
function resolvePersonView(hyperView) {
  return {
    id: hyperView.id,
    name: hyperView.name
      .sort((a, b) => b.timestamp - a.timestamp)[0]  // Most recent
      .pointers.find(p => p.localContext === 'name')
      .target
  }
}

const aliceView = resolvePersonView(aliceHyperView)
// Result: { id: 'alice_uuid', name: 'Alice Smith' }
```

This final View is what gets returned to the application - a clean, simple object ready for use in a UI, API response, or further computation.

**Summary of the three layers:**

1. **Deltas**: Raw assertions in the stream - provenance-rich, immutable, context-free
2. **HyperView**: Filtered and organized deltas - bounded, structured, still contains full provenance
3. **View**: Resolved domain object - conflicts handled, primitives extracted, ready for consumption

The power of this tripartite structure is that each layer serves a distinct purpose:
- Deltas enable federation, time-travel, and full audit trails
- HyperViews make querying tractable and enable efficient indexing
- Views provide clean interfaces for applications

### Mutation

How do you mutate state in this system? You create and append deltas to your store. Just as GraphQL exposes queries, it exposes mutations - your application can define mutations that generate new deltas based on the values passed in, and push these into the instance. You can wire up your GraphQL interface to do this for you, or you can just literally create javascript objects that conform to the `Delta` schema and push them in.

#### Delta Negation and Retraction

Remember that this is an **append-only** system - once a delta is written, it cannot be deleted. But what if you need to "undo" a delta? What if someone made an incorrect assertion that needs to be retracted?

This is where **negation deltas** come in. A negation delta is itself just another delta, but it specifically targets a previous delta to mark it as negated.

Here's how it works:

<details>
<summary>Example: Negating a delta (click to expand)</summary>

```typescript
// Original delta: Alice's name
const delta_alice_name = {
  id: "delta_001",
  timestamp: 1000,
  author: "user_bob",
  system: "instance_primary",
  pointers: [{
    localContext: 'named',
    target: { id: 'alice_uuid' },
    targetContext: 'name'
  }, {
    localContext: 'name',
    target: 'Alice Smith'
  }]
}

// Later, we discover this was wrong and want to retract it
const delta_negation = {
  id: "delta_002",
  timestamp: 2000,
  author: "user_bob",
  system: "instance_primary",
  pointers: [{
    localContext: 'negates',
    target: { id: 'delta_001' },  // Targeting the delta itself
    targetContext: 'negated_by'
  }, {
    localContext: 'reason',
    target: 'Incorrect information'
  }]
}
```

</details>

Now both deltas exist in the stream. The original delta is still there (immutability!), but it's been marked as negated.

**How do HyperViews handle negations?**

When a HyperSchema computes relevance closure, it needs to account for negations:
1. Select deltas targeting the domain object
2. For each selected delta `d`, check if there exists a negation delta targeting `d`
3. If negated, either exclude it or mark it as negated (depending on the schema's policy)

This means different schemas can handle negations differently:
- **Exclude negated deltas**: Most common - treat negated deltas as if they don't exist
- **Include but mark**: Audit trails might want to show "this was claimed but later retracted"
- **Require authorization**: Only respect negations from certain authors

The key principle is: **negation is just more deltas**. There's no special "delete" operation - retraction is an additive assertion, just like everything else. Deltas are atomic - you must accept or negate the entire delta, which means the granularity of negation is determined when you create the delta, not when you negate it.

**Why this matters:**

- **Auditability**: You can see not just what's currently believed, but what was once believed and later retracted
- **Time-travel**: Queries at timestamp 1500 would see the original delta; queries at timestamp 2500 would see it negated
- **Federation**: Negations propagate just like any other delta - no special sync logic needed
- **Conflict resolution**: If two instances negate the same delta, that's just convergent state

### Streaming
The streaming model means that each delta can be treated as an event, and various subscribers can react to these events. A given instance probably has a default `persistDelta` handler which appends it to some underlying append-only durable stream. But you might also have an `indexDelta` handler which efficiently compares incoming deltas to the filters associated with any indexes, and replicates them there. You may also have a `pubsub` system connecting your instance of the database to a remote instance, to which you publish a subset of your deltas; or you may have a socket open to a client-side instance, where certain deltas get streamed as soon as they're created so that client state can be updated in realtime. Different instances of this technology can be optimized for different things - so you could spin up a different instance for each of the different examples I just mentioned, and have a canonical source of truth that you regenerate your index from, a dynamic and fast in-memory index instance, many client-side instances, horizontally scalable servers supporting different subsets of your clients, whatever. Streams are great because they make eventual consistency possible!

## Practical Use Cases

The core architecture is well-suited for applications that benefit from:

**Audit-Heavy Domains**
- Financial systems where every transaction needs full provenance
- Healthcare records where changes must be tracked and potentially reverted
- Legal document management with complete version history

**Collaborative Tools**
- Multi-user editing where conflicts are expected and need contextual resolution
- Research platforms where multiple teams contribute overlapping data
- Wiki-style knowledge bases with competing claims that need to be surfaced

**Local-First Applications**
- Offline-first mobile apps that sync when connected
- Distributed systems where nodes may have different views of state
- Edge computing scenarios where data lives close to users

**Time-Travel and Debugging**
- Systems that need to reconstruct past states for analysis
- Debugging tools that replay state evolution
- Audit trails for compliance and security analysis

**Schema Evolution**
- Long-lived systems where data models change over time
- Multi-tenant platforms where different tenants need different schemas
- Experimental systems where the schema itself is being discovered

The reference implementation will focus on single-instance operation with clear sync primitives. Federation, global knowledge graphs, and compute fabrics are longer-term possibilities explored in [docs/long_term_vision.md](docs/long_term_vision.md).

## Open Questions

These are unresolved challenges that need to be addressed during implementation:

### Performance & Scale
- **Query complexity**: What is the time complexity for HyperView construction? How does it scale with stream size?
- **Index maintenance**: As deltas accumulate, how do we maintain index performance? What's the memory footprint of materialized HyperViews?
- **Compaction strategies**: Do we need snapshotting or compaction for long-running systems? How do we balance immutability with storage costs?
- **Benchmark targets**: What are acceptable performance characteristics for v1? When does the system become impractical?

### Delta Identity and Provenance
- **ID generation strategy**: Should we use UUIDs, content-addressed hashes, or another scheme? What are the collision and determinism trade-offs?
- **Author/system verification**: Currently these fields are spoofable - how do we verify authorship and system identity?
  - Cryptographic signatures? Public key infrastructure?
  - What's the verification model in federated scenarios?
  - This must be resolved before production use
- **Timestamp authority**: Who sets timestamps? Can they be trusted? What about clock skew across systems?

### Query Language Design
- **Developer ergonomics**: How do we expose HyperSchema composition to developers? Do they write schemas directly or use a higher-level DSL?
- **Complex queries**: How do you express "all directors who released a movie starring Keanu in the 90s"? What's the query API?
- **Query optimization**: Can we detect common patterns and optimize HyperView construction?

### Consistency & Causality
- **Consistency guarantees**: What are the actual guarantees? How do we reason about causality across instances?
- **Conflict convergence**: How do we ensure that different resolution strategies don't lead to unbounded divergence?
- **Partition tolerance**: What happens during network partitions? How do we handle split-brain scenarios?

### Federation Protocol
- **Sync semantics**: What's the protocol for syncing deltas between instances? How do we handle partial sync?
- **Trust boundaries**: How do we model trust between instances? Who decides what gets shared?
- **Spam & abuse**: In an open federated system, how do we prevent spam or malicious deltas?

### Schema Evolution
- **Schema conflicts**: When two instances define incompatible schemas, how do we merge them? Is schema conflict resolution fundamentally different from data conflict resolution?
- **Breaking changes**: How do we handle schemas that make breaking changes? Can old deltas be queried with new schemas?
- **Version coordination**: Do schemas need version numbers? How do we coordinate schema updates across federated instances?

### Context Vocabulary and Semantic Convergence
- **Mutation-based consistency**: Should the reference implementation include mutation helpers that enforce context vocabulary?
- **Aliasing mechanism**: In federated scenarios, how do we map vocabularies between systems? Are aliases themselves deltas?
- **Semantic similarity**: Can vector embeddings enable fuzzy context matching in specialized indexes? What are the implications for determinism and convergence?
- **Case and normalization**: Are contexts case-sensitive? How do we handle whitespace, pluralization, and special characters?

### Data Retention & Privacy
- **GDPR compliance**: How do we handle "right to be forgotten" in an append-only immutable system? Is negation sufficient, or do we need actual deletion?
- **Data lifecycle**: How long do deltas live? Do we need retention policies?
- **Selective sharing**: How granular can we be about what deltas get shared with which instances?

### Meta-Delta Complexity
- **Deltas about deltas**: Negations target deltas. What about comments on deltas? Tags? Categories? How deep does the meta-graph go?
- **Circular negations**: Can you negate a negation? What are the semantics?
- **Self-referential deltas**: Are self-negating deltas (with conditional activation) useful or dangerous?

### Operational Concerns
- **Monitoring**: What metrics matter? How do we observe system health?
- **Debugging**: How do you debug a system where state is assembled at query time?
- **Migration**: How do you migrate existing data into this model? What's the onboarding story?
- **Backup & recovery**: What does backup mean for a delta stream? How do you recover from corruption?

### Comparison to Existing Systems
- **Datomic**: How does this differ from Datomic's immutable facts and time-travel?
- **CRDTs**: What's the relationship to traditional CRDTs? Are deltas themselves CRDTs?
- **RDF/Triple stores**: How does this compare to semantic web technologies?
- **Event sourcing**: What advantages does this have over traditional event sourcing frameworks?

Some of these questions will be answered during implementation. Others may remain open for years. The goal is to be explicit about uncertainty rather than hand-waving it away.
