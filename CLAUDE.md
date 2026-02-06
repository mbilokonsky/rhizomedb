# RhizomeDB Development Guide

## Vision & Strategic Direction

RhizomeDB is a rhizomatic database using immutable delta-CRDTs as hyperedges in a hypergraph that treats state as a side-effect assembled at query-time. The target is not "a database product." The target is a **substrate for autonomous agent coordination**, and emergent possibilities.

### Core Architectural Principles

- **No single source of truth.** Different observers can hold different views of the same data via query-time assembly.
- **Schemas are data.** Everything except the Delta schema itself is composed of deltas. Schemas flow through the system like any other data.
- **Anti-imperial by design.** No forced consensus, no last-write-wins, no central authority. Trust-based resolution at the query layer. "Who holds the deltas and who chooses the resolution strategy" is a governance question baked into the data layer.

### The Frontier (within sight)

- Deltas that define functions which when invoked generate new deltas based on input deltas
- This creates homoiconic (code-as-data), distributed (CRDT), autopoietic (self-producing) structures
- "Organisms" in idea space — sets of deltas that maintain their own coherence
- Self-similarity quantification: measuring when a set of deltas crosses from "collection of assertions" into "self-maintaining structure"

### Release Philosophy

- Not a startup. Not a product. Not patented.
- Ideally released through the distributed agent ecosystem rather than through traditional human-founder channels
- The architecture should distribute itself rhizomatically
- **MCP is transitional.** The MCP server exists but MCP as a standard is likely dissolving as agents move toward local harnesses with shell access. The real integration story is RhizomeDB as a library/local process, with federation between instances via delta exchange over any available transport.


---

## Project Overview

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

## Delta Semantics

### Role Naming Conventions

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

### Atomicity

**Independent facts should be separate deltas** (each can be negated independently).
**Inseparable facts** belong in one delta (e.g., a transaction's buyer/seller/price).

### Ordering

The data layer is fundamentally unordered - deltas exist in superposition. **Ordering is a property of View-level reduction**, not data-level structure. Timestamps, position hints, and sequence annotations are just more facts in the rhizome - they inform ordering but don't determine it. The View resolver collapses superposition into sequence.

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