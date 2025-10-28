# Queries Module

Query functionality including view resolution, time-travel, and negation semantics.

## Files

### `view-resolver.ts`
Conflict resolution for converting HyperViews to Views.

**Problem:** HyperViews contain arrays of deltas. Multiple deltas may assert conflicting values for the same property. How do we resolve conflicts?

**Solution:** Resolution strategies that define how to pick "the" value from multiple deltas.

**Exports:**
- `ViewResolver` - Main resolution class
- Resolution strategies (functions):
  - `mostRecent` - Newest delta wins (by timestamp)
  - `firstWrite` - Oldest delta wins
  - `allValues` - Return array of all values
  - `trustedAuthor` - Prefer specific author
  - `consensus` - Most common value wins
  - `average` - Numeric average
  - `minimum` - Smallest value
  - `maximum` - Largest value
  - `lastByAuthor` - Most recent per author
- Extraction helpers:
  - `extractPrimitive` - Get primitive value from delta
  - `extractReference` - Get object reference from delta
  - `extractArray` - Get array from delta
  - `extractNestedView` - Get nested HyperView from delta

**Usage:**
```typescript
// Define how to resolve a view
const userViewSchema: ViewSchema = {
  properties: {
    name: {
      source: 'default',           // Which HyperView property
      extract: extractPrimitive,    // How to extract value
      resolve: mostRecent           // How to resolve conflicts
    },
    age: {
      source: 'default',
      extract: extractPrimitive,
      resolve: average              // Average all ages
    },
    friends: {
      source: 'friends',
      extract: extractReference,
      resolve: allValues            // Keep all friends
    }
  }
};

// Resolve a HyperView to a View
const resolver = new ViewResolver();
const view = resolver.resolveView(hyperView, userViewSchema);

// Result:
{
  id: 'user-1',
  name: 'Alice',           // Most recent value
  age: 30.5,               // Average of all ages
  friends: ['user-2', 'user-3']  // All friend IDs
}
```

**Custom Strategy:**
```typescript
// Create your own resolution strategy
const customResolve: ResolutionStrategy = (deltas: Delta[]) => {
  // Your logic here
  return deltas[0];  // Example: pick first
};

const schema: ViewSchema = {
  properties: {
    value: {
      source: 'default',
      extract: extractPrimitive,
      resolve: customResolve
    }
  }
};
```

**When to Use Each Strategy:**
- `mostRecent`: User profiles, settings (latest value matters)
- `firstWrite`: Immutable fields (creation time, ID)
- `allValues`: Collections, tags, relationships
- `trustedAuthor`: Editorial content (editor > contributor)
- `consensus`: Collaborative editing (voting)
- `average`: Ratings, scores
- `minimum`: Price tracking (lowest price)
- `maximum`: High scores, bid tracking
- `lastByAuthor`: Collaborative editing (each author's latest)

**Tests:** `view-resolver.test.ts` - 16 tests

### `time-travel.ts`
Historical state reconstruction and time-travel queries.

**Problem:** Deltas are timestamped but no built-in way to query "what did this object look like at time T?"

**Solution:** TimeTravelDB wrapper that filters deltas by timestamp before constructing views.

**Class:** `TimeTravelDB`

**Methods:**
- `queryAt(objectId, schema, timestamp)` - Get HyperView as of timestamp
- `getSnapshot(objectId, schema, timestamp)` - Snapshot at specific time
- `getObjectTimeline(objectId, schema, timestamps[])` - Multiple snapshots
- `replayObject(objectId, schema, fromTime, toTime, interval)` - Replay changes
- `trackPropertyChanges(objectId, schema, property, fromTime?, toTime?)` - Track single property
- `compareSnapshots(objectId, schema, time1, time2)` - Diff two points in time
- `findOrigin(objectId, schema)` - First delta for object
- `getStatsAt(objectId, schema, timestamp)` - Statistics at timestamp
- `queryDeltasAt(filter, timestamp)` - Query deltas as of timestamp

**Usage:**
```typescript
const db = new RhizomeDB({ storage: 'memory' });
const timeTravel = new TimeTravelDB(db);

// Query object state at specific time
const pastView = timeTravel.queryAt('user-1', userSchema, Date.now() - 86400000);
// Shows user-1 as they were 24 hours ago

// Get snapshots at multiple times
const timeline = timeTravel.getObjectTimeline('user-1', userSchema, [
  Date.parse('2024-01-01'),
  Date.parse('2024-02-01'),
  Date.parse('2024-03-01')
]);
// Array of 3 HyperViews showing evolution

// Track how a property changed
const nameChanges = timeTravel.trackPropertyChanges(
  'user-1',
  userSchema,
  'name'
);
// [{ timestamp, value: 'Alice' }, { timestamp, value: 'Alicia' }, ...]

// Compare two points in time
const diff = timeTravel.compareSnapshots(
  'user-1',
  userSchema,
  pastTime,
  currentTime
);
// { added: [...], removed: [...], changed: [...] }

// Replay all changes
for (const view of timeTravel.replayObject('user-1', userSchema, startTime, endTime, 3600000)) {
  console.log('State at', new Date(view._lastUpdated));
}
```

**Use Cases:**
- Audit logs: "What did user X do on date Y?"
- Debugging: "When did this value change?"
- Version history: "Show me all versions of this document"
- Rollback: "Restore to state from 1 hour ago"
- Compliance: "Prove data state at regulatory snapshot time"
- A/B testing: "Compare behavior before/after change"

**Performance Notes:**
- Time-travel queries filter deltas, so they're O(n) where n = total deltas
- Use delta indexing with timestamp ranges for better performance
- Consider materializing snapshots for frequently-accessed historical states

**Tests:** `time-travel.test.ts` - 10 tests

### `negation.ts`
Delta negation semantics including double negation.

**Problem:** Spec says "negation is itself a delta and can be negated" but original implementation only handled single negation.

**Solution:** Full negation state calculation supporting arbitrary negation chains.

**Exports:**
- `calculateNegationStates(deltas, asOfTimestamp?)` - Calculate negation state for all deltas
- `getNegatedDeltaIds(deltas, asOfTimestamp?)` - Get set of negated delta IDs
- `isNegated(deltaId, deltas, asOfTimestamp?)` - Check if specific delta is negated
- `NegationState` - Detailed negation state interface

**Negation Semantics:**
1. Delta A can be negated by Delta B (B.pointers contains `{ role: 'negates', target: { id: A.id } }`)
2. Delta B itself can be negated by Delta C (double negation)
3. When B is negated, A is restored (no longer negated)
4. This can continue indefinitely (triple negation, etc.)
5. Negation is time-sensitive: queries before negation timestamp see original

**Usage:**
```typescript
// Create and negate a delta
const original = db.createDelta('alice', [{ role: 'value', target: 42 }]);
await db.persistDelta(original);

const negation = db.negateDelta('bob', original.id, 'Incorrect value');
await db.persistDelta(negation);

// Original is now negated
const results1 = db.queryDeltas({});  // Original not included

// Negate the negation (double negation)
const doubleNegation = db.negateDelta('charlie', negation.id, 'Actually it was correct');
await db.persistDelta(doubleNegation);

// Original is restored!
const results2 = db.queryDeltas({});  // Original included again

// Get detailed state
const states = calculateNegationStates([original, negation, doubleNegation]);
const originalState = states.get(original.id);
// {
//   deltaId: 'original-id',
//   isNegated: false,
//   wasDoubleNegated: true,
//   negationTimestamp: undefined,
//   negatedBy: undefined
// }
```

**Time-Travel with Negation:**
```typescript
const t1 = 1000;  // Before negation
const t2 = 2000;  // After negation
const t3 = 3000;  // After double negation

// At t1: original is visible
isNegated(original.id, allDeltas, t1);  // false

// At t2: original is negated
isNegated(original.id, allDeltas, t2);  // true

// At t3: original is restored
isNegated(original.id, allDeltas, t3);  // false
```

**NegationState Fields:**
- `deltaId` - The delta ID
- `isNegated` - Is currently negated?
- `wasDoubleNegated` - Was negated then restored?
- `negationTimestamp` - When negated (if currently negated)
- `negatedBy` - ID of negating delta (if currently negated)

**Use Cases:**
- Undo/redo: Negate a change, then negate the negation to restore
- Moderation: Admin negates inappropriate content
- Conflict resolution: Negate conflicting assertions
- Soft delete: Negate deltas instead of removing them
- Access control: Negate deltas user shouldn't see

**Algorithm:**
Iterative DFS through negation graph:
1. Build map of negation relationships
2. Iterate until no changes (handles complex chains)
3. For each delta, find most recent un-negated negation
4. Mark as negated or not based on effective negation
5. Track double negation for debugging

**Tests:** `negation.test.ts` - 12 tests

## Query Patterns

### Basic Filtering
```typescript
// Query by author
db.queryDeltas({ authors: ['alice', 'bob'] });

// Query by time range
db.queryDeltas({
  timestampRange: {
    start: Date.now() - 86400000,
    end: Date.now()
  }
});

// Query by target context
db.queryDeltas({ targetContexts: ['friends', 'followers'] });

// Include negated deltas
db.queryDeltas({ includeNegated: true });

// Custom predicate
db.queryDeltas({
  predicate: (delta) => delta.pointers.length > 5
});
```

### View Resolution Pattern
```typescript
// 1. Get HyperView
const hyperView = db.applyHyperSchema('user-1', userSchema);

// 2. Resolve to View
const resolver = new ViewResolver();
const view = resolver.resolveView(hyperView, viewSchema);

// 3. Use resolved data
console.log(view.name);  // Single value, not array
```

### Time-Travel Pattern
```typescript
// 1. Wrap instance
const timeTravel = new TimeTravelDB(db);

// 2. Query at specific time
const pastView = timeTravel.queryAt('user-1', userSchema, pastTimestamp);

// 3. Compare or replay
const changes = timeTravel.trackPropertyChanges('user-1', userSchema, 'status');
```

### Negation Pattern
```typescript
// 1. Create delta
const delta = db.createDelta(author, pointers);
await db.persistDelta(delta);

// 2. Negate if needed
const negation = db.negateDelta(author, delta.id, reason);
await db.persistDelta(negation);

// 3. Queries automatically exclude negated deltas
const results = db.queryDeltas({});  // delta not included

// 4. Can be restored via double negation
const restore = db.negateDelta(author, negation.id, 'restoring');
await db.persistDelta(restore);
```

## Performance Considerations

**View Resolution:**
- O(d × r) where d = deltas in HyperView, r = resolution complexity
- mostRecent is O(d log d) (needs sort)
- average/min/max are O(d) (single pass)
- consensus is O(d²) (needs counting)

**Time-Travel:**
- Filters all deltas: O(n) where n = total deltas
- Use delta indexing with timestamp ranges for better performance
- Consider materializing snapshots for hot paths

**Negation:**
- calculateNegationStates is O(n × i) where n = deltas, i = iterations
- Usually converges in 1-3 iterations
- Complex negation chains may take longer
- Results should be cached if queried frequently

## Testing

- `view-resolver.test.ts` - Resolution strategies and extraction (16 tests)
- `time-travel.test.ts` - Historical queries and replay (10 tests)
- `negation.test.ts` - Single, double, triple negation (12 tests)

Total: 38 tests
