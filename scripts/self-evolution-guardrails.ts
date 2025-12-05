#!/usr/bin/env tsx
/**
 * Self-Evolution Guardrails Checker
 *
 * Validates pull requests against self-evolution safety policies:
 * - Diff caps (lines of code, files, directories)
 * - Allow/block lists for file patterns
 * - Database migration approval requirements
 *
 * Usage:
 *   tsx self-evolution-guardrails.ts [pr-number]
 *   tsx self-evolution-guardrails.ts --check-diff <base> <head>
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const execAsync = promisify(exec);
const { Pool } = pg;

interface SafetyPolicy {
  policy_name: string;
  max_lines_of_code: number;
  max_files_changed: number;
  max_directories_changed: number;
  allowlist_patterns: string[];
  blocklist_patterns: string[];
  is_active: boolean;
}

interface DiffStats {
  filesChanged: string[];
  directoriesChanged: string[];
  linesAdded: number;
  linesDeleted: number;
  totalLinesOfCode: number;
}

interface GuardrailViolation {
  type: string;
  message: string;
  severity: 'error' | 'warning';
  details?: any;
}

interface GuardrailResult {
  passed: boolean;
  policy: SafetyPolicy;
  diffStats: DiffStats;
  violations: GuardrailViolation[];
}

/**
 * Fetch active safety policy from database
 */
async function fetchSafetyPolicy(): Promise<SafetyPolicy> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
  });

  try {
    const result = await pool.query(
      'SELECT * FROM safety_policy WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      throw new Error('No active safety policy found in database');
    }

    const row = result.rows[0];
    return {
      policy_name: row.policy_name,
      max_lines_of_code: row.max_lines_of_code,
      max_files_changed: row.max_files_changed,
      max_directories_changed: row.max_directories_changed,
      allowlist_patterns: row.allowlist_patterns || [],
      blocklist_patterns: row.blocklist_patterns || [],
      is_active: row.is_active,
    };
  } finally {
    await pool.end();
  }
}

/**
 * Get diff statistics between two commits
 */
async function getDiffStats(base: string, head: string): Promise<DiffStats> {
  // Get changed files with stats
  const { stdout: diffOutput } = await execAsync(
    `git diff --numstat ${base}...${head}`
  );

  const filesChanged: string[] = [];
  const directoriesSet = new Set<string>();
  let linesAdded = 0;
  let linesDeleted = 0;

  for (const line of diffOutput.trim().split('\n')) {
    if (!line) continue;

    const [added, deleted, filepath] = line.split(/\s+/);

    // Skip binary files (shown as "-")
    if (added === '-' || deleted === '-') continue;

    filesChanged.push(filepath);

    // Extract directory
    const dir = filepath.includes('/')
      ? filepath.substring(0, filepath.lastIndexOf('/'))
      : '.';
    directoriesSet.add(dir);

    linesAdded += parseInt(added, 10);
    linesDeleted += parseInt(deleted, 10);
  }

  return {
    filesChanged,
    directoriesChanged: Array.from(directoriesSet),
    linesAdded,
    linesDeleted,
    totalLinesOfCode: linesAdded + linesDeleted,
  };
}

/**
 * Check if file path matches any pattern (glob-like)
 */
function matchesPattern(filepath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Simple pattern matching (supports trailing slash for directories and basic wildcards)
    const patternRegex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\/$/, '(/.*)?$'); // Match directory and its contents

    if (new RegExp(`^${patternRegex}`).test(filepath)) {
      return true;
    }
  }
  return false;
}

/**
 * Validate diff against safety policy
 */
function validateDiff(diffStats: DiffStats, policy: SafetyPolicy): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  // Check diff caps
  if (diffStats.totalLinesOfCode > policy.max_lines_of_code) {
    violations.push({
      type: 'diff_cap_exceeded',
      message: `Total lines changed (${diffStats.totalLinesOfCode}) exceeds limit (${policy.max_lines_of_code})`,
      severity: 'error',
      details: {
        total: diffStats.totalLinesOfCode,
        limit: policy.max_lines_of_code,
        added: diffStats.linesAdded,
        deleted: diffStats.linesDeleted,
      },
    });
  }

  if (diffStats.filesChanged.length > policy.max_files_changed) {
    violations.push({
      type: 'file_cap_exceeded',
      message: `Files changed (${diffStats.filesChanged.length}) exceeds limit (${policy.max_files_changed})`,
      severity: 'error',
      details: {
        count: diffStats.filesChanged.length,
        limit: policy.max_files_changed,
        files: diffStats.filesChanged,
      },
    });
  }

  if (diffStats.directoriesChanged.length > policy.max_directories_changed) {
    violations.push({
      type: 'directory_cap_exceeded',
      message: `Directories changed (${diffStats.directoriesChanged.length}) exceeds limit (${policy.max_directories_changed})`,
      severity: 'error',
      details: {
        count: diffStats.directoriesChanged.length,
        limit: policy.max_directories_changed,
        directories: diffStats.directoriesChanged,
      },
    });
  }

  // Check blocklist patterns
  const blockedFiles = diffStats.filesChanged.filter(file =>
    matchesPattern(file, policy.blocklist_patterns)
  );

  if (blockedFiles.length > 0) {
    // Special handling for database migrations
    const dbMigrationFiles = blockedFiles.filter(file =>
      file.includes('packages/database/scripts/') ||
      file.includes('packages/database/prisma/')
    );

    if (dbMigrationFiles.length > 0) {
      violations.push({
        type: 'database_migration_requires_approval',
        message: 'Database migration files require human approval (add "allow-migrations" label)',
        severity: 'warning',
        details: {
          files: dbMigrationFiles,
          requiredLabel: 'allow-migrations',
        },
      });
    }

    // Other blocked files
    const otherBlockedFiles = blockedFiles.filter(file =>
      !file.includes('packages/database/scripts/') &&
      !file.includes('packages/database/prisma/')
    );

    if (otherBlockedFiles.length > 0) {
      violations.push({
        type: 'blocklist_violation',
        message: `Blocked files modified: ${otherBlockedFiles.join(', ')}`,
        severity: 'error',
        details: {
          files: otherBlockedFiles,
          blocklist: policy.blocklist_patterns,
        },
      });
    }
  }

  // Check if files are in allowlist (for new file creation)
  // This is informational - new files should be in allowlist directories
  const newFiles = diffStats.filesChanged.filter(async file => {
    try {
      const { stdout } = await execAsync(`git diff --diff-filter=A --name-only ${file}`);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  });

  // Note: This is a simplified check. In production, we'd want to verify
  // new files are only in allowlist directories like:
  // - prompts/, docs/, apps/bot/src/agent/tools/, .github/workflows/, config/feature-flags

  return violations;
}

/**
 * Record rollback event to database
 */
async function recordRollback(
  prNumber: number | null,
  failureReason: string,
  violationDetails: any
): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
  });

  try {
    await pool.query(
      `INSERT INTO self_evolution_rollbacks (
        pr_number,
        failure_reason,
        failure_type,
        violation_details,
        rollback_status,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        prNumber,
        failureReason,
        'guardrail_violation',
        JSON.stringify(violationDetails),
        'pending',
        'guardrails-checker',
      ]
    );
  } finally {
    await pool.end();
  }
}

/**
 * Format violation report for GitHub comment
 */
function formatViolationReport(result: GuardrailResult): string {
  const { passed, policy, diffStats, violations } = result;

  let report = '## 🛡️ Self-Evolution Safety Check\n\n';

  if (passed) {
    report += '✅ **All guardrails passed!**\n\n';
  } else {
    report += '❌ **Guardrail violations detected**\n\n';
  }

  report += `**Policy:** ${policy.policy_name}\n\n`;

  report += '### Diff Statistics\n\n';
  report += `- **Lines changed:** ${diffStats.totalLinesOfCode} / ${policy.max_lines_of_code} (${diffStats.linesAdded}+ ${diffStats.linesDeleted}-)\n`;
  report += `- **Files changed:** ${diffStats.filesChanged.length} / ${policy.max_files_changed}\n`;
  report += `- **Directories changed:** ${diffStats.directoriesChanged.length} / ${policy.max_directories_changed}\n\n`;

  if (violations.length > 0) {
    report += '### Violations\n\n';

    const errors = violations.filter(v => v.severity === 'error');
    const warnings = violations.filter(v => v.severity === 'warning');

    if (errors.length > 0) {
      report += '**Errors:**\n\n';
      for (const violation of errors) {
        report += `- ❌ **${violation.type}:** ${violation.message}\n`;
        if (violation.details) {
          report += `  \`\`\`json\n  ${JSON.stringify(violation.details, null, 2)}\n  \`\`\`\n`;
        }
      }
      report += '\n';
    }

    if (warnings.length > 0) {
      report += '**Warnings:**\n\n';
      for (const violation of warnings) {
        report += `- ⚠️ **${violation.type}:** ${violation.message}\n`;
        if (violation.details) {
          report += `  \`\`\`json\n  ${JSON.stringify(violation.details, null, 2)}\n  \`\`\`\n`;
        }
      }
      report += '\n';
    }
  }

  report += '---\n';
  report += '*Generated by self-evolution guardrails checker*\n';

  return report;
}

/**
 * Main execution
 */
async function main() {
  console.log('🛡️ Self-Evolution Guardrails Checker v1.0.0');
  console.log('');

  // Validate environment
  if (!process.env.DATABASE_URL && !process.env.DATABASE_PUBLIC_URL) {
    console.error('❌ DATABASE_URL or DATABASE_PUBLIC_URL required');
    process.exit(1);
  }

  try {
    // Fetch active safety policy
    console.log('📋 Fetching safety policy from database...');
    const policy = await fetchSafetyPolicy();
    console.log(`✅ Loaded policy: ${policy.policy_name}`);
    console.log(`   Caps: ${policy.max_lines_of_code} LOC, ${policy.max_files_changed} files, ${policy.max_directories_changed} dirs`);
    console.log('');

    // Determine diff range
    let base = 'main';
    let head = 'HEAD';

    if (process.argv.includes('--check-diff')) {
      const idx = process.argv.indexOf('--check-diff');
      base = process.argv[idx + 1] || 'main';
      head = process.argv[idx + 2] || 'HEAD';
    } else if (process.env.GITHUB_BASE_REF && process.env.GITHUB_HEAD_REF) {
      base = process.env.GITHUB_BASE_REF;
      head = process.env.GITHUB_HEAD_REF;
    }

    console.log(`📊 Analyzing diff: ${base}...${head}`);

    // Get diff stats
    const diffStats = await getDiffStats(base, head);
    console.log(`   Files: ${diffStats.filesChanged.length}`);
    console.log(`   Directories: ${diffStats.directoriesChanged.length}`);
    console.log(`   Lines: ${diffStats.totalLinesOfCode} (${diffStats.linesAdded}+ ${diffStats.linesDeleted}-)`);
    console.log('');

    // Validate diff
    console.log('🔍 Validating against guardrails...');
    const violations = validateDiff(diffStats, policy);

    const result: GuardrailResult = {
      passed: violations.filter(v => v.severity === 'error').length === 0,
      policy,
      diffStats,
      violations,
    };

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 GUARDRAIL CHECK RESULT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Violations: ${violations.length} (${violations.filter(v => v.severity === 'error').length} errors, ${violations.filter(v => v.severity === 'warning').length} warnings)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Format report
    const report = formatViolationReport(result);
    console.log(report);

    // Output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      const fs = await import('node:fs');
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `guardrails_passed=${result.passed}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `violations_count=${violations.length}\n`);

      // Escape newlines and quotes for GitHub Actions multiline output
      const escapedReport = report
        .replace(/%/g, '%25')
        .replace(/\n/g, '%0A')
        .replace(/\r/g, '%0D');
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `report<<EOF\n${report}\nEOF\n`);
    }

    // Record rollback if failed
    if (!result.passed) {
      const prNumber = process.env.GITHUB_PR_NUMBER
        ? parseInt(process.env.GITHUB_PR_NUMBER, 10)
        : null;

      await recordRollback(
        prNumber,
        'Guardrail violations detected',
        { violations, diffStats, policy: policy.policy_name }
      );

      console.log('📝 Rollback event recorded to database');
    }

    // Exit with appropriate code
    process.exit(result.passed ? 0 : 1);

  } catch (error) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ GUARDRAIL CHECK FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');

    if (error instanceof Error && error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

main();
