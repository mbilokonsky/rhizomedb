/**
 * Core type definitions for RhizomeDB
 * Based on RhizomeDB Technical Specification v0.1
 */

// ============================================================================
// Delta and Pointer Types
// ============================================================================

/**
 * Primitive values supported in deltas
 */
export type Primitive = string | number | boolean;

/**
 * Reference to a domain object by ID
 */
export interface DomainNodeReference {
  id: string;
}

/**
 * A contextualized pointer from a delta to a target (domain object or primitive)
 */
export interface Pointer {
  /** The semantic role of this pointer from the delta's perspective */
  localContext: string;

  /** The referenced entity or value */
  target: DomainNodeReference | Primitive;

  /** Optional: Where this delta should be organized when querying the target */
  targetContext?: string;
}

/**
 * An immutable assertion with unique identity, timestamp, author, system, and pointers
 *
 * Deltas are the atomic unit of data in RhizomeDB. They are:
 * - Immutable: Once created, cannot be modified
 * - Context-free: Stand alone, independent of any particular state
 * - Atomic: Must be accepted or negated in entirety
 */
export interface Delta {
  /** Unique identifier for this delta (UUIDv4 recommended) */
  id: string;

  /** Millisecond timestamp of delta creation */
  timestamp: number;

  /** UUID of the author (person or process) - currently unverified */
  author: string;

  /** UUID of the instance that created this delta - currently unverified */
  system: string;

  /** Array of contextualized pointers */
  pointers: Pointer[];
}

// ============================================================================
// HyperSchema Types
// ============================================================================

/**
 * Selection function determines which deltas are relevant to a domain object
 *
 * @param objectId - The domain object ID being queried
 * @param delta - The delta to check for relevance
 * @returns false (exclude), true (include in default property), or string[] (property names)
 */
export type SelectionFunction = (
  objectId: string,
  delta: Delta
) => boolean | string[];

/**
 * Primitive type schema for primitive values (string, number, boolean)
 *
 * PrimitiveHyperSchemas define validation and GraphQL type mapping for primitive values.
 * They can be used in TransformationRules to specify how primitive pointer targets
 * should be validated and typed.
 */
export interface PrimitiveHyperSchema {
  /** Type identifier (e.g., 'string', 'integer.year') */
  type: string;

  /** GraphQL scalar type for this primitive */
  graphQLType: any; // GraphQLScalarType from 'graphql' package

  /** Validation function to check if a value matches this schema */
  validate: (value: any) => boolean;
}

/**
 * Transformation rule for expanding pointers into nested HyperViews or validating primitives
 */
export interface TransformationRule {
  /** The HyperSchema or PrimitiveHyperSchema to apply to this pointer's target */
  schema: HyperSchema | PrimitiveHyperSchema | string;

  /** Optional filter for when to apply this transformation */
  when?: (pointer: Pointer, delta: Delta) => boolean;
}

/**
 * Transformation rules indexed by localContext
 */
export type TransformationRules = {
  [localContext: string]: TransformationRule;
};

/**
 * A HyperSchema defines how to construct a HyperView from deltas
 *
 * It consists of:
 * 1. Selection function: Which deltas are relevant?
 * 2. Transformation rules: How to expand pointers into nested HyperViews?
 */
export interface HyperSchema {
  /** Unique identifier for this schema */
  id: string;

  /** Human-readable name */
  name: string;

  /** Selection function: determines which deltas are relevant */
  select: SelectionFunction;

  /** Transformation rules: how to transform pointers */
  transform: TransformationRules;
}

// ============================================================================
// HyperView Types
// ============================================================================

/**
 * A structured organization of deltas representing a domain object
 *
 * Each property contains an array of deltas, with pointers potentially
 * transformed into nested HyperViews.
 */
export interface HyperView {
  /** The domain object ID */
  id: string;

  /** Properties, each containing deltas. Note: id is string, rest are Delta[] */
  [property: string]: string | Delta[];
}

/**
 * A materialized HyperView with metadata about when it was last updated
 */
export interface MaterializedHyperView {
  /** The domain object ID */
  id: string;

  /** The schema ID used to create this view */
  _schemaId: string;

  /** When this view was last updated (timestamp) */
  _lastUpdated: number;

  /** How many deltas are in this view */
  _deltaCount: number;

  /** Properties, each containing deltas */
  [property: string]: string | number | Delta[];
}

// ============================================================================
// View Types
// ============================================================================

/**
 * A View is a resolved representation of a domain object with conflicts handled
 */
export interface View {
  id: string;
  [property: string]: any;
}

/**
 * Resolution strategy for handling conflicting deltas
 */
export type ResolutionStrategy = (deltas: Delta[]) => any;

/**
 * Configuration for resolving a single property in a View
 */
export interface PropertyResolution {
  /** Which HyperView property to source from */
  source: string;

  /** How to extract value from a delta */
  extract: (delta: Delta) => any;

  /** How to resolve conflicts */
  resolve: ResolutionStrategy;
}

/**
 * ViewSchema defines how to resolve a HyperView into a View
 */
export interface ViewSchema {
  /** How to resolve each property */
  properties: {
    [property: string]: PropertyResolution;
  };
}

// ============================================================================
// Query and Filter Types
// ============================================================================

/**
 * Filter for querying deltas
 */
export interface DeltaFilter {
  /** Filter by delta IDs */
  ids?: string[];

  /** Filter by target object IDs */
  targetIds?: string[];

  /** Filter by target contexts */
  targetContexts?: string[];

  /** Filter by author */
  authors?: string[];

  /** Filter by system */
  systems?: string[];

  /** Filter by timestamp range */
  timestampRange?: { start?: number; end?: number };

  /** Include negated deltas? (default: false) */
  includeNegated?: boolean;

  /** Arbitrary predicate for advanced filtering */
  predicate?: (delta: Delta) => boolean;
}

// ============================================================================
// Stream Types
// ============================================================================

/**
 * Handler for deltas received from a stream
 */
export type DeltaHandler = (delta: Delta) => void | Promise<void>;

/**
 * Subscription to a delta stream
 */
export interface Subscription {
  /** Unsubscribe from the stream */
  unsubscribe(): void;

  /** Pause receiving deltas */
  pause(): void;

  /** Resume receiving deltas */
  resume(): void;

  /** Get current position in stream */
  getPosition(): string;
}

/**
 * Stream metadata
 */
export interface StreamInfo {
  /** Total number of deltas published */
  totalDeltas: number;

  /** Number of active subscriptions */
  activeSubscriptions: number;

  /** Timestamp of latest delta */
  latestTimestamp?: number;
}

// ============================================================================
// Instance Types
// ============================================================================

/**
 * Minimal instance interface - all instances must implement this
 */
export interface RhizomeInstance {
  /** Unique identifier for this instance */
  readonly systemId: string;

  /** Query deltas matching a filter */
  queryDeltas(filter: DeltaFilter): Delta[] | AsyncIterable<Delta> | Promise<Delta[]>;

  /** Apply a HyperSchema to construct a HyperView */
  applyHyperSchema(objectId: string, schema: HyperSchema): HyperView | Promise<HyperView>;
}

/**
 * Delta authoring capability
 */
export interface DeltaAuthor extends RhizomeInstance {
  /** Create a new delta */
  createDelta(author: string, pointers: Pointer[]): Delta;

  /** Create a negation delta */
  negateDelta(author: string, targetDeltaId: string, reason?: string): Delta;
}

/**
 * Delta persistence capability
 */
export interface DeltaStore extends RhizomeInstance {
  /** Persist a delta */
  persistDelta(delta: Delta): Promise<void>;

  /** Batch persist deltas */
  persistDeltas(deltas: Delta[]): Promise<void>;

  /** Get deltas by IDs */
  getDeltas(ids: string[]): Promise<Delta[]>;

  /** Scan deltas (for initial load, backfill, etc.) */
  scanDeltas(filter?: DeltaFilter, cursor?: string): AsyncIterable<Delta>;
}

/**
 * Stream consumption capability
 */
export interface StreamConsumer extends RhizomeInstance {
  /** Subscribe to delta stream */
  subscribe(filter: DeltaFilter, handler: DeltaHandler): Subscription;
}

/**
 * Stream production capability
 */
export interface StreamProducer extends RhizomeInstance {
  /** Publish a delta to subscribers */
  publishDelta(delta: Delta): Promise<void>;

  /** Get stream metadata */
  getStreamInfo(): StreamInfo | Promise<StreamInfo>;
}

/**
 * Index maintenance capability
 */
export interface IndexMaintainer extends RhizomeInstance {
  /** Materialize a HyperView for fast access */
  materializeHyperView(objectId: string, schema: HyperSchema): MaterializedHyperView | Promise<MaterializedHyperView>;

  /** Update a materialized HyperView with a new delta */
  updateHyperView(view: MaterializedHyperView, delta: Delta): void;

  /** Get a materialized HyperView (optionally filtered by schemaId) */
  getHyperView(objectId: string, schemaId?: string): MaterializedHyperView | null;

  /** Invalidate and rebuild a HyperView */
  rebuildHyperView(objectId: string, schemaId?: string): MaterializedHyperView;
}

/**
 * Configuration for RhizomeDB instance
 */
export interface RhizomeConfig {
  /** Instance identity (auto-generated if not provided) */
  systemId?: string;

  /** Storage backend type */
  storage: 'memory' | 'leveldb' | 'custom';

  /** Storage-specific configuration */
  storageConfig?: any;

  /** Maximum materialized HyperViews to cache */
  cacheSize?: number;

  /** Enable indexing */
  enableIndexing?: boolean;

  /** Validate schemas on registration to prevent cycles (default: false) */
  validateSchemas?: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of cache hits */
  hits: number;

  /** Number of cache misses */
  misses: number;

  /** Number of cache evictions */
  evictions: number;

  /** Cache hit rate (0-1) */
  hitRate: number;
}

/**
 * Instance statistics
 */
export interface InstanceStats {
  /** System ID of this instance */
  systemId?: string;

  /** Total number of deltas */
  totalDeltas: number;

  /** Number of materialized HyperViews */
  materializedHyperViews?: number;

  /** Number of cached views */
  cachedViews?: number;

  /** Number of active subscriptions */
  activeSubscriptions: number;

  /** Uptime in milliseconds */
  uptime: number;

  /** Storage backend type */
  storageType?: string;

  /** Cache performance statistics */
  cacheStats?: CacheStats;
}

// ============================================================================
// Primitive Type Schemas
// ============================================================================

/**
 * Helper to check if a schema is a PrimitiveHyperSchema
 */
export function isPrimitiveHyperSchema(schema: any): schema is PrimitiveHyperSchema {
  return schema && typeof schema === 'object' && 'type' in schema && 'validate' in schema && 'graphQLType' in schema;
}

// GraphQL type imports (note: actual GraphQL types injected at runtime to avoid circular deps)
let GraphQLString: any;
let GraphQLInt: any;
let GraphQLBoolean: any;

// Initialize GraphQL types from the graphql package
try {
  const graphql = require('graphql');
  GraphQLString = graphql.GraphQLString;
  GraphQLInt = graphql.GraphQLInt;
  GraphQLBoolean = graphql.GraphQLBoolean;
} catch (e) {
  // GraphQL not available - schemas will have undefined graphQLType
  console.warn('GraphQL package not available - PrimitiveSchemas will not have graphQLType');
}

/**
 * String primitive schema with nested EmailAddress variant
 */
interface StringPrimitiveSchema extends PrimitiveHyperSchema {
  EmailAddress: PrimitiveHyperSchema;
}

/**
 * Integer primitive schema with nested Year variant
 */
interface IntegerPrimitiveSchema extends PrimitiveHyperSchema {
  Year: PrimitiveHyperSchema;
}

/**
 * Primitive type schemas for use in TransformationRules
 *
 * Usage:
 *   - PrimitiveSchemas.String - any string
 *   - PrimitiveSchemas.String.EmailAddress - validated email string
 *   - PrimitiveSchemas.Integer - any integer number
 *   - PrimitiveSchemas.Integer.Year - validated year (1800-2100)
 *   - PrimitiveSchemas.Boolean - any boolean
 */
export const PrimitiveSchemas: {
  String: StringPrimitiveSchema;
  Integer: IntegerPrimitiveSchema;
  Boolean: PrimitiveHyperSchema;
} = {
  String: {
    type: 'string',
    graphQLType: GraphQLString,
    validate: (v: any) => typeof v === 'string',

    EmailAddress: {
      type: 'string.email',
      graphQLType: GraphQLString,
      validate: (v: any) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
    }
  } as StringPrimitiveSchema,

  Integer: {
    type: 'integer',
    graphQLType: GraphQLInt,
    validate: (v: any) => typeof v === 'number' && Number.isInteger(v),

    Year: {
      type: 'integer.year',
      graphQLType: GraphQLInt,
      validate: (v: any) => typeof v === 'number' && Number.isInteger(v) && v >= 1800 && v <= 2100
    }
  } as IntegerPrimitiveSchema,

  Boolean: {
    type: 'boolean',
    graphQLType: GraphQLBoolean,
    validate: (v: any) => typeof v === 'boolean'
  }
};
