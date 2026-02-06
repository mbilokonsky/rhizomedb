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
  ResolutionStrategy,
  PropertyResolution,
  DeltaAuthor,
  DeltaStore,
  StreamConsumer,
  StreamProducer,
  IndexMaintainer
} from '../core/types';
import { validateDelta, isDomainNodeReference, isReference } from '../core/validation';
import { constructHyperView, createStandardSchema, SchemaRegistry } from '../schemas/hyperview';
import { ViewResolver, mostRecent } from '../queries/view-resolver';
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
        p => isReference(p.target) && p.target.context && this.filter.targetContexts!.includes(p.target.context)
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
  /** Reverse index: objectId → Set of cache keys for views that reference this object */
  private viewsByObjectId: Map<string, Set<string>> = new Map();
  private cacheStats = { hits: 0, misses: 0, evictions: 0 };
  private schemaRegistry: SchemaRegistry;
  private startTime: number = Date.now();
  private config: Required<RhizomeConfig>;

  constructor(config: RhizomeConfig) {
    this.systemId = config.systemId || uuidv4();
    this.config = {
      systemId: this.systemId,
      storage: config.storage,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      storageConfig: config.storageConfig,
      cacheSize: config.cacheSize || 1000,
      enableIndexing: config.enableIndexing !== false,
      validateSchemas: config.validateSchemas || false
    };

    // Initialize LRU cache for materialized views
    this.materializedViews = new LRUCache<string, MaterializedHyperView>({
      max: this.config.cacheSize,
      // Track evictions and clean up reverse index
      dispose: (_value: MaterializedHyperView, key: string) => {
        this.cacheStats.evictions++;
        this.removeFromReverseIndex(key);
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
        role: 'negates',
        target: { id: targetDeltaId, context: 'negated_by' }
      }
    ];

    if (reason) {
      pointers.push({
        role: 'reason',
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

    // Idempotency: skip if delta already exists (important for federation)
    if (this.deltaIndex.has(delta.id)) {
      return;
    }

    // Store in array and index
    this.deltas.push(delta);
    this.deltaIndex.set(delta.id, delta);

    // Add to secondary indexes
    this.deltaIndexes.addDelta(delta);

    // Publish to subscribers
    await this.publishDelta(delta);

    // Update materialized views if indexing is enabled
    if (this.config.enableIndexing) {
      this.incrementallyUpdateViews(delta);
    }
  }

  async persistDeltas(deltas: Delta[]): Promise<void> {
    for (const delta of deltas) {
      await this.persistDelta(delta);
    }
  }

  getDeltas(ids: string[]): Promise<Delta[]> {
    return Promise.resolve(
      ids.map(id => this.deltaIndex.get(id)).filter((d): d is Delta => d !== undefined)
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async *scanDeltas(filter?: DeltaFilter, _cursor?: string): AsyncIterable<Delta> {
    const matchingDeltas = filter ? this.queryDeltas(filter) : this.deltas;

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
        deltaCount += hyperView[key].length;
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
      this.addToReverseIndex(objectId, cacheKey);
    }

    return materializedView;
  }

  updateHyperView(view: MaterializedHyperView, _delta: Delta): void {
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
      throw new Error(
        `No materialized view found for object: ${objectId}${schemaId ? ` with schema: ${schemaId}` : ''}`
      );
    }

    const schema = this.schemaRegistry.get(existing._metadata.schemaId);
    if (!schema) {
      throw new Error(`Schema not found: ${existing._metadata.schemaId}`);
    }

    return this.materializeHyperView(objectId, schema);
  }

  // =========================================================================
  // Incremental view update internals
  // =========================================================================

  /**
   * Add a mapping from objectId to a cache key in the reverse index
   */
  private addToReverseIndex(objectId: string, cacheKey: string): void {
    let keys = this.viewsByObjectId.get(objectId);
    if (!keys) {
      keys = new Set();
      this.viewsByObjectId.set(objectId, keys);
    }
    keys.add(cacheKey);
  }

  /**
   * Remove a cache key from the reverse index
   */
  private removeFromReverseIndex(cacheKey: string): void {
    for (const [objectId, keys] of this.viewsByObjectId.entries()) {
      keys.delete(cacheKey);
      if (keys.size === 0) {
        this.viewsByObjectId.delete(objectId);
      }
    }
  }

  /**
   * Extract object IDs that a delta references (via pointer targets)
   */
  private getReferencedObjectIds(delta: Delta): string[] {
    const ids: string[] = [];
    for (const pointer of delta.pointers) {
      if (isDomainNodeReference(pointer.target)) {
        ids.push(pointer.target.id);
      }
    }
    return ids;
  }

  /**
   * Check if a delta is a negation delta (has a pointer with role 'negates')
   */
  private isNegationDelta(delta: Delta): { isNegation: boolean; targetDeltaId?: string } {
    for (const pointer of delta.pointers) {
      if (pointer.role === 'negates' && isDomainNodeReference(pointer.target)) {
        return { isNegation: true, targetDeltaId: pointer.target.id };
      }
    }
    return { isNegation: false };
  }

  /**
   * Count deltas across all properties in a materialized view
   */
  private countViewDeltas(view: MaterializedHyperView): number {
    let count = 0;
    for (const key in view) {
      if (key !== 'id' && key !== '_metadata' && Array.isArray(view[key])) {
        count += (view[key] as Delta[]).length;
      }
    }
    return count;
  }

  /**
   * Incrementally update all affected materialized views when a new delta arrives.
   *
   * For regular deltas: add to matching views via schema selection.
   * For negation deltas: remove the negated delta from affected views.
   * For double negation: fall back to full rebuild.
   */
  private incrementallyUpdateViews(delta: Delta): void {
    const { isNegation, targetDeltaId } = this.isNegationDelta(delta);

    if (isNegation && targetDeltaId) {
      this.handleNegationDelta(delta, targetDeltaId);
    } else {
      this.handleRegularDelta(delta);
    }
  }

  /**
   * Handle a regular (non-negation) delta by adding it to affected materialized views.
   */
  private handleRegularDelta(delta: Delta): void {
    const objectIds = this.getReferencedObjectIds(delta);

    for (const objectId of objectIds) {
      const cacheKeys = this.viewsByObjectId.get(objectId);
      if (!cacheKeys) continue;

      for (const cacheKey of cacheKeys) {
        const view = this.materializedViews.get(cacheKey);
        if (!view) continue;

        const schema = this.schemaRegistry.get(view._metadata.schemaId);
        if (!schema) continue;

        // Check if schema selects this delta for this object
        const result = schema.select(objectId, delta);
        if (result === false) continue;

        const properties = result === true ? ['_default'] : result;

        // Apply transformation rules to the delta's pointers
        const transformedDelta: Delta = {
          ...delta,
          pointers: delta.pointers.map(pointer => {
            const rule = schema.transform[pointer.role];
            if (!rule || (rule.when && !rule.when(pointer, delta))) return pointer;
            if (!isDomainNodeReference(pointer.target)) return pointer;
            // Skip nested HyperView expansion for incremental updates -
            // mark parent as needing rebuild on next access for nested views
            return pointer;
          })
        };

        // Add the delta to appropriate property arrays
        for (const property of properties) {
          if (!view[property]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (view as any)[property] = [];
          }
          (view[property] as Delta[]).push(transformedDelta);
        }

        // Update metadata
        view._metadata.lastUpdated = Date.now();
        view._metadata.deltaCount = this.countViewDeltas(view);
      }
    }
  }

  /**
   * Handle a negation delta by removing the negated delta from affected views.
   * Falls back to full rebuild for double negation (negation of a negation).
   */
  private handleNegationDelta(_negationDelta: Delta, targetDeltaId: string): void {
    // Check if this is a double negation (negating a negation delta)
    const targetDelta = this.deltaIndex.get(targetDeltaId);
    if (targetDelta) {
      const { isNegation: isDoubleNegation, targetDeltaId: originalDeltaId } = this.isNegationDelta(targetDelta);
      if (isDoubleNegation && originalDeltaId) {
        // Double negation: the originally negated delta is restored.
        // Find the original delta and rebuild views that contain its referenced objects.
        const originalDelta = this.deltaIndex.get(originalDeltaId);
        if (originalDelta) {
          this.rebuildAffectedViews(originalDelta);
        }
        return;
      }
    }

    // Single negation: remove the negated delta from all views that contain it
    // The negated delta's object IDs tell us which views to check
    if (!targetDelta) return;

    const objectIds = this.getReferencedObjectIds(targetDelta);

    for (const objectId of objectIds) {
      const cacheKeys = this.viewsByObjectId.get(objectId);
      if (!cacheKeys) continue;

      for (const cacheKey of cacheKeys) {
        const view = this.materializedViews.get(cacheKey);
        if (!view) continue;

        let removed = false;

        // Remove the negated delta from all property arrays in the view
        for (const key in view) {
          if (key === 'id' || key === '_metadata') continue;
          const arr = view[key];
          if (!Array.isArray(arr)) continue;

          const before = arr.length;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (view as any)[key] = arr.filter((d: Delta) => d.id !== targetDeltaId);
          if ((view[key] as Delta[]).length < before) {
            removed = true;
          }
        }

        if (removed) {
          view._metadata.lastUpdated = Date.now();
          view._metadata.deltaCount = this.countViewDeltas(view);
        }
      }
    }
  }

  /**
   * Rebuild all materialized views affected by a delta (used for double negation)
   */
  private rebuildAffectedViews(delta: Delta): void {
    const objectIds = this.getReferencedObjectIds(delta);

    for (const objectId of objectIds) {
      const cacheKeys = this.viewsByObjectId.get(objectId);
      if (!cacheKeys) continue;

      for (const cacheKey of Array.from(cacheKeys)) {
        const view = this.materializedViews.get(cacheKey);
        if (!view) continue;

        const schema = this.schemaRegistry.get(view._metadata.schemaId);
        if (!schema) continue;

        // Full rebuild
        this.materializeHyperView(objectId, schema);
      }
    }
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
        hitRate:
          this.cacheStats.hits + this.cacheStats.misses > 0
            ? this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)
            : 0
      },
      indexStats: this.deltaIndexes.getStats()
    };
  }

  // =========================================================================
  // Convenience methods
  // =========================================================================

  /**
   * Resolve an entity to a plain object using a resolution strategy.
   *
   * Builds a HyperView with the standard schema (selectByTargetContext),
   * then resolves each property using the given strategy.
   *
   * @param entityId - The entity to resolve
   * @param strategy - Resolution strategy (default: mostRecent)
   * @param queryTimestamp - Optional timestamp for time-travel queries
   * @returns Plain object with resolved property values
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve(entityId: string, strategy?: ResolutionStrategy, queryTimestamp?: number): Record<string, any> {
    const schema = createStandardSchema('_resolve', 'Resolve');
    const registry = new SchemaRegistry();
    registry.register(schema);

    const allDeltas = this.queryDeltas({ includeNegated: true });
    const hyperView = constructHyperView(entityId, schema, allDeltas, registry, queryTimestamp);

    const resolveStrategy = strategy ?? mostRecent;
    const properties: Record<string, PropertyResolution> = {};

    for (const [key, value] of Object.entries(hyperView)) {
      if (key === 'id' || key === '_metadata' || !Array.isArray(value)) continue;
      properties[key] = {
        source: key,
        extract: (delta: Delta) => {
          for (const p of delta.pointers) {
            if (typeof p.target === 'string' || typeof p.target === 'number' || typeof p.target === 'boolean') {
              return p.target;
            }
          }
          return null;
        },
        resolve: resolveStrategy
      };
    }

    if (Object.keys(properties).length === 0) {
      return { id: hyperView.id };
    }

    const resolver = new ViewResolver();
    return resolver.resolveView(hyperView, { properties });
  }

  /**
   * Get all values for a specific property of an entity (for conflict visibility).
   *
   * @param entityId - The entity to query
   * @param property - The property name (context)
   * @param queryTimestamp - Optional timestamp for time-travel queries
   * @returns Array of all primitive values for the property
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allValuesFor(entityId: string, property: string, queryTimestamp?: number): any[] {
    const schema = createStandardSchema('_resolve', 'Resolve');
    const registry = new SchemaRegistry();
    registry.register(schema);

    const allDeltas = this.queryDeltas({ includeNegated: true });
    const hyperView = constructHyperView(entityId, schema, allDeltas, registry, queryTimestamp);
    const deltas = hyperView[property] as Delta[] | undefined;
    if (!deltas || deltas.length === 0) return [];

    return deltas.map((delta) => {
      for (const p of delta.pointers) {
        if (typeof p.target === 'string' || typeof p.target === 'number' || typeof p.target === 'boolean') {
          return p.target;
        }
      }
      return null;
    }).filter((v) => v !== null);
  }

  /**
   * Get related entity IDs through a relationship property.
   *
   * @param entityId - The entity to query
   * @param property - The property name (context on this entity's side)
   * @param throughRole - The role on the pointer that references the related entity
   * @param queryTimestamp - Optional timestamp for time-travel queries
   * @returns Array of related entity IDs
   */
  relatedIds(entityId: string, property: string, throughRole: string, queryTimestamp?: number): string[] {
    const schema = createStandardSchema('_resolve', 'Resolve');
    const registry = new SchemaRegistry();
    registry.register(schema);

    const allDeltas = this.queryDeltas({ includeNegated: true });
    const hyperView = constructHyperView(entityId, schema, allDeltas, registry, queryTimestamp);
    const deltas = hyperView[property] as Delta[] | undefined;
    if (!deltas || deltas.length === 0) return [];

    const ids: string[] = [];
    for (const delta of deltas) {
      for (const p of delta.pointers) {
        if (p.role === throughRole && typeof p.target === 'object' && 'id' in p.target) {
          ids.push(p.target.id);
        }
      }
    }
    return ids;
  }

  /**
   * Create and persist an annotation delta (object + primitive value).
   *
   * Uses the standard annotation pattern: `{property}d` role for the object pointer,
   * `{property}` role for the value pointer.
   *
   * @param entityId - The entity to annotate
   * @param property - The property name (becomes the context)
   * @param value - The primitive value
   * @param author - The author of this assertion
   * @param timestamp - Optional explicit timestamp
   * @returns The created delta (already persisted)
   */
  async annotate(
    entityId: string,
    property: string,
    value: string | number | boolean,
    author: string,
    timestamp?: number
  ): Promise<Delta> {
    const delta = this.createDelta(author, [
      { role: `${property}d`, target: { id: entityId, context: property } },
      { role: property, target: value }
    ]);
    if (timestamp !== undefined) delta.timestamp = timestamp;
    await this.persistDelta(delta);
    return delta;
  }

  /**
   * Create and persist a relationship delta (object + object).
   *
   * @param roleA - Role for the first entity's pointer
   * @param entityA - First entity ID
   * @param contextA - Context on the first entity (where this shows up in its HyperView)
   * @param roleB - Role for the second entity's pointer
   * @param entityB - Second entity ID
   * @param contextB - Context on the second entity
   * @param author - The author of this assertion
   * @param timestamp - Optional explicit timestamp
   * @returns The created delta (already persisted)
   */
  async relate(
    roleA: string,
    entityA: string,
    contextA: string,
    roleB: string,
    entityB: string,
    contextB: string,
    author: string,
    timestamp?: number
  ): Promise<Delta> {
    const delta = this.createDelta(author, [
      { role: roleA, target: { id: entityA, context: contextA } },
      { role: roleB, target: { id: entityB, context: contextB } }
    ]);
    if (timestamp !== undefined) delta.timestamp = timestamp;
    await this.persistDelta(delta);
    return delta;
  }

  /**
   * Clear all data (useful for testing)
   */
  clear(): void {
    this.deltas = [];
    this.deltaIndex.clear();
    this.deltaIndexes.clear();
    this.materializedViews.clear();
    this.viewsByObjectId.clear();
    // Don't clear subscriptions or schema registry
  }
}
