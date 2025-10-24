/**
 * Backpressure handling for delta subscriptions
 *
 * Implements buffering and overflow strategies to prevent memory leaks
 * when consumers process deltas slower than they're produced.
 */

import { Delta, DeltaFilter, DeltaHandler, Subscription } from '../core/types';

/**
 * Overflow strategy when buffer is full
 */
export enum OverflowStrategy {
  /** Drop oldest deltas when buffer is full */
  DROP_OLDEST = 'drop_oldest',

  /** Drop newest deltas when buffer is full */
  DROP_NEWEST = 'drop_newest',

  /** Throw an error when buffer overflows */
  ERROR = 'error',

  /** Block until buffer has space (not recommended) */
  BLOCK = 'block'
}

/**
 * Subscription options with backpressure control
 */
export interface BackpressureOptions {
  /** Maximum number of deltas to buffer */
  bufferSize: number;

  /** What to do when buffer is full */
  overflowStrategy: OverflowStrategy;

  /** Warn when buffer reaches this percentage full */
  warningThreshold?: number;

  /** Callback for buffer warnings */
  onWarning?: (stats: BufferStats) => void;

  /** Callback for overflow events */
  onOverflow?: (dropped: Delta, stats: BufferStats) => void;
}

/**
 * Buffer statistics
 */
export interface BufferStats {
  /** Current number of deltas in buffer */
  size: number;

  /** Maximum buffer size */
  capacity: number;

  /** Percentage full (0-100) */
  percentFull: number;

  /** Total deltas received */
  totalReceived: number;

  /** Total deltas processed */
  totalProcessed: number;

  /** Total deltas dropped */
  totalDropped: number;

  /** Number of overflow events */
  overflowCount: number;
}

/**
 * Buffered subscription with backpressure handling
 */
export class BackpressureSubscription implements Subscription {
  private buffer: Delta[] = [];
  private paused: boolean = false;
  private processing: boolean = false;

  private stats: BufferStats;

  constructor(
    private id: string,
    private filter: DeltaFilter,
    private handler: DeltaHandler,
    private options: BackpressureOptions,
    private unsubscribeFn: () => void
  ) {
    this.stats = {
      size: 0,
      capacity: options.bufferSize,
      percentFull: 0,
      totalReceived: 0,
      totalProcessed: 0,
      totalDropped: 0,
      overflowCount: 0
    };
  }

  unsubscribe(): void {
    this.unsubscribeFn();
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    // Process any buffered deltas
    this.processBuffer().catch(err => {
      console.error('Error processing buffer after resume:', err);
    });
  }

  getPosition(): string {
    return this.id;
  }

  /**
   * Get current buffer statistics
   */
  getStats(): BufferStats {
    this.stats.size = this.buffer.length;
    this.stats.percentFull = (this.buffer.length / this.options.bufferSize) * 100;
    return { ...this.stats };
  }

  /**
   * Handle incoming delta
   */
  handleDelta(delta: Delta): Promise<void> {
    this.stats.totalReceived++;

    if (this.paused) {
      // When paused, always buffer
      this.addToBuffer(delta);
      return Promise.resolve();
    }

    // Always add to buffer first
    this.addToBuffer(delta);

    // Start processing if not already processing
    if (!this.processing) {
      // Don't await - let it process in background
      this.processBuffer().catch(err => {
        console.error('Error processing buffer:', err);
      });
    }

    return Promise.resolve();
  }

  /**
   * Add delta to buffer with overflow handling
   */
  private addToBuffer(delta: Delta): void {
    // Check if buffer is full
    if (this.buffer.length >= this.options.bufferSize) {
      this.handleOverflow(delta);
      return;
    }

    // Add to buffer
    this.buffer.push(delta);

    // Check warning threshold
    const percentFull = (this.buffer.length / this.options.bufferSize) * 100;
    if (
      this.options.warningThreshold &&
      percentFull >= this.options.warningThreshold &&
      this.options.onWarning
    ) {
      this.options.onWarning(this.getStats());
    }
  }

  /**
   * Handle buffer overflow
   */
  private handleOverflow(delta: Delta): void {
    this.stats.overflowCount++;

    switch (this.options.overflowStrategy) {
      case OverflowStrategy.DROP_OLDEST:
        {
          // Remove oldest delta
          const dropped = this.buffer.shift();
          if (dropped) {
            this.stats.totalDropped++;
            if (this.options.onOverflow) {
              this.options.onOverflow(dropped, this.getStats());
            }
          }
        }
        // Add new delta
        this.buffer.push(delta);
        break;

      case OverflowStrategy.DROP_NEWEST:
        // Drop the new delta
        this.stats.totalDropped++;
        if (this.options.onOverflow) {
          this.options.onOverflow(delta, this.getStats());
        }
        break;

      case OverflowStrategy.ERROR:
        throw new Error(
          `Subscription buffer overflow: ${this.buffer.length}/${this.options.bufferSize} deltas`
        );

      case OverflowStrategy.BLOCK:
        // Add to buffer anyway (will grow beyond capacity)
        // This is not recommended as it can lead to memory leaks
        this.buffer.push(delta);
        break;
    }
  }

  /**
   * Process all buffered deltas
   */
  private async processBuffer(): Promise<void> {
    if (this.processing || this.paused) {
      return;
    }

    this.processing = true;

    try {
      while (this.buffer.length > 0 && !this.paused) {
        const delta = this.buffer.shift();
        if (delta) {
          await this.processDelta(delta);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a single delta
   */
  private async processDelta(delta: Delta): Promise<void> {
    try {
      await this.handler(delta);
      this.stats.totalProcessed++;
    } catch (error) {
      console.error('Error in delta handler:', error);
      // Continue processing other deltas
    }
  }

  /**
   * Check if a delta matches the filter
   */
  matchesFilter(delta: Delta): boolean {
    // Same filter logic as standard subscription
    // (Could be extracted to shared function)
    if (this.filter.ids && !this.filter.ids.includes(delta.id)) {
      return false;
    }

    if (this.filter.authors && !this.filter.authors.includes(delta.author)) {
      return false;
    }

    if (this.filter.systems && !this.filter.systems.includes(delta.system)) {
      return false;
    }

    if (this.filter.timestampRange) {
      const { start, end } = this.filter.timestampRange;
      if (start !== undefined && delta.timestamp < start) {
        return false;
      }
      if (end !== undefined && delta.timestamp > end) {
        return false;
      }
    }

    if (this.filter.predicate && !this.filter.predicate(delta)) {
      return false;
    }

    return true;
  }
}

/**
 * Default backpressure options
 */
export const DEFAULT_BACKPRESSURE_OPTIONS: BackpressureOptions = {
  bufferSize: 1000,
  overflowStrategy: OverflowStrategy.DROP_OLDEST,
  warningThreshold: 80
};

/**
 * Create a backpressure-aware subscription
 */
export function createBackpressureSubscription(
  id: string,
  filter: DeltaFilter,
  handler: DeltaHandler,
  options: Partial<BackpressureOptions>,
  unsubscribeFn: () => void
): BackpressureSubscription {
  const fullOptions: BackpressureOptions = {
    ...DEFAULT_BACKPRESSURE_OPTIONS,
    ...options
  };

  return new BackpressureSubscription(id, filter, handler, fullOptions, unsubscribeFn);
}
