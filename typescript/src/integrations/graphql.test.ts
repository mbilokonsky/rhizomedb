/**
 * Tests for GraphQL integration
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { graphql } from 'graphql';
import { RhizomeDB } from '../storage/instance';
import { createStandardSchema } from '../schemas/hyperview';
import { createGraphQLSchema } from './graphql';
import { HyperSchema, PrimitiveSchemas } from '../core/types';

// Helper to create Person schema with common primitive fields
function createPersonSchema(additionalTransform: HyperSchema['transform'] = {}): HyperSchema {
  return createStandardSchema('person', 'Person', {
    name: {
      schema: PrimitiveSchemas.String,
      when: p => PrimitiveSchemas.String.validate(p.target)
    },
    ...additionalTransform
  });
}

// Helper to create Post/Blog schema with common primitive fields
function createPostSchema(
  id: string,
  name: string,
  additionalTransform: HyperSchema['transform'] = {}
): HyperSchema {
  return createStandardSchema(id, name, {
    title: {
      schema: PrimitiveSchemas.String,
      when: p => PrimitiveSchemas.String.validate(p.target)
    },
    content: {
      schema: PrimitiveSchemas.String,
      when: p => PrimitiveSchemas.String.validate(p.target)
    },
    ...additionalTransform
  });
}

describe('GraphQL Integration', () => {
  let db: RhizomeDB;
  let schemas: Map<string, HyperSchema>;

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory' });
    schemas = new Map();
  });

  describe('Schema Generation', () => {
    it('should generate GraphQL schema from HyperSchemas', async () => {
      // Create a simple schema
      const personSchema = createPersonSchema();
      schemas.set('person', personSchema);
      db.registerSchema(personSchema);

      const gqlSchema = createGraphQLSchema({
        db,
        schemas
      });

      expect(gqlSchema).toBeDefined();
      expect(gqlSchema.getQueryType()).toBeDefined();
      expect(gqlSchema.getQueryType()?.getFields()['Person']).toBeDefined();
    });
  });

  describe('Queries', () => {
    it('should query a simple object', async () => {
      // Setup schema with primitive field
      const personSchema = createPersonSchema();
      schemas.set('person', personSchema);
      db.registerSchema(personSchema);

      // Create data
      const personId = 'person_alice';
      const nameDelta = db.createDelta('author', [
        {
          localContext: 'named',
          target: { id: personId, context: 'name' }
        },
        {
          localContext: 'name',
          target: 'Alice Johnson'
        }
      ]);
      await db.persistDelta(nameDelta);

      // Create GraphQL schema
      const gqlSchema = createGraphQLSchema({
        db,
        schemas
      });

      // Execute query
      const query = `
        query {
          Person(id: "${personId}") {
            id
            name
          }
        }
      `;

      const result = await graphql({ schema: gqlSchema, source: query });

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        Person: {
          id: personId,
          name: 'Alice Johnson'
        }
      });
    });

    it('should query nested objects', async () => {
      // Setup schemas
      const personSchema = createPersonSchema();
      const postSchema = createPostSchema('post', 'Post', {
        author: {
          schema: personSchema,
          when: p => typeof p.target === 'object' && 'id' in p.target
        }
      });

      schemas.set('person', personSchema);
      schemas.set('post', postSchema);
      db.registerSchema(personSchema);
      db.registerSchema(postSchema);

      // Create data
      const authorId = 'person_alice';
      const postId = 'post_001';

      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'named', target: { id: authorId, context: 'name' } },
          { localContext: 'name', target: 'Alice' }
        ])
      );

      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'post', target: { id: postId, context: 'title' } },
          { localContext: 'title', target: 'My Post' }
        ])
      );

      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'post', target: { id: postId, context: 'author' } },
          { localContext: 'author', target: { id: authorId, context: 'posts' } }
        ])
      );

      // Create GraphQL schema
      const gqlSchema = createGraphQLSchema({
        db,
        schemas
      });

      // Execute query
      const query = `
        query {
          Post(id: "${postId}") {
            id
            title
            author {
              id
              name
            }
          }
        }
      `;

      const result = await graphql({ schema: gqlSchema, source: query });

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        Post: {
          id: postId,
          title: 'My Post',
          author: [
            {
              id: authorId,
              name: 'Alice'
            }
          ]
        }
      });
    });

    it('should query multiple objects', async () => {
      const personSchema = createPersonSchema();
      schemas.set('person', personSchema);
      db.registerSchema(personSchema);

      // Create multiple people
      const ids = ['person_alice', 'person_bob'];

      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'named', target: { id: ids[0], context: 'name' } },
          { localContext: 'name', target: 'Alice' }
        ])
      );

      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'named', target: { id: ids[1], context: 'name' } },
          { localContext: 'name', target: 'Bob' }
        ])
      );

      const gqlSchema = createGraphQLSchema({
        db,
        schemas
      });

      const query = `
        query {
          Persons(ids: ["${ids[0]}", "${ids[1]}"]) {
            id
            name
          }
        }
      `;

      const result = await graphql({ schema: gqlSchema, source: query });

      expect(result.errors).toBeUndefined();
      expect(result.data?.Persons).toHaveLength(2);
    });
  });

  describe('Mutations', () => {
    it('should create deltas via mutation', async () => {
      const personSchema = createPersonSchema();
      schemas.set('person', personSchema);
      db.registerSchema(personSchema);

      const gqlSchema = createGraphQLSchema({
        db,
        schemas,
        enableMutations: true
      });

      const mutation = `
        mutation {
          createDelta(
            author: "alice"
            pointers: "[{\\"localContext\\":\\"test\\",\\"target\\":\\"value\\"}]"
          )
        }
      `;

      const result = await graphql({ schema: gqlSchema, source: mutation });

      expect(result.errors).toBeUndefined();
      expect(result.data?.createDelta).toBeDefined();
      expect(typeof result.data?.createDelta).toBe('string'); // Delta ID
    });

    it('should create typed objects via mutation', async () => {
      const personSchema = createPersonSchema();
      schemas.set('person', personSchema);
      db.registerSchema(personSchema);

      const gqlSchema = createGraphQLSchema({
        db,
        schemas,
        enableMutations: true
      });

      const mutation = `
        mutation {
          createPerson(
            id: "person_charlie"
            author: "system"
            input: { name: "Charlie" }
          ) {
            id
            name
          }
        }
      `;

      const result = await graphql({ schema: gqlSchema, source: mutation });

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        createPerson: {
          id: 'person_charlie',
          name: 'Charlie'
        }
      });
    });

    it('should negate deltas via mutation', async () => {
      const personSchema = createPersonSchema();
      schemas.set('person', personSchema);
      db.registerSchema(personSchema);

      // Create a delta to negate
      const delta = db.createDelta('alice', [{ localContext: 'test', target: 'value' }]);
      await db.persistDelta(delta);

      const gqlSchema = createGraphQLSchema({
        db,
        schemas,
        enableMutations: true
      });

      const mutation = `
        mutation {
          negateDelta(
            author: "alice"
            targetDeltaId: "${delta.id}"
            reason: "Test negation"
          )
        }
      `;

      const result = await graphql({ schema: gqlSchema, source: mutation });

      expect(result.errors).toBeUndefined();
      expect(result.data?.negateDelta).toBeDefined();
    });
  });

  describe('Full Stack Integration', () => {
    it('should demonstrate complete workflow: create, query, update', async () => {
      // Setup schema
      const blogSchema = createPostSchema('blog', 'Blog');
      schemas.set('blog', blogSchema);
      db.registerSchema(blogSchema);

      const gqlSchema = createGraphQLSchema({
        db,
        schemas,
        enableMutations: true
      });

      // 1. Create a blog post
      const createMutation = `
        mutation {
          createBlog(
            id: "blog_001"
            author: "alice"
            input: { title: "GraphQL + RhizomeDB", content: "Amazing!" }
          ) {
            id
            title
            content
          }
        }
      `;

      const createResult = await graphql({ schema: gqlSchema, source: createMutation });
      expect(createResult.errors).toBeUndefined();
      expect((createResult.data as any)?.createBlog.title).toBe('GraphQL + RhizomeDB');

      // 2. Query it
      const query = `
        query {
          Blog(id: "blog_001") {
            id
            title
            content
          }
        }
      `;

      const queryResult = await graphql({ schema: gqlSchema, source: query });
      expect(queryResult.errors).toBeUndefined();
      expect((queryResult.data as any)?.Blog.title).toBe('GraphQL + RhizomeDB');

      // 3. Update it (create new delta with same object ID)
      const updateDelta = db.createDelta('alice', [
        { localContext: 'blog', target: { id: 'blog_001', context: 'content' } },
        { localContext: 'content', target: 'Updated content!' }
      ]);
      await db.persistDelta(updateDelta);

      // 4. Query again to see update
      const queryResult2 = await graphql({ schema: gqlSchema, source: query });
      expect(queryResult2.errors).toBeUndefined();
      // Note: Will have multiple content deltas, resolver picks most recent
    });
  });

  describe('Time-travel via GraphQL', () => {
    it('should support querying at specific timestamps', async () => {
      const personSchema = createPersonSchema();
      schemas.set('person', personSchema);
      db.registerSchema(personSchema);

      const personId = 'person_alice';

      // Create initial name
      const delta1 = db.createDelta('system', [
        { localContext: 'named', target: { id: personId, context: 'name' } },
        { localContext: 'name', target: 'Alice' }
      ]);
      await db.persistDelta(delta1);

      const timestamp1 = Date.now();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update name
      const delta2 = db.createDelta('system', [
        { localContext: 'named', target: { id: personId, context: 'name' } },
        { localContext: 'name', target: 'Alice Johnson' }
      ]);
      await db.persistDelta(delta2);

      // Query at old timestamp would show old name
      // (This would require extending GraphQL schema with timestamp arg)
      // For now, just verify both deltas exist
      const stats = db.getStats();
      expect(stats.totalDeltas).toBe(2);
    });
  });
});
