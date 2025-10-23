# RhizomeDB TODO

This document tracks planned improvements and changes to the project.

## README Updates

### Terminology Fixes
- [x] Replace "zero-knowledge" with "context-free" throughout
  - ✅ Completed in commit fdcc026
  - Changed line 14 and line 18 to use "context-free"
  - Also fixed typo "zero-knoweldge" → "context-free"

### Relational Algebra
- [x] Add note about relational algebra as research goal
  - ✅ Completed - added within HyperSchema Semantics subsection
  - Added after "Why this matters" section (after line 533)
  - Maps HyperSchema operations to relational algebra:
    - Selection (σ): filter deltas by predicates
    - Projection (π): choose which properties to include
    - Join (⋈): delta pointers as materialized joins
    - Union/Intersection/Difference: set operations over deltas
  - Acknowledges this remains an open research question
  - Emphasizes innovation: materialized joins vs computed joins

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
- [x] Add explicit section on HyperSchema mechanics
  - ✅ Completed - added as subsection within Tripartite Schema Structure
  - Added after natural language HyperSchema definitions (after line 480)
  - Covers abstract operations: Selection Function and Transformation Rules
  - Details important constraints:
    - DAG Requirement: no circular dependencies
    - Graceful Degradation: resilient to messy/incomplete data
    - Conventions vs Constraints: targetContext/localContext are conventions
  - Explains advanced use cases: temporal, trust-based, permission schemas
  - Emphasizes flexibility beyond the simple examples shown

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
- [x] Add new section: "Schemas as Data"
  - ✅ Completed - added as new top-level section after Delta Schema
  - Added after line 182, before Tripartite Schema Structure
  - Covers core principle: Everything except DeltaSchema is composed of deltas
  - Explains bootstrap: DeltaSchema hardcoded, everything else is data
  - Details implications: schema sync, evolution, conflicts, discovery, reactivity
  - Includes collapsible example of MovieSchema defined as deltas
  - Emphasizes philosophical importance of "schemas as data"

### Why HyperViews? (New Section)
- [x] Add section explaining why HyperViews solve tractability problem
  - ✅ Completed - added as new top-level section before Tripartite Schema
  - Added after line 277, organized with subsections:
    - The Tractability Problem: unbounded streams are intractable
    - HyperSchemas Define Relevance Closure: bounded subsets of deltas
    - HyperViews as Staging Area: partial application of view resolution
    - HyperViews as Indexes: materialized HyperViews
    - One Abstraction, Multiple Purposes: queries, indexes, templates
  - Explains why HyperViews are central to making the system tractable
  - Motivates the concept before diving into technical details

### Complete Round-Trip Example
- [x] Add simple end-to-end example showing all three layers
  - ✅ Completed - added at end of Tripartite Schema section (before Mutation)
  - Simple scenario: Person named "Alice"
  - Shows all three layers clearly:
    - Step 1: Delta (raw assertion)
    - Step 2: HyperView (filtered and organized)
    - Step 3: View (resolved with conflict resolution)
  - Includes summary explaining purpose of each layer
  - Much simpler than IMDB examples, easier to follow

### Delta Negation
- [x] Add section showing how to negate deltas
  - ✅ Completed - added as subsection within Mutation section
  - Added "Delta Negation and Retraction" subsection
  - Explains: negation is just another delta (append-only preserved)
  - Shows collapsible example of delta + negation delta
  - Covers how HyperViews handle negations (exclude, mark, or authorize)
  - Discusses partial vs complete negation
  - Emphasizes: "negation is just more deltas" - no special delete operation
  - Benefits: auditability, time-travel, federation, conflict resolution

### Circular References
- [x] Make circular reference handling more explicit
  - ✅ Completed - added clarification note after line 180
  - Addresses inline comment "More about this below"
  - Distinguishes: circular *references* (in data) vs circular *expansion* (prevented)
  - Explains DAG constraint: schemas cannot reference themselves
  - Terminal schemas (like NamedEntity) don't transform targets → prevent recursion
  - Data can have cycles, schemas cannot → bounded expansion

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
