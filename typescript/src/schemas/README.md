# Schemas Module

HyperSchema functionality including construction, validation, and versioning.

## Files

### `hyperview.ts`
Core HyperView construction and schema registry.

**Exports:**
- `constructHyperView(objectId, schema, deltas, registry?, asOfTimestamp?)` - Constructs a HyperView from deltas
- `SchemaRegistry` - Registry for managing HyperSchemas

**Key Concepts:**
- **Selection**: Determines which deltas are relevant to an object
- **Transformation**: Expands pointers into nested HyperViews or validates primitives
- **Context**: Each delta can appear in multiple properties based on Reference context

**Usage:**
```typescript
// Define a schema
const userSchema: HyperSchema = {
  id: 'user-schema',
  name: 'User Schema',
  select: (objectId, delta) => {
    return delta.pointers.some(p =>
      typeof p.target === 'object' &&
      'id' in p.target &&
      p.target.id === objectId
    );
  },
  transform: {
    friend: {
      schema: 'user-schema',  // Recursive reference
      when: (pointer) => pointer.localContext === 'friend'
    }
  }
};

// Register schema
const registry = new SchemaRegistry();
registry.register(userSchema);

// Construct HyperView
const hyperView = constructHyperView('user-1', userSchema, allDeltas, registry);

// Result structure:
{
  id: 'user-1',
  friends: [delta1, delta2, ...],  // Deltas with Reference context='friends'
  default: [delta3, ...],          // Other relevant deltas
}
```

**Features:**
- Recursive schema expansion (with cycle detection opt-in)
- Primitive validation via PrimitiveHyperSchemas
- Time-travel support (asOfTimestamp parameter)
- Property grouping by Reference context

**Tests:** Tested via `materialized-view.test.ts` and `schemas-as-deltas.test.ts`

### `schema-validator.ts`
Schema cycle detection and validation.

**Exports:**
- `detectCycle(schema, registry)` - Returns cycle path or null
- `validateSchemaDAG(schema, registry)` - Throws if cycle detected
- `validateSchema(schema, registry)` - Alias for validateSchemaDAG
- `wouldCreateCycle(newSchema, registry)` - Check before registering
- `findDependents(schemaId, registry)` - Find schemas that reference this one
- `calculateSchemaDepth(schemaId, registry)` - Max depth in dependency tree
- `topologicalSort(schemas)` - Sort schemas by dependencies

**Problem:** Circular schema references cause stack overflow during HyperView construction.

**Solution:** Depth-first search to detect cycles before they cause problems.

**Usage:**
```typescript
const registry = new SchemaRegistry({ validateOnRegister: true });

// This will throw if schema has circular references
registry.register(schemaWithCycle);  // Error: Circular schema reference detected

// Or validate manually
try {
  validateSchemaDAG(schema, registry);
} catch (error) {
  console.error('Cycle detected:', error.message);
}

// Check before adding
if (wouldCreateCycle(newSchema, registry)) {
  console.warn('Cannot add schema - would create cycle');
}
```

**Features:**
- Cycle detection via DFS
- Detailed cycle path reporting
- Opt-in validation (default: off for backward compatibility)
- Dependency analysis utilities
- Topological sort for schema registration order

**Tests:** `schema-validator.test.ts` - 22 tests

### `schema-versioning.ts`
Schema version tracking and drift detection.

**Exports:**
- `calculateSchemaHash(schema)` - SHA-256 content hash
- `hasSchemaChanged(oldSchema, newSchema)` - Detect changes
- `addSchemaHash(schema)` - Attach content hash
- `VersionedHyperSchema` - Extended HyperSchema with version fields
- `SchemaVersionRegistry` - Track version history
- `SchemaVersionInfo` - Version metadata

**Problem:** Schemas evolve over time. Materialized views cached with old schema versions become stale and produce incorrect results.

**Solution:** Track schema version with each materialized view. Detect when schema has changed and rebuild is needed.

**Usage:**
```typescript
// Explicit versioning
const schema: VersionedHyperSchema = {
  id: 'user-schema',
  name: 'User Schema',
  version: 2,  // Explicit version number
  select: /* ... */,
  transform: /* ... */
};

// Content-based hashing (automatic)
const hash = calculateSchemaHash(schema);
console.log(`Schema hash: ${hash}`); // SHA-256 hash

// Check if schema changed
if (hasSchemaChanged(oldSchema, newSchema)) {
  console.log('Schema has changed - views need rebuilding');
}

// Track version history
const versionRegistry = new SchemaVersionRegistry();
versionRegistry.register(schema);

const latest = versionRegistry.getLatestVersion('user-schema');
if (versionRegistry.isOutdated('user-schema', oldHash)) {
  console.log('This version is outdated');
}

// In RhizomeDB instance
const view = db.materializeHyperView('user-1', schema);
console.log(view._schemaHash);     // Content hash
console.log(view._schemaVersion);  // Explicit version (if provided)

// Check if view is outdated
if (db.isViewOutdated(view)) {
  // Schema has changed - rebuild needed
  const fresh = db.getOrRebuildHyperView('user-1', schema);
}
```

**Versioning Strategies:**
1. **Content-based (automatic)**: SHA-256 hash of schema structure. Changes to selection function or transformation rules automatically detected.
2. **Explicit versioning**: Manual version numbers. Useful for semantic versioning.
3. **Hybrid**: Use both. Content hash ensures no silent breakage, version number provides semantic meaning.

**What Triggers Hash Change:**
- Change to selection function
- Change to transformation rules (add/remove/modify)
- Change to nested schema references
- Change to conditional transformation (`when` functions)

**Tests:** `schema-versioning.test.ts` - 17 tests

## Schema Lifecycle

```
1. Define Schema
   ↓
2. Register (optional: validate for cycles)
   ↓
3. Calculate Content Hash (automatic)
   ↓
4. Apply to Object → HyperView
   ↓
5. Cache with Metadata
   {
     _schemaId: 'user-schema',
     _schemaHash: 'abc123...',
     _schemaVersion: 2,
     _lastUpdated: timestamp
   }
   ↓
6. Schema Changes?
   ↓
7. Detect via Hash/Version
   ↓
8. Rebuild if Outdated
```

## Integration with MaterializedHyperView

```typescript
interface MaterializedHyperView {
  id: string;
  _schemaId: string;           // Which schema was used
  _schemaHash: string;          // Content hash of that schema
  _schemaVersion?: number;      // Explicit version (if provided)
  _lastUpdated: number;         // When view was materialized
  _deltaCount: number;          // How many deltas in view
  [property: string]: any;      // Actual delta properties
}
```

This allows:
- Tracking exact schema version used for each view
- Detecting when schema drifts and views are stale
- Automatic rebuilding of outdated views
- Schema evolution without breaking old views

## Best Practices

**Schema Design:**
1. Use meaningful schema IDs (e.g., 'user-schema-v2')
2. Document selection and transformation logic
3. Test recursive schemas carefully
4. Enable cycle validation in development

**Versioning:**
1. Use explicit versions for public APIs
2. Rely on content hashing for internal changes
3. Track version history for debugging
4. Rebuild views proactively when schema changes

**Performance:**
1. Keep selection functions fast (they run for every delta)
2. Minimize transformation depth (each level is expensive)
3. Use specific Reference contexts to reduce property arrays
4. Cache materialized views aggressively

## Testing

- `materialized-view.test.ts` - View materialization and caching (7 tests)
- `schemas-as-deltas.test.ts` - Schema representation as deltas (3 tests)
- `schema-validator.test.ts` - Cycle detection and validation (22 tests)
- `schema-versioning.test.ts` - Version tracking and drift detection (17 tests)

Total: 49 tests
