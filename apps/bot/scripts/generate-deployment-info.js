#!/usr/bin/env node
/**
 * Generate build timestamp at build time
 * Captures Unix timestamp (milliseconds since epoch)
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Get current Unix timestamp in milliseconds
  const buildTimestamp = Date.now();

  const deploymentInfo = {
    buildTimestamp,
  };

  // Write to src directory so it's included in build
  const outputPath = join(__dirname, '..', 'src', 'deployment-info.json');
  writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));

  console.log('✅ Generated build timestamp:');
  console.log(`   Timestamp: ${buildTimestamp}`);
  console.log(`   Date: ${new Date(buildTimestamp).toISOString()}`);
} catch (error) {
  console.error('❌ Failed to generate build timestamp:', error.message);
  // Don't fail the build if timestamp generation fails
  // Create a fallback deployment info
  const fallbackInfo = {
    buildTimestamp: Date.now(),
  };

  const outputPath = join(__dirname, '..', 'src', 'deployment-info.json');
  writeFileSync(outputPath, JSON.stringify(fallbackInfo, null, 2));
  console.log('⚠️  Created fallback build timestamp');
}
