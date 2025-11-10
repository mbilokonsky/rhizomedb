# Delta-Defined Schemas & GraphQL Integration

This document describes how to define HyperSchemas as deltas (data) rather than code, enabling dynamic schema evolution, versioning, and GraphQL schema generation.

## Overview

RhizomeDB supports representing **schemas as data** using the same delta mechanism used for regular data. This enables:

- **Dynamic Schema Evolution**: Schemas can be modified at runtime by creating new deltas
- **Provenance Tracking**: Track who created/modified each schema and when
- **Versioning**: Automatic version tracking with content hashing
- **Time-Travel**: Query historical schema definitions
- **GraphQL Auto-Generation**: Generate GraphQL schemas directly from delta-defined HyperSchemas
- **MCP Integration**: Manage schemas via MCP tools for AI agent interaction

## Architecture

```
┌─────────────────────────────────────────┐
│         Deltas (Storage Layer)          │
│  - Regular data deltas                  │
│  - Schema-defining deltas (meta-level) │
└─────────────┬───────────────────────────┘
              │
              ├──→ Apply Meta-Schema
              │    ↓
              │    HyperView of Schema
              │    ↓
              │    Resolve to Executable HyperSchema
              │    ↓
              │    Snapshot & Version
              │
              └──→ Generate GraphQL Schema
                   ↓
                   Query/Mutate via GraphQL
```

### Key Components

1. **Meta-Schema**: Bootstrap schema (hardcoded) that queries schema-defining deltas
2. **Schema Deltas**: Regular deltas that define schemas using specific pointer roles
3. **Schema Snapshots**: Cached executable HyperSchemas with version tracking
4. **GraphQL Generator**: Creates GraphQL schemas from delta-defined HyperSchemas

## Delta Schema Format

Schemas are represented using deltas with specific pointer roles:

### Schema Metadata

```typescript
// Declare this is a HyperSchema
{
  role: 'schema',
  target: { id: 'my_schema', context: 'name' }
}
{
  role: 'name',
  target: 'MySchema'
}
```

### Selection Pattern

```typescript
// Use built-in selector
{
  role: 'schema',
  target: { id: 'my_schema', context: 'select' }
}
{
  role: 'pattern',
  target: { id: 'select_by_target_context' }
}
```

Available built-in patterns:
- `select_by_target_context`: Organizes deltas by Reference context field

### Transformation Rules

```typescript
// Terminal schema (no transformations)
{
  role: 'schema',
  target: { id: 'my_schema', context: 'transform' }
}
{
  role: 'rules',
  target: '{}' // JSON-encoded empty object
}

// Schema with transformation
{
  role: 'schema',
  target: { id: 'blog_post_schema', context: 'transform' }
}
{
  role: 'on-context',
  target: 'author'
}
{
  role: 'apply-schema',
  target: { id: 'person_schema' }
}
```

## Usage Examples

### 1. Creating a Terminal Schema

```typescript
import { RhizomeDB } from 'rhizomedb';
import { createTerminalSchemaAsDeltas } from 'rhizomedb/schemas/schemas-as-deltas';

const db = new RhizomeDB({ storage: 'memory' });

// Create a simple Person schema as deltas
await createTerminalSchemaAsDeltas(db, 'person_schema', 'Person');

// Load the schema from deltas
const personSchema = db.loadSchemaFromDeltas('person_schema');

console.log(personSchema.name); // 'Person'
```

### 2. Adding Transformation Rules

```typescript
import { addTransformationRule } from 'rhizomedb/schemas/schemas-as-deltas';

// Create dependent schemas
await createTerminalSchemaAsDeltas(db, 'person_schema', 'Person');
await createTerminalSchemaAsDeltas(db, 'address_schema', 'Address');
await createTerminalSchemaAsDeltas(db, 'company_schema', 'Company');

// Add transformations to Company schema
await addTransformationRule(db, 'company_schema', 'ceo', 'person_schema');
await addTransformationRule(db, 'company_schema', 'address', 'address_schema');

// Load the evolved schema
const companySchema = db.loadSchemaFromDeltas('company_schema');
// Now includes transformations for 'ceo' and 'address' fields
```

### 3. GraphQL Integration

```typescript
import { createGraphQLSchemaFromDeltas } from 'rhizomedb/integrations/graphql';
import { graphql } from 'graphql';

// Create schemas as deltas
await createTerminalSchemaAsDeltas(db, 'book_schema', 'Book');
await createTerminalSchemaAsDeltas(db, 'author_schema', 'Author');
await addTransformationRule(db, 'book_schema', 'author', 'author_schema');

// Generate GraphQL schema from deltas
const graphqlSchema = createGraphQLSchemaFromDeltas({
  db,
  enableMutations: true,
  enableSubscriptions: false
});

// Query via GraphQL
const query = `
  query {
    Book(id: "book_1") {
      id
      title
      author {
        id
        name
      }
    }
  }
`;

const result = await graphql({ schema: graphqlSchema, source: query });
console.log(result.data);
```

### 4. Dynamic Schema Updates

```typescript
import { createDynamicGraphQLSchema } from 'rhizomedb/integrations/graphql';

// Create initial schema
await createTerminalSchemaAsDeltas(db, 'product_schema', 'Product');

// Create dynamic schema manager
const dynamicSchema = createDynamicGraphQLSchema({
  db,
  enableMutations: true
});

// Use the schema
let schema = dynamicSchema.getSchema();

// ... later, evolve the schema ...
await createTerminalSchemaAsDeltas(db, 'category_schema', 'Category');
await addTransformationRule(db, 'product_schema', 'category', 'category_schema');

// Check for changes
if (dynamicSchema.checkForChanges()) {
  const { changed, schema: newSchema } = dynamicSchema.regenerate();
  console.log('Schema updated!', changed);
}
```

## MCP Tools

The MCP server provides tools for managing delta-defined schemas:

### `load_schema`

Load a schema from deltas and register it.

```json
{
  "name": "load_schema",
  "arguments": {
    "schemaId": "person_schema"
  }
}
```

Response:
```json
{
  "schema": {
    "id": "person_schema",
    "name": "Person",
    "version": "a3f8b2c...",
    "timestamp": 1699564800000
  },
  "message": "Schema 'Person' loaded successfully"
}
```

### `load_all_schemas`

Load all schemas from deltas.

```json
{
  "name": "load_all_schemas",
  "arguments": {}
}
```

### `check_schema_changed`

Check if a schema has changed since last snapshot.

```json
{
  "name": "check_schema_changed",
  "arguments": {
    "schemaId": "person_schema"
  }
}
```

Response:
```json
{
  "changed": true,
  "currentVersion": "b7e9c1d...",
  "snapshotVersion": "a3f8b2c..."
}
```

### `reload_schema`

Reload a schema if it has changed.

```json
{
  "name": "reload_schema",
  "arguments": {
    "schemaId": "person_schema"
  }
}
```

## Schema Versioning

Schemas are automatically versioned using content hashing:

```typescript
// Get schema snapshot
const snapshot = db.getSchemaSnapshot('person_schema');

console.log(snapshot.version);    // SHA-256 hash of schema content
console.log(snapshot.timestamp);  // When snapshot was created

// Check if schema has changed
const changed = db.hasSchemaChanged('person_schema');

if (changed) {
  // Reload schema
  const updatedSchema = db.reloadSchemaIfChanged('person_schema');
}
```

### Version Hash Calculation

The version hash is calculated from:
- Schema ID
- Schema name
- Selection function (stringified)
- Transformation rules (sorted by key for determinism)

Any change to these components results in a new version hash.

## Advanced Patterns

### Custom Selection Functions

You can register custom selection patterns:

```typescript
import { registerSelectionPattern } from 'rhizomedb/schemas/schemas-as-deltas';

// Define custom selector
const mySelector = (objectId: string, delta: Delta) => {
  // Custom logic
  return ['custom_property'];
};

// Register it
registerSelectionPattern('my_custom_selector', mySelector);

// Use in schema delta
await db.persistDelta(
  db.createDelta('system', [
    { role: 'schema', target: { id: 'my_schema', context: 'select' } },
    { role: 'pattern', target: { id: 'my_custom_selector' } }
  ])
);
```

### Schema Evolution with Negation

Schemas can be evolved using delta negation:

```typescript
// Create a transformation rule
const oldRule = db.createDelta('system', [
  { role: 'schema', target: { id: 'my_schema', context: 'transform' } },
  { role: 'on-context', target: 'old_field' },
  { role: 'apply-schema', target: { id: 'old_schema' } }
]);
await db.persistDelta(oldRule);

// Later, remove it
const negation = db.negateDelta('system', oldRule.id, 'Field deprecated');
await db.persistDelta(negation);

// Schema will no longer include the old transformation
```

### Time-Travel Schemas

Query historical schema definitions:

```typescript
import { timeTravelQuery } from 'rhizomedb/queries/time-travel';

// Get schema as it was at a specific time
const pastTimestamp = Date.now() - 86400000; // 24 hours ago

const pastDeltas = timeTravelQuery(db, {
  timestamp: pastTimestamp,
  targetIds: ['my_schema']
});

// Build schema from historical deltas
// (Would need custom implementation to apply meta-schema to past deltas)
```

## Best Practices

1. **Schema IDs**: Use descriptive, stable IDs (e.g., `user_schema`, not `schema_1`)

2. **Naming**: Use PascalCase for schema names to match GraphQL conventions

3. **Versioning**: Let the system handle versioning automatically via content hashing

4. **Dependencies**: Define terminal (leaf) schemas before schemas that reference them

5. **Evolution**: Add transformation rules incrementally; use negation sparingly

6. **GraphQL Regeneration**: In production, regenerate GraphQL schema on schema changes

7. **Snapshots**: Monitor snapshot timestamps to detect stale schemas

## Limitations

- **Meta-Schema Bootstrap**: The meta-schema itself is hardcoded (not stored as deltas)
- **Function Serialization**: Selection functions must be registered; can't be defined inline in deltas
- **Schema Discovery**: No automatic schema inference from data patterns yet
- **Circular References**: Schemas must form a DAG (no circular dependencies)

## Testing

Run the comprehensive test suite:

```bash
npm test src/integrations/graphql-with-delta-schemas.test.ts
```

Tests cover:
- Basic schema creation and loading
- Nested schemas with transformations
- Dynamic schema updates
- Version tracking
- Multiple schema management
- GraphQL integration

## See Also

- [HyperSchema Documentation](./HYPERSCHEMAS.md)
- [GraphQL Integration](./GRAPHQL.md)
- [MCP Server Guide](../mcp-server/README.md)
- [Schema Versioning API](../src/schemas/schema-versioning.ts)
