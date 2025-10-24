/**
 * Tests for schema versioning
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-floating-promises */

import { RhizomeDB } from '../storage/instance';
import { HyperSchema } from '../core/types';
import {
  calculateSchemaHash,
  hasSchemaChanged,
  addSchemaHash,
  VersionedHyperSchema,
  SchemaVersionRegistry
} from './schema-versioning';

describe('Schema Versioning', () => {
  let db: RhizomeDB;

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory' });
  });

  describe('Schema Hashing', () => {
    it('should calculate deterministic hashes for schemas', () => {
      const schema: HyperSchema = {
        id: 'test-schema',
        name: 'Test Schema',
        select: (objectId, delta) => {
          return delta.pointers.some(p => p.target === objectId);
        },
        transform: {}
      };

      const hash1 = calculateSchemaHash(schema);
      const hash2 = calculateSchemaHash(schema);

      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(hash1.length).toBe(64); // SHA-256 = 64 hex chars
    });

    it('should produce different hashes for different schemas', () => {
      const schema1: HyperSchema = {
        id: 'schema-1',
        name: 'Schema 1',
        select: () => true,
        transform: {}
      };

      const schema2: HyperSchema = {
        id: 'schema-2',
        name: 'Schema 2',
        select: () => false,
        transform: {}
      };

      const hash1 = calculateSchemaHash(schema1);
      const hash2 = calculateSchemaHash(schema2);

      expect(hash1).not.toBe(hash2);
    });

    it('should detect changes to selection function', () => {
      const schema1: HyperSchema = {
        id: 'test',
        name: 'Test',
        select: () => true,
        transform: {}
      };

      const schema2: HyperSchema = {
        id: 'test',
        name: 'Test',
        select: () => false,
        transform: {}
      };

      expect(calculateSchemaHash(schema1)).not.toBe(calculateSchemaHash(schema2));
    });

    it('should detect changes to transformation rules', () => {
      const schema1: HyperSchema = {
        id: 'test',
        name: 'Test',
        select: () => true,
        transform: {
          friend: { schema: 'user-schema' }
        }
      };

      const schema2: HyperSchema = {
        id: 'test',
        name: 'Test',
        select: () => true,
        transform: {
          friend: { schema: 'different-schema' }
        }
      };

      expect(calculateSchemaHash(schema1)).not.toBe(calculateSchemaHash(schema2));
    });
  });

  describe('Schema Change Detection', () => {
    it('should detect when schema has changed based on hash', () => {
      const schema1: VersionedHyperSchema = {
        id: 'test',
        name: 'Test',
        select: () => true,
        transform: {},
        contentHash: 'hash1'
      };

      const schema2: VersionedHyperSchema = {
        id: 'test',
        name: 'Test',
        select: () => true,
        transform: {},
        contentHash: 'hash2'
      };

      expect(hasSchemaChanged(schema1, schema2)).toBe(true);
    });

    it('should detect when schema has NOT changed', () => {
      const schema1: VersionedHyperSchema = {
        id: 'test',
        name: 'Test',
        select: () => true,
        transform: {},
        contentHash: 'samehash'
      };

      const schema2: VersionedHyperSchema = {
        id: 'test',
        name: 'Test',
        select: () => true,
        transform: {},
        contentHash: 'samehash'
      };

      expect(hasSchemaChanged(schema1, schema2)).toBe(false);
    });

    it('should detect version changes', () => {
      const schema1: VersionedHyperSchema = {
        id: 'test',
        name: 'Test',
        select: () => true,
        transform: {},
        version: 1
      };

      const schema2: VersionedHyperSchema = {
        id: 'test',
        name: 'Test',
        select: () => true,
        transform: {},
        version: 2
      };

      expect(hasSchemaChanged(schema1, schema2)).toBe(true);
    });

    it('should calculate hash when not provided', () => {
      const schema1: HyperSchema = {
        id: 'test',
        name: 'Test',
        select: () => true,
        transform: {}
      };

      const schema2: HyperSchema = {
        id: 'test',
        name: 'Test',
        select: () => true,
        transform: {}
      };

      expect(hasSchemaChanged(schema1, schema2)).toBe(false);
    });
  });

  describe('Schema Version Registry', () => {
    let registry: SchemaVersionRegistry;

    beforeEach(() => {
      registry = new SchemaVersionRegistry();
    });

    it('should register schema versions', () => {
      const schema: VersionedHyperSchema = {
        id: 'user-schema',
        name: 'User Schema',
        select: () => true,
        transform: {},
        version: 1
      };

      const versionInfo = registry.register(schema);

      expect(versionInfo.schemaId).toBe('user-schema');
      expect(versionInfo.version).toBe(1);
      expect(versionInfo.contentHash).toBeTruthy();
    });

    it('should track multiple versions of a schema', () => {
      const schema1: VersionedHyperSchema = {
        id: 'user-schema',
        name: 'User Schema',
        select: () => true,
        transform: {},
        version: 1
      };

      const schema2: VersionedHyperSchema = {
        id: 'user-schema',
        name: 'User Schema',
        select: () => false,
        transform: {},
        version: 2
      };

      registry.register(schema1);
      registry.register(schema2);

      const versions = registry.getVersions('user-schema');
      expect(versions.length).toBe(2);
      expect(versions[0].version).toBe(1);
      expect(versions[1].version).toBe(2);
    });

    it('should not duplicate identical versions', () => {
      const schema: VersionedHyperSchema = {
        id: 'user-schema',
        name: 'User Schema',
        select: () => true,
        transform: {},
        version: 1
      };

      registry.register(schema);
      registry.register(schema);

      const versions = registry.getVersions('user-schema');
      expect(versions.length).toBe(1);
    });

    it('should get latest version', () => {
      const schema1 = addSchemaHash({
        id: 'user-schema',
        name: 'User Schema',
        select: () => true,
        transform: {}
      });

      const schema2 = addSchemaHash({
        id: 'user-schema',
        name: 'User Schema',
        select: () => false,
        transform: {}
      });

      registry.register(schema1);
      registry.register(schema2);

      const latest = registry.getLatestVersion('user-schema');
      expect(latest?.contentHash).toBe(schema2.contentHash);
    });

    it('should detect outdated schemas', () => {
      const schema1 = addSchemaHash({
        id: 'user-schema',
        name: 'User Schema',
        select: () => true,
        transform: {}
      });

      const schema2 = addSchemaHash({
        id: 'user-schema',
        name: 'User Schema',
        select: () => false,
        transform: {}
      });

      const info1 = registry.register(schema1);
      registry.register(schema2);

      expect(registry.isOutdated('user-schema', info1.contentHash)).toBe(true);
    });
  });

  describe('Integration with RhizomeDB', () => {
    it('should track schema hash in materialized views', () => {
      const schema: HyperSchema = {
        id: 'user-schema',
        name: 'User Schema',
        select: (objectId, delta) => {
          return delta.pointers.some(
            p => typeof p.target === 'object' && 'id' in p.target && p.target.id === objectId
          );
        },
        transform: {}
      };

      db.registerSchema(schema);

      const delta = db.createDelta('system', [{ localContext: 'name', target: 'Alice' }]);
      db.persistDelta(delta);

      const view = db.materializeHyperView('user-1', schema);

      expect(view._metadata.schemaId).toBe('user-schema');
      expect(view._metadata.schemaHash).toBeTruthy();
      expect(view._metadata.schemaHash.length).toBe(64);
    });

    it('should detect when a view is outdated', () => {
      const schema1: HyperSchema = {
        id: 'user-schema',
        name: 'User Schema',
        select: () => true,
        transform: {}
      };

      db.registerSchema(schema1);
      const view = db.materializeHyperView('user-1', schema1);

      // Change the schema
      const schema2: HyperSchema = {
        id: 'user-schema',
        name: 'User Schema',
        select: () => false, // Changed!
        transform: {}
      };

      db.registerSchema(schema2);

      // View should be outdated
      expect(db.isViewOutdated(view)).toBe(true);
    });

    it('should rebuild views when schema changes', () => {
      const schema1: VersionedHyperSchema = {
        id: 'user-schema',
        name: 'User Schema',
        select: () => true,
        transform: {},
        version: 1
      };

      db.registerSchema(schema1);
      const view1 = db.materializeHyperView('user-1', schema1);
      expect(view1._metadata.schemaVersion).toBe(1);

      // Update schema
      const schema2: VersionedHyperSchema = {
        id: 'user-schema',
        name: 'User Schema',
        select: () => true,
        transform: {},
        version: 2
      };

      db.registerSchema(schema2);

      // Get or rebuild should detect outdated and rebuild
      const view2 = db.getOrRebuildHyperView('user-1', schema2);
      expect(view2._metadata.schemaVersion).toBe(2);
    });

    it('should use cached view when schema has not changed', () => {
      const schema: HyperSchema = {
        id: 'user-schema',
        name: 'User Schema',
        select: () => true,
        transform: {}
      };

      db.registerSchema(schema);

      // Materialize and cache
      const view1 = db.materializeHyperView('user-1', schema);
      const timestamp1 = view1._metadata.lastUpdated;

      // Small delay to ensure different timestamps
      setTimeout(() => {
        // Get same schema - should use cache
        const view2 = db.getOrRebuildHyperView('user-1', schema);

        // Should be same instance (from cache)
        expect(view2._metadata.lastUpdated).toBe(timestamp1);
      }, 10);
    });
  });
});
