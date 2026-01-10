# RhizomeDB Development Guide

## Project Overview

RhizomeDB is a rhizomatic database using immutable delta-CRDTs as hyperedges in a hypergraph. State is assembled at query time from an append-only stream of deltas.

### Core Concepts

- **Delta**: Immutable assertion with id, timestamp, author, system, and pointers
- **Pointer**: References a target (domain object or primitive) with a role
- **HyperSchema**: Defines how to select and transform deltas into a HyperView
- **HyperView**: Filtered/organized deltas for a domain object
- **View**: Final resolved object with conflicts handled

### Architecture

```
Deltas (append-only stream)
    ↓ HyperSchema (selection + transformation)
HyperView (organized deltas with provenance)
    ↓ View Resolver (conflict resolution)
View (clean domain object)
```

## Repository Structure

```
/
├── README.md              # Main documentation
├── CLAUDE.md              # This file
├── spec/spec.md           # Formal specification
├── docs/                  # Additional documentation
└── typescript/            # Reference implementation
    ├── src/
    │   ├── core/          # Types and validation
    │   ├── storage/       # RhizomeDB and LevelDBStore
    │   ├── schemas/       # HyperSchema and HyperView
    │   ├── queries/       # View resolution, time-travel, negation
    │   ├── streaming/     # Subscriptions and backpressure
    │   ├── federation/    # Multi-instance sync
    │   └── integrations/  # GraphQL integration
    └── examples/          # Usage examples
```

## Development Workflow

### Git Workflow

- **Always use PR-based workflow** - create a branch, commit, push, open PR
- Never commit directly to main
- Branch naming: `feature/description` or `fix/description`

### Commands

```bash
cd typescript

# Build
npm run build

# Test
npm test

# Lint
npm run lint
npm run lint:fix

# Format
npm run format

# Type check only
npx tsc --noEmit
```

### Code Style

- ESLint + Prettier configured (runs on commit via husky)
- Strict TypeScript
- No `any` types without justification

## Dogfooding

We use RhizomeDB to track development context. The database persists to `.rhizome/` directory.

### Delta Semantics

#### Role Naming Conventions

**Annotation Pattern (Object + Primitive)**

When annotating a domain object with a primitive value, use `{past-participle}` / `{noun}`:
- `named` / `name` - asserting something's name
- `typed` / `type` - asserting something's type
- `described` / `content` - asserting something's content
- `titled` / `title`, `valued` / `value`, etc.

```typescript
{ role: 'named', target: { id: personId, context: 'name' } },
{ role: 'name', target: 'Alice Smith' }
```

**Relationship Pattern (Object + Object)**

When relating two domain objects, both roles are nouns - neither is privileged:
- `parent` / `child`
- `author` / `work`
- `actor` / `movie`
- `creator` / `creation`

```typescript
{ role: 'parent', target: { id: folderId, context: 'children' } },
{ role: 'child', target: { id: fileId, context: 'parent' } }
```

The delta is readable from either direction. The `context` on each target determines where the delta appears when querying that object.

#### Atomicity

**Independent facts should be separate deltas** (each can be negated independently).
**Inseparable facts** belong in one delta (e.g., a transaction's buyer/seller/price).

#### Ordering

The data layer is fundamentally unordered - deltas exist in superposition. **Ordering is a property of View-level reduction**, not data-level structure. Timestamps, position hints, and sequence annotations are just more facts in the rhizome - they inform ordering but don't determine it. The View resolver collapses superposition into sequence.

### Quick Usage

```typescript
import { LevelDBStore } from './src/storage/leveldb-store';

const db = new LevelDBStore({
  dbPath: '.rhizome/dev',
  storage: 'leveldb'
});

const taskId = 'task-123';

// Delta 1: Assert the task's type
const typeDelta = db.createDelta('claude', [
  { role: 'typed', target: { id: taskId, context: 'type' } },
  { role: 'type', target: 'task' }
]);

// Delta 2: Assert the task's name
const nameDelta = db.createDelta('claude', [
  { role: 'named', target: { id: taskId, context: 'name' } },
  { role: 'name', target: 'Implement feature X' }
]);

await db.persistDelta(typeDelta);
await db.persistDelta(nameDelta);

// Query deltas targeting this task
const taskDeltas = await db.queryDeltas({
  targetIds: [taskId]
});

await db.close();
```

### Dogfooding Script

Run from the typescript directory:

```bash
npx ts-node scripts/dogfood.ts <command> [args]
```

Commands:
- `stats` - Show database statistics
- `log` - Show recent deltas
- `add <type> <content>` - Add a new entry

## Key Files

- `typescript/src/storage/instance.ts` - In-memory RhizomeDB
- `typescript/src/storage/leveldb-store.ts` - Persistent LevelDB storage
- `typescript/src/core/types.ts` - Core type definitions
- `typescript/src/schemas/hyperview.ts` - HyperView construction
- `typescript/src/queries/view-resolver.ts` - View resolution

## Testing

Tests are co-located with source files (`*.test.ts`). Run with:

```bash
npm test                    # All tests
npm test -- --watch         # Watch mode
npm test -- path/to/file    # Specific file
```

## Open Questions

See README.md "Open Questions" section for unresolved design challenges.
