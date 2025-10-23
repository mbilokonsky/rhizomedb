/**
 * Tests for representing HyperSchemas as deltas
 */

import { RhizomeDB } from './instance';
import { Delta, HyperSchema } from './types';

describe('Schemas as Deltas', () => {
  let db: RhizomeDB;

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory' });
  });

  describe('Simple Schema (NamedEntity)', () => {
    it('should represent a terminal schema using deltas', async () => {
      const schemaId = 'named_entity_schema';

      // Delta 1: Declare this is a HyperSchema
      const typeDeclaration = db.createDelta('system', [
        {
          localContext: 'entity',
          target: { id: schemaId },
          targetContext: 'type'
        },
        {
          localContext: 'type',
          target: 'hyperschema'
        }
      ]);

      // Delta 2: Give it a name
      const nameDeclaration = db.createDelta('system', [
        {
          localContext: 'schema',
          target: { id: schemaId },
          targetContext: 'name'
        },
        {
          localContext: 'name',
          target: 'NamedEntity'
        }
      ]);

      // Delta 3: Specify selection pattern (use built-in)
      const selectionDeclaration = db.createDelta('system', [
        {
          localContext: 'schema',
          target: { id: schemaId },
          targetContext: 'select'
        },
        {
          localContext: 'pattern',
          target: { id: 'select_by_target_context' } // reference to built-in
        }
      ]);

      // Delta 4: No transformation rules (terminal schema)
      // Could omit this or explicitly declare empty
      const transformDeclaration = db.createDelta('system', [
        {
          localContext: 'schema',
          target: { id: schemaId },
          targetContext: 'transform'
        },
        {
          localContext: 'rules',
          target: '{}' // empty JSON object as primitive
        }
      ]);

      await db.persistDelta(typeDeclaration);
      await db.persistDelta(nameDeclaration);
      await db.persistDelta(selectionDeclaration);
      await db.persistDelta(transformDeclaration);

      // Now query for the schema using a meta-schema
      const metaSchema = createMetaHyperSchema();
      const schemaHyperView = db.applyHyperSchema(schemaId, metaSchema);

      // Verify HyperView structure
      expect(schemaHyperView.id).toBe(schemaId);
      expect(schemaHyperView.type).toBeDefined();
      expect(schemaHyperView.name).toBeDefined();
      expect(schemaHyperView.select).toBeDefined();
      expect(schemaHyperView.transform).toBeDefined();

      // Extract the type
      const typeDeltas = schemaHyperView.type as Delta[];
      expect(typeDeltas.length).toBe(1);
      const typeValue = typeDeltas[0].pointers.find(p => p.localContext === 'type')?.target;
      expect(typeValue).toBe('hyperschema');
    });

    it('should resolve schema HyperView into executable HyperSchema', async () => {
      // Create the schema deltas (same as above)
      const schemaId = 'named_entity_schema';

      await db.persistDelta(db.createDelta('system', [
        { localContext: 'schema', target: { id: schemaId }, targetContext: 'name' },
        { localContext: 'name', target: 'NamedEntity' }
      ]));

      await db.persistDelta(db.createDelta('system', [
        { localContext: 'schema', target: { id: schemaId }, targetContext: 'select' },
        { localContext: 'pattern', target: { id: 'select_by_target_context' } }
      ]));

      await db.persistDelta(db.createDelta('system', [
        { localContext: 'schema', target: { id: schemaId }, targetContext: 'transform' },
        { localContext: 'rules', target: '{}' }
      ]));

      // Get HyperView and resolve to executable schema
      const metaSchema = createMetaHyperSchema();
      const schemaHyperView = db.applyHyperSchema(schemaId, metaSchema);
      const executableSchema = resolveHyperSchemaView(schemaHyperView, db);

      // Verify it's a valid HyperSchema
      expect(executableSchema.id).toBe(schemaId);
      expect(executableSchema.name).toBe('NamedEntity');
      expect(typeof executableSchema.select).toBe('function');
      expect(executableSchema.transform).toEqual({});

      // Test that it works on actual data
      const personId = 'person_alice';
      await db.persistDelta(db.createDelta('author', [
        { localContext: 'named', target: { id: personId }, targetContext: 'name' },
        { localContext: 'name', target: 'Alice' }
      ]));

      const personView = db.applyHyperSchema(personId, executableSchema);
      expect(personView.id).toBe(personId);
      expect(personView.name).toBeDefined();
    });
  });

  describe('Schema with Transformations (BlogPost)', () => {
    it('should represent transformation rules as deltas', async () => {
      const schemaId = 'blog_post_schema';

      // Basic schema metadata
      await db.persistDelta(db.createDelta('system', [
        { localContext: 'schema', target: { id: schemaId }, targetContext: 'name' },
        { localContext: 'name', target: 'BlogPost' }
      ]));

      await db.persistDelta(db.createDelta('system', [
        { localContext: 'schema', target: { id: schemaId }, targetContext: 'select' },
        { localContext: 'pattern', target: { id: 'select_by_target_context' } }
      ]));

      // Transform rule 1: author -> NamedEntity
      const authorTransform = db.createDelta('system', [
        {
          localContext: 'schema',
          target: { id: schemaId },
          targetContext: 'transform'
        },
        {
          localContext: 'on-context',
          target: 'author'
        },
        {
          localContext: 'apply-schema',
          target: { id: 'named_entity_schema' }
        }
      ]);

      // Transform rule 2: comment -> Comment
      const commentTransform = db.createDelta('system', [
        {
          localContext: 'schema',
          target: { id: schemaId },
          targetContext: 'transform'
        },
        {
          localContext: 'on-context',
          target: 'comment'
        },
        {
          localContext: 'apply-schema',
          target: { id: 'comment_schema' }
        }
      ]);

      await db.persistDelta(authorTransform);
      await db.persistDelta(commentTransform);

      // Query the schema
      const metaSchema = createMetaHyperSchema();
      const schemaHyperView = db.applyHyperSchema(schemaId, metaSchema);

      // Verify we have transformation rules
      expect(schemaHyperView.transform).toBeDefined();
      const transformDeltas = schemaHyperView.transform as Delta[];
      expect(transformDeltas.length).toBe(2);

      // Check the rules reference the right schemas
      const authorRule = transformDeltas.find(d =>
        d.pointers.some(p => p.localContext === 'on-context' && p.target === 'author')
      );
      expect(authorRule).toBeDefined();

      const appliesSchema = authorRule!.pointers.find(p => p.localContext === 'apply-schema');
      expect(appliesSchema?.target).toEqual({ id: 'named_entity_schema' });
    });

    it('should use schema with transforms on actual data', async () => {
      // First, create NamedEntity schema as deltas
      const namedEntityId = 'named_entity_schema';
      await createNamedEntitySchemaAsDeltas(db, namedEntityId);

      // Then create BlogPost schema as deltas
      const blogPostId = 'blog_post_schema';
      await createBlogPostSchemaAsDeltas(db, blogPostId, namedEntityId);

      // Resolve both schemas to executable form
      const metaSchema = createMetaHyperSchema();

      const namedEntityHV = db.applyHyperSchema(namedEntityId, metaSchema);
      const namedEntitySchema = resolveHyperSchemaView(namedEntityHV, db);
      db.registerSchema(namedEntitySchema);

      const blogPostHV = db.applyHyperSchema(blogPostId, metaSchema);
      const blogPostSchema = resolveHyperSchemaView(blogPostHV, db);
      db.registerSchema(blogPostSchema);

      // Now create actual blog post data
      const authorId = 'author_alice';
      const postId = 'post_001';

      await db.persistDelta(db.createDelta('system', [
        { localContext: 'named', target: { id: authorId }, targetContext: 'name' },
        { localContext: 'name', target: 'Alice' }
      ]));

      await db.persistDelta(db.createDelta('system', [
        { localContext: 'post', target: { id: postId }, targetContext: 'title' },
        { localContext: 'title', target: 'My Post' }
      ]));

      await db.persistDelta(db.createDelta('system', [
        { localContext: 'post', target: { id: postId }, targetContext: 'author' },
        { localContext: 'author', target: { id: authorId }, targetContext: 'posts' }
      ]));

      // Query using the schema that was defined as deltas!
      const postView = db.applyHyperSchema(postId, blogPostSchema);

      expect(postView.id).toBe(postId);
      expect(postView.title).toBeDefined();
      expect(postView.author).toBeDefined();

      // The author should be a nested HyperView
      const authorDeltas = postView.author as Delta[];
      const authorPointer = authorDeltas[0].pointers.find(p => p.localContext === 'author');
      const nestedAuthor = authorPointer?.target as any;
      expect(nestedAuthor.id).toBe(authorId);
      expect(nestedAuthor.name).toBeDefined();
    });
  });

  describe('Schema Evolution', () => {
    it('should allow schema updates via new deltas', async () => {
      const schemaId = 'person_schema';

      // Initial schema: just name
      await db.persistDelta(db.createDelta('system', [
        { localContext: 'schema', target: { id: schemaId }, targetContext: 'name' },
        { localContext: 'name', target: 'Person' }
      ]));

      await db.persistDelta(db.createDelta('system', [
        { localContext: 'schema', target: { id: schemaId }, targetContext: 'select' },
        { localContext: 'pattern', target: { id: 'select_by_target_context' } }
      ]));

      // Later: add a transformation rule
      await db.persistDelta(db.createDelta('system', [
        { localContext: 'schema', target: { id: schemaId }, targetContext: 'transform' },
        { localContext: 'on-context', target: 'address' },
        { localContext: 'apply-schema', target: { id: 'address_schema' } }
      ]));

      // Query the evolved schema
      const metaSchema = createMetaHyperSchema();
      const schemaHyperView = db.applyHyperSchema(schemaId, metaSchema);

      // Should now have transformation rules
      expect(schemaHyperView.transform).toBeDefined();
      const transformDeltas = schemaHyperView.transform as Delta[];
      expect(transformDeltas.length).toBeGreaterThan(0);
    });

    it('should allow schema negation/retraction', async () => {
      const schemaId = 'old_schema';

      // Create a transformation rule
      const badRule = db.createDelta('system', [
        { localContext: 'schema', target: { id: schemaId }, targetContext: 'transform' },
        { localContext: 'on-context', target: 'deprecated_field' },
        { localContext: 'apply-schema', target: { id: 'deprecated_schema' } }
      ]);

      await db.persistDelta(badRule);

      // Later, negate it
      const negation = db.negateDelta('system', badRule.id, 'Field deprecated');
      await db.persistDelta(negation);

      // Query the schema
      const metaSchema = createMetaHyperSchema();
      const schemaHyperView = db.applyHyperSchema(schemaId, metaSchema);

      // The negated rule should not appear
      const transformDeltas = (schemaHyperView.transform as Delta[]) || [];
      const hasDeprecatedRule = transformDeltas.some(d =>
        d.pointers.some(p => p.target === 'deprecated_field')
      );
      expect(hasDeprecatedRule).toBe(false);
    });
  });
});

// Helper functions (to be implemented)

function createMetaHyperSchema(): HyperSchema {
  // This is the bootstrap schema that queries schemas!
  // For now, return a placeholder
  throw new Error('createMetaHyperSchema not yet implemented');
}

function resolveHyperSchemaView(hyperView: any, db: RhizomeDB): HyperSchema {
  // Resolve a HyperView of a schema into an executable HyperSchema
  // For now, return a placeholder
  throw new Error('resolveHyperSchemaView not yet implemented');
}

async function createNamedEntitySchemaAsDeltas(db: RhizomeDB, schemaId: string): Promise<void> {
  await db.persistDelta(db.createDelta('system', [
    { localContext: 'schema', target: { id: schemaId }, targetContext: 'name' },
    { localContext: 'name', target: 'NamedEntity' }
  ]));

  await db.persistDelta(db.createDelta('system', [
    { localContext: 'schema', target: { id: schemaId }, targetContext: 'select' },
    { localContext: 'pattern', target: { id: 'select_by_target_context' } }
  ]));

  await db.persistDelta(db.createDelta('system', [
    { localContext: 'schema', target: { id: schemaId }, targetContext: 'transform' },
    { localContext: 'rules', target: '{}' }
  ]));
}

async function createBlogPostSchemaAsDeltas(
  db: RhizomeDB,
  schemaId: string,
  namedEntitySchemaId: string
): Promise<void> {
  await db.persistDelta(db.createDelta('system', [
    { localContext: 'schema', target: { id: schemaId }, targetContext: 'name' },
    { localContext: 'name', target: 'BlogPost' }
  ]));

  await db.persistDelta(db.createDelta('system', [
    { localContext: 'schema', target: { id: schemaId }, targetContext: 'select' },
    { localContext: 'pattern', target: { id: 'select_by_target_context' } }
  ]));

  await db.persistDelta(db.createDelta('system', [
    { localContext: 'schema', target: { id: schemaId }, targetContext: 'transform' },
    { localContext: 'on-context', target: 'author' },
    { localContext: 'apply-schema', target: { id: namedEntitySchemaId } }
  ]));
}
