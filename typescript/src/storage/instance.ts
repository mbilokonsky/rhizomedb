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
} from '../core/types';
import { validateDelta, isDomainNodeReference } from '../core/validation';
import { constructHyperView, SchemaRegistry } from '../schemas/hyperview';
import { DeltaIndexes } from './delta-indexes';
import { getNegatedDeltaIds } from '../queries/negation';
import { calculateSchemaHash, VersionedHyperSchema } from '../schemas/schema-versioning';

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
  private deltaIndexes: DeltaIndexes = new DeltaIndexes();
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

    // Add to secondary indexes
    this.deltaIndexes.addDelta(delta);

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
    let results: Delta[];

    // Try to use indexes for efficient filtering
    const candidateIds = this.deltaIndexes.queryDeltaIds(filter);

    if (candidateIds) {
      // Index query returned candidates - fetch only those deltas
      results = Array.from(candidateIds)
        .map(id => this.deltaIndex.get(id))
        .filter((d): d is Delta => d !== undefined);
    } else {
      // No indexed fields in filter - scan all deltas
      results = [...this.deltas];
    }

    // Apply remaining filters not handled by indexes
    if (filter.ids) {
      const idSet = new Set(filter.ids);
      results = results.filter(d => idSet.has(d.id));
    }

    if (filter.predicate) {
      results = results.filter(filter.predicate);
    }

    // Handle negations (with double negation support)
    if (!filter.includeNegated) {
      const negatedIds = getNegatedDeltaIds(this.deltas);
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
      if (key !== 'id' && key !== '_metadata' && Array.isArray(hyperView[key])) {
        deltaCount += (hyperView[key] as Delta[]).length;
      }
    }

    // Calculate schema hash for version tracking
    const schemaHash = calculateSchemaHash(schema);
    const versionedSchema = schema as VersionedHyperSchema;

    const materializedView: MaterializedHyperView = {
      ...hyperView,
      _metadata: {
        schemaId: schema.id,
        schemaHash: schemaHash,
        schemaVersion: versionedSchema.version,
        lastUpdated: Date.now(),
        deltaCount: deltaCount
      }
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
    const schema = this.schemaRegistry.get(view._metadata.schemaId);
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

    const schema = this.schemaRegistry.get(existing._metadata.schemaId);
    if (!schema) {
      throw new Error(`Schema not found: ${existing._metadata.schemaId}`);
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
   * Check if a materialized view is outdated and needs rebuilding
   *
   * A view is outdated if:
   * 1. The schema has changed (different hash)
   * 2. The schema version has increased
   *
   * @param view - The materialized view to check
   * @returns true if the view should be rebuilt
   */
  isViewOutdated(view: MaterializedHyperView): boolean {
    const schema = this.schemaRegistry.get(view._metadata.schemaId);
    if (!schema) {
      // Schema doesn't exist anymore - view is orphaned
      return true;
    }

    const currentHash = calculateSchemaHash(schema);

    // Check if hash has changed
    if (view._metadata.schemaHash !== currentHash) {
      return true;
    }

    // Check if explicit version has increased
    const versionedSchema = schema as VersionedHyperSchema;
    if (versionedSchema.version !== undefined && view._metadata.schemaVersion !== undefined) {
      if (versionedSchema.version > view._metadata.schemaVersion) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get a materialized view, rebuilding if outdated
   *
   * @param objectId - The object ID
   * @param schema - The schema to use
   * @returns The materialized view (fresh or from cache)
   */
  getOrRebuildHyperView(objectId: string, schema: HyperSchema): MaterializedHyperView {
    const existing = this.getHyperView(objectId, schema.id);

    if (existing && !this.isViewOutdated(existing)) {
      return existing;
    }

    // View is outdated or doesn't exist - rebuild it
    return this.materializeHyperView(objectId, schema);
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
      },
      indexStats: this.deltaIndexes.getStats()
    };
  }

  /**
   * Clear all data (useful for testing)
   */
  clear(): void {
    this.deltas = [];
    this.deltaIndex.clear();
    this.deltaIndexes.clear();
    this.materializedViews.clear();
    // Don't clear subscriptions or schema registry
  }
}
