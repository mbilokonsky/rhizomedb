# Integrations Module

External API integrations for RhizomeDB.

## Files

### `graphql.ts`
GraphQL schema and resolvers for RhizomeDB.

**Exports:**
- `createRhizomeGraphQLSchema(db)` - Creates GraphQL schema bound to RhizomeDB instance
- Type definitions for Delta, Pointer, HyperView, etc.
- Queries: queryDeltas, getHyperView
- Mutations: createDelta, negateDelta

**Schema:**
```graphql
type Delta {
  id: ID!
  timestamp: Float!
  author: String!
  system: String!
  pointers: [Pointer!]!
}

type Pointer {
  role: String!
  target: PointerTarget!
}

union PointerTarget = Reference | HyperView | PrimitiveValue

type Reference {
  id: ID!
  context: String
}

type PrimitiveValue {
  value: String
}

type HyperView {
  id: String!
  properties: [HyperViewProperty!]!
}

type HyperViewProperty {
  name: String!
  deltas: [Delta!]!
}

type Query {
  queryDeltas(
    ids: [ID!]
    targetIds: [ID!]
    targetContexts: [String!]
    authors: [String!]
    systems: [String!]
    timestampStart: Float
    timestampEnd: Float
    includeNegated: Boolean
  ): [Delta!]!

  getHyperView(
    objectId: ID!
    schemaId: ID!
  ): HyperView
}

type Mutation {
  createDelta(
    author: String!
    pointers: [PointerInput!]!
  ): Delta!

  negateDelta(
    author: String!
    targetDeltaId: ID!
    reason: String
  ): Delta!
}

input PointerInput {
  role: String!
  target: PointerTargetInput!
}

input PointerTargetInput {
  id: ID
  context: String
  value: String
}
```

**Usage:**

```typescript
import { ApolloServer } from '@apollo/server';
import { createRhizomeGraphQLSchema } from './integrations/graphql';

// Create RhizomeDB instance
const db = new RhizomeDB({ storage: 'memory' });

// Create GraphQL schema
const schema = createRhizomeGraphQLSchema(db);

// Create Apollo Server
const server = new ApolloServer({ schema });

await server.start();
```

**Example Queries:**

```graphql
# Query recent deltas
query RecentDeltas {
  queryDeltas(
    authors: ["user-1", "user-2"]
    timestampStart: 1640000000000
  ) {
    id
    timestamp
    author
    pointers {
      role
      target {
        ... on DomainNodeReference {
          id
        }
        ... on PrimitiveValue {
          value
        }
      }
    }
  }
}

# Get HyperView for object
query UserView {
  getHyperView(
    objectId: "user-1"
    schemaId: "user-schema"
  ) {
    id
    properties {
      name
      deltas {
        id
        timestamp
        author
      }
    }
  }
}

# Create delta
mutation CreateDelta {
  createDelta(
    author: "user-1"
    pointers: [
      {
        role: "name"
        target: { value: "Alice" }
      }
      {
        role: "friend"
        target: { id: "user-2" }
        targetContext: "friends"
      }
    ]
  ) {
    id
    timestamp
  }
}

# Negate delta
mutation NegateDelta {
  negateDelta(
    author: "admin"
    targetDeltaId: "delta-123"
    reason: "Policy violation"
  ) {
    id
    pointers {
      role
      target {
        ... on DomainNodeReference {
          id
        }
      }
    }
  }
}
```

**Features:**
- Full GraphQL schema for RhizomeDB operations
- Query deltas with filtering
- Get HyperViews for objects
- Create and negate deltas via mutations
- Proper union types for PointerTarget (reference or primitive)
- Input validation

**Type Safety:**
TypeScript types for:
- Resolvers (Query, Mutation)
- Arguments (DeltaFilterInput, PointerInput)
- Return types (Delta, HyperView)

**Resolver Implementation:**
```typescript
// Query resolvers
Query: {
  queryDeltas: (_, args, { db }) => {
    const filter: DeltaFilter = {
      ids: args.ids,
      targetIds: args.targetIds,
      targetContexts: args.targetContexts,
      authors: args.authors,
      systems: args.systems,
      timestampRange: {
        start: args.timestampStart,
        end: args.timestampEnd
      },
      includeNegated: args.includeNegated
    };
    return db.queryDeltas(filter);
  },

  getHyperView: (_, args, { db }) => {
    const schema = db.schemaRegistry.get(args.schemaId);
    if (!schema) return null;
    return db.applyHyperSchema(args.objectId, schema);
  }
}

// Mutation resolvers
Mutation: {
  createDelta: (_, args, { db }) => {
    const pointers = args.pointers.map(convertInputToPointer);
    return db.createDelta(args.author, pointers);
  },

  negateDelta: (_, args, { db }) => {
    return db.negateDelta(args.author, args.targetDeltaId, args.reason);
  }
}
```

**Best Practices:**
1. Register schemas before querying HyperViews
2. Use DataLoader for batching (future enhancement)
3. Add authentication middleware
4. Rate limit mutations
5. Validate author IDs
6. Add pagination for large result sets

**Future Enhancements:**
- Subscriptions for real-time updates
- DataLoader integration for batching
- Pagination (first/after/last/before)
- Field-level resolvers for nested data
- GraphQL federation support
- Schema introspection extensions
- Custom scalars for timestamps

**Testing:**
`graphql.test.ts` - 4 tests:
- Schema creation
- Query deltas resolver
- Create delta mutation
- Negate delta mutation

## Integration Patterns

### Express + Apollo Server
```typescript
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

const app = express();
const db = new RhizomeDB({ storage: 'memory' });
const schema = createRhizomeGraphQLSchema(db);

const server = new ApolloServer({
  schema,
  context: ({ req }) => ({ db, user: req.user })
});

await server.start();
app.use('/graphql', expressMiddleware(server));
app.listen(4000);
```

### Next.js API Route
```typescript
// pages/api/graphql.ts
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';

const db = new RhizomeDB({ storage: 'memory' });
const schema = createRhizomeGraphQLSchema(db);

const server = new ApolloServer({ schema });
export default startServerAndCreateNextHandler(server);
```

### With Authentication
```typescript
const schema = createRhizomeGraphQLSchema(db);

const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    const token = req.headers.authorization;
    const user = verifyToken(token);
    return { db, user };
  }
});

// In resolvers:
Mutation: {
  createDelta: (_, args, { db, user }) => {
    if (!user) throw new Error('Unauthorized');
    return db.createDelta(user.id, args.pointers);
  }
}
```

## Dependencies

- `graphql` - GraphQL implementation
- `@apollo/server` (optional) - Apollo Server for hosting
- `@as-integrations/*` (optional) - Framework integrations

## Testing

Tests cover:
- Schema generation
- Query resolution
- Mutation execution
- Delta creation and negation
- Input validation

All GraphQL operations tested via actual GraphQL queries (not direct resolver calls) for end-to-end confidence.
