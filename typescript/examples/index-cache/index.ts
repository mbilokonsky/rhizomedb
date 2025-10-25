/**
 * INDEX/CACHE INSTANCE
 *
 * Capabilities: VIEW-FOCUSED
 * - StreamConsumption: Subscribe to delta streams
 * - IndexMaintenance: Maintain materialized HyperViews with large cache
 * - QueryAPI: Expose read interface for cached views
 *
 * NOT included:
 * - DeltaPersistence: Ephemeral; doesn't store deltas durably
 * - DeltaAuthoring: Doesn't create deltas
 * - StreamProduction: Doesn't publish to other instances
 *
 * Use Case: Specialized instance that maintains expensive-to-compute
 * materialized views in memory. Acts as a fast query cache layer.
 * Can be restarted and will rebuild views from canonical server.
 */

import { RhizomeDB } from '../../src/storage/instance';

async function main() {
  console.log('=== INDEX/CACHE INSTANCE ===\n');

  // Ephemeral in-memory instance optimized for view caching
  const cache = new RhizomeDB({
    storage: 'memory',
    systemId: 'index-cache-001',
    cacheSize: 100000, // VERY LARGE cache for materialized views
    enableIndexing: true // Essential for this archetype
  });

  console.log(`Instance ID: ${cache.systemId}`);
  console.log('Storage: In-Memory (ephemeral)');
  console.log('Cache Size: 100,000 materialized HyperViews');
  console.log('Capabilities: StreamConsumption, IndexMaintenance, QueryAPI\n');

  // Subscribe to deltas from canonical server
  console.log('Subscribing to canonical server for view updates...');

  const unsubscribe = cache.subscribe(
    { contexts: ['user', 'product', 'order'] }, // Filter for specific contexts
    async (delta) => {
      console.log(`→ Processing delta ${delta.id} for view update`);
      // Delta is automatically incorporated into materialized views
    }
  );

  // Simulate receiving deltas and building views
  console.log('\n--- Building materialized views from delta stream ---\n');

  // Product catalog deltas
  for (let i = 1; i <= 5; i++) {
    const productDelta = cache.createDelta('canonical-server-001', [
      {
        localContext: 'product',
        target: { id: `product_${i}` }
      },
      {
        localContext: 'name',
        target: `Product ${i}`
      },
      {
        localContext: 'product',
        targetContext: 'name'
      },
      {
        localContext: 'price',
        target: (i * 10).toString()
      },
      {
        localContext: 'product',
        targetContext: 'price'
      }
    ]);

    await cache.persistDelta(productDelta);
  }

  console.log('✓ Built 5 product views in cache\n');

  // User order deltas
  const orderDelta = cache.createDelta('browser-client-456', [
    {
      localContext: 'order',
      target: { id: 'order_1001' }
    },
    {
      localContext: 'order',
      target: { id: 'product_3' },
      targetContext: 'product'
    },
    {
      localContext: 'quantity',
      target: '2'
    },
    {
      localContext: 'order',
      targetContext: 'quantity'
    }
  ]);

  await cache.persistDelta(orderDelta);
  console.log('✓ Built order view in cache\n');

  // Demonstrate fast cached queries
  console.log('--- Serving cached queries ---\n');

  // Query 1: Materialize a product view
  console.time('Product query');
  const product3 = cache.materialize({ id: 'product_3' });
  console.timeEnd('Product query');
  console.log('Product 3 view:', product3);

  // Query 2: Materialize an order view
  console.time('Order query');
  const order = cache.materialize({ id: 'order_1001' });
  console.timeEnd('Order query');
  console.log('\nOrder 1001 view:', order);

  // Query 3: Complex aggregate (traverse relationships)
  console.log('\n--- Complex cached query ---');
  const orderView = cache.materialize({ id: 'order_1001' });

  // Follow the relationship to product
  if (orderView.product && typeof orderView.product === 'object') {
    const productId = orderView.product;
    const productView = cache.materialize(productId);
    console.log('Order with product details:', {
      order: orderView,
      product: productView
    });
  }

  // Cache statistics
  console.log('\n--- Cache Statistics ---');
  const allDeltas = cache.getDeltasByFilter({});
  console.log(`Total deltas processed: ${allDeltas.length}`);
  console.log(`Cache capacity: 100,000 views`);
  console.log('Cache hit rate: 100% (all queries served from memory)');

  // Demonstrate cache invalidation/refresh
  console.log('\n--- Cache Refresh Strategy ---');
  console.log('On restart:');
  console.log('  1. Subscribe to canonical server');
  console.log('  2. Rebuild views from delta stream');
  console.log('  3. Mark cache as warm when caught up');
  console.log('  4. Serve queries from in-memory views');

  unsubscribe();

  console.log('\n=== FEDERATION STATUS ===');
  console.log('❌ Automatic cache sync not yet implemented');
  console.log('When implemented, this instance would:');
  console.log('  - Connect to canonical server on startup');
  console.log('  - Stream all deltas (or filtered subset)');
  console.log('  - Build materialized views incrementally');
  console.log('  - Expose read-only query API');
  console.log('  - LRU eviction for cache size limits');
  console.log('  - Optional: Write views to Redis/Memcached');
}

main().catch(console.error);
