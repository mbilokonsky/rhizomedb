/**
 * Delta indexing system for query performance optimization
 *
 * Creates and maintains secondary indexes on commonly-queried delta fields
 * to dramatically speed up filtered queries.
 */

import { Delta, DeltaFilter, IndexStats } from '../core/types';
import { isDomainNodeReference, isReference } from '../core/validation';

/**
 * Secondary indexes for delta queries
 */
export class DeltaIndexes {
  // Map from target object ID to delta IDs
  private targetIdIndex: Map<string, Set<string>> = new Map();

  // Map from target context to delta IDs
  private targetContextIndex: Map<string, Set<string>> = new Map();

  // Map from author to delta IDs
  private authorIndex: Map<string, Set<string>> = new Map();

  // Map from system to delta IDs
  private systemIndex: Map<string, Set<string>> = new Map();

  // Sorted array of {timestamp, deltaId} for range queries
  private timestampIndex: Array<{ timestamp: number; deltaId: string }> = [];

  /**
   * Add a delta to all relevant indexes
   */
  addDelta(delta: Delta): void {
    // Index by target IDs
    for (const pointer of delta.pointers) {
      if (isReference(pointer.target)) {
        this.addToIndex(this.targetIdIndex, pointer.target.id, delta.id);

        // Index by target context
        if (pointer.target.context) {
          this.addToIndex(this.targetContextIndex, pointer.target.context, delta.id);
        }
      }
    }

    // Index by author
    this.addToIndex(this.authorIndex, delta.author, delta.id);

    // Index by system
    this.addToIndex(this.systemIndex, delta.system, delta.id);

    // Index by timestamp (maintain sorted order)
    this.insertTimestamp(delta.timestamp, delta.id);
  }

  /**
   * Remove a delta from all indexes
   */
  removeDelta(delta: Delta): void {
    // Remove from target ID and context indexes
    for (const pointer of delta.pointers) {
      if (isReference(pointer.target)) {
        this.removeFromIndex(this.targetIdIndex, pointer.target.id, delta.id);

        // Remove from target context index
        if (pointer.target.context) {
          this.removeFromIndex(this.targetContextIndex, pointer.target.context, delta.id);
        }
      }
    }

    // Remove from author index
    this.removeFromIndex(this.authorIndex, delta.author, delta.id);

    // Remove from system index
    this.removeFromIndex(this.systemIndex, delta.system, delta.id);

    // Remove from timestamp index
    this.removeTimestamp(delta.timestamp, delta.id);
  }

  /**
   * Get delta IDs for a specific target object
   */
  getDeltaIdsByTargetId(targetId: string): Set<string> {
    return this.targetIdIndex.get(targetId) || new Set();
  }

  /**
   * Get delta IDs for a specific target context
   */
  getDeltaIdsByTargetContext(targetContext: string): Set<string> {
    return this.targetContextIndex.get(targetContext) || new Set();
  }

  /**
   * Get delta IDs for a specific author
   */
  getDeltaIdsByAuthor(author: string): Set<string> {
    return this.authorIndex.get(author) || new Set();
  }

  /**
   * Get delta IDs for a specific system
   */
  getDeltaIdsBySystem(system: string): Set<string> {
    return this.systemIndex.get(system) || new Set();
  }

  /**
   * Get delta IDs within a timestamp range
   */
  getDeltaIdsByTimestampRange(start?: number, end?: number): Set<string> {
    const result = new Set<string>();

    for (const entry of this.timestampIndex) {
      if (start !== undefined && entry.timestamp < start) {
        continue;
      }

      if (end !== undefined && entry.timestamp > end) {
        break; // Since sorted, we can break early
      }

      result.add(entry.deltaId);
    }

    return result;
  }

  /**
   * Query delta IDs using filter (optimized with indexes)
   *
   * Returns the smallest set of candidate delta IDs based on the filter.
   * Caller should still apply full filter to these candidates.
   */
  queryDeltaIds(filter: DeltaFilter): Set<string> | null {
    const candidateSets: Set<string>[] = [];

    // Use indexes to get candidate sets
    if (filter.targetIds && filter.targetIds.length > 0) {
      const targetSet = new Set<string>();
      for (const targetId of filter.targetIds) {
        const deltaIds = this.getDeltaIdsByTargetId(targetId);
        for (const id of deltaIds) {
          targetSet.add(id);
        }
      }
      candidateSets.push(targetSet);
    }

    if (filter.targetContexts && filter.targetContexts.length > 0) {
      const contextSet = new Set<string>();
      for (const context of filter.targetContexts) {
        const deltaIds = this.getDeltaIdsByTargetContext(context);
        for (const id of deltaIds) {
          contextSet.add(id);
        }
      }
      candidateSets.push(contextSet);
    }

    if (filter.authors && filter.authors.length > 0) {
      const authorSet = new Set<string>();
      for (const author of filter.authors) {
        const deltaIds = this.getDeltaIdsByAuthor(author);
        for (const id of deltaIds) {
          authorSet.add(id);
        }
      }
      candidateSets.push(authorSet);
    }

    if (filter.systems && filter.systems.length > 0) {
      const systemSet = new Set<string>();
      for (const system of filter.systems) {
        const deltaIds = this.getDeltaIdsBySystem(system);
        for (const id of deltaIds) {
          systemSet.add(id);
        }
      }
      candidateSets.push(systemSet);
    }

    if (filter.timestampRange) {
      const { start, end } = filter.timestampRange;
      const timestampSet = this.getDeltaIdsByTimestampRange(start, end);
      candidateSets.push(timestampSet);
    }

    // If no indexed fields in filter, return null (scan all deltas)
    if (candidateSets.length === 0) {
      return null;
    }

    // Intersect all candidate sets to get final set
    return this.intersectSets(candidateSets);
  }

  /**
   * Get index statistics
   */
  getStats(): IndexStats {
    // Estimate memory usage
    let memory = 0;

    // Each Map entry + Set overhead
    memory += this.targetIdIndex.size * 100; // Rough estimate
    memory += this.targetContextIndex.size * 100;
    memory += this.authorIndex.size * 100;
    memory += this.systemIndex.size * 100;
    memory += this.timestampIndex.length * 50;

    return {
      targetIdIndexSize: this.targetIdIndex.size,
      targetContextIndexSize: this.targetContextIndex.size,
      authorIndexSize: this.authorIndex.size,
      systemIndexSize: this.systemIndex.size,
      timestampIndexSize: this.timestampIndex.length,
      estimatedMemory: memory
    };
  }

  /**
   * Clear all indexes
   */
  clear(): void {
    this.targetIdIndex.clear();
    this.targetContextIndex.clear();
    this.authorIndex.clear();
    this.systemIndex.clear();
    this.timestampIndex = [];
  }

  // Helper methods

  private addToIndex(index: Map<string, Set<string>>, key: string, deltaId: string): void {
    let set = index.get(key);
    if (!set) {
      set = new Set();
      index.set(key, set);
    }
    set.add(deltaId);
  }

  private removeFromIndex(index: Map<string, Set<string>>, key: string, deltaId: string): void {
    const set = index.get(key);
    if (set) {
      set.delete(deltaId);
      if (set.size === 0) {
        index.delete(key);
      }
    }
  }

  private insertTimestamp(timestamp: number, deltaId: string): void {
    // Binary search for insertion point
    let left = 0;
    let right = this.timestampIndex.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.timestampIndex[mid].timestamp < timestamp) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    this.timestampIndex.splice(left, 0, { timestamp, deltaId });
  }

  private removeTimestamp(timestamp: number, deltaId: string): void {
    const index = this.timestampIndex.findIndex(
      entry => entry.timestamp === timestamp && entry.deltaId === deltaId
    );

    if (index !== -1) {
      this.timestampIndex.splice(index, 1);
    }
  }

  private intersectSets(sets: Set<string>[]): Set<string> {
    if (sets.length === 0) {
      return new Set();
    }

    if (sets.length === 1) {
      return sets[0];
    }

    // Start with smallest set for efficiency
    sets.sort((a, b) => a.size - b.size);

    const result = new Set<string>();
    const smallest = sets[0];

    for (const item of smallest) {
      if (sets.every(set => set.has(item))) {
        result.add(item);
      }
    }

    return result;
  }
}
