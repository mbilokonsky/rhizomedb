#!/usr/bin/env npx ts-node
/**
 * RhizomeDB Dogfooding Script
 *
 * A simple CLI for interacting with a persistent RhizomeDB instance
 * used during development to track context, decisions, and notes.
 *
 * Usage:
 *   npx ts-node scripts/dogfood.ts <command> [args]
 *
 * Commands:
 *   stats                    - Show database statistics
 *   log [limit]              - Show recent deltas (default: 10)
 *   add <type> <content>     - Add a new entry (types: note, decision, task, context)
 *   query <targetId>         - Show all deltas for a target
 *   negate <deltaId> [reason] - Negate a delta
 */

import { LevelDBStore } from '../src/storage/leveldb-store';
import * as path from 'path';

const DB_PATH = path.join(__dirname, '../../.rhizome/dev');
const AUTHOR = 'claude-dev';

async function getDB(): Promise<LevelDBStore> {
  const db = new LevelDBStore({
    dbPath: DB_PATH,
    storage: 'leveldb'
  });
  // Wait for DB to be ready
  await new Promise(resolve => setTimeout(resolve, 100));
  return db;
}

async function showStats(): Promise<void> {
  const db = await getDB();
  try {
    const stats = await db.getStats();
    console.log('\nRhizomeDB Statistics');
    console.log('====================');
    console.log(`System ID: ${stats.systemId}`);
    console.log(`Total Deltas: ${stats.totalDeltas}`);
    console.log(`Cached Views: ${stats.cachedViews}`);
    console.log(`Active Subscriptions: ${stats.activeSubscriptions}`);
    console.log(`Uptime: ${Math.round(stats.uptime / 1000)}s`);
    console.log(`Storage: ${stats.storageType}`);
  } finally {
    await db.close();
  }
}

async function showLog(limit: number = 10): Promise<void> {
  const db = await getDB();
  try {
    const deltas: Array<{
      id: string;
      timestamp: number;
      author: string;
      pointers: Array<{ role: string; target: unknown }>;
    }> = [];

    for await (const delta of db.scanDeltas()) {
      deltas.push(delta);
    }

    // Sort by timestamp descending and take limit
    deltas.sort((a, b) => b.timestamp - a.timestamp);
    const recent = deltas.slice(0, limit);

    console.log(`\nRecent Deltas (${recent.length} of ${deltas.length})`);
    console.log('='.repeat(50));

    for (const delta of recent) {
      const date = new Date(delta.timestamp).toISOString();
      console.log(`\n[${delta.id.slice(0, 8)}] ${date}`);
      console.log(`  Author: ${delta.author}`);
      for (const ptr of delta.pointers) {
        const target =
          typeof ptr.target === 'object' && ptr.target !== null
            ? JSON.stringify(ptr.target)
            : String(ptr.target);
        console.log(`  ${ptr.role}: ${target}`);
      }
    }
  } finally {
    await db.close();
  }
}

async function addEntry(type: string, content: string): Promise<void> {
  const db = await getDB();
  try {
    const entryId = `${type}-${Date.now()}`;

    // Delta 1: Assert the entry's type
    const typeDelta = db.createDelta(AUTHOR, [
      { role: 'typed', target: { id: entryId, context: 'type' } },
      { role: 'type', target: type }
    ]);

    // Delta 2: Assert the entry's content
    const contentDelta = db.createDelta(AUTHOR, [
      { role: 'described', target: { id: entryId, context: 'content' } },
      { role: 'content', target: content }
    ]);

    await db.persistDelta(typeDelta);
    await db.persistDelta(contentDelta);

    console.log(`\nCreated ${type} entry`);
    console.log(`  Entry ID: ${entryId}`);
    console.log(`  Type Delta: ${typeDelta.id}`);
    console.log(`  Content Delta: ${contentDelta.id}`);
    console.log(`  Content: ${content}`);
  } finally {
    await db.close();
  }
}

async function queryTarget(targetId: string): Promise<void> {
  const db = await getDB();
  try {
    const deltas = await db.queryDeltas({
      targetIds: [targetId]
    });

    console.log(`\nDeltas targeting "${targetId}" (${deltas.length} found)`);
    console.log('='.repeat(50));

    for (const delta of deltas) {
      const date = new Date(delta.timestamp).toISOString();
      console.log(`\n[${delta.id.slice(0, 8)}] ${date}`);
      for (const ptr of delta.pointers) {
        const target =
          typeof ptr.target === 'object' && ptr.target !== null
            ? JSON.stringify(ptr.target)
            : String(ptr.target);
        console.log(`  ${ptr.role}: ${target}`);
      }
    }
  } finally {
    await db.close();
  }
}

async function negateDelta(deltaId: string, reason?: string): Promise<void> {
  const db = await getDB();
  try {
    const negation = db.negateDelta(AUTHOR, deltaId, reason);
    await db.persistDelta(negation);

    console.log(`\nNegated delta ${deltaId}`);
    console.log(`  Negation ID: ${negation.id}`);
    if (reason) {
      console.log(`  Reason: ${reason}`);
    }
  } finally {
    await db.close();
  }
}

function printUsage(): void {
  console.log(`
RhizomeDB Dogfooding CLI

Usage: npx ts-node scripts/dogfood.ts <command> [args]

Commands:
  stats                      Show database statistics
  log [limit]                Show recent deltas (default: 10)
  add <type> <content>       Add a new entry
                             Types: note, decision, task, context
  query <targetId>           Show all deltas for a target
  negate <deltaId> [reason]  Negate a delta

Examples:
  npx ts-node scripts/dogfood.ts stats
  npx ts-node scripts/dogfood.ts log 5
  npx ts-node scripts/dogfood.ts add note "Reviewed the schema design"
  npx ts-node scripts/dogfood.ts add decision "Use LevelDB for persistence"
  npx ts-node scripts/dogfood.ts query task-123
  npx ts-node scripts/dogfood.ts negate abc123 "Incorrect information"
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'stats':
        await showStats();
        break;
      case 'log':
        await showLog(parseInt(args[1]) || 10);
        break;
      case 'add':
        if (args.length < 3) {
          console.error('Error: add requires <type> and <content>');
          printUsage();
          process.exit(1);
        }
        await addEntry(args[1], args.slice(2).join(' '));
        break;
      case 'query':
        if (!args[1]) {
          console.error('Error: query requires <targetId>');
          printUsage();
          process.exit(1);
        }
        await queryTarget(args[1]);
        break;
      case 'negate':
        if (!args[1]) {
          console.error('Error: negate requires <deltaId>');
          printUsage();
          process.exit(1);
        }
        await negateDelta(args[1], args.slice(2).join(' ') || undefined);
        break;
      case 'help':
      case '--help':
      case '-h':
        printUsage();
        break;
      default:
        if (command) {
          console.error(`Unknown command: ${command}`);
        }
        printUsage();
        process.exit(command ? 1 : 0);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
