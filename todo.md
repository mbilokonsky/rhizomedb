# RhizomeDB TODO

This document tracks planned improvements and changes to the project.

## README Updates

### Terminology Fixes
- [x] Replace "zero-knowledge" with "context-free" throughout
  - ✅ Completed in commit fdcc026
  - Changed line 14 and line 18 to use "context-free"
  - Also fixed typo "zero-knoweldge" → "context-free"

### Relational Algebra
- [ ] Add note about relational algebra as research goal
  - Add section or sidebar explaining:
    - HyperSchema operations map to relational algebra (σ, π, ⋈, ∪, ∩, −)
    - Selection = filtering deltas by predicates
    - Projection = choosing which properties to include
    - Joins = materialized as delta pointers
    - Goal: Prove HyperSchemas are relationally complete
    - Status: Aspirational, needs formal proof

### Conflict Resolution
- [x] Add conflict resolution example showing multiple deltas for same property
  - ✅ Completed in commit fdcc026
  - Added "Conflict Resolution in Practice" section after line 408
  - Showed two competing deltas (correct vs. misspelled "Keanu Reeves")
  - Demonstrated HyperView preserving both values
  - Illustrated 4 resolution strategies with code:
    - Strategy 1: Most recent (timestamp-based)
    - Strategy 2: Trusted authors (authority-based)
    - Strategy 3: Return all (surface conflicts)
    - Strategy 4: LLM resolver (AI-assisted)
  - Emphasized context-appropriate resolution

### Code Block Organization
- [x] Make large code blocks collapsible
  - ✅ Completed in commit a5a8d08
  - Wrapped 3 largest code examples in `<details>/<summary>` tags:
    - First deltas example (~43 lines) - "Deltas representing Keanu Reeves"
    - Additional deltas (~68 lines) - "Names and directors deltas"
    - matrixHyperview (~100 lines) - "Full matrixHyperview example"
  - Kept visible: Delta interface, domain object results, circular reference example, conflict resolution
  - Pattern can be applied to future large examples as needed

### HyperSchema Semantics
- [ ] Add explicit section on HyperSchema mechanics
  - **DAG Constraint**: HyperSchemas must form directed acyclic graph (no circular dependencies)
  - **Filter Operation**: Selection function determines which deltas are relevant
    - Example uses: targetContext matching
    - But can filter by: author, timestamp, system, signatures, complex predicates
  - **Transform Operation**: Transformation rules for nested targets
    - Example uses: localContext matching → apply nested HyperSchema
    - But can transform by: any delta/pointer properties, temporal rules, permissions
  - **Graceful Degradation**: Missing properties → don't show up; malformed pointers → simplified to {id}
  - **Abstract Definition**:
    - Selection: `(domainObjectId, allDeltas) → relevantDeltas[]`
    - Transformation: `(delta, pointer) → transformedPointer`
  - Note: targetContext/localContext are CONVENTIONS, not constraints

### HyperView Generalization
- [ ] Expand HyperView concept to support multiple roots
  - Current model: `HyperView(Schema, { id: specific_id })` → single HyperView
  - New model: `HyperView(Schema, { property: constraint })` → HyperView[]
  - Examples:
    - `HyperView(MovieSchema, { releaseYear: { between: [1990, 1999] } })` → multiple movies
    - `HyperView(ActorSchema, { name: "Keanu Reeves" })` → could return 0-to-N matches
  - Result: All HyperView operations return arrays (even if length = 1)

### Queries as HyperView Compositions
- [ ] Add section on Queries as pipelines of HyperView operations
  - Example: "All directors who released a movie starring Keanu Reeves in the 90s"
    1. `HyperView(ActorSchema, { name: "Keanu Reeves" })`
    2. Traverse `appearedIn`, filter by `releaseYear`
    3. `HyperView(MovieSchema, { id: { in: [matched_ids] } })`
    4. Extract directors, apply `DirectorSchema`
  - Key insight: Queries compose HyperViews through graph traversal
  - Each step operates on HyperView[] → filters/transforms → HyperView[]
  - Status: This is still somewhat intuitive, needs more development

### Schemas as Data (Meta-Level)
- [ ] Add new section: "Schemas as Data"
  - **Core Principle**: Everything except the Delta schema itself is composed of deltas
  - **Bootstrap**: DeltaSchema is hardcoded; all other schemas are deltas
  - **Implications**:
    - HyperSchemas are deltas
    - Indexes are deltas (config for which HyperViews to materialize)
    - Queries are deltas (composition of HyperView operations)
    - Functions are deltas (per Reactor section)
  - **Benefits**:
    - Schema sync: Federating instances exchange schemas automatically
    - Schema evolution: Adding fields = appending deltas
    - Schema conflicts: Resolved same as data conflicts
    - Schema discovery: "Show me all schemas referencing ActorSchema" is queryable
    - Reactive schemas: Schema changes → materialized views invalidate/rebuild
  - Show example of MovieSchema defined as deltas

### Why HyperViews? (New Section)
- [ ] Add section explaining why HyperViews solve tractability problem
  - **The Problem**: Unbounded delta streams are intractable to query directly
  - **The Solution**: HyperSchemas define "relevance closure"
    1. Deltas directly targeting root object
    2. Deltas targeting objects referenced by those deltas (via transforms)
    3. Deltas targeting those deltas (negations, modifications)
  - **Staging Area Concept**: HyperViews partially apply view resolution
    - Without: `View = resolve(allDeltas, query)` (intractable)
    - With: `HyperView = filter_and_transform(allDeltas, schema)` then `View = resolve_conflicts(hyperView)` (tractable)
  - **HyperViews as Indexes**:
    - An index IS a materialized HyperView
    - Build: Scan stream to build initial index
    - Maintain: Subscribe to stream, check each delta against HyperSchema select operations
    - Update: Delta targets root? Update. Targets nested object? Update. Negates included delta? Update.
    - Relevance closure computed automatically from HyperSchema definition
  - **Multiple Purposes**: Same abstraction serves as views, indexes, query building blocks

### Complete Round-Trip Example
- [ ] Add simple end-to-end example showing all three layers
  - Pick minimal case (simpler than IMDB)
  - Show: Deltas → HyperView → View
  - All three layers for one simple query
  - Demonstrate conflict resolution in the View layer

### Delta Negation
- [ ] Add section showing how to negate deltas
  - Show example of delta creation
  - Show negation delta that targets it
  - Clarify: Do you negate whole delta or specific pointers?
  - Show how HyperViews handle negated deltas

### Circular References
- [ ] Make circular reference handling more explicit
  - Currently mentioned at line 168: "hmm, this is a circular reference. More about this below"
  - Explain: HyperSchemas act like GraphQL queries - they specify depth
  - When transformation stops (terminal schema), references remain as `{ id }` only
  - No infinite recursion because DAG constraint prevents cycles

## Open Questions / Research Topics

- [ ] Formal proof of relational completeness
  - Can every relational algebra expression be encoded as HyperSchema operations?
  - Are there relational operations that can't be expressed?

- [ ] Query language design
  - How do we expose HyperView composition to users?
  - GraphQL-like syntax? Custom DSL?
  - How do multiple-root HyperViews affect query semantics?

- [ ] Performance characteristics
  - How does querying scale as deltas accumulate?
  - Compaction/snapshot strategies?
  - Garbage collection in append-only model?

- [ ] Privacy & Deletion
  - GDPR "right to be forgotten" in append-only immutable store?
  - Can negation deltas satisfy this?
  - Or do we need additional mechanisms?

## Implementation TODOs

(To be populated as we move from spec to reference implementation)

## Notes

- Keep examples collapsible with natural language summaries
- Emphasize flexibility over rigid constraints (e.g., targetContext/localContext as conventions)
- Make clear what's proven vs. aspirational
- "Schemas as data" is philosophically central - should be prominent
