#!/usr/bin/env npx ts-node
/**
 * Print instance stats as JSON. No args needed.
 * Output: {"systemId", "dataDir", "totalDeltas", "storageType", ...}
 */

import { getDataDir, withStore, closeAndExit, run } from './common';

run(async () => {
  await withStore(async (store) => {
    const stats = await store.getStats();
    await closeAndExit(store, { ...stats, dataDir: getDataDir() });
  });
});
