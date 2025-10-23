/**
 * GraphQL integration for RhizomeDB
 *
 * Converts HyperSchemas to GraphQL schemas and provides resolvers
 */

import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLInputFieldConfigMap,
} from 'graphql';
import { RhizomeDB } from './instance';
import { HyperSchema, HyperView, Delta, Pointer, ViewSchema, ResolutionStrategy } from './types';
import { isDomainNodeReference } from './validation';

/**
 * Configuration for GraphQL schema generation
 */
export interface GraphQLConfig {
  /** The RhizomeDB instance */
  db: RhizomeDB;

  /** HyperSchemas to expose via GraphQL */
  schemas: Map<string, HyperSchema>;

  /** View schemas for conflict resolution */
  viewSchemas?: Map<string, ViewSchema>;

  /** Custom resolvers */
  customResolvers?: GraphQLFieldConfigMap<any, any>;

  /** Enable mutations */
  enableMutations?: boolean;

  /** Enable subscriptions */
  enableSubscriptions?: boolean;
}

/**
 * Create a GraphQL schema from HyperSchemas
 */
export function createGraphQLSchema(config: GraphQLConfig): GraphQLSchema {
  const { db, schemas, viewSchemas = new Map(), customResolvers = {} } = config;

  // Build GraphQL types from HyperSchemas
  const typeCache = new Map<string, GraphQLObjectType>();

  for (const [schemaId, hyperSchema] of schemas) {
    const graphqlType = hyperSchemaToGraphQLType(
      hyperSchema,
      db,
      schemas,
      viewSchemas,
      typeCache
    );
    typeCache.set(schemaId, graphqlType);
  }

  // Build Query type
  const queryFields: GraphQLFieldConfigMap<any, any> = {
    ...customResolvers,
  };

  // Add a query for each schema
  for (const [schemaId, hyperSchema] of schemas) {
    const graphqlType = typeCache.get(schemaId)!;
    queryFields[hyperSchema.name] = {
      type: graphqlType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve: (_source, { id }) => {
        return resolveObject(id, hyperSchema, db, viewSchemas.get(schemaId));
      }
    };

    // Add plural query for lists
    queryFields[`${hyperSchema.name}s`] = {
      type: new GraphQLList(graphqlType),
      args: {
        ids: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) }
      },
      resolve: (_source, { ids }) => {
        return ids.map((id: string) =>
          resolveObject(id, hyperSchema, db, viewSchemas.get(schemaId))
        );
      }
    };
  }

  const queryType = new GraphQLObjectType({
    name: 'Query',
    fields: queryFields
  });

  // Build Mutation type (if enabled)
  let mutationType: GraphQLObjectType | undefined;
  if (config.enableMutations) {
    mutationType = createMutationType(db, schemas, typeCache);
  }

  // Build Subscription type (if enabled)
  let subscriptionType: GraphQLObjectType | undefined;
  if (config.enableSubscriptions) {
    subscriptionType = createSubscriptionType(db, schemas, typeCache);
  }

  return new GraphQLSchema({
    query: queryType,
    mutation: mutationType,
    subscription: subscriptionType
  });
}

/**
 * Convert a HyperSchema to a GraphQL ObjectType
 */
function hyperSchemaToGraphQLType(
  hyperSchema: HyperSchema,
  db: RhizomeDB,
  allSchemas: Map<string, HyperSchema>,
  viewSchemas: Map<string, ViewSchema>,
  typeCache: Map<string, GraphQLObjectType>
): GraphQLObjectType {
  // Check cache first
  if (typeCache.has(hyperSchema.id)) {
    return typeCache.get(hyperSchema.id)!;
  }

  // Create placeholder to handle circular references
  const fields: () => GraphQLFieldConfigMap<any, any> = () => {
    const fieldMap: GraphQLFieldConfigMap<any, any> = {
      id: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: (source) => source.id
      }
    };

    // Infer fields from transformation rules
    for (const [localContext, rule] of Object.entries(hyperSchema.transform)) {
      const referencedSchemaId = typeof rule.schema === 'string' ? rule.schema : rule.schema.id;
      const referencedSchema = allSchemas.get(referencedSchemaId);

      if (referencedSchema) {
        const nestedType = hyperSchemaToGraphQLType(
          referencedSchema,
          db,
          allSchemas,
          viewSchemas,
          typeCache
        );

        fieldMap[localContext] = {
          type: nestedType,
          resolve: (source) => {
            // Source should have this property from HyperView
            const property = source[localContext];
            if (!property || !Array.isArray(property)) return null;

            const deltas = property as Delta[];
            if (deltas.length === 0) return null;

            // Extract nested object from first delta's pointer (must be DomainNodeReference)
            const delta = deltas[0];
            const pointer = delta.pointers.find(p =>
              p.localContext === localContext &&
              isDomainNodeReference(p.target)
            );
            if (!pointer) return null;

            return pointer.target;
          }
        };
      }
    }

    // Add fields for primitives (inferred from common patterns)
    // This is a simplification - in production you'd want explicit field definitions
    const commonPrimitiveFields = ['name', 'title', 'content', 'text', 'description'];
    for (const fieldName of commonPrimitiveFields) {
      if (!fieldMap[fieldName]) {
        fieldMap[fieldName] = {
          type: GraphQLString,
          resolve: (source) => {
            const property = source[fieldName];
            if (!property || !Array.isArray(property)) return null;

            const deltas = property as Delta[];
            if (deltas.length === 0) return null;

            // Extract primitive from pointer (skip DomainNodeReference targets)
            const delta = deltas[0];
            const pointer = delta.pointers.find(p =>
              p.localContext === fieldName &&
              !isDomainNodeReference(p.target)
            );
            return pointer?.target || null;
          }
        };
      }
    }

    return fieldMap;
  };

  const graphqlType = new GraphQLObjectType({
    name: hyperSchema.name,
    fields
  });

  typeCache.set(hyperSchema.id, graphqlType);
  return graphqlType;
}

/**
 * Resolve an object by ID using HyperSchema
 */
function resolveObject(
  id: string,
  hyperSchema: HyperSchema,
  db: RhizomeDB,
  viewSchema?: ViewSchema
): any {
  // Apply HyperSchema to get HyperView
  const hyperView = db.applyHyperSchema(id, hyperSchema);

  // If we have a ViewSchema, resolve to View
  if (viewSchema) {
    return resolveView(hyperView, viewSchema);
  }

  // Otherwise return HyperView (GraphQL resolvers will extract fields)
  return hyperView;
}

/**
 * Simple View resolution (from spec §6)
 */
function resolveView(hyperView: HyperView, schema: ViewSchema): any {
  const view: any = { id: hyperView.id };

  for (const [property, config] of Object.entries(schema.properties)) {
    const deltas = hyperView[config.source] as Delta[] | undefined;
    if (!deltas || deltas.length === 0) continue;

    const resolved = config.resolve(deltas);
    if (resolved) {
      view[property] = config.extract(resolved);
    }
  }

  return view;
}

/**
 * Create Mutation type
 */
function createMutationType(
  db: RhizomeDB,
  schemas: Map<string, HyperSchema>,
  typeCache: Map<string, GraphQLObjectType>
): GraphQLObjectType {
  const fields: GraphQLFieldConfigMap<any, any> = {
    createDelta: {
      type: GraphQLString, // Returns delta ID
      args: {
        author: { type: new GraphQLNonNull(GraphQLString) },
        pointers: { type: new GraphQLNonNull(GraphQLString) } // JSON string
      },
      resolve: async (_source, { author, pointers }) => {
        const parsedPointers = JSON.parse(pointers) as Pointer[];
        const delta = db.createDelta(author, parsedPointers);
        await db.persistDelta(delta);
        return delta.id;
      }
    },

    negateDelta: {
      type: GraphQLString,
      args: {
        author: { type: new GraphQLNonNull(GraphQLString) },
        targetDeltaId: { type: new GraphQLNonNull(GraphQLString) },
        reason: { type: GraphQLString }
      },
      resolve: async (_source, { author, targetDeltaId, reason }) => {
        const negation = db.negateDelta(author, targetDeltaId, reason);
        await db.persistDelta(negation);
        return negation.id;
      }
    }
  };

  // Add create mutation for each schema
  for (const [schemaId, hyperSchema] of schemas) {
    const graphqlType = typeCache.get(schemaId);
    if (!graphqlType) continue;

    fields[`create${hyperSchema.name}`] = {
      type: graphqlType,
      args: {
        id: { type: GraphQLString }, // Optional, will generate if not provided
        author: { type: new GraphQLNonNull(GraphQLString) },
        data: { type: new GraphQLNonNull(GraphQLString) } // JSON data
      },
      resolve: async (_source, { id, author, data }) => {
        const objectId = id || db.createDelta(author, []).id; // Use delta ID as object ID
        const parsedData = JSON.parse(data);

        // Create deltas for each property
        for (const [key, value] of Object.entries(parsedData)) {
          const pointers: Pointer[] = [
            {
              localContext: key.replace(/^_/, ''), // Remove leading underscore if any
              target: { id: objectId },
              targetContext: key
            },
            {
              localContext: key,
              target: value as any
            }
          ];

          const delta = db.createDelta(author, pointers);
          await db.persistDelta(delta);
        }

        // Return the created object
        return resolveObject(objectId, hyperSchema, db);
      }
    };
  }

  return new GraphQLObjectType({
    name: 'Mutation',
    fields
  });
}

/**
 * Create Subscription type
 */
function createSubscriptionType(
  db: RhizomeDB,
  schemas: Map<string, HyperSchema>,
  typeCache: Map<string, GraphQLObjectType>
): GraphQLObjectType {
  const DeltaType = new GraphQLObjectType({
    name: 'Delta',
    fields: {
      id: { type: new GraphQLNonNull(GraphQLString) },
      timestamp: { type: new GraphQLNonNull(GraphQLInt) },
      author: { type: new GraphQLNonNull(GraphQLString) },
      system: { type: new GraphQLNonNull(GraphQLString) },
      pointers: { type: new GraphQLNonNull(GraphQLString) } // JSON string
    }
  });

  return new GraphQLObjectType({
    name: 'Subscription',
    fields: {
      deltaCreated: {
        type: DeltaType,
        args: {
          filter: { type: GraphQLString } // JSON filter
        },
        subscribe: async function* (_source, { filter }) {
          const parsedFilter = filter ? JSON.parse(filter) : {};

          // Create an async generator that yields deltas
          const deltaQueue: Delta[] = [];
          let resolveNext: ((delta: Delta) => void) | null = null;

          const subscription = db.subscribe(parsedFilter, (delta) => {
            if (resolveNext) {
              resolveNext(delta);
              resolveNext = null;
            } else {
              deltaQueue.push(delta);
            }
          });

          try {
            while (true) {
              let delta: Delta;

              if (deltaQueue.length > 0) {
                delta = deltaQueue.shift()!;
              } else {
                delta = await new Promise<Delta>((resolve) => {
                  resolveNext = resolve;
                });
              }

              yield {
                deltaCreated: {
                  ...delta,
                  pointers: JSON.stringify(delta.pointers)
                }
              };
            }
          } finally {
            subscription.unsubscribe();
          }
        }
      }
    }
  });
}

/**
 * Helper to create a simple ViewSchema
 */
export function createSimpleViewSchema(fields: string[]): ViewSchema {
  const mostRecent: ResolutionStrategy = (deltas) => {
    if (deltas.length === 0) return null;
    return deltas.sort((a, b) => b.timestamp - a.timestamp)[0];
  };

  const properties: ViewSchema['properties'] = {};

  for (const field of fields) {
    properties[field] = {
      source: field,
      extract: (delta: Delta) => {
        const pointer = delta.pointers.find(p => p.localContext === field);
        return pointer?.target || null;
      },
      resolve: mostRecent
    };
  }

  return { properties };
}
