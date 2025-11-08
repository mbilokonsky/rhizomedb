/**
 * Configuration for RhizomeDB MCP Server
 */

import * as path from 'path';
import * as os from 'os';

export interface MCPServerConfig {
  /** Storage backend: 'memory' or 'leveldb' */
  storage: 'memory' | 'leveldb';

  /** Path to LevelDB storage (if storage === 'leveldb') */
  storagePath?: string;

  /** System ID for this instance */
  systemId?: string;

  /** Cache size for materialized views */
  cacheSize?: number;

  /** Enable indexing for faster queries */
  enableIndexing?: boolean;

  /** Validate schemas on registration */
  validateSchemas?: boolean;
}

/**
 * Load configuration from environment variables with sensible defaults
 */
export function loadConfig(): MCPServerConfig {
  const storage = (process.env.RHIZOME_STORAGE as 'memory' | 'leveldb') || 'memory';

  const defaultPath = path.join(os.homedir(), '.rhizomedb');
  const storagePath = process.env.RHIZOME_PATH || defaultPath;

  const systemId = process.env.RHIZOME_SYSTEM_ID || undefined;

  const cacheSize = process.env.RHIZOME_CACHE_SIZE
    ? parseInt(process.env.RHIZOME_CACHE_SIZE, 10)
    : 10000;

  const enableIndexing = process.env.RHIZOME_ENABLE_INDEXING !== 'false';
  const validateSchemas = process.env.RHIZOME_VALIDATE_SCHEMAS === 'true';

  return {
    storage,
    storagePath,
    systemId,
    cacheSize,
    enableIndexing,
    validateSchemas
  };
}
