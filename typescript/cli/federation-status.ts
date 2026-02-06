#!/usr/bin/env npx ts-node
/**
 * CLI: federation-status
 *
 * Show federation configuration and last known state.
 * Reads .rhizome/federation.json (no store needed).
 *
 * Input: none
 * Output: federation config JSON or empty state
 */

import * as fs from 'fs';
import * as path from 'path';
import { output, run, getRhizomeDir } from './common';

run(async () => {
  const rhizomeDir = getRhizomeDir();
  const configPath = path.join(rhizomeDir, 'federation.json');

  if (!fs.existsSync(configPath)) {
    output({
      configured: false,
      message: 'No federation configuration found. Run federation-serve or federation-connect first.'
    });
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  output({
    configured: true,
    ...config
  });
});
