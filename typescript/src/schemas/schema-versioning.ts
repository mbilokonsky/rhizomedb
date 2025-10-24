/**
 * Schema versioning utilities
 *
 * Tracks schema versions to detect when materialized views need rebuilding.
 * Supports both explicit version numbers and content-based hashing.
 */

import { HyperSchema } from '../core/types';
import { createHash } from 'crypto';

/**
 * Extended HyperSchema with versioning information
 */
export interface VersionedHyperSchema extends HyperSchema {
  /** Optional explicit version number */
  version?: number;

  /** Optional content hash for automatic version detection */
  contentHash?: string;
}

/**
 * Calculate a content hash for a HyperSchema
 *
 * This creates a deterministic hash based on the schema's structure.
 * Changes to selection function or transformation rules will change the hash.
 *
 * @param schema - The schema to hash
 * @returns SHA-256 hash of the schema content
 */
export function calculateSchemaHash(schema: HyperSchema): string {
  // Create a normalized representation of the schema
  const normalized = {
    id: schema.id,
    name: schema.name,
    // Convert functions to strings for hashing
    select: schema.select.toString(),
    // Sort transformation rules by key for deterministic ordering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    transform: Object.keys(schema.transform)
      .sort()
      .reduce(
        (acc, key) => {
          const rule = schema.transform[key];
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          acc[key] = {
            schema:
              typeof rule.schema === 'string'
                ? rule.schema
                : typeof rule.schema === 'object' && 'id' in rule.schema
                  ? rule.schema.id
                  : JSON.stringify(rule.schema),
            when: rule.when ? rule.when.toString() : undefined
          };
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return acc;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any
      )
  };

  const content = JSON.stringify(normalized);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Attach a content hash to a schema
 *
 * @param schema - The schema to hash
 * @returns The schema with contentHash field added
 */
export function addSchemaHash(schema: HyperSchema): VersionedHyperSchema {
  return {
    ...schema,
    contentHash: calculateSchemaHash(schema)
  };
}

/**
 * Check if a schema has changed based on version or content hash
 *
 * @param oldSchema - The previous version of the schema
 * @param newSchema - The current version of the schema
 * @returns true if the schemas are different
 */
export function hasSchemaChanged(
  oldSchema: VersionedHyperSchema,
  newSchema: VersionedHyperSchema
): boolean {
  // If both have explicit versions, compare those
  if (oldSchema.version !== undefined && newSchema.version !== undefined) {
    return oldSchema.version !== newSchema.version;
  }

  // If both have content hashes, compare those
  if (oldSchema.contentHash && newSchema.contentHash) {
    return oldSchema.contentHash !== newSchema.contentHash;
  }

  // If one has a hash and the other doesn't, calculate missing hash
  const oldHash = oldSchema.contentHash || calculateSchemaHash(oldSchema);
  const newHash = newSchema.contentHash || calculateSchemaHash(newSchema);

  return oldHash !== newHash;
}

/**
 * Schema version information
 */
export interface SchemaVersionInfo {
  /** Schema ID */
  schemaId: string;

  /** Explicit version number if available */
  version?: number;

  /** Content hash */
  contentHash: string;

  /** When this version was first registered */
  registeredAt: number;
}

/**
 * Registry for tracking schema versions
 */
export class SchemaVersionRegistry {
  private versions = new Map<string, SchemaVersionInfo[]>();

  /**
   * Register a new schema version
   *
   * @param schema - The schema to register
   * @returns The version info for this schema
   */
  register(schema: VersionedHyperSchema): SchemaVersionInfo {
    const versionInfo: SchemaVersionInfo = {
      schemaId: schema.id,
      version: schema.version,
      contentHash: schema.contentHash || calculateSchemaHash(schema),
      registeredAt: Date.now()
    };

    const versions = this.versions.get(schema.id) || [];

    // Check if this exact version is already registered
    const existing = versions.find(
      v => v.contentHash === versionInfo.contentHash && v.version === versionInfo.version
    );

    if (!existing) {
      versions.push(versionInfo);
      this.versions.set(schema.id, versions);
    }

    return versionInfo;
  }

  /**
   * Get all versions of a schema
   *
   * @param schemaId - The schema ID
   * @returns Array of version info, sorted by registration time
   */
  getVersions(schemaId: string): SchemaVersionInfo[] {
    return this.versions.get(schemaId) || [];
  }

  /**
   * Get the latest version of a schema
   *
   * @param schemaId - The schema ID
   * @returns The most recent version info, or undefined
   */
  getLatestVersion(schemaId: string): SchemaVersionInfo | undefined {
    const versions = this.getVersions(schemaId);
    if (versions.length === 0) return undefined;
    return versions[versions.length - 1];
  }

  /**
   * Check if a schema version is outdated
   *
   * @param schemaId - The schema ID
   * @param contentHash - The content hash to check
   * @returns true if this is not the latest version
   */
  isOutdated(schemaId: string, contentHash: string): boolean {
    const latest = this.getLatestVersion(schemaId);
    if (!latest) return false;
    return latest.contentHash !== contentHash;
  }

  /**
   * Clear all version history
   */
  clear(): void {
    this.versions.clear();
  }
}
