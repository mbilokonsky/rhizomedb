/**
 * Tests for subscription backpressure handling
 */

import { RhizomeDB } from './instance';
import {
  BackpressureSubscription,
  OverflowStrategy,
  createBackpressureSubscription
} from './subscription-backpressure';
import { Delta } from './types';

describe('Subscription Backpressure', () => {
  let db: RhizomeDB;

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory' });
  });

  describe('BackpressureSubscription', () => {
    it('should buffer deltas when handler is slow', async () => {
      const received: Delta[] = [];
      let processingTime = 50;

      const slowHandler = async (delta: Delta) => {
        await new Promise(resolve => setTimeout(resolve, processingTime));
        received.push(delta);
      };

      const subscription = createBackpressureSubscription(
        'test',
        {},
        slowHandler,
        { bufferSize: 10, overflowStrategy: OverflowStrategy.DROP_OLDEST },
        () => {}
      );

      // Send 5 deltas quickly
      for (let i = 0; i < 5; i++) {
        const delta = db.createDelta('user', [{ localContext: 'test', target: i }]);
        await subscription.handleDelta(delta);
      }

      // Some should be buffered
      const stats = subscription.getStats();
      expect(stats.totalReceived).toBe(5);
      expect(stats.size).toBeGreaterThan(0);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(received.length).toBe(5);
      expect(subscription.getStats().size).toBe(0);
    });

    it('should drop oldest deltas on overflow with DROP_OLDEST strategy', async () => {
      const received: Delta[] = [];
      const dropped: Delta[] = [];

      const neverResolveHandler = async (delta: Delta) => {
        // Never resolve - simulate blocked handler
        await new Promise(() => {});
      };

      const subscription = createBackpressureSubscription(
        'test',
        {},
        neverResolveHandler,
        {
          bufferSize: 3,
          overflowStrategy: OverflowStrategy.DROP_OLDEST,
          onOverflow: (delta, stats) => {
            dropped.push(delta);
          }
        },
        () => {}
      );

      // Send more deltas than buffer can hold
      const deltas: Delta[] = [];
      for (let i = 0; i < 5; i++) {
        const delta = db.createDelta('user', [{ localContext: 'test', target: i }]);
        deltas.push(delta);
        await subscription.handleDelta(delta);
      }

      const stats = subscription.getStats();
      expect(stats.size).toBe(3); // Buffer is full
      expect(stats.totalDropped).toBe(2); // 2 oldest dropped
      expect(dropped.length).toBe(2);
    });

    it('should drop newest deltas on overflow with DROP_NEWEST strategy', async () => {
      const dropped: Delta[] = [];

      const neverResolveHandler = async (delta: Delta) => {
        await new Promise(() => {});
      };

      const subscription = createBackpressureSubscription(
        'test',
        {},
        neverResolveHandler,
        {
          bufferSize: 3,
          overflowStrategy: OverflowStrategy.DROP_NEWEST,
          onOverflow: (delta) => {
            dropped.push(delta);
          }
        },
        () => {}
      );

      for (let i = 0; i < 5; i++) {
        const delta = db.createDelta('user', [{ localContext: 'test', target: i }]);
        await subscription.handleDelta(delta);
      }

      const stats = subscription.getStats();
      expect(stats.size).toBe(3); // Buffer is full
      expect(stats.totalDropped).toBe(2); // 2 newest dropped
      expect(dropped.length).toBe(2);
    });

    it('should throw error on overflow with ERROR strategy', async () => {
      const neverResolveHandler = async (delta: Delta) => {
        await new Promise(() => {});
      };

      const subscription = createBackpressureSubscription(
        'test',
        {},
        neverResolveHandler,
        {
          bufferSize: 2,
          overflowStrategy: OverflowStrategy.ERROR
        },
        () => {}
      );

      // Fill buffer
      await subscription.handleDelta(db.createDelta('user', [{ localContext: 'test', target: 1 }]));
      await subscription.handleDelta(db.createDelta('user', [{ localContext: 'test', target: 2 }]));

      // This should throw
      await expect(async () => {
        await subscription.handleDelta(db.createDelta('user', [{ localContext: 'test', target: 3 }]));
      }).rejects.toThrow('buffer overflow');
    });

    it('should emit warnings when threshold is reached', async () => {
      const warnings: any[] = [];

      const neverResolveHandler = async (delta: Delta) => {
        await new Promise(() => {});
      };

      const subscription = createBackpressureSubscription(
        'test',
        {},
        neverResolveHandler,
        {
          bufferSize: 10,
          overflowStrategy: OverflowStrategy.DROP_OLDEST,
          warningThreshold: 80,
          onWarning: (stats) => {
            warnings.push(stats);
          }
        },
        () => {}
      );

      // Fill to 80%
      for (let i = 0; i < 8; i++) {
        await subscription.handleDelta(db.createDelta('user', [{ localContext: 'test', target: i }]));
      }

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].percentFull).toBeGreaterThanOrEqual(80);
    });

    it('should pause and resume correctly', async () => {
      const received: Delta[] = [];

      const subscription = createBackpressureSubscription(
        'test',
        {},
        async (delta) => {
          received.push(delta);
        },
        { bufferSize: 10, overflowStrategy: OverflowStrategy.DROP_OLDEST },
        () => {}
      );

      // Pause subscription
      subscription.pause();

      // Send deltas while paused
      for (let i = 0; i < 3; i++) {
        await subscription.handleDelta(db.createDelta('user', [{ localContext: 'test', target: i }]));
      }

      // Should be buffered, not processed
      expect(received.length).toBe(0);
      expect(subscription.getStats().size).toBe(3);

      // Resume
      subscription.resume();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should be processed now
      expect(received.length).toBe(3);
      expect(subscription.getStats().size).toBe(0);
    });

    it('should provide accurate statistics', async () => {
      const subscription = createBackpressureSubscription(
        'test',
        {},
        async (delta) => {
          await new Promise(resolve => setTimeout(resolve, 10));
        },
        { bufferSize: 5, overflowStrategy: OverflowStrategy.DROP_OLDEST },
        () => {}
      );

      // Send some deltas
      for (let i = 0; i < 3; i++) {
        await subscription.handleDelta(db.createDelta('user', [{ localContext: 'test', target: i }]));
      }

      const stats = subscription.getStats();
      expect(stats.totalReceived).toBe(3);
      expect(stats.capacity).toBe(5);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalStats = subscription.getStats();
      expect(finalStats.totalProcessed).toBe(3);
    });

    it('should handle handler errors gracefully', async () => {
      const received: Delta[] = [];
      let errorCount = 0;

      const faultyHandler = async (delta: Delta) => {
        errorCount++;
        if (errorCount === 2) {
          throw new Error('Handler error');
        }
        received.push(delta);
      };

      const subscription = createBackpressureSubscription(
        'test',
        {},
        faultyHandler,
        { bufferSize: 10, overflowStrategy: OverflowStrategy.DROP_OLDEST },
        () => {}
      );

      // Send 3 deltas
      for (let i = 0; i < 3; i++) {
        await subscription.handleDelta(db.createDelta('user', [{ localContext: 'test', target: i }]));
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have processed all but the one that errored
      expect(received.length).toBe(2);
      expect(subscription.getStats().totalProcessed).toBe(2);
    });
  });
});
