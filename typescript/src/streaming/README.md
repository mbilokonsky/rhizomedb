# Streaming Module

Subscription management and backpressure handling for delta streams.

## Files

### `subscription-backpressure.ts`
Buffer management for slow delta consumers.

**Problem:** Fast producers + slow consumers = memory leaks. If deltas arrive faster than a subscriber can process them, the buffer grows unbounded.

**Solution:** Backpressure management with configurable overflow strategies.

**Class:** `BackpressureSubscription`

**Features:**
- Configurable buffer size
- 4 overflow strategies
- Warning thresholds with callbacks
- Pause/resume control
- Statistics tracking
- Error handling

**Overflow Strategies:**

1. **DROP_OLDEST** - Drop oldest deltas from buffer
   ```typescript
   // Use when: Recent data is more important (real-time dashboards)
   const sub = createBackpressureSubscription({
     handler: processRealtimeData,
     bufferSize: 100,
     overflowStrategy: OverflowStrategy.DROP_OLDEST
   });
   ```

2. **DROP_NEWEST** - Drop incoming deltas
   ```typescript
   // Use when: Historical completeness matters (audit logs)
   const sub = createBackpressureSubscription({
     handler: writeToAuditLog,
     bufferSize: 100,
     overflowStrategy: OverflowStrategy.DROP_NEWEST
   });
   ```

3. **ERROR** - Throw error on overflow
   ```typescript
   // Use when: Loss is unacceptable (financial transactions)
   const sub = createBackpressureSubscription({
     handler: processTransaction,
     bufferSize: 100,
     overflowStrategy: OverflowStrategy.ERROR
   });
   ```

4. **BLOCK** - Block until buffer has space
   ```typescript
   // Use when: Can afford to slow producer (batch processing)
   const sub = createBackpressureSubscription({
     handler: batchProcess,
     bufferSize: 100,
     overflowStrategy: OverflowStrategy.BLOCK,
     maxBlockTime: 5000  // Timeout after 5s
   });
   ```

**Usage:**
```typescript
// Create subscription with backpressure
const subscription = createBackpressureSubscription({
  handler: async (delta: Delta) => {
    // Process delta (may be slow)
    await slowOperation(delta);
  },
  bufferSize: 100,
  overflowStrategy: OverflowStrategy.DROP_OLDEST,
  warningThreshold: 0.8,  // Warn at 80% full
  onWarning: (stats) => {
    console.warn(`Buffer ${stats.bufferSize}/${stats.maxBufferSize}`);
  }
});

// Subscribe to delta stream
const unsub = db.subscribe({ authors: ['important-author'] }, subscription.handleDelta);

// Monitor statistics
setInterval(() => {
  const stats = subscription.getStats();
  console.log(`Received: ${stats.totalReceived}, Processed: ${stats.totalProcessed}`);
  console.log(`Buffer: ${stats.bufferSize}, Dropped: ${stats.totalDropped}`);
}, 1000);

// Pause if needed
subscription.pause();

// Resume later
subscription.resume();

// Cleanup
subscription.unsubscribe();
unsub();
```

**Statistics:**
```typescript
interface BackpressureStats {
  totalReceived: number;      // Total deltas received
  totalProcessed: number;     // Total deltas processed
  totalDropped: number;       // Total deltas dropped
  bufferSize: number;         // Current buffer size
  maxBufferSize: number;      // Max buffer capacity
  isPaused: boolean;          // Is subscription paused?
}
```

**Pause/Resume:**
```typescript
// Pause subscription (deltas buffer but don't process)
subscription.pause();

// Useful for:
// - Controlled testing
// - Rate limiting
// - Maintenance windows
// - Backpressure propagation

// Resume processing
subscription.resume();
```

**Error Handling:**
```typescript
const subscription = createBackpressureSubscription({
  handler: async (delta) => {
    try {
      await riskyOperation(delta);
    } catch (error) {
      // Errors logged but don't stop processing
      console.error('Handler error:', error);
    }
  },
  bufferSize: 100,
  overflowStrategy: OverflowStrategy.DROP_OLDEST,
  onError: (error, delta) => {
    // Custom error handling
    logError(error, delta);
  }
});
```

**Performance Characteristics:**
- Buffer operations: O(1) amortized
- Processing: Async, non-blocking
- Memory: O(bufferSize) maximum
- DROP_OLDEST/NEWEST: No backpressure propagation
- BLOCK: Propagates backpressure to producer
- ERROR: Fails fast, prevents data loss

**When to Use Each Strategy:**

| Strategy | Use Case | Trade-off |
|----------|----------|-----------|
| DROP_OLDEST | Real-time dashboards | Lose old data |
| DROP_NEWEST | Audit logs | Lose recent data |
| ERROR | Financial transactions | Crashes on overflow |
| BLOCK | Batch processing | Slows producer |

**Testing:**
`subscription-backpressure.test.ts` - 8 tests covering:
- Buffer management
- All overflow strategies
- Pause/resume
- Statistics tracking
- Error handling
- Warning thresholds

## Subscription Patterns

### Basic Subscription
```typescript
// Simple handler
const subscription = db.subscribe(
  { authors: ['user-1'] },
  (delta) => console.log('Received:', delta)
);

// Cleanup
subscription.unsubscribe();
```

### Filtered Subscription
```typescript
// Subscribe to specific deltas
const subscription = db.subscribe(
  {
    targetContexts: ['friends'],
    authors: ['user-1', 'user-2']
  },
  handleFriendshipDelta
);
```

### With Backpressure
```typescript
// Safe for slow handlers
const subscription = createBackpressureSubscription({
  handler: slowHandler,
  bufferSize: 1000,
  overflowStrategy: OverflowStrategy.DROP_OLDEST
});

db.subscribe(filter, subscription.handleDelta);
```

### Multiple Subscriptions
```typescript
// Fan-out pattern
const deltas = db.subscribe(allFilter, (delta) => {
  // Broadcast to multiple handlers
  handler1(delta);
  handler2(delta);
  handler3(delta);
});
```

### Reactive Updates
```typescript
// Update materialized view on delta arrival
const subscription = db.subscribe(
  { targetIds: ['object-1'] },
  async (delta) => {
    const view = db.getHyperView('object-1', schema.id);
    if (view && db.isViewOutdated(view)) {
      // Rebuild view
      db.materializeHyperView('object-1', schema);
    }
  }
);
```

## Best Practices

**Buffer Sizing:**
```typescript
// Too small: frequent drops/blocks
bufferSize: 10  // ❌

// Too large: memory waste
bufferSize: 1000000  // ❌

// Just right: 2-10x average burst size
bufferSize: handler_throughput * burst_duration * safety_factor
// e.g., 100 deltas/sec * 2 sec burst * 2 safety = 400
```

**Strategy Selection:**
```typescript
// Real-time: DROP_OLDEST
// Historical: DROP_NEWEST
// Critical: ERROR
// Batch: BLOCK
```

**Monitoring:**
```typescript
// Set warning threshold
warningThreshold: 0.8  // Warn at 80%

// Monitor drop rate
const dropRate = stats.totalDropped / stats.totalReceived;
if (dropRate > 0.01) {  // More than 1% dropped
  console.warn('High drop rate!');
}
```

**Error Handling:**
```typescript
// Don't let handler errors crash subscription
handler: async (delta) => {
  try {
    await process(delta);
  } catch (error) {
    // Log and continue
    logError(error);
  }
}
```

## Integration with Storage

Backpressure subscriptions work with both RhizomeDB and LevelDBStore:

```typescript
// In-memory
const db = new RhizomeDB({ storage: 'memory' });
const sub = createBackpressureSubscription({ /* ... */ });
db.subscribe(filter, sub.handleDelta);

// Persistent
const db = new LevelDBStore({ storage: 'leveldb', storageConfig: { path: './db' } });
const sub = createBackpressureSubscription({ /* ... */ });
db.subscribe(filter, sub.handleDelta);
```

Both implementations:
- Support same subscription API
- Fire callbacks on persistDelta
- Filter deltas before calling handler
- Handle async handlers correctly

## Future Enhancements

Potential additions:
- Batch processing (accumulate N deltas before processing)
- Priority queues (process important deltas first)
- Exponential backoff (slow down on repeated errors)
- Rate limiting (max deltas per second)
- Compression (compress buffer to save memory)
- Persistence (persist buffer across restarts)

## Testing

`subscription-backpressure.test.ts` - 8 comprehensive tests:
- Basic buffer management
- DROP_OLDEST strategy
- DROP_NEWEST strategy
- ERROR strategy
- BLOCK strategy (with timeout)
- Pause/resume functionality
- Statistics tracking
- Error handling in handlers

All tests passing ✅
