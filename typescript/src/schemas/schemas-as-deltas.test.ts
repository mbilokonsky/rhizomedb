/**
 * Tests for representing HyperSchemas as deltas
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { RhizomeDB } from '../storage/instance';
import {
  Delta,
  HyperSchema,
  HyperView,
  SelectionFunction,
  TransformationRules
} from '../core/types';
import { selectByTargetContext } from './hyperview';
import { isDomainNodeReference } from '../core/validation';

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

      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'schema', target: { id: schemaId }, targetContext: 'name' },
          { localContext: 'name', target: 'NamedEntity' }
        ])
      );

      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'schema', target: { id: schemaId }, targetContext: 'select' },
          { localContext: 'pattern', target: { id: 'select_by_target_context' } }
        ])
      );

      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'schema', target: { id: schemaId }, targetContext: 'transform' },
          { localContext: 'rules', target: '{}' }
        ])
      );

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
      await db.persistDelta(
        db.createDelta('author', [
          { localContext: 'named', target: { id: personId }, targetContext: 'name' },
          { localContext: 'name', target: 'Alice' }
        ])
      );

      const personView = db.applyHyperSchema(personId, executableSchema);
      expect(personView.id).toBe(personId);
      expect(personView.name).toBeDefined();
    });
  });

  describe('Schema with Transformations (BlogPost)', () => {
    it('should represent transformation rules as deltas', async () => {
      const schemaId = 'blog_post_schema';

      // Basic schema metadata
      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'schema', target: { id: schemaId }, targetContext: 'name' },
          { localContext: 'name', target: 'BlogPost' }
        ])
      );

      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'schema', target: { id: schemaId }, targetContext: 'select' },
          { localContext: 'pattern', target: { id: 'select_by_target_context' } }
        ])
      );

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

      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'named', target: { id: authorId }, targetContext: 'name' },
          { localContext: 'name', target: 'Alice' }
        ])
      );

      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'post', target: { id: postId }, targetContext: 'title' },
          { localContext: 'title', target: 'My Post' }
        ])
      );

      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'post', target: { id: postId }, targetContext: 'author' },
          { localContext: 'author', target: { id: authorId }, targetContext: 'posts' }
        ])
      );

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
      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'schema', target: { id: schemaId }, targetContext: 'name' },
          { localContext: 'name', target: 'Person' }
        ])
      );

      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'schema', target: { id: schemaId }, targetContext: 'select' },
          { localContext: 'pattern', target: { id: 'select_by_target_context' } }
        ])
      );

      // Later: add a transformation rule
      await db.persistDelta(
        db.createDelta('system', [
          { localContext: 'schema', target: { id: schemaId }, targetContext: 'transform' },
          { localContext: 'on-context', target: 'address' },
          { localContext: 'apply-schema', target: { id: 'address_schema' } }
        ])
      );

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

// Helper functions

/**
 * Built-in selection pattern registry
 */
const BUILT_IN_SELECTORS: Record<string, SelectionFunction> = {
  select_by_target_context: selectByTargetContext
};

/**
 * Create the meta-schema that queries schemas
 *
 * This is the bootstrap schema - it's hardcoded and not itself represented as deltas.
 * It allows us to query schema-deltas to get schema-HyperViews.
 */
function createMetaHyperSchema(): HyperSchema {
  return {
    id: 'meta_hyperschema',
    name: 'MetaHyperSchema',
    select: selectByTargetContext, // Use the standard pattern
    transform: {} // No transformations - schemas are terminal from meta-schema's perspective
  };
}

/**
 * Resolve a HyperView of a schema into an executable HyperSchema
 *
 * Converts: HyperView (deltas organized by property) → HyperSchema (executable object)
 */
function resolveHyperSchemaView(hyperView: HyperView, db: RhizomeDB): HyperSchema {
  const schemaId = hyperView.id;

  // Extract name
  const name = extractName(hyperView);

  // Resolve selection function
  const select = resolveSelectionFunction(hyperView);

  // Build transformation rules
  const transform = resolveTransformationRules(hyperView);

  return {
    id: schemaId,
    name,
    select,
    transform
  };
}

/**
 * Extract schema name from HyperView
 */
function extractName(hyperView: HyperView): string {
  const nameDeltas = hyperView.name as Delta[] | undefined;
  if (!nameDeltas || nameDeltas.length === 0) {
    return hyperView.id; // Fallback to ID if no name
  }

  const nameDelta = nameDeltas[0]; // Take first (or could do conflict resolution)
  const namePointer = nameDelta.pointers.find(p => p.localContext === 'name');

  return (namePointer?.target as string) || hyperView.id;
}

/**
 * Resolve selection function from HyperView
 */
function resolveSelectionFunction(hyperView: HyperView): SelectionFunction {
  const selectDeltas = hyperView.select as Delta[] | undefined;
  if (!selectDeltas || selectDeltas.length === 0) {
    // Default to select_by_target_context if not specified
    return selectByTargetContext;
  }

  const selectDelta = selectDeltas[0];

  // Look for pattern reference (built-in selector)
  const patternPointer = selectDelta.pointers.find(p => p.localContext === 'pattern');
  if (patternPointer && isDomainNodeReference(patternPointer.target)) {
    const patternId = patternPointer.target.id;
    const builtIn = BUILT_IN_SELECTORS[patternId];
    if (builtIn) {
      return builtIn;
    }
  }

  // Look for custom logic (e.g., JSONLogic)
  const logicPointer = selectDelta.pointers.find(p => p.localContext === 'logic');
  if (logicPointer && typeof logicPointer.target === 'string') {
    // TODO: Parse JSONLogic and create selection function
    // For now, fallback to default
    return selectByTargetContext;
  }

  // Default
  return selectByTargetContext;
}

/**
 * Build transformation rules from HyperView
 */
function resolveTransformationRules(hyperView: HyperView): TransformationRules {
  const transformDeltas = hyperView.transform as Delta[] | undefined;
  if (!transformDeltas || transformDeltas.length === 0) {
    return {};
  }

  const rules: TransformationRules = {};

  for (const delta of transformDeltas) {
    // Check if this is a JSON-encoded rules object (from terminal schema)
    const rulesPointer = delta.pointers.find(p => p.localContext === 'rules');
    if (rulesPointer && typeof rulesPointer.target === 'string') {
      try {
        const parsedRules = JSON.parse(rulesPointer.target);
        Object.assign(rules, parsedRules);
        continue;
      } catch {
        // Not valid JSON, skip
        continue;
      }
    }

    // Otherwise, extract individual transformation rule
    const onContextPointer = delta.pointers.find(p => p.localContext === 'on-context');
    const applySchemaPointer = delta.pointers.find(p => p.localContext === 'apply-schema');

    if (onContextPointer && applySchemaPointer) {
      const contextName = onContextPointer.target as string;

      if (isDomainNodeReference(applySchemaPointer.target)) {
        rules[contextName] = {
          schema: applySchemaPointer.target.id,
          when: pointer => isDomainNodeReference(pointer.target)
        };
      }
    }
  }

  return rules;
}

async function createNamedEntitySchemaAsDeltas(db: RhizomeDB, schemaId: string): Promise<void> {
  await db.persistDelta(
    db.createDelta('system', [
      { localContext: 'schema', target: { id: schemaId }, targetContext: 'name' },
      { localContext: 'name', target: 'NamedEntity' }
    ])
  );

  await db.persistDelta(
    db.createDelta('system', [
      { localContext: 'schema', target: { id: schemaId }, targetContext: 'select' },
      { localContext: 'pattern', target: { id: 'select_by_target_context' } }
    ])
  );

  await db.persistDelta(
    db.createDelta('system', [
      { localContext: 'schema', target: { id: schemaId }, targetContext: 'transform' },
      { localContext: 'rules', target: '{}' }
    ])
  );
}

async function createBlogPostSchemaAsDeltas(
  db: RhizomeDB,
  schemaId: string,
  namedEntitySchemaId: string
): Promise<void> {
  await db.persistDelta(
    db.createDelta('system', [
      { localContext: 'schema', target: { id: schemaId }, targetContext: 'name' },
      { localContext: 'name', target: 'BlogPost' }
    ])
  );

  await db.persistDelta(
    db.createDelta('system', [
      { localContext: 'schema', target: { id: schemaId }, targetContext: 'select' },
      { localContext: 'pattern', target: { id: 'select_by_target_context' } }
    ])
  );

  await db.persistDelta(
    db.createDelta('system', [
      { localContext: 'schema', target: { id: schemaId }, targetContext: 'transform' },
      { localContext: 'on-context', target: 'author' },
      { localContext: 'apply-schema', target: { id: namedEntitySchemaId } }
    ])
  );
}
