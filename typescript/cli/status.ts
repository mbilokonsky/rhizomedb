#!/usr/bin/env npx ts-node
/**
 * Print instance stats as JSON. No args needed.
 * Output: {"systemId", "dataDir", "totalDeltas", "storageType", ...}
 */

import { getDataDir, openStore, closeAndExit, run } from './common';

run(async () => {
  const store = await openStore();
  const stats = await store.getStats();
  await closeAndExit(store, { ...stats, dataDir: getDataDir() });
});
