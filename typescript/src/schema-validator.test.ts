/**
 * Tests for Schema DAG Validation
 */

import { createStandardSchema, SchemaRegistry } from './hyperview';
import {
  validateSchema,
  detectCycle,
  validateSchemaDAG,
  wouldCreateCycle,
  findDependents,
  calculateSchemaDepth,
  topologicalSort,
  CircularSchemaError,
  SchemaValidationError
} from './schema-validator';
import { HyperSchema, PrimitiveSchemas } from './types';

describe('Schema Validation', () => {
  describe('validateSchema', () => {
    it('should validate a correct schema', () => {
      const schema = createStandardSchema('test', 'Test');
      const result = validateSchema(schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject schema without ID', () => {
      const schema = {
        id: '',
        name: 'Test',
        select: () => false,
        transform: {}
      } as HyperSchema;

      const result = validateSchema(schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schema must have a non-empty id string');
    });

    it('should reject schema without name', () => {
      const schema = {
        id: 'test',
        name: '',
        select: () => false,
        transform: {}
      } as HyperSchema;

      const result = validateSchema(schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schema must have a non-empty name string');
    });

    it('should reject schema without select function', () => {
      const schema = {
        id: 'test',
        name: 'Test',
        select: 'not a function',
        transform: {}
      } as any;

      const result = validateSchema(schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schema select must be a function');
    });

    it('should detect self-reference', () => {
      const schema = createStandardSchema('person', 'Person', {
        parent: {
          schema: 'person', // Self-reference!
          when: () => true
        }
      });

      const result = validateSchema(schema);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('self-reference'))).toBe(true);
    });

    it('should track dependencies', () => {
      const schema = createStandardSchema('post', 'Post', {
        author: { schema: 'person', when: () => true },
        category: { schema: 'category', when: () => true }
      });

      const result = validateSchema(schema);

      expect(result.dependencies.has('person')).toBe(true);
      expect(result.dependencies.has('category')).toBe(true);
      expect(result.dependencies.size).toBe(2);
    });

    it('should not count primitive schemas as dependencies', () => {
      const schema = createStandardSchema('person', 'Person', {
        name: { schema: PrimitiveSchemas.String, when: () => true },
        age: { schema: PrimitiveSchemas.Integer, when: () => true }
      });

      const result = validateSchema(schema);

      expect(result.dependencies.size).toBe(0); // Primitives don't count
    });
  });

  describe('detectCycle', () => {
    it('should detect simple 2-schema cycle', () => {
      const registry = new SchemaRegistry();

      const schemaA = createStandardSchema('a', 'A', {
        b: { schema: 'b', when: () => true }
      });

      const schemaB = createStandardSchema('b', 'B', {
        a: { schema: 'a', when: () => true } // Cycle!
      });

      registry.register(schemaA);
      registry.register(schemaB);

      const cycle = detectCycle(schemaA, registry);

      expect(cycle).not.toBeNull();
      expect(cycle).toContain('a');
      expect(cycle).toContain('b');
    });

    it('should detect 3-schema cycle', () => {
      const registry = new SchemaRegistry();

      const schemaA = createStandardSchema('a', 'A', {
        b: { schema: 'b', when: () => true }
      });

      const schemaB = createStandardSchema('b', 'B', {
        c: { schema: 'c', when: () => true }
      });

      const schemaC = createStandardSchema('c', 'C', {
        a: { schema: 'a', when: () => true } // Cycle back to A!
      });

      registry.register(schemaA);
      registry.register(schemaB);
      registry.register(schemaC);

      const cycle = detectCycle(schemaA, registry);

      expect(cycle).not.toBeNull();
      expect(cycle).toEqual(['a', 'b', 'c', 'a']);
    });

    it('should return null for acyclic schemas', () => {
      const registry = new SchemaRegistry();

      const person = createStandardSchema('person', 'Person');
      const post = createStandardSchema('post', 'Post', {
        author: { schema: person, when: () => true }
      });

      registry.register(person);
      registry.register(post);

      const cycle = detectCycle(post, registry);

      expect(cycle).toBeNull();
    });

    it('should handle schema with no dependencies', () => {
      const registry = new SchemaRegistry();
      const schema = createStandardSchema('simple', 'Simple');

      registry.register(schema);

      const cycle = detectCycle(schema, registry);

      expect(cycle).toBeNull();
    });
  });

  describe('validateSchemaDAG', () => {
    it('should pass for valid DAG', () => {
      const registry = new SchemaRegistry();

      const person = createStandardSchema('person', 'Person');
      const post = createStandardSchema('post', 'Post', {
        author: { schema: person, when: () => true }
      });

      registry.register(person);
      registry.register(post);

      expect(() => validateSchemaDAG(post, registry)).not.toThrow();
    });

    it('should throw CircularSchemaError for cycle', () => {
      const registry = new SchemaRegistry();

      const schemaA = createStandardSchema('a', 'A', {
        b: { schema: 'b', when: () => true }
      });

      const schemaB = createStandardSchema('b', 'B', {
        a: { schema: 'a', when: () => true }
      });

      registry.register(schemaA);
      registry.register(schemaB);

      expect(() => validateSchemaDAG(schemaA, registry)).toThrow(CircularSchemaError);
    });

    it('should throw SchemaValidationError for invalid schema', () => {
      const registry = new SchemaRegistry();

      const invalid = {
        id: '',
        name: 'Invalid',
        select: () => false,
        transform: {}
      } as HyperSchema;

      expect(() => validateSchemaDAG(invalid, registry)).toThrow(SchemaValidationError);
    });
  });

  describe('wouldCreateCycle', () => {
    it('should return false for valid addition', () => {
      const registry = new SchemaRegistry();

      const person = createStandardSchema('person', 'Person');
      const post = createStandardSchema('post', 'Post', {
        author: { schema: person, when: () => true }
      });

      registry.register(person);

      expect(wouldCreateCycle(post, registry)).toBe(false);
    });

    it('should return true for cyclic addition', () => {
      const registry = new SchemaRegistry();

      const schemaA = createStandardSchema('a', 'A', {
        b: { schema: 'b', when: () => true }
      });

      const schemaB = createStandardSchema('b', 'B', {
        a: { schema: 'a', when: () => true }
      });

      registry.register(schemaA);

      expect(wouldCreateCycle(schemaB, registry)).toBe(true);
    });
  });

  describe('findDependents', () => {
    it('should find all schemas that depend on a schema', () => {
      const registry = new SchemaRegistry();

      const person = createStandardSchema('person', 'Person');
      const post = createStandardSchema('post', 'Post', {
        author: { schema: 'person', when: () => true }
      });
      const comment = createStandardSchema('comment', 'Comment', {
        author: { schema: 'person', when: () => true },
        post: { schema: 'post', when: () => true }
      });

      registry.register(person);
      registry.register(post);
      registry.register(comment);

      const dependents = findDependents('person', registry);

      expect(dependents.has('post')).toBe(true);
      expect(dependents.has('comment')).toBe(true);
      expect(dependents.size).toBe(2);
    });

    it('should return empty set for schema with no dependents', () => {
      const registry = new SchemaRegistry();

      const person = createStandardSchema('person', 'Person');
      const post = createStandardSchema('post', 'Post', {
        author: { schema: 'person', when: () => true }
      });

      registry.register(person);
      registry.register(post);

      const dependents = findDependents('post', registry);

      expect(dependents.size).toBe(0);
    });
  });

  describe('calculateSchemaDepth', () => {
    it('should return 1 for terminal schema', () => {
      const registry = new SchemaRegistry();
      const person = createStandardSchema('person', 'Person');

      registry.register(person);

      const depth = calculateSchemaDepth(person, registry);

      expect(depth).toBe(1);
    });

    it('should calculate depth for nested schemas', () => {
      const registry = new SchemaRegistry();

      const person = createStandardSchema('person', 'Person');
      const post = createStandardSchema('post', 'Post', {
        author: { schema: person, when: () => true }
      });
      const comment = createStandardSchema('comment', 'Comment', {
        post: { schema: post, when: () => true }
      });

      registry.register(person);
      registry.register(post);
      registry.register(comment);

      expect(calculateSchemaDepth(person, registry)).toBe(1);
      expect(calculateSchemaDepth(post, registry)).toBe(2);
      expect(calculateSchemaDepth(comment, registry)).toBe(3);
    });
  });

  describe('topologicalSort', () => {
    it('should sort schemas in dependency order', () => {
      const registry = new SchemaRegistry();

      const person = createStandardSchema('person', 'Person');
      const post = createStandardSchema('post', 'Post', {
        author: { schema: person, when: () => true }
      });
      const comment = createStandardSchema('comment', 'Comment', {
        post: { schema: post, when: () => true },
        author: { schema: person, when: () => true }
      });

      registry.register(person);
      registry.register(post);
      registry.register(comment);

      // Provide schemas in reverse order
      const sorted = topologicalSort([comment, post, person], registry);

      // Person should come first, then post, then comment
      const personIndex = sorted.findIndex(s => s.id === 'person');
      const postIndex = sorted.findIndex(s => s.id === 'post');
      const commentIndex = sorted.findIndex(s => s.id === 'comment');

      expect(personIndex).toBeLessThan(postIndex);
      expect(postIndex).toBeLessThan(commentIndex);
    });

    it('should throw for cyclic dependencies', () => {
      const registry = new SchemaRegistry();

      const schemaA = createStandardSchema('a', 'A', {
        b: { schema: 'b', when: () => true }
      });

      const schemaB = createStandardSchema('b', 'B', {
        a: { schema: 'a', when: () => true }
      });

      registry.register(schemaA);
      registry.register(schemaB);

      expect(() => topologicalSort([schemaA, schemaB], registry)).toThrow(CircularSchemaError);
    });
  });
});
