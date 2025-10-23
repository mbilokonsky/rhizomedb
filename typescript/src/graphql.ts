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

    // Discover primitive fields by sampling actual data
    // Query for deltas that might represent this entity type to find what properties exist
    const sampleDeltas = db.queryDeltas({
      predicate: (delta) => {
        // Look for deltas that might be properties of entities matching this schema
        // We're looking for deltas with primitive values (not DomainNodeReferences)
        return delta.pointers.some(p =>
          !isDomainNodeReference(p.target) &&
          p.localContext &&
          p.localContext !== 'id'
        );
      }
    });

    // Track discovered fields and infer their types from actual values
    const discoveredFields = new Map<string, any>(); // fieldName -> sample value

    for (const delta of sampleDeltas.slice(0, 100)) { // Sample first 100 to avoid scanning everything
      for (const pointer of delta.pointers) {
        if (!isDomainNodeReference(pointer.target) &&
            pointer.localContext &&
            pointer.localContext !== 'id' &&
            !fieldMap[pointer.localContext]) {
          // Track this field and a sample value to infer type
          if (!discoveredFields.has(pointer.localContext)) {
            discoveredFields.set(pointer.localContext, pointer.target);
          }
        }
      }
    }

    // Create GraphQL fields for all discovered primitive fields
    for (const [fieldName, sampleValue] of discoveredFields) {
      if (!fieldMap[fieldName]) {
        // Infer GraphQL type from the sample value
        const graphQLType = typeof sampleValue === 'number' ? GraphQLInt :
                           typeof sampleValue === 'boolean' ? GraphQLBoolean :
                           typeof sampleValue === 'string' ? GraphQLString :
                           GraphQLString; // Default to string for unknown types

        fieldMap[fieldName] = {
          type: graphQLType,
          resolve: (source) => {
            const property = source[fieldName];
            if (!property || !Array.isArray(property)) return null;

            const deltas = property as Delta[];
            if (deltas.length === 0) return null;

            // Extract value from pointer
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

    // If no fields were discovered (empty database), add common fallback fields
    // so that the schema is valid even before data exists
    if (discoveredFields.size === 0) {
      const commonFields = ['name', 'title', 'content', 'text'];
      for (const fieldName of commonFields) {
        if (!fieldMap[fieldName]) {
          fieldMap[fieldName] = {
            type: GraphQLString,
            resolve: (source) => {
              const property = source[fieldName];
              if (!property || !Array.isArray(property)) return null;

              const deltas = property as Delta[];
              if (deltas.length === 0) return null;

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
 * Create an InputObjectType for a HyperSchema
 * Discovers fields by sampling actual data in the database
 */
function createInputType(
  hyperSchema: HyperSchema,
  allSchemas: Map<string, HyperSchema>,
  db: RhizomeDB
): GraphQLInputObjectType {
  const inputFields: GraphQLInputFieldConfigMap = {};

  // Discover fields by sampling actual data
  const sampleDeltas = db.queryDeltas({
    predicate: (delta) => {
      return delta.pointers.some(p =>
        !isDomainNodeReference(p.target) &&
        p.localContext &&
        p.localContext !== 'id'
      );
    }
  });

  // Track discovered fields and infer their types
  const discoveredFields = new Map<string, any>();

  for (const delta of sampleDeltas.slice(0, 100)) {
    for (const pointer of delta.pointers) {
      if (!isDomainNodeReference(pointer.target) &&
          pointer.localContext &&
          pointer.localContext !== 'id') {
        if (!discoveredFields.has(pointer.localContext)) {
          discoveredFields.set(pointer.localContext, pointer.target);
        }
      }
    }
  }

  // Create input fields for all discovered primitive fields
  for (const [fieldName, sampleValue] of discoveredFields) {
    // Infer GraphQL input type from the sample value
    const graphQLType = typeof sampleValue === 'number' ? GraphQLInt :
                       typeof sampleValue === 'boolean' ? GraphQLBoolean :
                       GraphQLString; // Default to string

    inputFields[fieldName] = { type: graphQLType };
  }

  // GraphQL requires at least one field in InputObjectType
  // If we didn't discover any fields (empty database), add common fallback fields
  if (Object.keys(inputFields).length === 0) {
    inputFields.name = { type: GraphQLString };
    inputFields.title = { type: GraphQLString };
    inputFields.content = { type: GraphQLString };
  }

  // Note: Relationships are not included in input types (they're created via separate deltas)
  // This is intentional - nested object creation should be explicit

  return new GraphQLInputObjectType({
    name: `${hyperSchema.name}Input`,
    fields: inputFields
  });
}

/**
 * Find and negate existing deltas for a property on an object
 */
async function negateExistingProperty(
  db: RhizomeDB,
  author: string,
  objectId: string,
  propertyName: string
): Promise<void> {
  // Query for existing deltas with this property
  const existingDeltas = db.queryDeltas({
    targetIds: [objectId],
    predicate: (delta) => delta.pointers.some(
      p => p.localContext === propertyName && p.targetContext === propertyName
    )
  });

  // Negate each existing delta
  for (const delta of existingDeltas) {
    const negation = db.negateDelta(
      author,
      delta.id,
      `Overwriting ${propertyName}`
    );
    await db.persistDelta(negation);
  }
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

    // Create input type for this schema
    const inputType = createInputType(hyperSchema, schemas, db);

    // Create mutation with new API
    fields[`create${hyperSchema.name}`] = {
      type: graphqlType,
      args: {
        id: { type: GraphQLString }, // Optional, will generate if not provided
        author: { type: new GraphQLNonNull(GraphQLString) },
        input: { type: new GraphQLNonNull(inputType) } // Proper input type!
      },
      resolve: async (_source, { id, author, input }) => {
        const objectId = id || db.createDelta(author, []).id; // Use delta ID as object ID

        // Create deltas for each property
        for (const [key, value] of Object.entries(input)) {
          if (value === null || value === undefined) continue;

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

    // Add update mutation with overwrite semantics
    fields[`update${hyperSchema.name}`] = {
      type: graphqlType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        author: { type: new GraphQLNonNull(GraphQLString) },
        input: { type: new GraphQLNonNull(inputType) }
      },
      resolve: async (_source, { id, author, input }) => {
        // For each property being updated, negate existing values first
        for (const [key, value] of Object.entries(input)) {
          if (value === null || value === undefined) continue;

          // Negate existing property deltas
          await negateExistingProperty(db, author, id, key);

          // Create new delta with new value
          const pointers: Pointer[] = [
            {
              localContext: key.replace(/^_/, ''),
              target: { id },
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

        // Return the updated object
        return resolveObject(id, hyperSchema, db);
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
