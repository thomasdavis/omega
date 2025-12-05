#!/usr/bin/env tsx
/**
 * Self-Evolution Safety Guardrails
 *
 * Validates PR changes against safety policies stored in the database.
 * Computes diff statistics and checks against allow/block patterns.
 *
 * Usage:
 *   tsx scripts/self_evolution/guardrails.ts --pr <number>
 *   tsx scripts/self_evolution/guardrails.ts --files <file1> <file2> ...
 *   tsx scripts/self_evolution/guardrails.ts --export-policy
 *
 * Exit codes:
 *   0 - All guardrails passed
 *   1 - Guardrail violations detected
 *   2 - Error running checks
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';

// ============================================================================
// Types
// ============================================================================

interface SafetyPolicy {
  id: number;
  policy_name: string;
  max_lines_of_code: number;
  max_files_changed: number;
  max_directories_affected: number;
  allow_patterns: string[];
  block_patterns: string[];
  require_canary_tests: boolean;
  auto_rollback_enabled: boolean;
  is_active: boolean;
  metadata?: Record<string, unknown>;
}

interface DiffStats {
  linesOfCode: number;
  filesChanged: number;
  directoriesAffected: number;
  filesList: string[];
  additions: number;
  deletions: number;
}

interface GuardrailViolation {
  type: 'error' | 'warning';
  rule: string;
  message: string;
  details?: Record<string, unknown>;
}

interface GuardrailResult {
  passed: boolean;
  violations: GuardrailViolation[];
  stats: DiffStats;
  policy: SafetyPolicy;
}

// ============================================================================
// Database Connection
// ============================================================================

async function getSafetyPolicy(): Promise<SafetyPolicy | null> {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    return null;
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const result = await client.query<SafetyPolicy>(
      `SELECT * FROM safety_policy WHERE is_active = true ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      console.warn('⚠️  No active safety policy found in database');
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('❌ Error fetching safety policy:', error);
    return null;
  } finally {
    await client.end();
  }
}

// ============================================================================
// Diff Analysis
// ============================================================================

function getFilesFromArgs(args: string[]): string[] {
  const filesIndex = args.indexOf('--files');
  if (filesIndex === -1) {
    return [];
  }

  const files: string[] = [];
  for (let i = filesIndex + 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      break;
    }
    files.push(args[i]);
  }

  return files;
}

function getPRNumber(args: string[]): number | null {
  const prIndex = args.indexOf('--pr');
  if (prIndex === -1 || prIndex === args.length - 1) {
    return null;
  }

  const prNumber = parseInt(args[prIndex + 1], 10);
  return isNaN(prNumber) ? null : prNumber;
}

function getFilesFromPR(prNumber: number): string[] {
  try {
    const output = execSync(`gh pr diff ${prNumber} --name-only`, {
      encoding: 'utf-8',
    });

    return output
      .trim()
      .split('\n')
      .filter((f) => f.length > 0);
  } catch (error) {
    console.error(`❌ Error fetching PR #${prNumber} files:`, error);
    return [];
  }
}

function getFilesFromGit(): string[] {
  try {
    const output = execSync('git diff --name-only HEAD~1 HEAD', {
      encoding: 'utf-8',
    });

    return output
      .trim()
      .split('\n')
      .filter((f) => f.length > 0);
  } catch (error) {
    console.error('❌ Error fetching git diff:', error);
    return [];
  }
}

function computeDiffStats(files: string[]): DiffStats {
  let totalAdditions = 0;
  let totalDeletions = 0;

  const directories = new Set<string>();

  for (const file of files) {
    const dir = file.substring(0, file.lastIndexOf('/'));
    if (dir) {
      directories.add(dir);
    }

    try {
      const stats = execSync(`git diff HEAD~1 HEAD --numstat -- "${file}"`, {
        encoding: 'utf-8',
      });

      const match = stats.trim().match(/^(\d+)\s+(\d+)/);
      if (match) {
        totalAdditions += parseInt(match[1], 10);
        totalDeletions += parseInt(match[2], 10);
      }
    } catch (error) {
      // File might be new or deleted, skip stats
    }
  }

  const linesOfCode = totalAdditions + totalDeletions;

  return {
    linesOfCode,
    filesChanged: files.length,
    directoriesAffected: directories.size,
    filesList: files,
    additions: totalAdditions,
    deletions: totalDeletions,
  };
}

// ============================================================================
// Pattern Matching
// ============================================================================

function matchesPattern(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesPattern(filePath, pattern));
}

// ============================================================================
// Guardrail Validation
// ============================================================================

function validateGuardrails(
  stats: DiffStats,
  policy: SafetyPolicy
): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  // Check diff caps
  if (stats.linesOfCode > policy.max_lines_of_code) {
    violations.push({
      type: 'error',
      rule: 'max_lines_of_code',
      message: `Lines of code changed (${stats.linesOfCode}) exceeds limit (${policy.max_lines_of_code})`,
      details: {
        current: stats.linesOfCode,
        limit: policy.max_lines_of_code,
        additions: stats.additions,
        deletions: stats.deletions,
      },
    });
  }

  if (stats.filesChanged > policy.max_files_changed) {
    violations.push({
      type: 'error',
      rule: 'max_files_changed',
      message: `Files changed (${stats.filesChanged}) exceeds limit (${policy.max_files_changed})`,
      details: {
        current: stats.filesChanged,
        limit: policy.max_files_changed,
        files: stats.filesList,
      },
    });
  }

  if (stats.directoriesAffected > policy.max_directories_affected) {
    violations.push({
      type: 'error',
      rule: 'max_directories_affected',
      message: `Directories affected (${stats.directoriesAffected}) exceeds limit (${policy.max_directories_affected})`,
      details: {
        current: stats.directoriesAffected,
        limit: policy.max_directories_affected,
      },
    });
  }

  // Check blocklist patterns
  for (const file of stats.filesList) {
    if (matchesAnyPattern(file, policy.block_patterns)) {
      violations.push({
        type: 'error',
        rule: 'blocked_file',
        message: `File "${file}" matches blocked pattern (requires human approval with 'allow-migrations' label)`,
        details: {
          file,
          matched_patterns: policy.block_patterns.filter((p) =>
            matchesPattern(file, p)
          ),
        },
      });
    }
  }

  // Check allowlist patterns (warning if not in allowlist)
  const filesNotInAllowlist = stats.filesList.filter(
    (file) => !matchesAnyPattern(file, policy.allow_patterns)
  );

  if (filesNotInAllowlist.length > 0) {
    violations.push({
      type: 'warning',
      rule: 'not_in_allowlist',
      message: `${filesNotInAllowlist.length} file(s) not in allowlist (review recommended)`,
      details: {
        files: filesNotInAllowlist,
        allowlist: policy.allow_patterns,
      },
    });
  }

  return violations;
}

// ============================================================================
// Policy Export (for visibility in repo)
// ============================================================================

async function exportPolicyToJSON(): Promise<void> {
  const policy = await getSafetyPolicy();

  if (!policy) {
    console.error('❌ No active policy to export');
    process.exit(1);
  }

  const exportPath = resolve(
    process.cwd(),
    'config/self-evolution-policy.json'
  );

  const exportData = {
    policy_name: policy.policy_name,
    limits: {
      max_lines_of_code: policy.max_lines_of_code,
      max_files_changed: policy.max_files_changed,
      max_directories_affected: policy.max_directories_affected,
    },
    patterns: {
      allow: policy.allow_patterns,
      block: policy.block_patterns,
    },
    settings: {
      require_canary_tests: policy.require_canary_tests,
      auto_rollback_enabled: policy.auto_rollback_enabled,
    },
    metadata: policy.metadata,
    last_updated: new Date().toISOString(),
  };

  try {
    writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');
    console.log(`✅ Policy exported to ${exportPath}`);
  } catch (error) {
    console.error('❌ Error exporting policy:', error);
    process.exit(1);
  }
}

// ============================================================================
// Main Function
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle export command
  if (args.includes('--export-policy')) {
    await exportPolicyToJSON();
    return;
  }

  // Fetch active safety policy
  const policy = await getSafetyPolicy();

  if (!policy) {
    console.error('❌ No active safety policy found. Skipping guardrail checks.');
    process.exit(2);
  }

  console.log(`📋 Using safety policy: ${policy.policy_name}`);

  // Determine files to check
  let files: string[] = [];

  const prNumber = getPRNumber(args);
  if (prNumber) {
    console.log(`🔍 Analyzing PR #${prNumber}...`);
    files = getFilesFromPR(prNumber);
  } else if (args.includes('--files')) {
    files = getFilesFromArgs(args);
  } else {
    console.log('🔍 Analyzing git diff...');
    files = getFilesFromGit();
  }

  if (files.length === 0) {
    console.log('✅ No files changed. Guardrails passed.');
    process.exit(0);
  }

  console.log(`📊 Analyzing ${files.length} file(s)...`);

  // Compute diff stats
  const stats = computeDiffStats(files);

  console.log('\nDiff Statistics:');
  console.log(`  Lines of code: ${stats.linesOfCode} (limit: ${policy.max_lines_of_code})`);
  console.log(`  Files changed: ${stats.filesChanged} (limit: ${policy.max_files_changed})`);
  console.log(`  Directories affected: ${stats.directoriesAffected} (limit: ${policy.max_directories_affected})`);

  // Validate guardrails
  const violations = validateGuardrails(stats, policy);

  const errors = violations.filter((v) => v.type === 'error');
  const warnings = violations.filter((v) => v.type === 'warning');

  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ All guardrails passed!');
    process.exit(0);
  }

  // Print violations
  console.log('\n🚨 Guardrail Violations Detected:\n');

  if (errors.length > 0) {
    console.log('ERRORS:');
    errors.forEach((v, i) => {
      console.log(`  ${i + 1}. [${v.rule}] ${v.message}`);
      if (v.details) {
        console.log(`     Details: ${JSON.stringify(v.details, null, 6)}`);
      }
    });
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('WARNINGS:');
    warnings.forEach((v, i) => {
      console.log(`  ${i + 1}. [${v.rule}] ${v.message}`);
      if (v.details) {
        console.log(`     Details: ${JSON.stringify(v.details, null, 6)}`);
      }
    });
    console.log('');
  }

  // Output JSON for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    const output = JSON.stringify({
      passed: errors.length === 0,
      violations,
      stats,
    });

    try {
      const fs = require('fs');
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `guardrails_result=${output}\n`);
    } catch (error) {
      console.error('Warning: Could not write to GITHUB_OUTPUT:', error);
    }
  }

  // Exit with error if violations found
  if (errors.length > 0) {
    console.log('❌ Guardrail checks FAILED');
    process.exit(1);
  } else {
    console.log('⚠️  Guardrail checks passed with warnings');
    process.exit(0);
  }
}

// ============================================================================
// Execute
// ============================================================================

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(2);
});
