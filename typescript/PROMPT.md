# Task: Build an Agent-First CLI for RhizomeDB

You are building a `cli/` directory in `/Users/mykola/vault/repos/rhizomedb/typescript/` containing standalone TypeScript scripts that let agents interact with RhizomeDB via shell commands.

## Design Contract

Every script in `cli/` follows this contract:
- Input: Single JSON argument via process.argv[2], or piped via stdin
- Output: JSON to stdout on success
- Errors: JSON with an "error" key to stderr, exit code 1
- State: Persisted to LevelDB at .rhizome/data (override via RHIZOME_DATA env var)
- No interactivity: No prompts, no colors, no spinners, no --help flags
- No CLI framework: No commander, no yargs. JSON.parse is the argument parser.

## Scripts to Build

Build these in order. Each should work independently. Write tests.

1. `cli/common.ts` - Shared utilities: open LevelDB store (respecting RHIZOME_DATA env), JSON parse args/stdin, error formatting, clean shutdown. Not a script itself, just the shared plumbing.

2. `cli/init.ts` - Initialize a .rhizome/data directory. Print systemId and dataDir as JSON. Idempotent (running twice is fine).

3. `cli/status.ts` - Print instance stats: delta count, schema count, data dir path. No args needed.

4. `cli/delta-create.ts` - Create and persist a delta. Input JSON with author and pointers. System ID and timestamp are auto-assigned. Output: the full persisted delta as JSON.

5. `cli/delta-get.ts` - Get a specific delta by ID. Input JSON with id. Output: the delta JSON, or error if not found.

6. `cli/delta-list.ts` - List deltas matching optional filters. Input JSON with optional author, targetId, after (timestamp), before (timestamp), limit (number). Output: JSON with deltas array.

7. `cli/negate.ts` - Negate a delta. Input JSON with deltaId, author, and optional reason. Output: the negation delta.

8. `cli/query.ts` - Query a domain object. Input JSON with objectId, optional schema (schemaId string), optional resolve (boolean, default true). If resolve is true, return the resolved View. If false, return the raw HyperView. Output: the view/hyperview JSON.

9. `cli/time-travel.ts` - Query at a past timestamp. Input JSON with objectId, timestamp (number), optional schema. Output: the resolved view as of that time.

10. `cli/schema-register.ts` - Register a HyperSchema. Input: a schema definition as JSON. Output: confirmation with schema ID.

11. `cli/schema-list.ts` - List registered schemas. No args. Output: JSON with schemas array.

## Package.json Integration

Add a few convenience scripts to package.json. Only a few - the scripts are discoverable by listing the cli/ directory. Do not clutter package.json.

## What NOT to Do

- Do NOT install any new npm packages for CLI parsing
- Do NOT build an MCP server
- Do NOT add interactive/TUI features
- Do NOT build federation/daemon features (that is a different shape of problem)
- Do NOT modify existing library code in src/ - the CLI is a consumer of the library
- Do NOT over-engineer. Each script should be under 100 lines. The common.ts can be longer.
- Do NOT remove the GraphQL integration - it is a separate concern

## Quality Checks

After each iteration:
1. Run npx tsc --noEmit to check types - must pass
2. Run npm test to check existing tests still pass
3. Test your CLI scripts manually: init, create a delta, query it back
4. Ensure JSON output is parseable (no stray console.log noise)

## Completion

When all 11 scripts work (init through schema-list), and you can demonstrate a round-trip (init, create deltas, query, negate, query again showing negation), output:

<promise>CLI COMPLETE</promise>
