/**
 * LevelDB-backed RhizomeDB instance implementation
 * Provides persistent storage for deltas using LevelDB
 */

import { Level } from 'level';
import { v4 as uuidv4 } from 'uuid';
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
import { validateDelta, isDomainNodeReference, isReference } from '../core/validation';
import { constructHyperView, SchemaRegistry } from '../schemas/hyperview';
import { calculateSchemaHash, VersionedHyperSchema } from '../schemas/schema-versioning';

/**
 * Subscription implementation (same as in-memory version)
 */
class LevelDBSubscription implements Subscription {
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
 * LevelDB-backed RhizomeDB instance
 *
 * Implements all core capabilities with persistent storage:
 * - DeltaAuthor: Create and negate deltas
 * - DeltaStore: Persist and query deltas using LevelDB
 * - StreamConsumer: Subscribe to delta streams
 * - StreamProducer: Publish deltas to subscribers
 * - IndexMaintainer: Materialize and maintain HyperViews
 */
export class LevelDBStore
  implements DeltaAuthor, DeltaStore, StreamConsumer, StreamProducer, IndexMaintainer
{
  public readonly systemId: string;
  private db: Level<string, string>;
  private subscriptions: Map<string, LevelDBSubscription> = new Map();
  private materializedViews: Map<string, MaterializedHyperView> = new Map();
  private schemaRegistry: SchemaRegistry;
  private startTime: number = Date.now();
  private config: Required<RhizomeConfig>;
  private ready: Promise<void>;

  // LevelDB key prefixes for different data types
  private static readonly DELTA_PREFIX = 'delta:';
  private static readonly TIMESTAMP_PREFIX = 'ts:';
  private static readonly AUTHOR_PREFIX = 'author:';
  private static readonly SYSTEM_PREFIX = 'system:';
  private static readonly TARGET_PREFIX = 'target:';

  constructor(config: RhizomeConfig & { dbPath: string }) {
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

    // Initialize schema registry with validation setting
    this.schemaRegistry = new SchemaRegistry({
      validateOnRegister: this.config.validateSchemas
    });

    // Initialize LevelDB
    this.db = new Level(config.dbPath, { valueEncoding: 'json' });
    this.ready = this.db.open();
  }

  /**
   * Ensure database is ready before operations
   */
  private async ensureReady(): Promise<void> {
    await this.ready;
  }

  /**
   * Close the database
   */
  async close(): Promise<void> {
    await this.db.close();
  }

  /**
   * Serialize delta to JSON string
   */
  private serializeDelta(delta: Delta): string {
    return JSON.stringify(delta);
  }

  /**
   * Deserialize delta from JSON string
   */
  private deserializeDelta(json: string): Delta {
    return JSON.parse(json) as Delta;
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
    await this.ensureReady();
    validateDelta(delta);

    const batch = this.db.batch();

    // Store delta by ID
    const deltaKey = `${LevelDBStore.DELTA_PREFIX}${delta.id}`;
    batch.put(deltaKey, this.serializeDelta(delta));

    // Create index entries for efficient querying
    // Timestamp index: ts:{timestamp}:{deltaId} -> deltaId
    const tsKey = `${LevelDBStore.TIMESTAMP_PREFIX}${delta.timestamp.toString().padStart(20, '0')}:${delta.id}`;
    batch.put(tsKey, delta.id);

    // Author index: author:{author}:{deltaId} -> deltaId
    const authorKey = `${LevelDBStore.AUTHOR_PREFIX}${delta.author}:${delta.id}`;
    batch.put(authorKey, delta.id);

    // System index: system:{system}:{deltaId} -> deltaId
    const systemKey = `${LevelDBStore.SYSTEM_PREFIX}${delta.system}:${delta.id}`;
    batch.put(systemKey, delta.id);

    // Target index: target:{targetId}:{deltaId} -> deltaId
    for (const pointer of delta.pointers) {
      if (isDomainNodeReference(pointer.target)) {
        const targetKey = `${LevelDBStore.TARGET_PREFIX}${pointer.target.id}:${delta.id}`;
        batch.put(targetKey, delta.id);
      }
    }

    await batch.write();

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
    await this.ensureReady();
    const deltas: Delta[] = [];

    for (const id of ids) {
      try {
        const deltaKey = `${LevelDBStore.DELTA_PREFIX}${id}`;
        const json = await this.db.get(deltaKey);
        deltas.push(this.deserializeDelta(json));
      } catch (err: unknown) {
        // Delta not found, skip
        if ((err as { code?: string }).code !== 'LEVEL_NOT_FOUND') {
          throw err;
        }
      }
    }

    return deltas;
  }

  async *scanDeltas(filter?: DeltaFilter, cursor?: string): AsyncIterable<Delta> {
    await this.ensureReady();

    // Use timestamp index for efficient scanning
    const prefix = LevelDBStore.TIMESTAMP_PREFIX;
    const iterator = this.db.iterator({
      gte: cursor || prefix,
      lte: prefix + '\xff'
    });

    for await (const [_key, deltaId] of iterator) {
      try {
        const deltaKey = `${LevelDBStore.DELTA_PREFIX}${deltaId}`;
        const json = await this.db.get(deltaKey);
        const delta = this.deserializeDelta(json);

        // Apply filter if provided
        if (filter && !this.matchesFilter(delta, filter)) {
          continue;
        }

        yield delta;
      } catch (err: unknown) {
        // Delta not found, skip
        if ((err as { code?: string }).code !== 'LEVEL_NOT_FOUND') {
          throw err;
        }
      }
    }
  }

  // =========================================================================
  // Helper methods for querying
  // =========================================================================

  private async getAllDeltas(): Promise<Delta[]> {
    const deltas: Delta[] = [];
    for await (const delta of this.scanDeltas()) {
      deltas.push(delta);
    }
    return deltas;
  }

  private matchesFilter(delta: Delta, filter: DeltaFilter): boolean {
    if (filter.ids && !filter.ids.includes(delta.id)) {
      return false;
    }

    if (filter.authors && !filter.authors.includes(delta.author)) {
      return false;
    }

    if (filter.systems && !filter.systems.includes(delta.system)) {
      return false;
    }

    if (filter.timestampRange) {
      const { start, end } = filter.timestampRange;
      if (start !== undefined && delta.timestamp < start) {
        return false;
      }
      if (end !== undefined && delta.timestamp > end) {
        return false;
      }
    }

    if (filter.targetIds) {
      const hasMatchingTarget = delta.pointers.some(
        p => isDomainNodeReference(p.target) && filter.targetIds!.includes(p.target.id)
      );
      if (!hasMatchingTarget) {
        return false;
      }
    }

    if (filter.targetContexts) {
      const hasMatchingContext = delta.pointers.some(
        p => isReference(p.target) && p.target.context && filter.targetContexts!.includes(p.target.context)
      );
      if (!hasMatchingContext) {
        return false;
      }
    }

    if (filter.predicate && !filter.predicate(delta)) {
      return false;
    }

    return true;
  }

  async queryDeltas(filter: DeltaFilter): Promise<Delta[]> {
    await this.ensureReady();
    const results: Delta[] = [];

    // Use indices for efficient querying when possible
    if (filter.ids && filter.ids.length > 0) {
      // Direct lookup by IDs
      return await this.getDeltas(filter.ids);
    }

    if (filter.authors && filter.authors.length === 1 && !filter.ids && !filter.systems) {
      // Use author index
      const author = filter.authors[0];
      const prefix = `${LevelDBStore.AUTHOR_PREFIX}${author}:`;
      const iterator = this.db.iterator({
        gte: prefix,
        lte: prefix + '\xff'
      });

      for await (const [_key, deltaId] of iterator) {
        const delta = await this.getDeltas([deltaId]);
        if (delta.length > 0 && this.matchesFilter(delta[0], filter)) {
          results.push(delta[0]);
        }
      }

      return this.applyNegationFilter(results, filter);
    }

    // Fallback to full scan with filter
    for await (const delta of this.scanDeltas()) {
      if (this.matchesFilter(delta, filter)) {
        results.push(delta);
      }
    }

    return this.applyNegationFilter(results, filter);
  }

  private async applyNegationFilter(deltas: Delta[], filter: DeltaFilter): Promise<Delta[]> {
    if (filter.includeNegated) {
      return deltas;
    }

    // Find all negated delta IDs
    const negatedIds = new Set<string>();
    for await (const delta of this.scanDeltas()) {
      for (const pointer of delta.pointers) {
        if (pointer.role === 'negates' && isDomainNodeReference(pointer.target)) {
          negatedIds.add(pointer.target.id);
        }
      }
    }

    return deltas.filter(d => !negatedIds.has(d.id));
  }

  async applyHyperSchema(objectId: string, schema: HyperSchema): Promise<HyperView> {
    await this.ensureReady();

    // Register schema if not already registered
    if (!this.schemaRegistry.get(schema.id)) {
      this.schemaRegistry.register(schema);
    }

    // Get all deltas for hyperview construction
    const allDeltas = await this.getAllDeltas();
    return constructHyperView(objectId, schema, allDeltas, this.schemaRegistry);
  }

  // =========================================================================
  // StreamConsumer implementation
  // =========================================================================

  subscribe(filter: DeltaFilter, handler: DeltaHandler): Subscription {
    const id = uuidv4();
    const subscription = new LevelDBSubscription(id, filter, handler, () => {
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

  async getStreamInfo(): Promise<StreamInfo> {
    await this.ensureReady();

    // Count total deltas
    let totalDeltas = 0;
    let latestTimestamp: number | undefined;

    for await (const delta of this.scanDeltas()) {
      totalDeltas++;
      if (!latestTimestamp || delta.timestamp > latestTimestamp) {
        latestTimestamp = delta.timestamp;
      }
    }

    return {
      totalDeltas,
      activeSubscriptions: this.subscriptions.size,
      latestTimestamp
    };
  }

  // =========================================================================
  // IndexMaintainer implementation
  // =========================================================================

  async materializeHyperView(
    objectId: string,
    schema: HyperSchema
  ): Promise<MaterializedHyperView> {
    await this.ensureReady();

    // Register schema if not already registered
    if (!this.schemaRegistry.get(schema.id)) {
      this.schemaRegistry.register(schema);
    }

    // Check if we have a cached version
    const cacheKey = `${objectId}:${schema.id}`;
    const cached = this.materializedViews.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Construct the hyperview
    const allDeltas = await this.getAllDeltas();
    const hyperView = constructHyperView(objectId, schema, allDeltas, this.schemaRegistry);

    // Convert to materialized view
    const schemaHash = calculateSchemaHash(schema);
    const versionedSchema = schema as VersionedHyperSchema;

    let deltaCount = 0;
    // Count deltas in the view
    for (const [key, value] of Object.entries(hyperView)) {
      if (key !== 'id' && key !== '_metadata' && Array.isArray(value)) {
        deltaCount += value.length;
      }
    }

    const materialized: MaterializedHyperView = {
      ...hyperView,
      _metadata: {
        schemaId: schema.id,
        schemaHash: schemaHash,
        schemaVersion: versionedSchema.version,
        lastUpdated: Date.now(),
        deltaCount: deltaCount
      }
    };

    // Cache if within size limit
    if (this.materializedViews.size < this.config.cacheSize) {
      this.materializedViews.set(cacheKey, materialized);
    }

    return materialized;
  }

  updateHyperView(view: MaterializedHyperView, _delta: Delta): void {
    // For simplicity, just rebuild the view
    // A more sophisticated implementation would incrementally update
    const schema = this.schemaRegistry.get(view._metadata.schemaId);
    if (schema) {
      // Note: This is intentionally fire-and-forget for the sync interface
      void this.materializeHyperView(view.id, schema).then(updated => {
        Object.assign(view, updated);
      });
    }
  }

  getHyperView(objectId: string): MaterializedHyperView | null {
    // Look for any cached view with this objectId
    for (const [key, view] of this.materializedViews.entries()) {
      if (key.startsWith(objectId + ':')) {
        return view;
      }
    }
    return null;
  }

  rebuildHyperView(objectId: string): MaterializedHyperView {
    const existing = this.getHyperView(objectId);
    if (!existing) {
      throw new Error(`No materialized view found for object: ${objectId}`);
    }

    // Extract schema ID from cache key
    for (const [key] of this.materializedViews.entries()) {
      if (key.startsWith(objectId + ':')) {
        const schemaId = key.split(':')[1];
        const schema = this.schemaRegistry.get(schemaId);
        if (schema) {
          // Invalidate cache
          this.materializedViews.delete(key);
          // Rebuild - note this is fire-and-forget for sync interface
          void this.materializeHyperView(objectId, schema).then(rebuilt => {
            Object.assign(existing, rebuilt);
          });
          return existing;
        }
      }
    }

    throw new Error(`Could not rebuild view for object: ${objectId}`);
  }

  invalidateView(objectId: string, schemaId: string): void {
    const cacheKey = `${objectId}:${schemaId}`;
    this.materializedViews.delete(cacheKey);
  }

  // =========================================================================
  // Instance management
  // =========================================================================

  async getStats(): Promise<InstanceStats> {
    const streamInfo = await this.getStreamInfo();

    return {
      systemId: this.systemId,
      uptime: Date.now() - this.startTime,
      totalDeltas: streamInfo.totalDeltas,
      cachedViews: this.materializedViews.size,
      activeSubscriptions: this.subscriptions.size,
      storageType: 'leveldb'
    };
  }
}
