/**
 * Evolution Sanity Checker
 * Runs safety checks before allowing changes
 */

import type { CheckResult, SanityCheckResults } from './types.js';
import { EVOLUTION_CONFIG } from './config.js';

/**
 * Run comprehensive sanity checks
 */
export async function runSanityChecks(
  changedFiles: string[],
  diffStats: { additions: number; deletions: number }
): Promise<SanityCheckResults> {
  const checks: CheckResult[] = [];

  // Check 1: Path allowlist
  const pathCheck = checkAllowedPaths(changedFiles);
  checks.push(pathCheck);

  // Check 2: Path blocklist
  const blockCheck = checkBlockedPaths(changedFiles);
  checks.push(blockCheck);

  // Check 3: Diff size limit
  const diffCheck = checkDiffSize(diffStats);
  checks.push(diffCheck);

  // Check 4: File count limit
  const fileCountCheck = checkFileCount(changedFiles);
  checks.push(fileCountCheck);

  // Calculate overall results
  const allPassed = checks.every((check) => check.passed);
  const avgScore = checks.reduce((sum, check) => sum + (check.score || 0), 0) / checks.length;

  return {
    checks,
    overall_passed: allPassed,
    overall_score: avgScore,
  };
}

/**
 * Check if all changed files are in allowed paths
 */
function checkAllowedPaths(changedFiles: string[]): CheckResult {
  const allowedPatterns = EVOLUTION_CONFIG.allowed_paths;

  const violators = changedFiles.filter((file) => {
    return !allowedPatterns.some((pattern) => {
      // Convert glob pattern to regex
      const regex = new RegExp(
        '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\//g, '\\/') + '$'
      );
      return regex.test(file);
    });
  });

  const passed = violators.length === 0;

  return {
    name: 'Allowed Paths',
    passed,
    details: passed
      ? 'All files are in allowed paths'
      : `Files outside allowed paths: ${violators.join(', ')}`,
    score: passed ? 100 : 0,
  };
}

/**
 * Check if any changed files are in blocked paths
 */
function checkBlockedPaths(changedFiles: string[]): CheckResult {
  const blockedPatterns = EVOLUTION_CONFIG.blocked_paths;

  const violators = changedFiles.filter((file) => {
    return blockedPatterns.some((pattern) => {
      if (pattern.includes('*')) {
        const regex = new RegExp(
          '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\//g, '\\/') + '$'
        );
        return regex.test(file);
      }
      return file.includes(pattern);
    });
  });

  const passed = violators.length === 0;

  return {
    name: 'Blocked Paths',
    passed,
    details: passed
      ? 'No blocked paths modified'
      : `BLOCKED files modified: ${violators.join(', ')}`,
    score: passed ? 100 : 0,
  };
}

/**
 * Check if diff size is within limits
 */
function checkDiffSize(diffStats: { additions: number; deletions: number }): CheckResult {
  const totalLines = diffStats.additions + diffStats.deletions;
  const limit = EVOLUTION_CONFIG.max_diff_lines;
  const passed = totalLines <= limit;

  return {
    name: 'Diff Size',
    passed,
    details: `${totalLines} lines changed (limit: ${limit})`,
    score: passed ? 100 : Math.max(0, 100 - ((totalLines - limit) / limit) * 100),
  };
}

/**
 * Check if file count is within limits
 */
function checkFileCount(changedFiles: string[]): CheckResult {
  const count = changedFiles.length;
  const limit = EVOLUTION_CONFIG.max_files_changed;
  const passed = count <= limit;

  return {
    name: 'File Count',
    passed,
    details: `${count} files changed (limit: ${limit})`,
    score: passed ? 100 : Math.max(0, 100 - ((count - limit) / limit) * 100),
  };
}

/**
 * Validate permissions for specific operations
 */
export function validatePermissions(operation: string): CheckResult {
  const dangerousOperations = [
    'delete database',
    'drop table',
    'modify secrets',
    'change deployment',
  ];

  const isDangerous = dangerousOperations.some((dangerous) =>
    operation.toLowerCase().includes(dangerous)
  );

  return {
    name: 'Permission Check',
    passed: !isDangerous,
    details: isDangerous
      ? `Dangerous operation detected: ${operation}`
      : 'Operation is safe',
    score: isDangerous ? 0 : 100,
  };
}
