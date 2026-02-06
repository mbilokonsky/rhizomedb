# Substrate Audit: What Does RhizomeDB Actually Need?

**Date:** 2026-02-05
**Branch:** `feature/scenario-tests`

## What This Is

A systematic map of what RhizomeDB can do, what it can't, and what needs
design work before implementation. Produced by auditing the 60 scenario
tests, the formal spec, and the core implementation against each other.

---

## I. What's Solid

These areas work well. The scenario tests confirm them across 12 diverse
domains. No design work needed — just maintenance.

### Delta Primitives
- Immutable delta creation with provenance (author, system, timestamp)
- Pointer semantics: annotation (object+primitive) and relationship (object+object)
- Delta identity via UUIDv4, idempotent persistence
- Full validation per spec (structure, types, self-reference handling)

### Negation
- Single primitive, multiple meanings: error correction, authority override,
  formal retraction, evidence challenge
- Double negation = restoration (full chain calculation, max 100 iterations)
- Integrated with time-travel — negations respect timestamps
- Tested in 8/12 scenarios

### Time-Travel
- `TimeTravelDB` wrapper: snapshots, timelines, property tracking, diffing
- `findOrigin()` for provenance
- Works cleanly with negation
- Every scenario that uses it works without workarounds

### Federation
- Bidirectional sync with automatic idempotency
- Push/pull filters with `deltaMatchesFilter()`
- Trust policies (trusted authors, trusted systems, custom verify)
- WebSocket transport, auto-broadcast of new deltas
- Tested across mutual aid, journalism, and medical records scenarios

### View Resolution
- Six spec strategies all implemented: mostRecent, firstWrite, allValues,
  trustedAuthor, consensus, custom
- Plus extras: trustedSystem, average, min, max
- `ViewResolver` handles recursive nested views
- Schema filtering produces different views from same underlying deltas

### Streaming
- Subscribe/publish with filter support
- Backpressure handling (configurable buffer, overflow strategies)
- Subscription control (pause, resume, unsubscribe)

### Spec Coverage
- ~85-90% of the formal spec is implemented
- All required reference implementation features present
- All instance capability interfaces defined and working

---

## II. What's Friction (Works, But Shouldn't Require This Much Effort)

These are things the scenario tests needed that the system provides, but
only through boilerplate or manual assembly. The helpers.ts file is the
evidence — it's 289 lines of "things that should be primitives."

### A. queryDeltas() Return Type

Every single test does this:
```typescript
const deltas = db.queryDeltas({...});
const deltasArray = Array.isArray(deltas) ? deltas : [];
```

This appears 100+ times across the test suite. The return type is
`Delta[] | Iterator<Delta>` but it always returns `Delta[]` in practice.
Fix the type signature.

### B. Entity Resolution to Plain Object

The full pipeline to get a resolved entity:
1. Build HyperView from all deltas
2. Iterate properties, skip `id` and `_metadata`
3. For each property, create a `PropertyResolution` with extract/resolve
4. Instantiate ViewResolver
5. Call resolveView

The helpers wrap this in `resolveEntity()` and `resolveEntityWith()`.
These should be built-in: `db.resolve(entityId, strategy?, timestamp?)`.

### C. Getting All Values for a Property

Used in 6/12 scenarios (conflicts, competing claims, audit trails):
```typescript
function allValuesFor(db, entityId, property, timestamp?): any[]
```

Requires building a HyperView, extracting the property's delta array,
then manually extracting primitive values from pointers. Should be a
one-liner.

### D. Relationship Traversal

Used in 7/12 scenarios (supply chains, evidence chains, knowledge graphs):
```typescript
function relatedIds(db, entityId, property, throughRole, timestamp?): string[]
```

Requires building a HyperView, extracting deltas, then manually walking
pointers to find targets with the right role. This is the most fundamental
graph operation and it's not a primitive.

### E. Schema Boilerplate

Every scenario that uses selective views writes a full `select()` function:
```typescript
const schema: HyperSchema = {
  id: 'legal-evidence',
  name: 'Legal Evidence',
  select: (objectId, delta) => {
    const admissibleContexts = ['land_use', 'seasonal_pattern'];
    // 8 lines of pointer iteration...
  },
  transform: {}
};
```

5/12 scenarios need this. A `selectByContexts(['land_use', 'seasonal_pattern'])`
helper exists (`selectByTargetContext`) but it's never used in the tests —
unclear if it actually works for this pattern or is incomplete.

### F. Primitive Extraction from Pointers

This 5-line pattern appears 100+ times:
```typescript
for (const p of delta.pointers) {
  if (typeof p.target === 'string' || typeof p.target === 'number' || typeof p.target === 'boolean') {
    return p.target;
  }
}
```

Should be `delta.getValue()` or `extractValue(delta)`.

---

## III. What's Missing (The Substrate Gaps)

These are things the system fundamentally cannot do today. Not friction —
absence. Ordered by how much they matter for the stated goal of being a
substrate for autonomous agent coordination.

### Gap 1: Entity Discovery

**The problem:** You can only find an entity if you already have its ID.

There is no way to:
- Query "all entities with property X = value"
- Query "all entities of type Y"
- Enumerate entities matching a pattern
- Do a reverse lookup ("what references this entity?")

**Why it matters:** Agents need to discover entities, not just access known
ones. "Show me all idle agents" or "find patients with allergy X" are
fundamental operations that require knowing IDs in advance.

**What exists:** `queryDeltas()` with `DeltaFilter` can filter by author,
system, targetId, targetContext, timestamp range. But this returns *deltas*,
not *entities*. There's no entity-level query layer.

**Design questions:**
- Should entity discovery be a delta-layer operation (scan + group) or
  a separate index?
- How does this interact with schemas? Is "type" just another property,
  or is it structural?
- Performance: full scan vs. secondary indexes on property values?

### Gap 2: Relationship/Graph Queries

**The problem:** No graph traversal primitives.

Cannot do:
- "All entities related to X through relationship Y"
- "Path from entity A to entity B"
- Transitive closure ("all ancestors of X")
- Bidirectional traversal ("who references me?")

**Why it matters:** Supply chains, evidence chains, knowledge graphs,
organizational hierarchies — the scenario tests all built these manually
by knowing IDs and calling `relatedIds()` one hop at a time.

**What exists:** HyperView construction does one level of expansion via
transformation rules. The `relatedIds()` helper in scenarios does one-hop
traversal manually.

**Design questions:**
- Is multi-hop traversal a query primitive or composed from single-hop?
- How does graph traversal interact with negation? (Edge negated = path broken?)
- Depth limits? Cycle handling for non-DAG graphs?
- Does this need its own index (adjacency list)?

### Gap 3: Entity Resolution Beyond String IDs

**The problem:** Two deltas about the same real-world thing but with
different IDs are treated as unrelated.

Cannot do:
- Declare "these two IDs are the same entity"
- Define identity properties ("entities with same SSN are the same person")
- Merge entity histories after identity discovery
- Fuzzy/approximate entity matching

**Why it matters:** In federated systems, different instances may create
deltas about the same entity under different IDs. Cross-instance entity
resolution is fundamental to federation being useful beyond "sync exact
replicas."

**What exists:** String equality on IDs. Period.

**Design questions:**
- Is entity equivalence itself a delta? (e.g., `{role: 'sameAs', targets: [idA, idB]}`)
- If so, does HyperView construction need to follow sameAs links?
- Is this query-time (expensive but flexible) or materialized (fast but rigid)?
- How does this interact with negation? (Can you negate a sameAs assertion?)
- Should the system even solve this, or is it an application-layer concern?

### Gap 4: Role/Context Registries

**The problem:** Roles and contexts are free-form strings with no validation,
no discovery, and no constraints.

Cannot do:
- Validate that a role is meaningful for a given entity type
- Discover what roles/contexts exist in the system
- Enforce cardinality ("entity can have at most one name")
- Deprecate or version role names

**Why it matters:** In a multi-agent system, agents need to agree on
vocabulary. Free-form strings mean any agent can assert anything about
anything using any role name. There's no way to detect when an agent
uses a misspelled or semantically wrong role.

**What exists:** Convention documented in CLAUDE.md. No enforcement.

**Design questions:**
- Should registries be deltas themselves? (schema-as-data principle)
- Open vocabulary (anything goes, registry is advisory) vs. closed
  vocabulary (must be registered)?
- How does this interact with federation? Different instances may have
  different registries.
- Is this a delta-layer concern or a view-layer concern?

### Gap 5: Aggregation and Counting

**The problem:** No aggregate queries.

Cannot do:
- COUNT entities matching criteria
- SUM/AVG/MIN/MAX across property values
- GROUP BY
- DISTINCT values for a property
- "What percentage of labs replicated this finding?"

**Why it matters:** Scenario 11 (scientific replication) needs consensus
metrics. Scenario 5 (agent swarm) needs to count task states. Any
dashboard or monitoring use case needs aggregation.

**What exists:** You can get all deltas and count manually in application
code.

**Design questions:**
- Is aggregation a view-level operation or a query primitive?
- How do aggregates interact with negation? (Negated deltas excluded?)
- Materialized aggregates vs. computed on demand?
- How does this interact with time-travel? (Aggregate as of timestamp T?)

### Gap 6: LevelDB Has No Indexes

**The problem:** The persistent storage backend (LevelDBStore) has no
secondary indexes. Every filtered query requires a full scan.

**What exists in-memory:** `DeltaIndexes` class with indexes on targetId,
targetContext, author, system, timestamp. Multi-index intersection for
efficient queries.

**What exists in LevelDB:** Key-value storage only. No indexes.

**Why it matters:** Any non-trivial persistent deployment degrades linearly
with dataset size. The in-memory path works but doesn't persist. This makes
the persistent backend useless for query-heavy workloads.

### Gap 7: Schema Composition

**The problem:** Every schema is written from scratch. No inheritance,
no composition, no reuse.

Cannot do:
- `baseSchema.exclude(['secret_field'])`
- `schemaA.merge(schemaB)`
- Schema inheritance ("this schema is like that one, but also includes X")
- Schema parameterization

**What exists:** `createStandardSchema()` creates a basic schema.
`selectByTargetContext` exists but isn't used in practice.

**Why it matters:** 5/12 scenarios needed custom schemas, each writing
8-15 lines of boilerplate select functions. Schema composition would
reduce this to one-liners.

### Gap 8: Atomic Multi-Delta Operations (Transactions)

**The problem:** No way to group related deltas as "must exist together."

Cannot do:
- `db.transaction().add(delta1).add(delta2).commit()`
- Rollback if persistence fails midway
- Atomic publish of related assertions

**Why it matters:** Supply chain (scenario 9) creates a material flow
as separate deltas. If persistence fails between them, the state is
inconsistent. Agent coordination (scenario 5) needs atomic claim+status
updates.

**Design questions:**
- Is this even compatible with CRDT semantics? (CRDTs are inherently
  per-operation, not per-transaction)
- Could transaction be modeled as a delta that references other deltas?
- Or is the answer "design your deltas to be independently meaningful"?

---

## IV. Spec vs. Implementation Gaps

The spec (spec/spec.md) is ~85-90% implemented. Specific gaps:

| Spec Section | Status | Gap |
|---|---|---|
| Delta structure (§2.1) | Complete | - |
| Delta validation (§2.1.1) | Complete | - |
| Delta negation (§2.5) | Complete + enhanced | Double-negation beyond spec |
| Instance capabilities (§3.2) | Complete | - |
| Instance archetypes (§3.3) | Partial | Browser, ephemeral, read-replica not standalone |
| HyperSchema DAG (§4.5) | Partial | Validation optional, not enforced by default |
| HyperView incremental updates (§5.3) | Missing | TODO in both storage backends |
| View resolution (§6) | Complete + enhanced | Extra strategies beyond spec |
| Streaming/backpressure (§7) | Complete | - |
| Federation (§8) | Complete | - |
| Performance benchmarks (§9.1) | Missing | No formal benchmark suite |
| Storage backends (§9.2) | Partial | Only in-memory + LevelDB |
| Delta verification (§9.5) | Missing | No cryptographic signing |
| Schema-as-deltas (§12.3) | Partial | JSONLogic parser TODO |

---

## V. The Substrate Gap Map

Reading across all three audits, here's the map of the design space:

```
SOLID (working, tested, no design needed)
├── Delta primitives (create, persist, validate)
├── Negation (single, double, chains)
├── Time-travel (snapshots, timelines, diffing)
├── Federation (bidirectional, filtered, trust)
├── View resolution (6+ strategies)
└── Streaming (subscribe, backpressure)

FRICTION (works, needs ergonomic improvement)
├── queryDeltas() return type inconsistency
├── Entity resolution pipeline too manual
├── Primitive extraction from pointers
├── Schema construction boilerplate
└── selectByTargetContext underutilized

MISSING PRIMITIVES (needs design + implementation)
├── Entity discovery (query by property, not just by ID)
├── Graph traversal (multi-hop, reverse lookup)
├── Entity resolution (cross-ID identity)
├── Role/context registries (vocabulary governance)
├── Aggregation (count, sum, group-by)
├── LevelDB secondary indexes
├── Schema composition (inheritance, exclusion, merge)
└── Atomic multi-delta operations

OPEN DESIGN QUESTIONS (needs thinking before implementation)
├── Is entity discovery a delta-layer or index-layer concern?
├── Is entity equivalence a delta or application-layer concept?
├── Should registries be open (advisory) or closed (enforced)?
├── Are transactions compatible with CRDT semantics?
├── Should aggregation be materialized or computed?
└── How deep should graph traversal go by default?
```

---

## VI. What to Do Next

This is a map, not a roadmap. But if forced to prioritize:

**Highest leverage (unblocks the most scenarios):**
1. Promote helpers.ts to core — `resolve()`, `allValuesFor()`, `relatedIds()`
   become built-in methods. Zero design risk, immediate ergonomic win.
2. Fix `queryDeltas()` return type. Trivial change, eliminates 100+ lines
   of defensive coding.
3. Entity discovery via property-value index. This is the biggest missing
   primitive. Without it, every consumer must maintain their own entity catalog.

**Requires design work first:**
4. Graph traversal primitives (depends on: what index structure?)
5. Entity resolution / sameAs (depends on: delta or application layer?)
6. Role/context registries (depends on: open vs. closed vocabulary)

**Can wait:**
7. LevelDB indexes (important for production, but in-memory is fine for now)
8. Schema composition (convenience, not capability)
9. Aggregation (can be done in application code)
10. Transactions (deep design question, may not be appropriate for CRDTs)
