# Storage Module

Storage implementations and performance optimization layers for RhizomeDB.

## Files

### `instance.ts`
In-memory RhizomeDB instance implementation.

**Class:** `RhizomeDB`

**Capabilities:**
- `DeltaAuthor` - Create and negate deltas
- `DeltaStore` - Persist and query deltas
- `StreamConsumer` - Subscribe to delta streams
- `StreamProducer` - Publish deltas to subscribers
- `IndexMaintainer` - Materialize and cache HyperViews

**Key Features:**
- In-memory delta storage with Map-based index
- LRU cache for materialized views
- Delta indexing for query performance
- Schema registry for HyperSchemas
- Subscription management with filtering
- Automatic negation handling (including double negation)
- Schema versioning with outdated view detection

**Usage:**
```typescript
const db = new RhizomeDB({
  storage: 'memory',
  cacheSize: 1000,
  enableIndexing: true
});

// Create and persist delta
const delta = db.createDelta('author-1', [
  { localContext: 'name', target: 'Alice' }
]);
await db.persistDelta(delta);

// Query deltas
const results = db.queryDeltas({ authors: ['author-1'] });

// Materialize view
const schema: HyperSchema = { /* ... */ };
const view = db.materializeHyperView('object-1', schema);
```

**Tests:** `instance.test.ts` - 30+ tests

### `leveldb-store.ts`
LevelDB-backed persistent storage implementation.

**Class:** `LevelDBStore`

**Features:**
- Persistent delta storage using LevelDB
- Same API as in-memory instance
- Async/await pattern for all operations
- Automatic delta serialization/deserialization
- Stream scanning with cursors
- Materialized view caching

**Usage:**
```typescript
const db = new LevelDBStore({
  storage: 'leveldb',
  storageConfig: { path: './db' }
});

await db.persistDelta(delta);
const deltas = await db.getDeltas(['id1', 'id2']);

for await (const delta of db.scanDeltas()) {
  console.log(delta);
}
```

**Tests:** `leveldb-store.test.ts` - 20+ tests

### `delta-indexes.ts`
Secondary indexes for query performance optimization.

**Class:** `DeltaIndexes`

**Indexes:**
- `targetIdIndex` - Map from referenced object ID to delta IDs
- `targetContextIndex` - Map from target context to delta IDs
- `authorIndex` - Map from author to delta IDs
- `systemIndex` - Map from system to delta IDs
- `timestampIndex` - Sorted array for range queries

**Features:**
- Automatic index maintenance on add/remove
- Query optimization via index intersection
- Statistics tracking (sizes, memory estimates)
- O(log n) timestamp range queries

**Usage:**
```typescript
const indexes = new DeltaIndexes();

// Add delta to all relevant indexes
indexes.addDelta(delta);

// Query using indexes
const candidateIds = indexes.queryDeltaIds({
  authors: ['alice'],
  targetIds: ['user-1'],
  targetContexts: ['friends']
});

// Get statistics
const stats = indexes.getStats();
console.log(`Author index size: ${stats.authorIndexSize}`);
```

**Performance Impact:**
- Avoids full table scans for filtered queries
- Multiple index intersection for multi-criteria queries
- Dramatically faster for large datasets

**Tests:** `delta-indexes.test.ts` - 9 tests

## Architecture

```
┌─────────────────┐
│   RhizomeDB     │  ← In-memory instance
│   (instance.ts) │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
    ┌────▼─────┐   ┌───▼────────┐
    │  Delta   │   │ Materialized│
    │ Indexes  │   │View Cache   │
    │          │   │(LRU)        │
    └──────────┘   └─────────────┘

┌─────────────────┐
│  LevelDBStore   │  ← Persistent storage
│(leveldb-store.ts)
└────────┬────────┘
         │
    ┌────▼─────┐
    │ LevelDB  │
    │(on disk) │
    └──────────┘
```

## Configuration

**RhizomeConfig:**
```typescript
{
  systemId?: string,           // Auto-generated if not provided
  storage: 'memory' | 'leveldb' | 'custom',
  storageConfig?: any,         // LevelDB: { path: string }
  cacheSize?: number,          // Max materialized views (default: 1000)
  enableIndexing?: boolean,    // Enable delta indexing (default: true)
  validateSchemas?: boolean    // Validate schemas on registration (default: false)
}
```

## Performance Characteristics

**In-Memory (RhizomeDB):**
- Delta persistence: O(1)
- Query without indexes: O(n) - full scan
- Query with indexes: O(k) - where k is result set size
- View materialization: O(d × s) - d=deltas, s=schema complexity
- View cache hit: O(1)

**Persistent (LevelDBStore):**
- Delta persistence: O(log n)
- Query: O(n) - requires full scan or custom indexes
- Scan: Streaming, memory-efficient

## Dependencies

- `lru-cache` - LRU cache for materialized views
- `level` - LevelDB bindings for persistent storage
- `uuid` - UUID generation

## Testing

All storage implementations are thoroughly tested:
- Delta creation and persistence
- Query filtering (authors, systems, timestamps, predicates)
- Negation handling (including double negation)
- View materialization and caching
- Schema versioning and outdated view detection
- Delta indexing and query optimization
- Subscription management
- LevelDB persistence and scanning
