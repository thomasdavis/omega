#!/usr/bin/env node
/**
 * Generate build timestamp at build time
 * Creates BUILD-TIMESTAMP.txt with Unix timestamp in seconds
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Get current Unix timestamp in milliseconds
  const buildTimestamp = Date.now();
  const timestampInSeconds = Math.floor(buildTimestamp / 1000);

  // Ensure public directory exists
  const publicDir = join(__dirname, '..', 'public');
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  // Write BUILD-TIMESTAMP.txt to public directory
  const timestampFilePath = join(publicDir, 'BUILD-TIMESTAMP.txt');
  writeFileSync(timestampFilePath, timestampInSeconds.toString());

  console.log('✅ Generated build timestamp:');
  console.log(`   Timestamp: ${timestampInSeconds} seconds (${buildTimestamp} ms)`);
  console.log(`   Date: ${new Date(buildTimestamp).toISOString()}`);
  console.log(`   File: BUILD-TIMESTAMP.txt`);
} catch (error) {
  console.error('❌ Failed to generate build timestamp:', error.message);
  // Don't fail the build if timestamp generation fails
  // Create a fallback BUILD-TIMESTAMP.txt
  try {
    const fallbackTimestamp = Date.now();
    const timestampInSeconds = Math.floor(fallbackTimestamp / 1000);

    const publicDir = join(__dirname, '..', 'public');
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }

    const timestampFilePath = join(publicDir, 'BUILD-TIMESTAMP.txt');
    writeFileSync(timestampFilePath, timestampInSeconds.toString());

    console.log('⚠️  Created fallback build timestamp');
  } catch (fallbackError) {
    console.error('❌ Failed to write fallback BUILD-TIMESTAMP.txt:', fallbackError.message);
    process.exit(1);
  }
}
