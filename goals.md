# RhizomeDB Development Goals

## Observations from Code Review

### Context Field Usage Analysis

#### ✅ Correct Usage:
- **README.md** - Excellent documentation of localContext and targetContext semantics
- **spec/spec.md** - Comprehensive technical specification with detailed examples
- **instance.test.ts** - Proper use in line 169-176 (named/name pattern)
- **graphql.test.ts** - Consistent context patterns throughout
- **movie-database.test.ts** - Rich examples with proper localContext/targetContext pairs
- **schemas-as-deltas.test.ts** - Innovative use of contexts for meta-schemas

#### ⚠️ Areas Needing Clarification:
- **PrimitiveSchemas** - The system has PrimitiveHyperSchemas but limited examples of their use in practice
- **Time-travel queries** - Mentioned in spec and README but only basic testing in graphql.test.ts:379-412
- **Federation** - Extensively documented but not implemented at all

### Test Coverage Gaps

1. **Time-travel Queries** - Minimal testing
   - Only one basic test in graphql.test.ts
   - No tests for negation at different timestamps
   - No tests for reconstructing past states

2. **Negation Handling** - Partial coverage
   - Basic negation works (instance.test.ts:271-298)
   - Not tested: double negation, negation authorization, negation of negations
   - Not tested: time-travel with negations

3. **Conflict Resolution** - Underdeveloped
   - README has great examples (lines 726-817)
   - No actual View resolution implementation
   - No conflict resolution strategies implemented

4. **Schema Evolution** - Documented but untested
   - schemas-as-deltas.test.ts:266-296 has basic test
   - No tests for schema versioning or migration
   - No tests for schema conflicts in federation

5. **Performance/Scalability** - No tests
   - No benchmarks for HyperView construction
   - No tests for large delta streams
   - No tests for cache eviction

6. **LevelDB Store** - Basic tests only
   - movie-database.test.ts:229-330 covers basics
   - No tests for concurrent access
   - No tests for crash recovery
   - No tests for large datasets

7. **GraphQL Integration** - Good but incomplete
   - Mutations work well
   - No subscriptions (reactive queries)
   - No time-travel query parameter
   - No batch query optimization

8. **Streaming** - Basic coverage
   - Subscriptions work (instance.test.ts:84-160)
   - No tests for backpressure
   - No tests for subscription lifecycle edge cases

### Brittle/Hacky Code Patterns

1. **Type Casting** (hyperview.ts:165)
   ```typescript
   target: nestedHyperView as any // Type system limitation
   ```
   - Comment acknowledges issue but doesn't resolve it
   - Could use better typing with conditional types

2. **Manual Cache Eviction** (instance.ts:371-377)
   ```typescript
   if (this.materializedViews.size > this.config.cacheSize) {
     const firstKey = this.materializedViews.keys().next().value;
   ```
   - Uses FIFO instead of LRU
   - No cache hit tracking
   - Should use proper LRU cache library

3. **Schema Registry Lookup** (instance.ts:386-390)
   - Uses view ID to look up schema, but view doesn't store schema ID
   - Fragile association between views and schemas

4. **GraphQL Type Require** (types.ts:428-436)
   ```typescript
   const graphql = require('graphql');
   ```
   - Runtime require instead of import
   - Could break in environments without graphql

5. **Subscription Filtering** (instance.ts:71-117)
   - Duplicated filter logic between queryDeltas and MemorySubscription
   - Should extract to shared function

### Discrepancies Between Sources of Truth

1. **Delta Negation Semantics**
   - README (lines 921-990): Says negation is for retraction
   - Spec (§2.5): Says negation can be negated (double negation)
   - Code: Only implements simple negation, no double-negation handling

2. **Materialized HyperView Schema Association**
   - Spec (§3.4.6): MaterializedHyperView interface extends HyperView
   - Implementation: No way to recover which schema was used to create a materialized view
   - instance.ts:386 tries to use view.id as schema ID (incorrect)

3. **View Resolution**
   - README (lines 726-817): Extensive examples of conflict resolution
   - Spec (§6): Complete specification of View resolution
   - Implementation: NO View resolver implemented at all
   - GraphQL creates views ad-hoc but doesn't use ViewSchema abstraction

4. **PrimitiveHyperSchema**
   - types.ts:84-93: Defines PrimitiveHyperSchema interface
   - types.ts:461-496: Implements PrimitiveSchemas (String, Integer, Boolean)
   - But: No clear examples of using these in TransformationRules
   - Movie fixture uses them but in an unclear way

5. **Schema Registry**
   - Spec: Says schemas should be represented as deltas
   - schemas-as-deltas.test.ts: Tests this concept extensively
   - But: No production implementation of schema-as-deltas
   - hyperview.ts: Has SchemaRegistry class that's just an in-memory Map

6. **Federation**
   - Spec (§8-9): Extensive documentation
   - README: Mentions pub/sub and federation
   - long_term_vision.md: Global federation is a core vision
   - Implementation: ZERO federation code exists

### Missing Core Features from Spec

1. **View Resolution System** (Spec §6)
   - No ViewResolver class
   - No conflict resolution strategies
   - No extractPrimitive helpers
   - GraphQL does resolution inline but inconsistently

2. **Time-Travel Query API**
   - constructHyperView accepts queryTimestamp but it's not exposed
   - No high-level API for "query at timestamp T"
   - No "replay state over time" functionality

3. **Computed Properties** (Spec §12.5)
   - No way to define computed/derived fields
   - No caching/invalidation for computed values

4. **Schema Validation**
   - No validation that schemas form a DAG (could have cycles)
   - No detection of circular schema references
   - No warnings for inefficient schemas

5. **Federation Protocol** (Spec §8)
   - No FederatedInstance implementation
   - No FederationConfig
   - No TrustPolicy
   - No sync logic

6. **Streaming Backpressure** (Spec §7.2.3)
   - No buffer size configuration
   - No overflow strategies
   - Subscriptions could memory leak on slow consumers

## Actionable Goals

### Priority 1: Core Correctness

1. **Implement View Resolution System**
   - Create ViewResolver class with ResolutionStrategy types
   - Implement mostRecent, trustedAuthor, allValues strategies
   - Refactor GraphQL to use ViewResolver
   - Add comprehensive tests

2. **Fix MaterializedHyperView Schema Tracking**
   - Store schema ID in MaterializedHyperView
   - Fix instance.ts:386 to use stored schema ID
   - Add test coverage

3. **Refactor Duplicate Filter Logic**
   - Extract shared function for delta filtering
   - Use in both queryDeltas and MemorySubscription
   - Reduce code duplication

4. **Improve Type Safety**
   - Remove "as any" type casts
   - Use conditional types for HyperView with nested targets
   - Add proper typing for transformed pointers

### Priority 2: Complete Specification Implementation

5. **Time-Travel Query API**
   - Add queryTimestamp parameter to applyHyperSchema
   - Add queryAt(objectId, schema, timestamp) convenience method
   - Test time-travel with negations
   - Test reconstructing historical states

6. **Double Negation Support**
   - Allow negating negation deltas
   - Test negation chains
   - Document semantics clearly

7. **Schema DAG Validation**
   - Add cycle detection when registering schemas
   - Throw error if circular reference detected
   - Add helpful error messages

8. **Backpressure Handling**
   - Add buffer size to subscription options
   - Implement overflow strategies (drop_oldest, drop_newest, error)
   - Test with slow consumers

### Priority 3: Performance & Scalability

9. **Replace FIFO Cache with LRU**
   - Install LRU cache library (lru-cache)
   - Track cache hits/misses
   - Add cache performance to getStats()

10. **Add Performance Benchmarks**
    - Benchmark HyperView construction time
    - Benchmark query performance vs delta count
    - Benchmark cache hit rates
    - Identify performance bottlenecks

11. **Optimize Delta Indexing**
    - Create index for targetId lookups
    - Create index for targetContext lookups
    - Measure index memory overhead vs query speedup

### Priority 4: Advanced Features (From Spec & Vision)

12. **Implement ViewResolver as Production System**
    - Full ViewSchema implementation
    - PropertyResolution with extract/resolve
    - Multiple resolution strategies
    - Integration with GraphQL

13. **Schema-as-Deltas Production Implementation**
    - Move meta-schema logic from tests to src
    - Implement resolveHyperSchemaView in core
    - Allow runtime schema updates via deltas
    - Test schema evolution scenarios

14. **Reactive Query Subscriptions**
    - GraphQL subscriptions that re-execute on relevant delta
    - Efficient delta-to-query relevance detection
    - Test with real-time updates

15. **Computed Properties**
    - Define computed field syntax
    - Implement computation caching
    - Implement invalidation on delta changes
    - Test with aggregations (count, sum, etc.)

### Priority 5: Federation & Long-Term Vision

16. **Basic Federation Protocol**
    - Implement FederatedInstance interface
    - Basic push/pull sync between instances
    - Trust policy filtering
    - Test two-instance sync

17. **Schema Conflict Resolution**
    - Handle same schema ID with different definitions
    - Merge compatible schema changes
    - Flag incompatible changes
    - Test federation with evolving schemas

### Testing & Documentation

18. **Increase Test Coverage**
    - Conflict resolution tests
    - Edge cases for negation
    - Schema evolution tests
    - Large dataset tests
    - Concurrent access tests

19. **Add Examples**
    - Simple todo app example
    - Collaborative editing example
    - Time-travel debugging example
    - Federation example

20. **Update Documentation**
    - Reconcile README, spec, and code
    - Document implemented vs aspirational features
    - Add architecture diagrams
    - Add API reference

## Implementation Strategy

Work in the following order:
1. Fix critical bugs and type safety issues (Goals 1-4)
2. Complete core specification features (Goals 5-8)
3. Add performance optimizations (Goals 9-11)
4. Implement advanced features (Goals 12-15)
5. Build towards federation (Goals 16-17)
6. Polish with tests and docs (Goals 18-20)

Each goal should be:
- Implemented fully
- Tested comprehensively
- Committed separately with clear message
- Pushed before moving to next goal
