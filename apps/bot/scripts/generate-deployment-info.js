#!/usr/bin/env node
/**
 * Generate deployment info at build time
 * Captures git SHA and deployment timestamp
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Get git SHA (full and short)
  const gitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  const gitShaShort = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

  // Get commit message
  const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();

  // Get commit author
  const commitAuthor = execSync('git log -1 --pretty=%an', { encoding: 'utf-8' }).trim();

  // Get commit date
  const commitDate = execSync('git log -1 --pretty=%cI', { encoding: 'utf-8' }).trim();

  // Get branch name (if available)
  let branchName = 'unknown';
  try {
    branchName = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch (e) {
    // In detached HEAD state (common in CI), branch name might not be available
    console.warn('Could not determine branch name (detached HEAD?)');
  }

  const deploymentInfo = {
    gitSha,
    gitShaShort,
    commitMessage,
    commitAuthor,
    commitDate,
    branchName,
    buildTimestamp: new Date().toISOString(),
    buildEnvironment: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || 'unknown',
  };

  // Write to src directory so it's included in build
  const outputPath = join(__dirname, '..', 'src', 'deployment-info.json');
  writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));

  console.log('✅ Generated deployment info:');
  console.log(`   SHA: ${gitShaShort}`);
  console.log(`   Commit: ${commitMessage.split('\n')[0]}`);
  console.log(`   Author: ${commitAuthor}`);
  console.log(`   Built: ${deploymentInfo.buildTimestamp}`);
} catch (error) {
  console.error('❌ Failed to generate deployment info:', error.message);
  // Don't fail the build if git info is unavailable
  // Create a fallback deployment info
  const fallbackInfo = {
    gitSha: 'unknown',
    gitShaShort: 'unknown',
    commitMessage: 'Deployment info unavailable',
    commitAuthor: 'unknown',
    commitDate: new Date().toISOString(),
    branchName: 'unknown',
    buildTimestamp: new Date().toISOString(),
    buildEnvironment: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || 'unknown',
  };

  const outputPath = join(__dirname, '..', 'src', 'deployment-info.json');
  writeFileSync(outputPath, JSON.stringify(fallbackInfo, null, 2));
  console.log('⚠️  Created fallback deployment info');
}
