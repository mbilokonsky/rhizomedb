# RhizomeDB Technical Specification v0.1

## Abstract

RhizomeDB is a rhizomatic database system that uses immutable delta-CRDTs as hyperedges in a hypergraph, treating state as a side-effect assembled at query-time. This specification defines the core abstractions, instance model, and operational semantics required to implement a conformant RhizomeDB instance.

The fundamental simplicity of this model is that as long as you have a consistent implementation of the `Delta` schema you should at minimum be able to share JSON feeds with any existing implementation.

## 1. Introduction

### 1.1 Purpose

This specification defines:
- The fundamental data structures (Deltas, HyperViews, Views)
- The instance model and capability framework
- Algorithms for HyperView construction and View resolution
- Streaming and federation primitives
- Requirements for conformant implementations

### 1.2 Design Principles

RhizomeDB diverges from traditional database architecture in several key ways:

1. **No Canonical State**: State emerges from delta composition at query-time
2. **Compositional Instances**: Instances are characterized by capabilities, not roles
3. **Schemas as Data**: Everything except the Delta schema is represented as deltas
4. **Provenance First**: Every assertion carries full authorship and temporal metadata
5. **Conflict Preservation**: Multiple competing values coexist; resolution happens at query-time

### 1.3 Terminology

- **Delta**: An immutable assertion with unique identity, timestamp, author, system, and pointers
- **Pointer**: A contextualized reference from a delta to a domain object or primitive value
- **Domain Object**: An entity identified by UUID, materialized from deltas that reference it
- **HyperSchema**: A specification defining selection and transformation operations
- **HyperView**: A structured organization of deltas representing a domain object
- **View**: A resolved representation of a domain object with conflicts handled
- **Instance**: A running software component implementing some subset of RhizomeDB capabilities

## 2. Delta Specification

### 2.1 Delta Schema

A Delta is the atomic unit of data in RhizomeDB. It is immutable, context-free, and fully self-describing.

```typescript
interface Delta {
  // Unique identifier for this delta
  // Implementation note: UUIDs recommended for v1, content-addressing under consideration
  id: string

  // Millisecond timestamp of delta creation
  // Implementation note: Timestamp authority and clock skew are open questions
  timestamp: number

  // UUID of the author (person or process)
  // SECURITY WARNING: Currently unverified - cryptographic signing required for production
  author: string

  // UUID of the instance that created this delta
  // SECURITY WARNING: Currently unverified - attestation mechanism needed
  system: string

  // Array of contextualized pointers
  pointers: Pointer[]
}

interface Pointer {
  // The semantic role of this pointer from the delta's perspective
  localContext: string

  // The referenced entity or value
  target: DomainNodeReference | Primitive

  // Optional: Where this delta should be organized when querying the target
  targetContext?: string
}

interface DomainNodeReference {
  id: string
}

type Primitive = string | number | boolean
// Note: No null, undefined, or array primitives
// - Absence is represented by lack of deltas
// - Arrays are represented by multiple pointers with the same localContext
```

### 2.1.1 Delta Validation Rules

A valid delta MUST satisfy:

1. **Non-empty ID**: `id` must be a non-empty string
2. **Valid timestamp**: `timestamp` must be a positive number
3. **Non-empty author**: `author` must be a non-empty string
4. **Non-empty system**: `system` must be a non-empty string
5. **Valid pointers array**: `pointers` must be an array (can be empty)
6. **Valid pointer structure**: Each pointer must have:
   - Non-empty `localContext` string
   - Valid `target` (either DomainNodeReference with non-empty `id`, or primitive value)
   - Optional `targetContext` (if present, must be non-empty string)

**Edge cases**:

- **Empty pointers array**: Valid. Represents a delta that exists but makes no assertions. Rare but useful for metadata deltas.
- **Multiple pointers with same localContext**: Valid. Represents an array of values for that context.
- **Self-referential delta**: A delta can target itself (e.g., for metadata about the delta itself).
- **Primitive in DomainNodeReference slot**: Invalid. Use TypeScript type checking to prevent.

### 2.2 Delta Semantics

#### 2.2.1 Immutability

Once created, a delta MUST NOT be modified. Any correction or retraction MUST be expressed as a new delta (see §2.5 Negation).

#### 2.2.2 Context-Freedom

A delta does not depend on or reference any particular state. It is an assertion that stands alone, independent of when or how it is applied.

#### 2.2.3 Atomicity

A delta is atomic - it must be accepted or negated in its entirety. You cannot partially accept some pointers and reject others. This means **granularity of retraction is determined at delta creation time**.

Guidelines for delta granularity:
- **Independent facts** → Separate deltas (e.g., person's name, birthdate, nationality)
- **Inseparable facts** → Single delta (e.g., transaction with buyer, seller, item, price)

#### 2.2.4 Pointer Context Semantics

The `localContext` and `targetContext` fields define the semantics of the assertion:

- **localContext**: Describes the pointer's role within this delta
- **targetContext**: Specifies where this delta appears when querying the target object

Example:
```typescript
{
  id: "delta_001",
  timestamp: 1000,
  author: "alice",
  system: "instance_1",
  pointers: [
    {
      localContext: 'parent',
      target: { id: 'container_1' },
      targetContext: 'children'
    },
    {
      localContext: 'child',
      target: { id: 'item_1' },
      targetContext: 'parent'
    }
  ]
}
```

This delta asserts a parent-child relationship. When querying `container_1`, this delta appears under its `children` property. When querying `item_1`, it appears under its `parent` property.

#### 2.2.5 Primitive Pointers

When targeting primitive values, `targetContext` is typically omitted (as primitives don't have queryable properties):

```typescript
{
  id: "delta_002",
  timestamp: 1001,
  author: "alice",
  system: "instance_1",
  pointers: [
    {
      localContext: 'named',
      target: { id: 'person_1' },
      targetContext: 'name'
    },
    {
      localContext: 'name',
      target: 'Alice Smith'
      // No targetContext - primitives aren't queried
    }
  ]
}
```

### 2.3 Delta Identity

Each delta MUST have a globally unique `id`. Recommended approaches:

1. **UUIDv4** (recommended for v1): Simple, no coordination required
2. **Content-addressed hash**: Deterministic, enables deduplication, but requires canonical serialization
3. **UUIDv7** (time-ordered): Provides sortability, but requires timestamp trust

Implementation SHOULD document which approach is used.

### 2.4 Delta Provenance

Every delta carries complete provenance:
- **author**: Who created this assertion
- **system**: Which instance created it
- **timestamp**: When it was created

This enables:
- Trust-based conflict resolution
- Audit trails
- Time-travel queries
- Debugging and attribution

**SECURITY NOTE**: In v1, these fields are unverified and spoofable. Production systems MUST implement verification (e.g., cryptographic signatures, PKI).

### 2.5 Delta Negation

Since deltas are immutable and append-only, retraction is expressed via **negation deltas**.

A negation delta targets another delta:

```typescript
{
  id: "delta_003",
  timestamp: 2000,
  author: "alice",
  system: "instance_1",
  pointers: [
    {
      localContext: 'negates',
      target: { id: 'delta_002' },  // Targeting a delta, not a domain object
      targetContext: 'negated_by'
    },
    {
      localContext: 'reason',
      target: 'Incorrect information'
    }
  ]
}
```

Implementations MUST handle negations when constructing HyperViews (see §4.3).

Negation semantics:
- Negation is itself a delta and can be negated (double negation)
- Negation is time-sensitive: queries at `timestamp < negation.timestamp` see the original delta
- Negation can come from a different author than the original delta (authorization concerns)
- Atomic negation: cannot negate individual pointers, only entire deltas

## 3. Instance Model

### 3.1 Instance Definition

An **instance** is any running software component that participates in the RhizomeDB ecosystem. Unlike traditional databases with a server/client dichotomy, RhizomeDB instances exist on a spectrum of capabilities.

**Minimal Requirements**: An instance MUST:
1. Have a unique `system` UUID
2. Have access to deltas (from memory, disk, or network)
3. Be able to apply HyperSchemas to construct HyperViews

### 3.2 Capability Framework

Instances are characterized by which capabilities they implement:

| Capability | Description |
|------------|-------------|
| **DeltaAccess** | Can read deltas (minimal requirement) |
| **DeltaAuthoring** | Can create new deltas |
| **DeltaPersistence** | Durably stores deltas |
| **StreamConsumption** | Subscribes to delta streams |
| **StreamProduction** | Publishes deltas to subscribers |
| **IndexMaintenance** | Maintains materialized HyperViews |
| **Federation** | Syncs deltas with other instances |
| **MutationAPI** | Exposes write interface (GraphQL, REST, etc.) |
| **QueryAPI** | Exposes read interface |

### 3.3 Instance Archetypes

Different capability combinations create different instance types:

#### 3.3.1 Canonical Server
- **Capabilities**: All
- **Purpose**: Primary source of truth
- **Storage**: Durable append-only log
- **Use case**: Main application database

#### 3.3.2 Browser Client
- **Capabilities**: DeltaAuthoring, StreamConsumption, QueryAPI, optional DeltaPersistence
- **Purpose**: Offline-first client, local state management
- **Storage**: In-memory + IndexedDB
- **Use case**: React app using RhizomeDB instead of Redux/MobX

#### 3.3.3 Index/Cache Instance
- **Capabilities**: StreamConsumption, IndexMaintenance, QueryAPI
- **Purpose**: Fast lookups for specific query patterns
- **Storage**: In-memory or specialized storage (Redis, etc.)
- **Use case**: Materialized view for "all movies by year"

#### 3.3.4 Read Replica
- **Capabilities**: DeltaPersistence, StreamConsumption, QueryAPI
- **Purpose**: Horizontal scaling for read-heavy workloads
- **Storage**: Eventually-consistent copy of delta stream
- **Use case**: Geographic replica

#### 3.3.5 Ephemeral Compute
- **Capabilities**: DeltaAccess (read-only), QueryAPI
- **Purpose**: Stateless query execution
- **Storage**: None (queries external stream)
- **Use case**: Serverless function querying S3-stored deltas

#### 3.3.6 HyperView Maintainer
- **Capabilities**: StreamConsumption, IndexMaintenance
- **Purpose**: Maintains specific long-lived HyperViews
- **Storage**: Materialized HyperView only, not full stream
- **Use case**: Notification service maintaining "recent activity per user"

#### 3.3.7 Federation Bridge
- **Capabilities**: StreamConsumption, StreamProduction, Federation, DeltaAuthoring
- **Purpose**: Connects separate RhizomeDB networks
- **Storage**: Minimal (sync metadata only)
- **Use case**: Sync between corporate internal and public instances

### 3.4 Instance Interfaces

#### 3.4.1 Minimal Instance Interface

Every instance MUST implement:

```typescript
interface RhizomeInstance {
  // Unique identifier for this instance
  readonly systemId: string

  // Query deltas matching a filter
  queryDeltas(filter: DeltaFilter): Delta[] | AsyncIterable<Delta>

  // Apply a HyperSchema to construct a HyperView
  applyHyperSchema(objectId: string, schema: HyperSchema): HyperView
}

interface DeltaFilter {
  // Filter by delta IDs
  ids?: string[]

  // Filter by target object IDs
  targetIds?: string[]

  // Filter by target contexts
  targetContexts?: string[]

  // Filter by author
  authors?: string[]

  // Filter by system
  systems?: string[]

  // Filter by timestamp range
  timestampRange?: { start?: number; end?: number }

  // Filter by whether delta is negated
  includeNegated?: boolean  // default: false

  // Arbitrary predicate (for advanced filtering)
  predicate?: (delta: Delta) => boolean
}
```

#### 3.4.2 DeltaAuthoring Interface

Instances that create deltas MUST implement:

```typescript
interface DeltaAuthor extends RhizomeInstance {
  // Create a new delta
  createDelta(
    author: string,
    pointers: Pointer[]
  ): Delta

  // Create a negation delta
  negateDelta(
    author: string,
    targetDeltaId: string,
    reason?: string
  ): Delta
}
```

Implementation notes:
- `timestamp` is set automatically to current time
- `system` is set to `this.systemId`
- `id` is generated according to instance's ID strategy

#### 3.4.3 DeltaPersistence Interface

Instances that durably store deltas MUST implement:

```typescript
interface DeltaStore extends RhizomeInstance {
  // Persist a delta
  persistDelta(delta: Delta): Promise<void>

  // Batch persist deltas
  persistDeltas(deltas: Delta[]): Promise<void>

  // Get deltas by IDs
  getDeltas(ids: string[]): Promise<Delta[]>

  // Scan deltas (for initial load, backfill, etc.)
  scanDeltas(
    filter?: DeltaFilter,
    cursor?: string
  ): AsyncIterable<Delta>
}
```

#### 3.4.4 StreamConsumption Interface

Instances that subscribe to delta streams MUST implement:

```typescript
interface StreamConsumer extends RhizomeInstance {
  // Subscribe to delta stream
  subscribe(
    filter: DeltaFilter,
    handler: (delta: Delta) => void | Promise<void>
  ): Subscription
}

interface Subscription {
  // Unsubscribe
  unsubscribe(): void

  // Pause subscription
  pause(): void

  // Resume subscription
  resume(): void
}
```

#### 3.4.5 StreamProduction Interface

Instances that publish delta streams MUST implement:

```typescript
interface StreamProducer extends RhizomeInstance {
  // Publish a delta to subscribers
  publishDelta(delta: Delta): Promise<void>

  // Get stream metadata
  getStreamInfo(): StreamInfo
}

interface StreamInfo {
  // Total number of deltas published
  totalDeltas: number

  // Number of active subscriptions
  activeSubscriptions: number

  // Timestamp of latest delta
  latestTimestamp?: number
}
```

#### 3.4.6 IndexMaintenance Interface

Instances that maintain materialized HyperViews (i.e., reified, concrete, populated HyperViews cached for fast access) MUST implement:

```typescript
interface IndexMaintainer extends RhizomeInstance {
  // Materialize a HyperView for fast access
  materializeHyperView(
    objectId: string,
    schema: HyperSchema
  ): HyperView

  // Update a materialized HyperView with a new delta
  updateHyperView(
    view: HyperView,
    delta: Delta
  ): void

  // Get a materialized HyperView
  getHyperView(objectId: string): HyperView | null

  // Invalidate and rebuild a HyperView
  rebuildHyperView(objectId: string): HyperView
}
```

**Note on terminology**: The term "materialized HyperView" refers to a reified, concrete, populated HyperView (as opposed to an abstract, hypothetical output of a HyperSchema). This is a descriptive term, not a separate technical concept. Implementations MAY track metadata about materialized HyperViews (such as last update time or delta count) using the `_metadata` field in the HyperView interface (see §5.1).

## 4. HyperSchema Specification

### 4.1 HyperSchema Definition

A **HyperSchema** defines how to construct a HyperView from deltas. It consists of two fundamental operations:

1. **Selection Function**: Which deltas are relevant to a domain object?
2. **Transformation Rules**: How should pointers be transformed into nested HyperViews?

```typescript
interface HyperSchema {
  // Unique identifier for this schema
  id: string

  // Human-readable name
  name: string

  // Selection function: determines which deltas are relevant
  select: SelectionFunction

  // Transformation rules: how to transform pointers
  transform: TransformationRules
}

type SelectionFunction = (
  objectId: string,
  delta: Delta
) => boolean | string[]  // true = include, false = exclude, string[] = property names

type TransformationRules = {
  [localContext: string]: {
    // Which HyperSchema to apply to this pointer's target
    schema: HyperSchema | string  // string = schema ID for lazy resolution

    // Optional: additional filter for when to apply this transformation
    when?: (pointer: Pointer, delta: Delta) => boolean
  }
}
```

### 4.2 PrimitiveHyperSchemas

While HyperSchemas primarily define transformations for domain object references, RhizomeDB also wraps primitive values in **PrimitiveHyperSchemas** to provide type validation and metadata.

```typescript
interface PrimitiveHyperSchema extends HyperSchema {
  // GraphQL type for this primitive
  graphqlType: string

  // Validate that a value matches this primitive type
  validate(value: any): boolean

  // Optional: Base schema this is derived from
  baseSchema?: PrimitiveHyperSchema
}

// Built-in primitive schemas
const PrimitiveSchemas = {
  String: PrimitiveHyperSchema,      // Any string
  Integer: PrimitiveHyperSchema,     // Any integer
  Boolean: PrimitiveHyperSchema,     // Any boolean
}

// Chained type narrowing - build specific types from base primitives
PrimitiveSchemas.String.EmailAddress = {
  ...PrimitiveSchemas.String,
  graphqlType: 'String',
  validate: (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  baseSchema: PrimitiveSchemas.String
}

PrimitiveSchemas.Integer.Year = {
  ...PrimitiveSchemas.Integer,
  graphqlType: 'Int',
  validate: (v) => typeof v === 'number' && Number.isInteger(v) && v >= 1800 && v <= 2100,
  baseSchema: PrimitiveSchemas.Integer
}
```

#### 4.2.1 Using PrimitiveSchemas in Transformations

PrimitiveSchemas are used in transformation rules to validate and type primitive fields:

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
}
```

**Benefits of PrimitiveHyperSchemas:**

1. **Type Safety**: Runtime validation ensures values match expected types
2. **GraphQL Integration**: Automatic GraphQL type inference
3. **Type Narrowing**: Build constrained types from base primitives (e.g., Year from Integer)
4. **Metadata-Driven Discovery**: Fields are defined in schemas, not inferred from data
5. **Consistent Filtering**: Invalid values are filtered out during HyperView construction

### 4.3 Selection Function Semantics

The selection function determines relevance. It receives an object ID and a delta, and returns:

- **`false`**: Delta is not relevant (exclude from HyperView)
- **`true`**: Delta is relevant (include in default property)
- **`string[]`**: Delta is relevant, organize under these property names

**Common pattern**: Select by `targetContext`

```typescript
// Example: NamedEntity schema
const namedEntitySelection: SelectionFunction = (objectId, delta) => {
  const properties: string[] = []

  for (const pointer of delta.pointers) {
    if (pointer.target.id === objectId && pointer.targetContext) {
      properties.push(pointer.targetContext)
    }
  }

  return properties.length > 0 ? properties : false
}
```

This pattern says: "Include this delta if any pointer targets this object, and organize it under the pointer's `targetContext`."

### 4.4 Transformation Rules Semantics

Transformation rules determine how to expand pointers into nested HyperViews.

For each pointer in a selected delta:
1. Check if `pointer.localContext` matches a transformation rule
2. If yes, apply the specified HyperSchema to `pointer.target`
3. If no, leave `pointer.target` as-is (either `{ id }` or primitive)

**Example**: Movie schema

```typescript
const movieSchema: HyperSchema = {
  id: 'movie_schema',
  name: 'Movie',
  select: (objectId, delta) => {
    const properties: string[] = []
    for (const pointer of delta.pointers) {
      if (pointer.target.id === objectId && pointer.targetContext) {
        properties.push(pointer.targetContext)
      }
    }
    return properties.length > 0 ? properties : false
  },
  transform: {
    'director': { schema: 'named_entity_schema' },
    'actor': { schema: 'named_entity_schema' }
  }
}
```

### 4.5 DAG Requirement

HyperSchemas MUST form a directed acyclic graph. No schema can invoke itself through a chain of transformations.

**Valid**:
- `Movie` → `Actor` → `NamedEntity` → (no transformations) ✓

**Invalid**:
- `Movie` → `Actor` → `Movie` → ... ✗ (cycle)

**Note**: Circular *data* references are fine (Keanu created BRZRKR, BRZRKR was created by Keanu). The schema just stops expanding at appropriate points.

### 4.6 Negation Handling

When constructing HyperViews, implementations MUST check for negation deltas.

Algorithm:
1. Collect deltas matching selection function
2. For each delta `d`, query for deltas where `pointer.localContext === 'negates' AND pointer.target.id === d.id`
3. If negation exists and `negation.timestamp <= queryTimestamp`, exclude `d` from HyperView

**Time-travel**: When querying at a specific timestamp, only apply negations with `timestamp <= queryTimestamp`.

### 4.7 Example: Complete HyperSchema Definition

```typescript
// Terminal schema - no transformations
const namedEntitySchema: HyperSchema = {
  id: 'named_entity_schema',
  name: 'NamedEntity',
  select: (objectId, delta) => {
    const properties: string[] = []
    for (const pointer of delta.pointers) {
      if (pointer.target.id === objectId && pointer.targetContext) {
        properties.push(pointer.targetContext)
      }
    }
    return properties.length > 0 ? properties : false
  },
  transform: {}  // No transformations - this is a terminal schema
}

// Movie schema with transformations
const movieSchema: HyperSchema = {
  id: 'movie_schema',
  name: 'Movie',
  select: (objectId, delta) => {
    const properties: string[] = []
    for (const pointer of delta.pointers) {
      if (pointer.target.id === objectId && pointer.targetContext) {
        properties.push(pointer.targetContext)
      }
    }
    return properties.length > 0 ? properties : false
  },
  transform: {
    'director': {
      schema: namedEntitySchema,
      when: (pointer) => typeof pointer.target === 'object' && 'id' in pointer.target
    },
    'actor': {
      schema: namedEntitySchema,
      when: (pointer) => typeof pointer.target === 'object' && 'id' in pointer.target
    }
  }
}
```

## 5. HyperView Construction

### 5.1 HyperView Definition

A **HyperView** is a structured organization of deltas representing a domain object. Each property contains an array of deltas, with pointers potentially transformed into nested HyperViews.

```typescript
interface HyperView {
  // The domain object ID
  id: string

  // Optional metadata (e.g., for materialized HyperViews)
  _metadata?: {
    lastUpdated?: number
    deltaCount?: number
    [key: string]: any
  }

  // Properties, each containing deltas
  [property: string]: Delta[] | string | HyperView['_metadata']
}

// Note: In implementation, Delta.pointers may contain nested HyperViews in place of targets
```

### 5.2 Construction Algorithm

**Input**:
- `objectId`: string
- `schema`: HyperSchema
- `allDeltas`: Delta[]
- `queryTimestamp`: number (optional, defaults to now)

**Output**: `HyperView`

**Algorithm**:

```typescript
function constructHyperView(
  objectId: string,
  schema: HyperSchema,
  allDeltas: Delta[],
  queryTimestamp: number = Date.now()
): HyperView {
  // 1. Find negation deltas
  const negations = new Set<string>()
  for (const delta of allDeltas) {
    for (const pointer of delta.pointers) {
      if (pointer.localContext === 'negates' &&
          typeof pointer.target === 'object' &&
          'id' in pointer.target &&
          delta.timestamp <= queryTimestamp) {
        negations.add(pointer.target.id)
      }
    }
  }

  // 2. Select relevant deltas
  const hyperView: HyperView = { id: objectId }

  for (const delta of allDeltas) {
    // Skip negated deltas
    if (negations.has(delta.id)) continue

    // Skip deltas created after query timestamp (for time-travel)
    if (delta.timestamp > queryTimestamp) continue

    // Apply selection function
    const result = schema.select(objectId, delta)
    if (result === false) continue

    const properties = result === true ? ['_default'] : result

    // 3. Transform pointers according to transformation rules
    const transformedDelta = { ...delta }
    transformedDelta.pointers = delta.pointers.map(pointer => {
      const rule = schema.transform[pointer.localContext]

      // No transformation rule, or rule doesn't apply
      if (!rule || (rule.when && !rule.when(pointer, delta))) {
        return pointer
      }

      // Don't transform primitives
      if (typeof pointer.target !== 'object' || !('id' in pointer.target)) {
        return pointer
      }

      // Don't transform if target is the same as current object (avoid infinite recursion)
      if (pointer.target.id === objectId) {
        return pointer
      }

      // Recursively construct nested HyperView
      const nestedSchema = typeof rule.schema === 'string'
        ? resolveSchema(rule.schema)  // Implementation-specific schema resolution
        : rule.schema

      const nestedHyperView = constructHyperView(
        pointer.target.id,
        nestedSchema,
        allDeltas,
        queryTimestamp
      )

      // Replace target with HyperView
      return {
        ...pointer,
        target: nestedHyperView
      }
    })

    // 4. Add transformed delta to appropriate properties
    for (const property of properties) {
      if (!hyperView[property]) {
        hyperView[property] = []
      }
      (hyperView[property] as Delta[]).push(transformedDelta)
    }
  }

  return hyperView
}
```

### 5.3 Optimization Considerations

The naive algorithm above scans all deltas for each object. Practical implementations SHOULD optimize:

1. **Indexing**: Maintain indexes on `target.id` and `targetContext` for O(1) delta lookup
2. **Memoization**: Cache HyperViews to avoid recomputation
3. **Incremental Updates**: When a new delta arrives, update only affected HyperViews
4. **Lazy Expansion**: Don't expand nested HyperViews until accessed
5. **Bounded Expansion**: Limit recursion depth to prevent performance issues

## 6. View Resolution

### 6.1 View Definition

A **View** is a resolved representation of a domain object suitable for application consumption. It handles conflicts and extracts values from HyperView delta arrays.

```typescript
interface View {
  id: string
  [property: string]: any  // Application-specific types
}
```

### 6.2 Conflict Resolution Strategies

When a HyperView property contains multiple deltas, the View resolver must choose how to handle them.

**Common strategies**:

1. **Most Recent**: Take delta with highest timestamp
2. **Trusted Author**: Prefer deltas from specific authors
3. **First Write**: Take delta with lowest timestamp
4. **Consensus**: Majority value across deltas
5. **All Values**: Return array of all competing values
6. **Custom Logic**: Application-specific resolution (e.g., LLM-assisted)

### 6.3 Resolution Function

```typescript
type ResolutionStrategy = (deltas: Delta[]) => any

interface ViewSchema {
  // How to resolve each property
  properties: {
    [property: string]: {
      // Which HyperView property to source from
      source: string

      // How to extract value from a delta
      extract: (delta: Delta) => any

      // How to resolve conflicts
      resolve: ResolutionStrategy
    }
  }
}
```

### 6.4 Example: View Resolution

```typescript
// Most recent strategy
const mostRecent: ResolutionStrategy = (deltas) => {
  if (deltas.length === 0) return null
  return deltas.sort((a, b) => b.timestamp - a.timestamp)[0]
}

// Trusted author strategy
const trustedAuthor = (trustedAuthors: string[]): ResolutionStrategy => {
  return (deltas) => {
    const trusted = deltas.find(d => trustedAuthors.includes(d.author))
    return trusted || deltas[0]
  }
}

// Extract primitive from pointer
const extractPrimitive = (localContext: string) => (delta: Delta) => {
  const pointer = delta.pointers.find(p => p.localContext === localContext)
  return pointer?.target
}

// Person view schema
const personViewSchema: ViewSchema = {
  properties: {
    name: {
      source: 'name',
      extract: extractPrimitive('name'),
      resolve: trustedAuthor(['imdb_official', 'wikipedia'])
    }
  }
}

// Resolve HyperView to View
function resolveView(hyperView: HyperView, schema: ViewSchema): View {
  const view: View = { id: hyperView.id }

  for (const [property, config] of Object.entries(schema.properties)) {
    const deltas = hyperView[config.source] as Delta[]
    if (!deltas || deltas.length === 0) continue

    const resolved = config.resolve(deltas)
    if (resolved) {
      view[property] = config.extract(resolved)
    }
  }

  return view
}
```

## 7. Streaming Model

### 7.1 Delta Streams

A **Delta Stream** is an ordered sequence of deltas published over time. Instances can subscribe to streams to receive deltas incrementally.

```typescript
interface DeltaStream {
  // Unique identifier for this stream
  id: string

  // Subscribe to the stream
  subscribe(
    filter: DeltaFilter,
    handler: DeltaHandler
  ): StreamSubscription

  // Publish a delta to the stream
  publish(delta: Delta): Promise<void>

  // Get stream position/cursor
  getPosition(): string
}

type DeltaHandler = (delta: Delta) => void | Promise<void>

interface StreamSubscription {
  // Unsubscribe from stream
  unsubscribe(): void

  // Pause receiving deltas
  pause(): void

  // Resume receiving deltas
  resume(): void

  // Get current position in stream
  getPosition(): string
}
```

### 7.2 Stream Consumption Patterns

#### 7.2.1 Full Scan + Subscribe

Common pattern for initializing an instance:

```typescript
async function initializeInstance(instance: RhizomeInstance, stream: DeltaStream) {
  // 1. Scan all historical deltas
  const allDeltas: Delta[] = []
  for await (const delta of instance.queryDeltas({})) {
    allDeltas.push(delta)
  }

  // 2. Build initial state
  // ... (build indexes, HyperViews, etc.)

  // 3. Subscribe to new deltas
  stream.subscribe({}, (delta) => {
    // Incrementally update state
    updateIndexes(delta)
  })
}
```

#### 7.2.2 Filtered Subscription

Subscribe only to relevant deltas:

```typescript
// Only subscribe to deltas targeting specific objects
stream.subscribe(
  { targetIds: ['movie_123', 'actor_456'] },
  (delta) => {
    updateHyperView(delta)
  }
)
```

#### 7.2.3 Backpressure Handling

Implementations SHOULD handle slow consumers:

```typescript
interface DeltaStream {
  subscribe(
    filter: DeltaFilter,
    handler: DeltaHandler,
    options?: {
      // Buffer size for slow consumers
      bufferSize?: number

      // What to do when buffer is full
      overflowStrategy?: 'drop_oldest' | 'drop_newest' | 'error'
    }
  ): StreamSubscription
}
```

## 8. Federation Primitives

### 8.1 Federation Overview

**Federation** allows separate RhizomeDB instances to sync deltas, enabling distributed operation without a central authority.

Key properties:
- **Eventual consistency**: Instances converge to the same state given the same deltas
- **Partial replication**: Instances can sync subsets of deltas
- **Trust boundaries**: Instances can filter deltas based on author/system
- **Conflict-free**: Delta CRDTs naturally merge without coordination

### 8.2 Federation Interface

```typescript
interface FederatedInstance extends RhizomeInstance {
  // Connect to a remote instance
  connectToRemote(
    remoteUrl: string,
    config: FederationConfig
  ): Promise<FederationLink>

  // List active federation links
  getFederationLinks(): FederationLink[]
}

interface FederationConfig {
  // Which deltas to send to remote
  pushFilter?: DeltaFilter

  // Which deltas to accept from remote
  pullFilter?: DeltaFilter

  // Trust settings
  trustPolicy?: TrustPolicy

  // Sync mode
  mode: 'push' | 'pull' | 'bidirectional'

  // Initial sync strategy
  initialSync?: 'full' | 'from_timestamp' | 'none'
}

interface FederationLink {
  // Unique ID for this link
  id: string

  // Remote instance info
  remoteSystemId: string
  remoteUrl: string

  // Current status
  status: 'connected' | 'disconnected' | 'syncing' | 'error'

  // Stats
  stats: {
    deltasSent: number
    deltasReceived: number
    lastSyncTimestamp: number
  }

  // Control
  pause(): void
  resume(): void
  disconnect(): void
}

interface TrustPolicy {
  // Which authors to trust from remote
  trustedAuthors?: string[]

  // Which systems to trust
  trustedSystems?: string[]

  // Custom verification
  verify?: (delta: Delta) => boolean | Promise<boolean>
}
```

### 8.3 Conflict-Free Convergence

Delta CRDTs ensure conflict-free convergence:

1. **Commutativity**: Order of delta application doesn't matter
2. **Idempotency**: Applying the same delta twice is safe
3. **Associativity**: Grouping of delta sets doesn't matter

**Proof sketch**: Since deltas are immutable with unique IDs, two instances that receive the same set of deltas (regardless of order) will construct identical HyperViews (given the same HyperSchema and query timestamp).

### 8.4 Federation Topology Patterns

#### 8.4.1 Hub-and-Spoke

Central instance federates with many peripheral instances:

```
    [Central Server]
      /    |    \
   [A]   [B]   [C]
```

Use case: Central authority with edge instances

#### 8.4.2 Peer-to-Peer

All instances federate with each other:

```
   [A] ─── [B]
    │   ×   │
   [D] ─── [C]
```

Use case: Fully distributed collaboration

#### 8.4.3 Hierarchical

Multi-level federation with regional hubs:

```
      [Global]
       /    \
   [US]    [EU]
   /  \    /  \
  [A] [B][C] [D]
```

Use case: Geographic distribution with regional aggregation

#### 8.4.4 Selective

Instances federate with subsets based on trust/interest:

```
   [Public] ←→ [Bridge] ←→ [Private]
```

Use case: Trust boundary between public and private networks

## 9. Implementation Considerations

### 9.1 Performance Characteristics

Expected performance targets for reference implementation:

| Operation | Target | Notes |
|-----------|--------|-------|
| Delta creation | < 1ms | In-memory operation |
| Delta persistence | < 10ms | Depends on storage backend |
| HyperView construction (cold) | < 100ms | For objects with ~100 deltas |
| HyperView construction (hot) | < 10ms | From materialized index |
| View resolution | < 1ms | In-memory conflict resolution |
| Stream subscription latency | < 10ms | From publish to delivery |

These are goals, not requirements. Actual performance depends on:
- Delta volume and growth rate
- HyperSchema complexity (depth, branching factor)
- Storage backend characteristics
- Hardware resources

### 9.2 Storage Recommendations

#### 9.2.1 Delta Storage

Recommended storage backends:

1. **PostgreSQL**: Good general-purpose choice
   - Store deltas as JSONB
   - Index on `id`, `timestamp`, `author`, `system`
   - GIN index on `pointers` for target queries

2. **Append-only log** (e.g., Kafka, NATS Streaming):
   - Natural fit for delta stream
   - Built-in replication and durability
   - Requires separate index for queries

3. **Object storage** (e.g., S3):
   - Cost-effective for large volumes
   - Partition by timestamp (e.g., daily files)
   - Requires separate index for queries

#### 9.2.2 Index Storage

Materialized HyperViews can be cached in:

1. **In-memory** (e.g., Redis):
   - Fastest access
   - Limited by RAM
   - Serialize as JSON

2. **Document store** (e.g., MongoDB):
   - Good for nested HyperViews
   - Flexible schema
   - Native JSON support

3. **Relational** (e.g., PostgreSQL JSONB):
   - Can colocate with delta storage
   - JSONB provides indexing and querying

### 9.3 Scaling Strategies

#### 9.3.1 Horizontal Scaling - Read Path

1. **Read replicas**: Multiple instances with replicated delta streams
2. **Specialized indexes**: Different instances maintain different HyperViews
3. **CDN pattern**: Edge instances cache popular HyperViews

#### 9.3.2 Horizontal Scaling - Write Path

1. **Partition by object ID**: Hash-partition deltas based on target IDs
2. **Time-based partitioning**: Recent deltas on fast storage, historical on slow
3. **Federation**: Multiple autonomous instances syncing subsets

#### 9.3.3 Vertical Scaling

1. **Faster storage**: SSDs, NVMe for delta and index storage
2. **More RAM**: Cache more HyperViews in memory
3. **Better CPU**: Faster HyperView construction and conflict resolution

### 9.4 Monitoring and Observability

Recommended metrics:

1. **Delta metrics**:
   - Deltas created per second
   - Deltas persisted per second
   - Delta storage size
   - Average delta size

2. **HyperView metrics**:
   - HyperView construction time (p50, p95, p99)
   - Cache hit rate
   - Number of materialized HyperViews
   - Average deltas per HyperView

3. **Stream metrics**:
   - Stream subscription count
   - Stream publish latency
   - Subscriber lag
   - Backpressure events

4. **Federation metrics**:
   - Active federation links
   - Deltas sent/received per link
   - Sync lag
   - Trust policy rejections

### 9.5 Security Considerations

#### 9.5.1 Delta Verification

**CRITICAL**: v1 implementation has unverified `author` and `system` fields. Production systems MUST implement verification.

Recommended approach:
```typescript
interface VerifiedDelta extends Delta {
  // Cryptographic signature
  signature: string

  // Public key of author
  publicKey: string
}

function verifyDelta(delta: VerifiedDelta): boolean {
  // Verify signature matches delta contents and public key
  const payload = JSON.stringify({
    id: delta.id,
    timestamp: delta.timestamp,
    author: delta.author,
    system: delta.system,
    pointers: delta.pointers
  })

  return cryptoVerify(payload, delta.signature, delta.publicKey)
}
```

#### 9.5.2 Trust Boundaries

In federated scenarios:
- Each instance SHOULD maintain a trust policy
- Trust policies SHOULD be configurable per federation link
- Untrusted deltas SHOULD be quarantined or rejected

#### 9.5.3 Privacy and GDPR

**Open question**: How to handle "right to be forgotten" in append-only system?

Potential approaches:
1. **Negation suffices**: Treat negation as effective deletion
2. **Encryption with key deletion**: Encrypt delta contents, delete keys to "forget"
3. **Separate retention policies**: Some deltas (e.g., personal data) can be actually deleted
4. **Off-chain references**: Store sensitive data off-chain, deltas only reference IDs

This requires legal analysis beyond scope of this spec.

## 10. Reference Implementation Requirements

### 10.1 Scope

A conformant reference implementation MUST:

1. Implement the Delta schema (§2)
2. Implement at least one instance archetype (§3.3)
3. Implement HyperView construction algorithm (§5)
4. Implement basic View resolution (§6)
5. Implement in-memory delta streaming (§7)
6. Provide TypeScript/JavaScript API

A conformant reference implementation SHOULD:
1. Implement delta persistence (PostgreSQL or similar)
2. Implement index maintenance
3. Implement at least one federation pattern
4. Provide GraphQL API
5. Include comprehensive tests
6. Include performance benchmarks

### 10.2 API Surface

Minimal API for a reference implementation:

```typescript
// Core instance
class RhizomeDB implements RhizomeInstance {
  constructor(config: RhizomeConfig)

  // Instance identity
  readonly systemId: string

  // Delta operations
  createDelta(author: string, pointers: Pointer[]): Delta
  negateDelta(author: string, targetDeltaId: string, reason?: string): Delta
  persistDelta(delta: Delta): Promise<void>
  queryDeltas(filter: DeltaFilter): Delta[]

  // HyperView operations
  applyHyperSchema(objectId: string, schema: HyperSchema): HyperView
  materializeHyperView(objectId: string, schema: HyperSchema): HyperView

  // Streaming
  subscribe(filter: DeltaFilter, handler: DeltaHandler): Subscription

  // Utility
  getStats(): InstanceStats
}

interface RhizomeConfig {
  // Instance identity
  systemId?: string  // Auto-generate if not provided

  // Storage
  storage: 'memory' | 'postgres' | 'custom'
  storageConfig?: any

  // Performance
  cacheSize?: number  // Max materialized HyperViews to cache
  enableIndexing?: boolean
}

interface InstanceStats {
  totalDeltas: number
  materializedHyperViews: number
  activeSubscriptions: number
  uptime: number
}
```

### 10.3 Test Coverage Requirements

Reference implementation SHOULD include tests for:

1. **Delta operations**:
   - Create delta with valid pointers
   - Negate delta
   - Query deltas by various filters
   - Persist and retrieve deltas

2. **HyperView construction**:
   - Simple HyperView (no transformations)
   - Nested HyperView (with transformations)
   - Time-travel queries
   - Negation handling
   - Circular reference handling

3. **View resolution**:
   - Conflict resolution strategies
   - Primitive extraction
   - Nested object resolution

4. **Streaming**:
   - Subscribe and receive deltas
   - Filtered subscriptions
   - Unsubscribe
   - Multiple subscribers

5. **Performance**:
   - HyperView construction time
   - Delta persistence throughput
   - Stream latency
   - Memory usage

## 11. Complete Worked Example

This section provides a complete end-to-end example demonstrating all core concepts: delta creation, HyperView construction, and View resolution.

### 11.1 Scenario

We'll model a simple blog post with an author and comments.

### 11.2 Step 1: Create Deltas

```typescript
const AUTHOR_ID = 'author_alice'
const POST_ID = 'post_001'
const COMMENT_1_ID = 'comment_001'
const COMMENT_2_ID = 'comment_002'
const SYSTEM_ID = 'blog_instance_1'

// Delta 1: Author's name
const delta1: Delta = {
  id: 'delta_001',
  timestamp: 1000,
  author: AUTHOR_ID,
  system: SYSTEM_ID,
  pointers: [
    {
      localContext: 'named',
      target: { id: AUTHOR_ID },
      targetContext: 'name'
    },
    {
      localContext: 'name',
      target: 'Alice Johnson'
    }
  ]
}

// Delta 2: Blog post
const delta2: Delta = {
  id: 'delta_002',
  timestamp: 1001,
  author: AUTHOR_ID,
  system: SYSTEM_ID,
  pointers: [
    {
      localContext: 'post',
      target: { id: POST_ID },
      targetContext: 'title'
    },
    {
      localContext: 'title',
      target: 'Understanding RhizomeDB'
    }
  ]
}

// Delta 3: Post content
const delta3: Delta = {
  id: 'delta_003',
  timestamp: 1002,
  author: AUTHOR_ID,
  system: SYSTEM_ID,
  pointers: [
    {
      localContext: 'post',
      target: { id: POST_ID },
      targetContext: 'content'
    },
    {
      localContext: 'content',
      target: 'RhizomeDB is a novel database architecture...'
    }
  ]
}

// Delta 4: Post authorship
const delta4: Delta = {
  id: 'delta_004',
  timestamp: 1003,
  author: AUTHOR_ID,
  system: SYSTEM_ID,
  pointers: [
    {
      localContext: 'post',
      target: { id: POST_ID },
      targetContext: 'author'
    },
    {
      localContext: 'author',
      target: { id: AUTHOR_ID },
      targetContext: 'posts'
    }
  ]
}

// Delta 5: First comment
const delta5: Delta = {
  id: 'delta_005',
  timestamp: 2000,
  author: 'user_bob',
  system: SYSTEM_ID,
  pointers: [
    {
      localContext: 'comment',
      target: { id: COMMENT_1_ID },
      targetContext: 'text'
    },
    {
      localContext: 'text',
      target: 'Great explanation!'
    },
    {
      localContext: 'author',
      target: 'Bob'
    }
  ]
}

// Delta 6: Comment -> Post relationship
const delta6: Delta = {
  id: 'delta_006',
  timestamp: 2001,
  author: 'user_bob',
  system: SYSTEM_ID,
  pointers: [
    {
      localContext: 'post',
      target: { id: POST_ID },
      targetContext: 'comments'
    },
    {
      localContext: 'comment',
      target: { id: COMMENT_1_ID },
      targetContext: 'post'
    }
  ]
}

// Delta 7: Second comment (contains error - will be negated)
const delta7: Delta = {
  id: 'delta_007',
  timestamp: 3000,
  author: 'user_bob',
  system: SYSTEM_ID,
  pointers: [
    {
      localContext: 'comment',
      target: { id: COMMENT_2_ID },
      targetContext: 'text'
    },
    {
      localContext: 'text',
      target: 'This is spam!'  // Oops, mistake
    }
  ]
}

// Delta 8: Negation of spam comment
const delta8: Delta = {
  id: 'delta_008',
  timestamp: 3500,
  author: 'user_bob',
  system: SYSTEM_ID,
  pointers: [
    {
      localContext: 'negates',
      target: { id: 'delta_007' },
      targetContext: 'negated_by'
    },
    {
      localContext: 'reason',
      target: 'Accidental spam comment'
    }
  ]
}

const allDeltas = [delta1, delta2, delta3, delta4, delta5, delta6, delta7, delta8]
```

### 11.3 Step 2: Define HyperSchemas

```typescript
// Terminal schema for named entities
const NamedEntitySchema: HyperSchema = {
  id: 'named_entity',
  name: 'NamedEntity',
  select: (objectId, delta) => {
    const properties: string[] = []
    for (const pointer of delta.pointers) {
      if (typeof pointer.target === 'object' &&
          pointer.target.id === objectId &&
          pointer.targetContext) {
        properties.push(pointer.targetContext)
      }
    }
    return properties.length > 0 ? properties : false
  },
  transform: {}  // Terminal - no nested expansion
}

// Schema for comments
const CommentSchema: HyperSchema = {
  id: 'comment',
  name: 'Comment',
  select: (objectId, delta) => {
    const properties: string[] = []
    for (const pointer of delta.pointers) {
      if (typeof pointer.target === 'object' &&
          pointer.target.id === objectId &&
          pointer.targetContext) {
        properties.push(pointer.targetContext)
      }
    }
    return properties.length > 0 ? properties : false
  },
  transform: {}  // Keep it simple - don't expand nested relationships
}

// Schema for blog posts
const BlogPostSchema: HyperSchema = {
  id: 'blog_post',
  name: 'BlogPost',
  select: (objectId, delta) => {
    const properties: string[] = []
    for (const pointer of delta.pointers) {
      if (typeof pointer.target === 'object' &&
          pointer.target.id === objectId &&
          pointer.targetContext) {
        properties.push(pointer.targetContext)
      }
    }
    return properties.length > 0 ? properties : false
  },
  transform: {
    'author': {
      schema: NamedEntitySchema,
      when: (pointer) => typeof pointer.target === 'object' && 'id' in pointer.target
    },
    'comment': {
      schema: CommentSchema,
      when: (pointer) => typeof pointer.target === 'object' && 'id' in pointer.target
    }
  }
}
```

### 11.4 Step 3: Construct HyperView

```typescript
// Using the algorithm from §5.2
const postHyperView = constructHyperView(
  POST_ID,
  BlogPostSchema,
  allDeltas,
  Date.now()  // Query at current time
)

// Result (simplified for readability):
{
  id: 'post_001',
  title: [
    {
      id: 'delta_002',
      timestamp: 1001,
      author: 'author_alice',
      system: 'blog_instance_1',
      pointers: [
        { localContext: 'post', target: { id: 'post_001' }, targetContext: 'title' },
        { localContext: 'title', target: 'Understanding RhizomeDB' }
      ]
    }
  ],
  content: [
    {
      id: 'delta_003',
      timestamp: 1002,
      author: 'author_alice',
      system: 'blog_instance_1',
      pointers: [
        { localContext: 'post', target: { id: 'post_001' }, targetContext: 'content' },
        { localContext: 'content', target: 'RhizomeDB is a novel database architecture...' }
      ]
    }
  ],
  author: [
    {
      id: 'delta_004',
      timestamp: 1003,
      author: 'author_alice',
      system: 'blog_instance_1',
      pointers: [
        { localContext: 'post', target: { id: 'post_001' }, targetContext: 'author' },
        {
          localContext: 'author',
          target: {
            // Nested HyperView for author (via NamedEntitySchema)
            id: 'author_alice',
            name: [
              {
                id: 'delta_001',
                timestamp: 1000,
                author: 'author_alice',
                system: 'blog_instance_1',
                pointers: [
                  { localContext: 'named', target: { id: 'author_alice' }, targetContext: 'name' },
                  { localContext: 'name', target: 'Alice Johnson' }
                ]
              }
            ]
          },
          targetContext: 'posts'
        }
      ]
    }
  ],
  comments: [
    {
      id: 'delta_006',
      timestamp: 2001,
      author: 'user_bob',
      system: 'blog_instance_1',
      pointers: [
        { localContext: 'post', target: { id: 'post_001' }, targetContext: 'comments' },
        {
          localContext: 'comment',
          target: {
            // Nested HyperView for comment (via CommentSchema)
            id: 'comment_001',
            text: [
              {
                id: 'delta_005',
                timestamp: 2000,
                author: 'user_bob',
                system: 'blog_instance_1',
                pointers: [
                  { localContext: 'comment', target: { id: 'comment_001' }, targetContext: 'text' },
                  { localContext: 'text', target: 'Great explanation!' },
                  { localContext: 'author', target: 'Bob' }
                ]
              }
            ]
          },
          targetContext: 'post'
        }
      ]
    }
  ]
  // Note: delta_007 is NOT included because it was negated by delta_008
}
```

### 11.5 Step 4: Define View Schema

```typescript
const extractPrimitive = (localContext: string) => (delta: Delta) => {
  const pointer = delta.pointers.find(p => p.localContext === localContext)
  return pointer?.target
}

const extractNestedHyperView = (localContext: string) => (delta: Delta) => {
  const pointer = delta.pointers.find(p => p.localContext === localContext)
  return pointer?.target
}

const mostRecent: ResolutionStrategy = (deltas) => {
  if (deltas.length === 0) return null
  return deltas.sort((a, b) => b.timestamp - a.timestamp)[0]
}

const allValues: ResolutionStrategy = (deltas) => {
  return deltas
}

const BlogPostViewSchema: ViewSchema = {
  properties: {
    title: {
      source: 'title',
      extract: extractPrimitive('title'),
      resolve: mostRecent
    },
    content: {
      source: 'content',
      extract: extractPrimitive('content'),
      resolve: mostRecent
    },
    author: {
      source: 'author',
      extract: (delta) => {
        const pointer = delta.pointers.find(p => p.localContext === 'author')
        if (!pointer || typeof pointer.target !== 'object' || !('id' in pointer.target)) {
          return null
        }
        const authorHyperView = pointer.target as any
        const nameDeltas = authorHyperView.name || []
        if (nameDeltas.length === 0) return { id: authorHyperView.id }
        const nameDelta = nameDeltas[0]
        const namePointer = nameDelta.pointers.find(p => p.localContext === 'name')
        return {
          id: authorHyperView.id,
          name: namePointer?.target
        }
      },
      resolve: mostRecent
    },
    comments: {
      source: 'comments',
      extract: (delta) => {
        return delta.pointers
          .filter(p => p.localContext === 'comment')
          .map(p => {
            if (typeof p.target !== 'object' || !('id' in p.target)) return null
            const commentHyperView = p.target as any
            const textDeltas = commentHyperView.text || []
            if (textDeltas.length === 0) return { id: commentHyperView.id }
            const textDelta = textDeltas[0]
            const textPointer = textDelta.pointers.find(p => p.localContext === 'text')
            const authorPointer = textDelta.pointers.find(p => p.localContext === 'author')
            return {
              id: commentHyperView.id,
              text: textPointer?.target,
              author: authorPointer?.target,
              timestamp: textDelta.timestamp
            }
          })
          .filter(c => c !== null)
      },
      resolve: allValues
    }
  }
}
```

### 11.6 Step 5: Resolve View

```typescript
const postView = resolveView(postHyperView, BlogPostViewSchema)

// Final result:
{
  id: 'post_001',
  title: 'Understanding RhizomeDB',
  content: 'RhizomeDB is a novel database architecture...',
  author: {
    id: 'author_alice',
    name: 'Alice Johnson'
  },
  comments: [
    [
      {
        id: 'comment_001',
        text: 'Great explanation!',
        author: 'Bob',
        timestamp: 2000
      }
    ]
  ]
}
```

### 11.7 Key Observations

1. **Negation worked**: `delta_007` (spam comment) was excluded because `delta_008` negated it
2. **Nested HyperViews**: Author and comments were expanded according to their schemas
3. **Conflict resolution**: Each property used a resolution strategy (mostRecent, allValues)
4. **Type safety**: The View is a clean JavaScript object ready for application use
5. **Provenance preserved**: The HyperView retains full delta information for auditing

This example demonstrates the complete flow from raw deltas through HyperView construction to final View resolution.

## 12. Open Research Questions

These questions remain open and should be addressed through implementation experience:

### 12.1 Performance and Scalability

1. **Query complexity bounds**: What is the worst-case complexity for HyperView construction? How do we prevent pathological cases?

2. **Compaction strategies**: Do we need snapshotting or compaction for long-running systems? How to balance immutability with storage costs?

3. **Index maintenance costs**: As delta volume grows, what is the cost to maintain materialized HyperViews? When does it become prohibitive?

### 12.2 Semantic Convergence

1. **Context vocabulary**: How do we achieve consistent `localContext`/`targetContext` naming across federated instances?

2. **Schema conflicts**: When two instances define incompatible HyperSchemas for the same domain, how do we merge them?

3. **Semantic similarity**: Can vector embeddings enable fuzzy context matching? What are the implications for determinism?

### 12.3 Consistency and Causality

1. **Causal ordering**: Do we need vector clocks or Lamport timestamps to preserve causality across instances?

2. **Consistency guarantees**: What are the actual guarantees? Can we provide something stronger than eventual consistency in some scenarios?

3. **Conflict convergence**: How do we ensure different resolution strategies don't lead to unbounded divergence?

### 12.4 Schema Evolution

1. **Breaking changes**: How do we handle schemas that make breaking changes? Can old deltas be queried with new schemas?

2. **Version coordination**: Do schemas need version numbers? How do we coordinate schema updates across federated instances?

3. **Schema as deltas**: What is the exact delta structure for representing HyperSchemas and ViewSchemas?

### 12.5 Advanced Features

1. **Computed properties**: Can HyperSchemas include derived/computed properties? How are they cached/invalidated?

2. **Reactive queries**: Can we support GraphQL-style subscriptions that re-execute when relevant deltas arrive?

3. **Transactions**: Do we need transaction semantics? What would they mean in a delta-based system?

## 13. Conclusion

This specification defines the core abstractions and operational semantics for RhizomeDB. Key innovations:

1. **Compositional instances**: Instances defined by capabilities, not roles
2. **State as side-effect**: No canonical state, only delta composition
3. **Conflict preservation**: Multiple values coexist until resolution
4. **Native federation**: Delta CRDTs enable conflict-free merging
5. **Provenance-first**: Every assertion carries full metadata

The reference implementation will validate these abstractions and surface any necessary refinements.

## Appendix A: Comparison to Related Systems

### A.1 Datomic

**Similarities**:
- Immutable facts with temporal metadata
- Time-travel queries
- Append-only storage

**Differences**:
- RhizomeDB: Deltas are context-free assertions, not state transitions
- RhizomeDB: Federation is first-class, not secondary
- RhizomeDB: No canonical transaction log, distributed by nature
- RhizomeDB: HyperViews organize deltas by property, not entity

### A.2 CRDTs

**Similarities**:
- Deltas behave like CRDT operations
- Conflict-free convergence
- Suitable for distributed systems

**Differences**:
- RhizomeDB: Deltas are hyperedges, not just state updates
- RhizomeDB: Richer semantic structure (pointers with contexts)
- RhizomeDB: Schema-driven composition, not just merge semantics

### A.3 RDF/Triple Stores

**Similarities**:
- Graph-based data model
- Flexible schema
- Semantic relationships

**Differences**:
- RhizomeDB: Deltas are hyperedges (n-ary), not triples (binary)
- RhizomeDB: Built-in temporal and provenance metadata
- RhizomeDB: HyperViews provide bounded query scope
- RhizomeDB: Conflict preservation vs. triple uniqueness

### A.4 Event Sourcing

**Similarities**:
- Append-only event log
- State derived from events
- Time-travel capabilities

**Differences**:
- RhizomeDB: Deltas are context-free, not state transitions
- RhizomeDB: No aggregate roots or command/event distinction
- RhizomeDB: Federation and merging are first-class
- RhizomeDB: HyperSchemas provide structured query, not just replay

## Appendix B: Glossary

- **CRDT**: Conflict-free Replicated Data Type - data structures that automatically merge without conflicts
- **Delta**: Atomic immutable assertion with provenance and pointers
- **Domain Object**: Entity identified by UUID, materialized from referencing deltas
- **Federation**: Process of syncing deltas between autonomous instances
- **HyperSchema**: Specification of selection and transformation operations
- **HyperView**: Structured organization of deltas representing a domain object
- **Instance**: Running software component implementing RhizomeDB capabilities
- **Pointer**: Contextualized reference from delta to domain object or primitive
- **Provenance**: Metadata about delta's origin (author, system, timestamp)
- **View**: Resolved domain object with conflicts handled, ready for consumption
- **View Schema**: Specification of conflict resolution and value extraction

## Appendix C: Version History

- **v0.1** (2025-10-23): Initial specification
  - Instance model and capability framework
  - Delta, HyperSchema, HyperView, View definitions
  - Basic streaming and federation primitives
  - Open research questions identified
