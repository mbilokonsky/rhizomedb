/**
 * RhizomeDB instance implementation
 * Based on RhizomeDB Specification §3 and §10
 */

import { v4 as uuidv4 } from 'uuid';
import { LRUCache } from 'lru-cache';
import {
  Delta,
  Pointer,
  DeltaFilter,
  HyperSchema,
  HyperView,
  MaterializedHyperView,
  RhizomeConfig,
  InstanceStats,
  DeltaHandler,
  Subscription,
  StreamInfo,
  DeltaAuthor,
  DeltaStore,
  StreamConsumer,
  StreamProducer,
  IndexMaintainer
} from './types';
import { validateDelta, isDomainNodeReference } from './validation';
import { constructHyperView, SchemaRegistry } from './hyperview';

/**
 * In-memory subscription implementation
 */
class MemorySubscription implements Subscription {
  private _paused = false;

  constructor(
    private id: string,
    private filter: DeltaFilter,
    private handler: DeltaHandler,
    private unsubscribeFn: () => void
  ) {}

  unsubscribe(): void {
    this.unsubscribeFn();
  }

  pause(): void {
    this._paused = true;
  }

  resume(): void {
    this._paused = false;
  }

  getPosition(): string {
    return this.id;
  }

  get paused(): boolean {
    return this._paused;
  }

  async handleDelta(delta: Delta): Promise<void> {
    if (this._paused) {
      return;
    }

    if (this.matchesFilter(delta)) {
      await this.handler(delta);
    }
  }

  private matchesFilter(delta: Delta): boolean {
    if (this.filter.ids && !this.filter.ids.includes(delta.id)) {
      return false;
    }

    if (this.filter.authors && !this.filter.authors.includes(delta.author)) {
      return false;
    }

    if (this.filter.systems && !this.filter.systems.includes(delta.system)) {
      return false;
    }

    if (this.filter.timestampRange) {
      const { start, end } = this.filter.timestampRange;
      if (start !== undefined && delta.timestamp < start) {
        return false;
      }
      if (end !== undefined && delta.timestamp > end) {
        return false;
      }
    }

    if (this.filter.targetIds) {
      const hasMatchingTarget = delta.pointers.some(
        p => isDomainNodeReference(p.target) && this.filter.targetIds!.includes(p.target.id)
      );
      if (!hasMatchingTarget) {
        return false;
      }
    }

    if (this.filter.targetContexts) {
      const hasMatchingContext = delta.pointers.some(
        p => p.targetContext && this.filter.targetContexts!.includes(p.targetContext)
      );
      if (!hasMatchingContext) {
        return false;
      }
    }

    if (this.filter.predicate && !this.filter.predicate(delta)) {
      return false;
    }

    return true;
  }
}

/**
 * RhizomeDB instance - reference implementation with in-memory storage
 *
 * Implements all core capabilities:
 * - DeltaAuthor: Create and negate deltas
 * - DeltaStore: Persist and query deltas
 * - StreamConsumer: Subscribe to delta streams
 * - StreamProducer: Publish deltas to subscribers
 * - IndexMaintainer: Materialize and maintain HyperViews
 */
export class RhizomeDB
  implements DeltaAuthor, DeltaStore, StreamConsumer, StreamProducer, IndexMaintainer
{
  public readonly systemId: string;
  private deltas: Delta[] = [];
  private deltaIndex: Map<string, Delta> = new Map();
  private subscriptions: Map<string, MemorySubscription> = new Map();
  private materializedViews: LRUCache<string, MaterializedHyperView>;
  private cacheStats = { hits: 0, misses: 0, evictions: 0 };
  private schemaRegistry: SchemaRegistry;
  private startTime: number = Date.now();
  private config: Required<RhizomeConfig>;

  constructor(config: RhizomeConfig) {
    this.systemId = config.systemId || uuidv4();
    this.config = {
      systemId: this.systemId,
      storage: config.storage,
      storageConfig: config.storageConfig,
      cacheSize: config.cacheSize || 1000,
      enableIndexing: config.enableIndexing !== false,
      validateSchemas: config.validateSchemas || false
    };

    // Initialize LRU cache for materialized views
    this.materializedViews = new LRUCache<string, MaterializedHyperView>({
      max: this.config.cacheSize,
      // Track evictions
      dispose: () => {
        this.cacheStats.evictions++;
      }
    });

    // Initialize schema registry with validation setting
    this.schemaRegistry = new SchemaRegistry({
      validateOnRegister: this.config.validateSchemas
    });
  }

  // =========================================================================
  // DeltaAuthor implementation
  // =========================================================================

  createDelta(author: string, pointers: Pointer[]): Delta {
    const delta: Delta = {
      id: uuidv4(),
      timestamp: Date.now(),
      author,
      system: this.systemId,
      pointers
    };

    validateDelta(delta);
    return delta;
  }

  negateDelta(author: string, targetDeltaId: string, reason?: string): Delta {
    const pointers: Pointer[] = [
      {
        localContext: 'negates',
        target: { id: targetDeltaId },
        targetContext: 'negated_by'
      }
    ];

    if (reason) {
      pointers.push({
        localContext: 'reason',
        target: reason
      });
    }

    return this.createDelta(author, pointers);
  }

  // =========================================================================
  // DeltaStore implementation
  // =========================================================================

  async persistDelta(delta: Delta): Promise<void> {
    validateDelta(delta);

    // Store in array and index
    this.deltas.push(delta);
    this.deltaIndex.set(delta.id, delta);

    // Publish to subscribers
    await this.publishDelta(delta);

    // Update materialized views if indexing is enabled
    if (this.config.enableIndexing) {
      // TODO: Implement incremental view updates
    }
  }

  async persistDeltas(deltas: Delta[]): Promise<void> {
    for (const delta of deltas) {
      await this.persistDelta(delta);
    }
  }

  async getDeltas(ids: string[]): Promise<Delta[]> {
    return ids.map(id => this.deltaIndex.get(id)).filter((d): d is Delta => d !== undefined);
  }

  async *scanDeltas(filter?: DeltaFilter, cursor?: string): AsyncIterable<Delta> {
    const matchingDeltas = filter ? this.queryDeltas(filter) as Delta[] : this.deltas;

    for (const delta of matchingDeltas) {
      yield delta;
    }
  }

  // =========================================================================
  // RhizomeInstance implementation
  // =========================================================================

  queryDeltas(filter: DeltaFilter): Delta[] {
    let results = [...this.deltas];

    if (filter.ids) {
      const idSet = new Set(filter.ids);
      results = results.filter(d => idSet.has(d.id));
    }

    if (filter.authors) {
      const authorSet = new Set(filter.authors);
      results = results.filter(d => authorSet.has(d.author));
    }

    if (filter.systems) {
      const systemSet = new Set(filter.systems);
      results = results.filter(d => systemSet.has(d.system));
    }

    if (filter.timestampRange) {
      const { start, end } = filter.timestampRange;
      if (start !== undefined) {
        results = results.filter(d => d.timestamp >= start);
      }
      if (end !== undefined) {
        results = results.filter(d => d.timestamp <= end);
      }
    }

    if (filter.targetIds) {
      const targetSet = new Set(filter.targetIds);
      results = results.filter(d =>
        d.pointers.some(p => isDomainNodeReference(p.target) && targetSet.has(p.target.id))
      );
    }

    if (filter.targetContexts) {
      const contextSet = new Set(filter.targetContexts);
      results = results.filter(d =>
        d.pointers.some(p => p.targetContext && contextSet.has(p.targetContext))
      );
    }

    if (filter.predicate) {
      results = results.filter(filter.predicate);
    }

    // Handle negations
    if (!filter.includeNegated) {
      const negatedIds = new Set<string>();
      for (const delta of this.deltas) {
        for (const pointer of delta.pointers) {
          if (pointer.localContext === 'negates' && isDomainNodeReference(pointer.target)) {
            negatedIds.add(pointer.target.id);
          }
        }
      }
      results = results.filter(d => !negatedIds.has(d.id));
    }

    return results;
  }

  applyHyperSchema(objectId: string, schema: HyperSchema): HyperView {
    // Register schema if not already registered
    if (!this.schemaRegistry.get(schema.id)) {
      this.schemaRegistry.register(schema);
    }

    return constructHyperView(objectId, schema, this.deltas, this.schemaRegistry);
  }

  // =========================================================================
  // StreamConsumer implementation
  // =========================================================================

  subscribe(filter: DeltaFilter, handler: DeltaHandler): Subscription {
    const id = uuidv4();
    const subscription = new MemorySubscription(id, filter, handler, () => {
      this.subscriptions.delete(id);
    });

    this.subscriptions.set(id, subscription);
    return subscription;
  }

  // =========================================================================
  // StreamProducer implementation
  // =========================================================================

  async publishDelta(delta: Delta): Promise<void> {
    // Notify all subscriptions
    const promises: Promise<void>[] = [];

    for (const subscription of this.subscriptions.values()) {
      promises.push(subscription.handleDelta(delta));
    }

    await Promise.all(promises);
  }

  getStreamInfo(): StreamInfo {
    const latestDelta = this.deltas[this.deltas.length - 1];

    return {
      totalDeltas: this.deltas.length,
      activeSubscriptions: this.subscriptions.size,
      latestTimestamp: latestDelta?.timestamp
    };
  }

  // =========================================================================
  // IndexMaintainer implementation
  // =========================================================================

  materializeHyperView(objectId: string, schema: HyperSchema): MaterializedHyperView {
    // Register schema if not already registered
    if (!this.schemaRegistry.get(schema.id)) {
      this.schemaRegistry.register(schema);
    }

    const hyperView = this.applyHyperSchema(objectId, schema);

    // Count deltas in the view
    let deltaCount = 0;
    for (const key in hyperView) {
      if (key !== 'id' && Array.isArray(hyperView[key])) {
        deltaCount += (hyperView[key] as Delta[]).length;
      }
    }

    const materializedView: MaterializedHyperView = {
      ...hyperView,
      _schemaId: schema.id,
      _lastUpdated: Date.now(),
      _deltaCount: deltaCount
    };

    // Cache if enabled (LRU automatically handles eviction)
    if (this.config.enableIndexing) {
      const cacheKey = `${objectId}:${schema.id}`;
      this.materializedViews.set(cacheKey, materializedView);
    }

    return materializedView;
  }

  updateHyperView(view: MaterializedHyperView, delta: Delta): void {
    // For simplicity, just rebuild the view
    // A more sophisticated implementation would incrementally update
    const schema = this.schemaRegistry.get(view._schemaId);
    if (schema) {
      const updated = this.materializeHyperView(view.id, schema);
      Object.assign(view, updated);
    }
  }

  getHyperView(objectId: string, schemaId?: string): MaterializedHyperView | null {
    if (schemaId) {
      // Look for specific schema
      const cacheKey = `${objectId}:${schemaId}`;
      const view = this.materializedViews.get(cacheKey);

      if (view) {
        this.cacheStats.hits++;
        return view;
      }

      this.cacheStats.misses++;
      return null;
    }

    // Look for any materialized view for this object
    // Note: This is less efficient with LRU but rare operation
    for (const view of this.materializedViews.values()) {
      if (view.id === objectId) {
        this.cacheStats.hits++;
        return view;
      }
    }

    this.cacheStats.misses++;
    return null;
  }

  rebuildHyperView(objectId: string, schemaId?: string): MaterializedHyperView {
    // Try to find existing view
    const existing = this.getHyperView(objectId, schemaId);
    if (!existing) {
      throw new Error(`No materialized view found for object: ${objectId}${schemaId ? ` with schema: ${schemaId}` : ''}`);
    }

    const schema = this.schemaRegistry.get(existing._schemaId);
    if (!schema) {
      throw new Error(`Schema not found: ${existing._schemaId}`);
    }

    return this.materializeHyperView(objectId, schema);
  }

  // =========================================================================
  // Utility methods
  // =========================================================================

  /**
   * Register a HyperSchema for use in transformations
   */
  registerSchema(schema: HyperSchema): void {
    this.schemaRegistry.register(schema);
  }

  /**
   * Get instance statistics
   */
  getStats(): InstanceStats {
    return {
      systemId: this.systemId,
      totalDeltas: this.deltas.length,
      materializedHyperViews: this.materializedViews.size,
      cachedViews: this.materializedViews.size,
      activeSubscriptions: this.subscriptions.size,
      uptime: Date.now() - this.startTime,
      storageType: 'memory',
      cacheStats: {
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses,
        evictions: this.cacheStats.evictions,
        hitRate: this.cacheStats.hits + this.cacheStats.misses > 0
          ? this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)
          : 0
      }
    };
  }

  /**
   * Clear all data (useful for testing)
   */
  clear(): void {
    this.deltas = [];
    this.deltaIndex.clear();
    this.materializedViews.clear();
    // Don't clear subscriptions or schema registry
  }
}
