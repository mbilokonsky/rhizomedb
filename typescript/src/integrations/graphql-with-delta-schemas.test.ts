/**
 * End-to-end test for GraphQL with delta-defined schemas
 *
 * This demonstrates the complete flow:
 * 1. Define schemas as deltas
 * 2. Load schemas from deltas into RhizomeDB
 * 3. Generate GraphQL schema from delta-defined HyperSchemas
 * 4. Query data via GraphQL
 * 5. Mutate schema and regenerate GraphQL schema
 */

import { RhizomeDB } from '../storage/instance';
import { graphql } from 'graphql';
import { createGraphQLSchemaFromDeltas, createDynamicGraphQLSchema } from './graphql';
import {
  createTerminalSchemaAsDeltas,
  addTransformationRule
} from '../schemas/schemas-as-deltas';

describe('GraphQL with Delta-Defined Schemas', () => {
  let db: RhizomeDB;

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory' });
  });

  describe('Basic Flow', () => {
    it('should create GraphQL schema from delta-defined HyperSchemas', async () => {
      // Step 1: Define a Person schema as deltas
      await createTerminalSchemaAsDeltas(db, 'person_schema', 'Person');

      // Step 2: Create some person data
      const aliceId = 'person_alice';
      await db.persistDelta(
        db.createDelta('system', [
          { role: 'person', target: { id: aliceId, context: 'name' } },
          { role: 'name', target: 'Alice' }
        ])
      );

      await db.persistDelta(
        db.createDelta('system', [
          { role: 'person', target: { id: aliceId, context: 'age' } },
          { role: 'age', target: 30 }
        ])
      );

      // Step 3: Generate GraphQL schema from deltas
      const graphqlSchema = createGraphQLSchemaFromDeltas({
        db,
        enableMutations: false
      });

      // Step 4: Query via GraphQL
      const query = `
        query {
          Person(id: "${aliceId}") {
            id
            name
            age
          }
        }
      `;

      const result = await graphql({ schema: graphqlSchema, source: query });

      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.Person).toMatchObject({
        id: aliceId,
        name: 'Alice',
        age: 30
      });
    });

    it('should handle nested schemas with transformations', async () => {
      // Create Person schema
      await createTerminalSchemaAsDeltas(db, 'person_schema', 'Person');

      // Create Address schema
      await createTerminalSchemaAsDeltas(db, 'address_schema', 'Address');

      // Create Company schema with transformation to Address
      await createTerminalSchemaAsDeltas(db, 'company_schema', 'Company');
      await addTransformationRule(db, 'company_schema', 'address', 'address_schema');

      // Create data
      const addressId = 'address_hq';
      await db.persistDelta(
        db.createDelta('system', [
          { role: 'address', target: { id: addressId, context: 'street' } },
          { role: 'street', target: '123 Main St' }
        ])
      );

      await db.persistDelta(
        db.createDelta('system', [
          { role: 'address', target: { id: addressId, context: 'city' } },
          { role: 'city', target: 'San Francisco' }
        ])
      );

      const companyId = 'company_acme';
      await db.persistDelta(
        db.createDelta('system', [
          { role: 'company', target: { id: companyId, context: 'name' } },
          { role: 'name', target: 'Acme Corp' }
        ])
      );

      await db.persistDelta(
        db.createDelta('system', [
          { role: 'company', target: { id: companyId, context: 'address' } },
          { role: 'address', target: { id: addressId, context: 'companies' } }
        ])
      );

      // Generate GraphQL schema
      const graphqlSchema = createGraphQLSchemaFromDeltas({ db });

      // Query with nested address
      const query = `
        query {
          Company(id: "${companyId}") {
            id
            name
            address {
              id
              street
              city
            }
          }
        }
      `;

      const result = await graphql({ schema: graphqlSchema, source: query });

      expect(result.errors).toBeUndefined();
      expect(result.data?.Company).toMatchObject({
        id: companyId,
        name: 'Acme Corp',
        address: {
          id: addressId,
          street: '123 Main St',
          city: 'San Francisco'
        }
      });
    });
  });

  describe('Dynamic Schema Updates', () => {
    it('should detect schema changes and regenerate GraphQL schema', async () => {
      // Create initial schema
      await createTerminalSchemaAsDeltas(db, 'product_schema', 'Product');

      // Create dynamic GraphQL schema manager
      const dynamicSchema = createDynamicGraphQLSchema({ db });

      // Create product data
      const productId = 'product_widget';
      await db.persistDelta(
        db.createDelta('system', [
          { role: 'product', target: { id: productId, context: 'name' } },
          { role: 'name', target: 'Widget' }
        ])
      );

      // Query 1: Basic product
      const query1 = `
        query {
          Product(id: "${productId}") {
            id
            name
          }
        }
      `;

      let result = await graphql({ schema: dynamicSchema.getSchema(), source: query1 });
      expect(result.data?.Product).toMatchObject({
        id: productId,
        name: 'Widget'
      });

      // Evolve schema: add transformation for manufacturer
      await createTerminalSchemaAsDeltas(db, 'manufacturer_schema', 'Manufacturer');
      await addTransformationRule(db, 'product_schema', 'manufacturer', 'manufacturer_schema');

      // Check for changes
      expect(dynamicSchema.checkForChanges()).toBe(true);

      // Regenerate schema
      const { changed, schema: newSchema } = dynamicSchema.regenerate();
      expect(changed).toBe(true);

      // Create manufacturer data
      const mfgId = 'mfg_acme';
      await db.persistDelta(
        db.createDelta('system', [
          { role: 'manufacturer', target: { id: mfgId, context: 'name' } },
          { role: 'name', target: 'Acme Manufacturing' }
        ])
      );

      // Link product to manufacturer
      await db.persistDelta(
        db.createDelta('system', [
          { role: 'product', target: { id: productId, context: 'manufacturer' } },
          { role: 'manufacturer', target: { id: mfgId, context: 'products' } }
        ])
      );

      // Query 2: Product with nested manufacturer
      const query2 = `
        query {
          Product(id: "${productId}") {
            id
            name
            manufacturer {
              id
              name
            }
          }
        }
      `;

      result = await graphql({ schema: dynamicSchema.getSchema(), source: query2 });
      expect(result.data?.Product).toMatchObject({
        id: productId,
        name: 'Widget',
        manufacturer: {
          id: mfgId,
          name: 'Acme Manufacturing'
        }
      });
    });

    it('should not regenerate if schemas have not changed', async () => {
      await createTerminalSchemaAsDeltas(db, 'user_schema', 'User');

      const dynamicSchema = createDynamicGraphQLSchema({ db });

      // First check
      expect(dynamicSchema.checkForChanges()).toBe(false);

      // First regenerate attempt
      const { changed: changed1 } = dynamicSchema.regenerate();
      expect(changed1).toBe(false);

      // Second regenerate attempt (still no changes)
      const { changed: changed2 } = dynamicSchema.regenerate();
      expect(changed2).toBe(false);
    });
  });

  describe('Schema Versioning', () => {
    it('should track schema versions across updates', async () => {
      // Create initial schema
      await createTerminalSchemaAsDeltas(db, 'article_schema', 'Article');

      // Load schema and get version
      const schema1 = db.loadSchemaFromDeltas('article_schema');
      const snapshot1 = db.getSchemaSnapshot('article_schema');
      expect(schema1).toBeDefined();
      expect(snapshot1).toBeDefined();
      const version1 = snapshot1!.version;

      // Update schema: add transformation rule
      await createTerminalSchemaAsDeltas(db, 'author_schema', 'Author');
      await addTransformationRule(db, 'article_schema', 'author', 'author_schema');

      // Schema should have changed
      expect(db.hasSchemaChanged('article_schema')).toBe(true);

      // Reload schema
      const schema2 = db.reloadSchemaIfChanged('article_schema');
      expect(schema2).toBeDefined();

      const snapshot2 = db.getSchemaSnapshot('article_schema');
      const version2 = snapshot2!.version;

      // Version should be different
      expect(version2).not.toBe(version1);
    });
  });

  describe('Multiple Schemas', () => {
    it('should load and expose multiple schemas via GraphQL', async () => {
      // Create multiple schemas
      await createTerminalSchemaAsDeltas(db, 'book_schema', 'Book');
      await createTerminalSchemaAsDeltas(db, 'author_schema', 'Author');
      await createTerminalSchemaAsDeltas(db, 'publisher_schema', 'Publisher');

      // Add transformations
      await addTransformationRule(db, 'book_schema', 'author', 'author_schema');
      await addTransformationRule(db, 'book_schema', 'publisher', 'publisher_schema');

      // Create data
      const authorId = 'author_asimov';
      await db.persistDelta(
        db.createDelta('system', [
          { role: 'author', target: { id: authorId, context: 'name' } },
          { role: 'name', target: 'Isaac Asimov' }
        ])
      );

      const publisherId = 'publisher_gnome';
      await db.persistDelta(
        db.createDelta('system', [
          { role: 'publisher', target: { id: publisherId, context: 'name' } },
          { role: 'name', target: 'Gnome Press' }
        ])
      );

      const bookId = 'book_foundation';
      await db.persistDelta(
        db.createDelta('system', [
          { role: 'book', target: { id: bookId, context: 'title' } },
          { role: 'title', target: 'Foundation' }
        ])
      );

      await db.persistDelta(
        db.createDelta('system', [
          { role: 'book', target: { id: bookId, context: 'author' } },
          { role: 'author', target: { id: authorId, context: 'books' } }
        ])
      );

      await db.persistDelta(
        db.createDelta('system', [
          { role: 'book', target: { id: bookId, context: 'publisher' } },
          { role: 'publisher', target: { id: publisherId, context: 'books' } }
        ])
      );

      // Generate GraphQL schema
      const graphqlSchema = createGraphQLSchemaFromDeltas({ db });

      // Query all three types
      const query = `
        query {
          Book(id: "${bookId}") {
            id
            title
            author {
              id
              name
            }
            publisher {
              id
              name
            }
          }
          Author(id: "${authorId}") {
            id
            name
          }
          Publisher(id: "${publisherId}") {
            id
            name
          }
        }
      `;

      const result = await graphql({ schema: graphqlSchema, source: query });

      expect(result.errors).toBeUndefined();
      expect(result.data?.Book).toMatchObject({
        id: bookId,
        title: 'Foundation',
        author: { id: authorId, name: 'Isaac Asimov' },
        publisher: { id: publisherId, name: 'Gnome Press' }
      });
      expect(result.data?.Author).toMatchObject({
        id: authorId,
        name: 'Isaac Asimov'
      });
      expect(result.data?.Publisher).toMatchObject({
        id: publisherId,
        name: 'Gnome Press'
      });
    });
  });
});
