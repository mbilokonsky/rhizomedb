#!/usr/bin/env npx ts-node
/**
 * Initialize a .rhizome/data directory. Idempotent.
 * Output: {"systemId": "...", "dataDir": "..."}
 */

import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDataDir, getSystemId, saveSystemId, output, run } from './common';

run(async () => {
  const dataDir = getDataDir();

  // Create data directory
  fs.mkdirSync(dataDir, { recursive: true });

  // Get or create system ID
  let systemId = getSystemId();
  if (!systemId) {
    systemId = uuidv4();
    saveSystemId(systemId);
  }

  output({ systemId, dataDir });
});
