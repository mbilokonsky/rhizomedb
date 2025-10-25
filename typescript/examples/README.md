# RhizomeDB Instance Configuration Examples

This directory contains examples of different RhizomeDB instance configurations, demonstrating the **archetype pattern** described in the spec (§3.3). Each archetype represents a specific combination of capabilities suited for different deployment scenarios.

## Current Implementation Status

### ✅ Implemented Capabilities

The TypeScript implementation supports 6 of the 9 core capabilities:

| Capability | Description | Status |
|-----------|-------------|--------|
| **DeltaAccess** | Read deltas by filter | ✅ Implemented |
| **DeltaAuthoring** | Create new deltas | ✅ Implemented |
| **DeltaPersistence** | Durable storage (LevelDB + In-Memory) | ✅ Implemented |
| **StreamConsumption** | Subscribe to delta streams | ✅ Implemented |
| **StreamProduction** | Publish deltas to subscribers | ✅ Implemented |
| **IndexMaintenance** | Maintain materialized HyperViews | ✅ Implemented |
| **MutationAPI** | Expose write interface | 🟡 Partial (GraphQL exists) |
| **QueryAPI** | Expose read interface | 🟡 Partial (GraphQL exists) |
| **Federation** | Sync with other instances | ✅ **Implemented** |

### ✅ Federation Status

**Inter-instance communication is now fully implemented!** See the `federation/` directory for examples.

- ✅ Instances can connect to each other over WebSocket
- ✅ Automatic delta synchronization between instances
- ✅ Trust policy enforcement
- ✅ Multiple sync modes (push/pull/bidirectional)
- ✅ Initial sync strategies (full/from_timestamp/none)
- ✅ Reconnection with exponential backoff

**See [federation/README.md](./federation/README.md) for detailed examples and documentation.**

## Instance Archetypes

### 1. Canonical Server (`canonical-server/`)

**All capabilities enabled** - Acts as the primary source of truth.

```typescript
const server = new RhizomeDB({
  storage: 'leveldb',
  systemId: 'canonical-server-001',
  cacheSize: 10000,
  enableIndexing: true,
  validateSchemas: true
});
```

**Capabilities:**
- ✅ DeltaAccess, DeltaAuthoring, DeltaPersistence
- ✅ StreamConsumption, StreamProduction
- ✅ IndexMaintenance
- ✅ MutationAPI, QueryAPI
- ❌ Federation (pending)

**Use Case:**
- Primary database for applications
- Authoritative instance that clients sync with
- Handles writes and complex queries
- Persistent LevelDB storage

**Run:** `npx ts-node examples/canonical-server/index.ts`

---

### 2. Browser Client (`browser-client/`)

**Lightweight instance** for interactive web applications.

```typescript
const client = new RhizomeDB({
  storage: 'memory',
  systemId: 'browser-client-001',
  cacheSize: 500,
  enableIndexing: true
});
```

**Capabilities:**
- ✅ DeltaAuthoring (create deltas from user actions)
- ✅ StreamConsumption (receive updates from server)
- ✅ QueryAPI (read local state for UI)
- ❌ StreamProduction, Federation (not needed)

**Use Case:**
- Web/mobile applications
- Offline-first with local delta creation
- Syncs with canonical server when online
- Ephemeral in-memory storage

**Run:** `npx ts-node examples/browser-client/index.ts`

---

### 3. Read Replica (`read-replica/`)

**Read-only replica** for geographic distribution and load balancing.

```typescript
const replica = new RhizomeDB({
  storage: 'leveldb',
  systemId: 'read-replica-us-west-1',
  cacheSize: 5000,
  enableIndexing: true
});
```

**Capabilities:**
- ✅ DeltaPersistence (durable LevelDB storage)
- ✅ StreamConsumption (receive all deltas from server)
- ✅ IndexMaintenance (fast query indexes)
- ✅ QueryAPI
- ❌ DeltaAuthoring, MutationAPI (read-only)

**Use Case:**
- Geographic load balancing
- Read-heavy workloads
- Fault tolerance (backup of canonical server)
- Eventually consistent with canonical server

**Run:** `npx ts-node examples/read-replica/index.ts`

---

### 4. Index/Cache Instance (`index-cache/`)

**Specialized caching layer** for expensive materialized views.

```typescript
const cache = new RhizomeDB({
  storage: 'memory',
  systemId: 'index-cache-001',
  cacheSize: 100000, // Very large cache
  enableIndexing: true
});
```

**Capabilities:**
- ✅ StreamConsumption (receive deltas)
- ✅ IndexMaintenance (large LRU cache)
- ✅ QueryAPI
- ❌ DeltaPersistence (ephemeral; rebuilds on restart)

**Use Case:**
- Fast query cache for complex views
- Reduced load on canonical server
- Can be restarted without data loss (rebuilds from server)
- Optional integration with Redis/Memcached

**Run:** `npx ts-node examples/index-cache/index.ts`

---

## Other Documented Archetypes (Not Yet Demonstrated)

The spec describes additional archetypes that require federation:

### 5. Ephemeral Compute
- **Capabilities:** DeltaAccess only
- **Use Case:** Stateless query instances (Lambda functions, serverless)

### 6. HyperView Maintainer
- **Capabilities:** StreamConsumption, IndexMaintenance
- **Use Case:** Specialized view builders (e.g., search indexes, aggregations)

### 7. Federation Bridge
- **Capabilities:** StreamConsumption, StreamProduction, Federation, DeltaAuthoring
- **Use Case:** Cross-network federation (e.g., public ↔ private networks)

## Running the Examples

All examples are self-contained and can be run individually:

```bash
# Run any example
npx ts-node examples/canonical-server/index.ts
npx ts-node examples/browser-client/index.ts
npx ts-node examples/read-replica/index.ts
npx ts-node examples/index-cache/index.ts
```

## Configuration Options

All instances support these configuration options:

```typescript
interface RhizomeConfig {
  // Instance identity
  systemId?: string;                    // Auto-generated UUID if not provided

  // Storage backend
  storage: 'memory' | 'leveldb';        // In-memory or persistent

  // Performance tuning
  cacheSize?: number;                   // LRU cache size (default: 1000)
  enableIndexing?: boolean;             // Enable secondary indexes (default: true)

  // Validation
  validateSchemas?: boolean;            // Detect schema cycles (default: false)
}
```

### Storage Backends

**In-Memory (`storage: 'memory'`)**
- Fast, ephemeral storage
- Suitable for: browser clients, cache instances
- Lost on restart

**LevelDB (`storage: 'leveldb'`)**
- Persistent disk storage
- Suitable for: canonical servers, read replicas
- Survives restarts

## Key Concepts

### Capabilities Are Compositional

Each instance can be configured with a subset of capabilities based on its role. The examples show how to mix and match capabilities for different use cases.

### Delta CRDTs Enable Federation

RhizomeDB's delta-based CRDT model ensures conflict-free merging, which makes federation straightforward (once implemented):

1. Instances exchange deltas over networks
2. Deltas are applied in any order
3. All instances converge to the same state
4. No central coordinator needed

### Trust Policies (Documented, Not Implemented)

The spec describes trust policies for federation:

```typescript
// Future API (not yet implemented)
interface FederationConfig {
  mode: 'push' | 'pull' | 'bidirectional';
  pushFilter?: DeltaFilter;
  pullFilter?: DeltaFilter;
  trustPolicy?: TrustPolicy;
}
```

## What's Next?

To enable real inter-instance communication, the following need implementation:

1. **Network Layer:** WebSocket/HTTP protocol for instance-to-instance communication
2. **Sync Engine:** Bidirectional delta synchronization
3. **Trust Framework:** Verification of `author` and `system` fields
4. **Federation Manager:** Implementation of `FederatedInstance` interface
5. **Connection Management:** URL-based instance discovery and connection

The architecture is well-prepared for this—the delta CRDT model naturally supports it—but the implementation hasn't been started yet.

## More Information

- **Spec Reference:** See `../SPEC.md` §3.3 (Instance Archetypes) and §8 (Federation)
- **Core Implementation:** `src/storage/instance.ts`
- **Storage Backends:** `src/storage/leveldb.ts`
- **Streaming:** `src/streaming/subscription-backpressure.ts`

## Questions?

If you're implementing federation or have questions about instance configuration, please open an issue!
