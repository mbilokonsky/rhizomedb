/**
 * Shared CLI utilities for RhizomeDB agent-first CLI
 *
 * Every CLI script follows this contract:
 * - Input: JSON via process.argv[2] or stdin
 * - Output: JSON to stdout on success
 * - Errors: JSON {"error": "message"} to stderr, exit code 1
 * - State: LevelDB at .rhizome/data (override via RHIZOME_DATA env)
 */

import * as path from 'path';
import * as fs from 'fs';
import { LevelDBStore } from '../src/storage/leveldb-store';

/** Resolve data directory from env or default */
export function getDataDir(): string {
  return process.env.RHIZOME_DATA || path.resolve(process.cwd(), '.rhizome', 'data');
}

/** Get the system ID file path (persists across invocations) */
function getSystemIdPath(): string {
  const dataDir = getDataDir();
  return path.resolve(path.dirname(dataDir), 'system-id');
}

/** Read or create a persistent system ID */
export function getSystemId(): string {
  const idPath = getSystemIdPath();
  try {
    return fs.readFileSync(idPath, 'utf-8').trim();
  } catch {
    // Will be created during init
    return '';
  }
}

/** Save system ID to disk */
export function saveSystemId(id: string): void {
  const idPath = getSystemIdPath();
  fs.mkdirSync(path.dirname(idPath), { recursive: true });
  fs.writeFileSync(idPath, id, 'utf-8');
}

/** Open a LevelDB store, reusing the persisted system ID */
export async function openStore(): Promise<LevelDBStore> {
  const dataDir = getDataDir();

  if (!fs.existsSync(dataDir)) {
    fail('Not initialized. Run: npx ts-node cli/init.ts');
  }

  const systemId = getSystemId();
  const store = new LevelDBStore({
    storage: 'leveldb',
    dbPath: dataDir,
    ...(systemId ? { systemId } : {})
  });

  await store.waitForReady();

  return store;
}

/**
 * Run a function with a store, ensuring the store is always closed.
 * Handles errors by closing the store and writing error JSON to stderr.
 */
export async function withStore(fn: (store: LevelDBStore) => Promise<void>): Promise<void> {
  const store = await openStore();
  try {
    await fn(store);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await closeAndFail(store, message);
  }
}

/** Parse JSON input from argv[2] or stdin */
export async function parseInput(): Promise<Record<string, unknown>> {
  const arg = process.argv[2];

  if (arg) {
    try {
      return JSON.parse(arg) as Record<string, unknown>;
    } catch {
      fail(`Invalid JSON argument: ${arg}`);
    }
  }

  // Try reading from stdin (non-interactive only)
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf-8').trim();
    if (raw) {
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        fail(`Invalid JSON on stdin: ${raw.slice(0, 100)}`);
      }
    }
  }

  // No input — return empty object (some commands need no args)
  return {};
}

/** Write JSON to stdout */
export function output(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

/** Write error JSON to stderr and exit */
export function fail(message: string): never {
  process.stderr.write(JSON.stringify({ error: message }) + '\n');
  process.exit(1);
}

/** Safely close a store and exit */
export async function closeAndExit(store: LevelDBStore, data: unknown): Promise<void> {
  output(data);
  await store.close();
  process.exit(0);
}

/** Safely close a store, write error, and exit */
export async function closeAndFail(store: LevelDBStore, message: string): Promise<void> {
  process.stderr.write(JSON.stringify({ error: message }) + '\n');
  await store.close();
  process.exit(1);
}

/** Run an async main function with error handling */
export function run(main: () => Promise<void>): void {
  main().catch((err: Error) => {
    fail(err.message || String(err));
  });
}
