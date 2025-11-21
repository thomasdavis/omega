#!/usr/bin/env node
/**
 * Generate build timestamp at build time
 * Captures Unix timestamp (milliseconds since epoch)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
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

  // Also write BUILD-TIMESTAMP.txt to public directory for frontend consumption
  const publicDir = join(__dirname, '..', 'public');
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  const timestampFilePath = join(publicDir, 'BUILD-TIMESTAMP.txt');
  // Write Unix timestamp in seconds (not milliseconds) as a plain integer
  const timestampInSeconds = Math.floor(buildTimestamp / 1000);
  writeFileSync(timestampFilePath, timestampInSeconds.toString());

  console.log('✅ Generated build timestamp:');
  console.log(`   Timestamp: ${buildTimestamp} ms (${timestampInSeconds} seconds)`);
  console.log(`   Date: ${new Date(buildTimestamp).toISOString()}`);
  console.log(`   Files: deployment-info.json, BUILD-TIMESTAMP.txt`);
} catch (error) {
  console.error('❌ Failed to generate build timestamp:', error.message);
  // Don't fail the build if timestamp generation fails
  // Create a fallback deployment info
  const fallbackInfo = {
    buildTimestamp: Date.now(),
  };

  const outputPath = join(__dirname, '..', 'src', 'deployment-info.json');
  writeFileSync(outputPath, JSON.stringify(fallbackInfo, null, 2));

  // Try to write fallback BUILD-TIMESTAMP.txt too
  try {
    const publicDir = join(__dirname, '..', 'public');
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }
    const timestampFilePath = join(publicDir, 'BUILD-TIMESTAMP.txt');
    const timestampInSeconds = Math.floor(fallbackInfo.buildTimestamp / 1000);
    writeFileSync(timestampFilePath, timestampInSeconds.toString());
  } catch (fallbackError) {
    console.error('❌ Failed to write fallback BUILD-TIMESTAMP.txt:', fallbackError.message);
  }

  console.log('⚠️  Created fallback build timestamp');
}
