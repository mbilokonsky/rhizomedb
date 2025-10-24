/**
 * Time-Travel Query API
 *
 * Provides ability to query database state at any point in time by reconstructing
 * HyperViews using only deltas that existed at that timestamp.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { RhizomeDB } from '../storage/instance';
import { HyperSchema, HyperView, Delta, DeltaFilter } from '../core/types';
import { constructHyperView } from '../schemas/hyperview';

/**
 * Time-travel query options
 */
export interface TimeTravelOptions {
  /** Timestamp to query at (defaults to current time) */
  timestamp?: number;

  /** Include negated deltas in results? (default: false) */
  includeNegated?: boolean;

  /** Additional delta filter criteria */
  filter?: Partial<DeltaFilter>;
}

/**
 * Snapshot of database state at a specific point in time
 */
export interface TimeSnapshot {
  /** Timestamp of this snapshot */
  timestamp: number;

  /** Number of deltas that existed at this time */
  deltaCount: number;

  /** Number of deltas that were negated at this time */
  negatedCount: number;
}

/**
 * TimeTravelDB wraps a RhizomeDB instance with time-travel capabilities
 */
export class TimeTravelDB {
  constructor(private db: RhizomeDB) {}

  /**
   * Query an object as it existed at a specific timestamp
   *
   * @param objectId - The domain object ID
   * @param schema - The HyperSchema to apply
   * @param timestamp - The timestamp to query at (defaults to now)
   * @returns HyperView as it existed at that time
   */
  queryAt(objectId: string, schema: HyperSchema, timestamp: number = Date.now()): HyperView {
    // Get all deltas from the database
    const allDeltas = this.db.queryDeltas({});

    // Construct HyperView at the specified timestamp
    return constructHyperView(
      objectId,
      schema,
      allDeltas,
      (this.db as any).schemaRegistry,
      timestamp
    );
  }

  /**
   * Get a snapshot of database state at a specific time
   *
   * @param timestamp - The timestamp to snapshot (defaults to now)
   * @returns Snapshot metadata
   */
  getSnapshot(timestamp: number = Date.now()): TimeSnapshot {
    const allDeltas = this.db.queryDeltas({});

    // Count deltas that existed at this time
    const existingDeltas = allDeltas.filter(d => d.timestamp <= timestamp);

    // Count negations
    const negations = new Set<string>();
    for (const delta of existingDeltas) {
      for (const pointer of delta.pointers) {
        if (
          pointer.localContext === 'negates' &&
          typeof pointer.target === 'object' &&
          'id' in pointer.target
        ) {
          negations.add(pointer.target.id);
        }
      }
    }

    return {
      timestamp,
      deltaCount: existingDeltas.length,
      negatedCount: negations.size
    };
  }

  /**
   * Get all timestamps where deltas were created for an object
   *
   * @param objectId - The domain object ID
   * @returns Array of timestamps in chronological order
   */
  getObjectTimeline(objectId: string): number[] {
    const deltas = this.db.queryDeltas({
      targetIds: [objectId]
    });

    const timestamps = new Set<number>();
    for (const delta of deltas) {
      timestamps.add(delta.timestamp);
    }

    return Array.from(timestamps).sort((a, b) => a - b);
  }

  /**
   * Query all states of an object across time
   *
   * @param objectId - The domain object ID
   * @param schema - The HyperSchema to apply
   * @param startTime - Start of time range (defaults to 0)
   * @param endTime - End of time range (defaults to now)
   * @param maxSnapshots - Maximum number of snapshots to return
   * @returns Array of {timestamp, hyperView} pairs
   */
  replayObject(
    objectId: string,
    schema: HyperSchema,
    startTime: number = 0,
    endTime: number = Date.now(),
    maxSnapshots: number = 100
  ): Array<{ timestamp: number; hyperView: HyperView }> {
    const timeline = this.getObjectTimeline(objectId).filter(t => t >= startTime && t <= endTime);

    // Sample timeline if too many snapshots
    let sampledTimeline = timeline;
    if (timeline.length > maxSnapshots) {
      const step = Math.floor(timeline.length / maxSnapshots);
      sampledTimeline = timeline.filter((_, i) => i % step === 0);
    }

    return sampledTimeline.map(timestamp => ({
      timestamp,
      hyperView: this.queryAt(objectId, schema, timestamp)
    }));
  }

  /**
   * Find when a specific property value changed
   *
   * @param objectId - The domain object ID
   * @param property - The property to track
   * @returns Array of {timestamp, delta} pairs showing changes
   */
  trackPropertyChanges(
    objectId: string,
    property: string
  ): Array<{ timestamp: number; delta: Delta }> {
    const deltas = this.db.queryDeltas({
      targetIds: [objectId],
      targetContexts: [property]
    });

    return deltas
      .map(delta => ({ timestamp: delta.timestamp, delta }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Compare an object's state at two different times
   *
   * @param objectId - The domain object ID
   * @param schema - The HyperSchema to apply
   * @param timestamp1 - First timestamp
   * @param timestamp2 - Second timestamp
   * @returns Object with before/after HyperViews and diff metadata
   */
  compareSnapshots(
    objectId: string,
    schema: HyperSchema,
    timestamp1: number,
    timestamp2: number
  ): {
    before: HyperView;
    after: HyperView;
    deltasAdded: number;
    properties: string[];
  } {
    const before = this.queryAt(objectId, schema, timestamp1);
    const after = this.queryAt(objectId, schema, timestamp2);

    // Count deltas in each
    const beforeDeltaCount = this.countDeltas(before);
    const afterDeltaCount = this.countDeltas(after);

    // Get all properties across both views
    const properties = new Set<string>();
    for (const key in before) {
      if (key !== 'id') properties.add(key);
    }
    for (const key in after) {
      if (key !== 'id') properties.add(key);
    }

    return {
      before,
      after,
      deltasAdded: afterDeltaCount - beforeDeltaCount,
      properties: Array.from(properties)
    };
  }

  /**
   * Find the first delta that created a specific object
   *
   * @param objectId - The domain object ID
   * @returns The earliest delta targeting this object, or null
   */
  findOrigin(objectId: string): Delta | null {
    const deltas = this.db.queryDeltas({
      targetIds: [objectId]
    });

    if (deltas.length === 0) return null;

    return deltas.reduce((earliest, current) =>
      current.timestamp < earliest.timestamp ? current : earliest
    );
  }

  /**
   * Get database statistics at a specific time
   *
   * @param timestamp - The timestamp to query (defaults to now)
   * @returns Statistics about database state at that time
   */
  getStatsAt(timestamp: number = Date.now()): {
    timestamp: number;
    totalDeltas: number;
    negatedDeltas: number;
    activeDeltas: number;
    uniqueAuthors: Set<string>;
    uniqueSystems: Set<string>;
  } {
    const allDeltas = this.db.queryDeltas({});
    const deltasAtTime = allDeltas.filter(d => d.timestamp <= timestamp);

    const negations = new Set<string>();
    const authors = new Set<string>();
    const systems = new Set<string>();

    for (const delta of deltasAtTime) {
      authors.add(delta.author);
      systems.add(delta.system);

      for (const pointer of delta.pointers) {
        if (
          pointer.localContext === 'negates' &&
          typeof pointer.target === 'object' &&
          'id' in pointer.target
        ) {
          negations.add(pointer.target.id);
        }
      }
    }

    return {
      timestamp,
      totalDeltas: deltasAtTime.length,
      negatedDeltas: negations.size,
      activeDeltas: deltasAtTime.length - negations.size,
      uniqueAuthors: authors,
      uniqueSystems: systems
    };
  }

  /**
   * Helper: count total deltas in a HyperView
   */
  private countDeltas(hyperView: HyperView): number {
    let count = 0;
    for (const key in hyperView) {
      if (key !== 'id' && Array.isArray(hyperView[key])) {
        count += hyperView[key].length;
      }
    }
    return count;
  }
}

/**
 * Create a time-travel enabled wrapper around a RhizomeDB instance
 */
export function enableTimeTravel(db: RhizomeDB): TimeTravelDB {
  return new TimeTravelDB(db);
}
