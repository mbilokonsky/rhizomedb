# Core Module

Foundational types and validation logic for RhizomeDB.

## Files

### `types.ts`
Core type definitions for RhizomeDB based on the Technical Specification v0.1.

**Exports:**
- `Delta`, `Pointer`, `Primitive` - Core delta types
- `HyperSchema`, `SelectionFunction`, `TransformationRules` - Schema definitions
- `HyperView`, `MaterializedHyperView` - View types
- `View`, `ViewSchema`, `ResolutionStrategy` - View resolution types
- `DeltaFilter` - Query filtering
- `RhizomeInstance`, `DeltaAuthor`, `DeltaStore`, `StreamConsumer`, `StreamProducer`, `IndexMaintainer` - Instance capability interfaces
- `RhizomeConfig`, `InstanceStats`, `CacheStats`, `IndexStats` - Configuration and statistics
- `PrimitiveHyperSchema`, `PrimitiveSchemas` - Primitive type schemas

**Key Concepts:**
- **Delta**: Immutable assertion with id, timestamp, author, system, and pointers
- **Pointer**: Contextualized link from delta to target (object or primitive)
- **HyperSchema**: Defines how to construct a HyperView from deltas (selection + transformation)
- **HyperView**: Structured organization of deltas representing a domain object
- **MaterializedHyperView**: Cached HyperView with metadata (schema version, update timestamp)

### `validation.ts`
Validation utilities for deltas, pointers, and references.

**Exports:**
- `validateDelta(delta: Delta): void` - Validates delta structure
- `isDomainNodeReference(target: any): boolean` - Type guard for object references
- `isPointer(obj: any): boolean` - Type guard for pointers

**Validation Rules:**
- Deltas must have id, timestamp, author, system, and pointers
- Pointers must have localContext and target
- Timestamps must be positive numbers
- Author and system must be non-empty strings

## Usage

```typescript
import { Delta, HyperSchema, validateDelta } from './core/types';
import { isDomainNodeReference } from './core/validation';

// Create and validate a delta
const delta: Delta = {
  id: '123',
  timestamp: Date.now(),
  author: 'user-1',
  system: 'instance-1',
  pointers: [
    { localContext: 'name', target: 'Alice' },
    { localContext: 'friend', target: { id: 'user-2' }, targetContext: 'friends' }
  ]
};

validateDelta(delta); // Throws if invalid

// Check if pointer target is an object reference
const pointer = delta.pointers[1];
if (isDomainNodeReference(pointer.target)) {
  console.log(`References object: ${pointer.target.id}`);
}
```

## Dependencies

- None (pure TypeScript types and validation logic)
- Optional: `graphql` package for PrimitiveSchemas (gracefully degrades if not available)

## Testing

No dedicated test file - validation is tested indirectly through storage and schema tests.
