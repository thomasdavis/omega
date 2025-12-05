#!/usr/bin/env tsx
/**
 * Self-Evolution Orchestrator
 *
 * Daily cron job that:
 * 1. Analyzes recent bot activity and conversation patterns
 * 2. Identifies potential improvements using AI reflection
 * 3. Generates proposed code changes within safety constraints
 * 4. Creates a PR if changes pass all safety checks
 * 5. Logs all activity to the database
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

interface SafetyPolicy {
  policy_type: string;
  policy_value: string;
  is_active: boolean;
}

interface RunMetadata {
  runId: number;
  runDate: string;
  status: string;
  branchName?: string;
  prNumber?: number;
  prUrl?: string;
}

/**
 * Main orchestrator function
 */
async function main() {
  console.log('🤖 Self-Evolution Orchestrator Starting...');
  console.log(`   Date: ${new Date().toISOString()}`);
  console.log(`   Repository: ${GITHUB_REPO}`);

  // Validate environment
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN not configured');
    process.exit(1);
  }

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured');
    process.exit(1);
  }

  try {
    // Step 1: Check for existing open self-evolution PRs
    console.log('\n📋 Step 1: Checking for existing open self-evolution PRs...');
    const existingPR = await checkForExistingPR();

    if (existingPR) {
      console.log(`⏭️  Skipping: Open self-evolution PR already exists (#${existingPR.number})`);
      await recordRun({
        status: 'skipped',
        skip_reason: `Existing open PR #${existingPR.number}`,
        pr_number: existingPR.number,
        pr_url: existingPR.url,
      });
      return;
    }

    // Step 2: Load safety policies from database
    console.log('\n🔒 Step 2: Loading safety policies...');
    const policies = await loadSafetyPolicies();
    console.log(`   Loaded ${policies.length} active safety policies`);

    // Step 3: Create run record
    console.log('\n📝 Step 3: Creating run record...');
    const runId = await createRunRecord();
    console.log(`   Run ID: ${runId}`);

    // Step 4: Analyze recent activity and generate reflection
    console.log('\n🧠 Step 4: Analyzing recent activity...');
    const reflection = await generateReflection();
    console.log(`   Generated ${reflection.insights.length} insights`);

    // Step 5: Generate proposed changes
    console.log('\n💡 Step 5: Generating proposed changes...');
    const proposedChanges = await generateProposedChanges(reflection, policies);
    console.log(`   Proposed ${proposedChanges.length} changes`);

    if (proposedChanges.length === 0) {
      console.log('   No changes proposed - skipping PR creation');
      await updateRunRecord(runId, {
        status: 'completed',
        skip_reason: 'No changes proposed',
      });
      return;
    }

    // Step 6: Validate changes against safety policies
    console.log('\n🔍 Step 6: Validating changes against safety policies...');
    const safetyCheckResults = await validateChanges(proposedChanges, policies);

    if (!safetyCheckResults.passed) {
      console.log(`   ❌ Safety check failed: ${safetyCheckResults.reason}`);
      await updateRunRecord(runId, {
        status: 'failed',
        error_message: `Safety check failed: ${safetyCheckResults.reason}`,
        safety_check_results: safetyCheckResults,
      });
      return;
    }

    console.log('   ✅ All safety checks passed');

    // Step 7: Create branch and apply changes
    console.log('\n🌿 Step 7: Creating branch and applying changes...');
    const branchName = `self-evolve/${new Date().toISOString().split('T')[0]}`;
    await createBranchAndApplyChanges(branchName, proposedChanges);
    console.log(`   Branch created: ${branchName}`);

    // Step 8: Create pull request
    console.log('\n🔀 Step 8: Creating pull request...');
    const pr = await createPullRequest(branchName, reflection, proposedChanges, safetyCheckResults);
    console.log(`   PR created: #${pr.number} - ${pr.url}`);

    // Step 9: Record changes in database
    console.log('\n💾 Step 9: Recording changes in database...');
    await recordChanges(runId, proposedChanges);

    // Step 10: Update run record with final status
    await updateRunRecord(runId, {
      status: 'completed',
      pr_number: pr.number,
      pr_url: pr.url,
      branch_name: branchName,
      total_loc_changed: safetyCheckResults.metrics.totalLOC,
      total_files_changed: safetyCheckResults.metrics.totalFiles,
      total_directories_changed: safetyCheckResults.metrics.totalDirectories,
      reflection_summary: reflection,
      proposed_changes: proposedChanges,
      safety_check_results: safetyCheckResults,
    });

    console.log('\n✅ Self-evolution run completed successfully!');
    console.log(`   PR URL: ${pr.url}`);

  } catch (error) {
    console.error('\n❌ Self-evolution run failed:', error);

    // Try to record the failure
    try {
      await recordRun({
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error),
      });
    } catch (dbError) {
      console.error('   Failed to record error in database:', dbError);
    }

    process.exit(1);
  }
}

/**
 * Check if there's already an open self-evolution PR
 */
async function checkForExistingPR(): Promise<{ number: number; url: string } | null> {
  const searchQuery = `repo:${GITHUB_REPO} is:pr is:open label:self-evolution in:title`;
  const response = await fetch(
    `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery)}`,
    {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to search for PRs: ${response.status}`);
  }

  const data: any = await response.json();

  if (data.total_count > 0) {
    const pr = data.items[0];
    return {
      number: pr.number,
      url: pr.html_url,
    };
  }

  return null;
}

/**
 * Load active safety policies from database
 */
async function loadSafetyPolicies(): Promise<SafetyPolicy[]> {
  // For now, return hardcoded policies matching the database defaults
  // In production, this would query the database
  return [
    { policy_type: 'max_loc', policy_value: '500', is_active: true },
    { policy_type: 'max_files', policy_value: '10', is_active: true },
    { policy_type: 'max_directories', policy_value: '4', is_active: true },
    { policy_type: 'allowlist', policy_value: 'prompts/', is_active: true },
    { policy_type: 'allowlist', policy_value: 'docs/', is_active: true },
    { policy_type: 'allowlist', policy_value: 'apps/bot/src/agent/tools:new_only', is_active: true },
    { policy_type: 'allowlist', policy_value: '.github/workflows/:new_only', is_active: true },
    { policy_type: 'allowlist', policy_value: 'config/feature-flags.*', is_active: true },
    { policy_type: 'blocklist', policy_value: 'apps/bot/src/index.ts', is_active: true },
    { policy_type: 'blocklist', policy_value: 'apps/*/src/index.ts', is_active: true },
    { policy_type: 'blocklist', policy_value: 'scripts/deploy-*.sh', is_active: true },
    { policy_type: 'blocklist', policy_value: '.env*', is_active: true },
    { policy_type: 'blocklist', policy_value: 'packages/database/scripts/*', is_active: true },
  ];
}

/**
 * Create a new run record in database
 */
async function createRunRecord(): Promise<number> {
  // In production, this would insert into the database and return the ID
  // For now, return a mock ID
  return Date.now();
}

/**
 * Update run record with final status and metadata
 */
async function updateRunRecord(runId: number, data: any): Promise<void> {
  // In production, this would update the database record
  console.log(`   Updated run ${runId} with status: ${data.status}`);
}

/**
 * Record a simple run without creating a record first
 */
async function recordRun(data: any): Promise<void> {
  // In production, this would insert into the database
  console.log(`   Recorded run with status: ${data.status}`);
}

/**
 * Generate reflection by analyzing recent activity
 */
async function generateReflection(): Promise<any> {
  // This would use AI to analyze:
  // - Recent Discord conversations
  // - GitHub issues and PRs
  // - Error logs
  // - User feedback
  // - Bot performance metrics

  return {
    insights: [
      'Prompt improvements for better user engagement',
      'Documentation updates for clarity',
      'Minor configuration adjustments',
    ],
    recommendations: [
      {
        category: 'prompts',
        description: 'Update system prompts for more natural responses',
        priority: 'medium',
      },
      {
        category: 'docs',
        description: 'Add examples to README for common use cases',
        priority: 'low',
      },
    ],
  };
}

/**
 * Generate proposed code changes based on reflection
 */
async function generateProposedChanges(reflection: any, policies: SafetyPolicy[]): Promise<any[]> {
  // This would use AI to generate actual code changes
  // For now, return empty array (no changes proposed)

  // Example structure:
  // return [
  //   {
  //     file_path: 'prompts/system.md',
  //     change_type: 'modify',
  //     lines_added: 5,
  //     lines_removed: 2,
  //     change_category: 'prompts',
  //     change_description: 'Improve system prompt clarity',
  //     content: '...'
  //   }
  // ];

  return [];
}

/**
 * Validate changes against safety policies
 */
async function validateChanges(changes: any[], policies: SafetyPolicy[]): Promise<any> {
  const maxLOC = parseInt(policies.find(p => p.policy_type === 'max_loc')?.policy_value || '500');
  const maxFiles = parseInt(policies.find(p => p.policy_type === 'max_files')?.policy_value || '10');
  const maxDirs = parseInt(policies.find(p => p.policy_type === 'max_directories')?.policy_value || '4');

  const allowlist = policies
    .filter(p => p.policy_type === 'allowlist')
    .map(p => p.policy_value);

  const blocklist = policies
    .filter(p => p.policy_type === 'blocklist')
    .map(p => p.policy_value);

  const totalLOC = changes.reduce((sum, c) => sum + (c.lines_added || 0) + (c.lines_removed || 0), 0);
  const totalFiles = changes.length;
  const directories = new Set(changes.map(c => {
    const parts = c.file_path.split('/');
    return parts.slice(0, -1).join('/');
  }));
  const totalDirectories = directories.size;

  // Check LOC limit
  if (totalLOC > maxLOC) {
    return {
      passed: false,
      reason: `Exceeds max LOC limit: ${totalLOC} > ${maxLOC}`,
      metrics: { totalLOC, totalFiles, totalDirectories },
    };
  }

  // Check files limit
  if (totalFiles > maxFiles) {
    return {
      passed: false,
      reason: `Exceeds max files limit: ${totalFiles} > ${maxFiles}`,
      metrics: { totalLOC, totalFiles, totalDirectories },
    };
  }

  // Check directories limit
  if (totalDirectories > maxDirs) {
    return {
      passed: false,
      reason: `Exceeds max directories limit: ${totalDirectories} > ${maxDirs}`,
      metrics: { totalLOC, totalFiles, totalDirectories },
    };
  }

  // Check allowlist/blocklist
  for (const change of changes) {
    const isBlocked = blocklist.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(change.file_path);
      }
      return change.file_path.startsWith(pattern);
    });

    if (isBlocked) {
      return {
        passed: false,
        reason: `File blocked by policy: ${change.file_path}`,
        metrics: { totalLOC, totalFiles, totalDirectories },
      };
    }

    const isAllowed = allowlist.some(pattern => {
      const [path, modifier] = pattern.split(':');
      const pathMatch = change.file_path.startsWith(path);

      if (!pathMatch) return false;

      if (modifier === 'new_only' && change.change_type !== 'create') {
        return false;
      }

      return true;
    });

    if (!isAllowed) {
      return {
        passed: false,
        reason: `File not in allowlist: ${change.file_path}`,
        metrics: { totalLOC, totalFiles, totalDirectories },
      };
    }
  }

  return {
    passed: true,
    metrics: { totalLOC, totalFiles, totalDirectories },
  };
}

/**
 * Create branch and apply changes
 */
async function createBranchAndApplyChanges(branchName: string, changes: any[]): Promise<void> {
  // Create new branch from main
  execSync('git fetch origin main', { stdio: 'inherit' });
  execSync(`git checkout -b ${branchName} origin/main`, { stdio: 'inherit' });

  // Apply each change
  for (const change of changes) {
    if (change.change_type === 'create' || change.change_type === 'modify') {
      const dir = change.file_path.split('/').slice(0, -1).join('/');
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(change.file_path, change.content);
    } else if (change.change_type === 'delete') {
      execSync(`git rm ${change.file_path}`, { stdio: 'inherit' });
    }
  }

  // Commit changes
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "feat: self-evolution improvements\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>"', { stdio: 'inherit' });

  // Push branch
  execSync(`git push origin ${branchName}`, { stdio: 'inherit' });
}

/**
 * Create pull request with reflection summary
 */
async function createPullRequest(
  branchName: string,
  reflection: any,
  changes: any[],
  safetyCheckResults: any
): Promise<{ number: number; url: string }> {
  const title = `Self-Evolution: ${new Date().toISOString().split('T')[0]}`;

  const body = `## 🤖 Automated Self-Evolution

This PR was generated by the daily self-evolution workflow based on analysis of recent bot activity.

### Reflection Summary

${reflection.insights.map((i: string) => `- ${i}`).join('\n')}

### Proposed Changes

${changes.map(c => `- **${c.change_type}** \`${c.file_path}\`: ${c.change_description}`).join('\n')}

### Safety Check Results

- **Total LOC Changed**: ${safetyCheckResults.metrics.totalLOC} / 500
- **Total Files Changed**: ${safetyCheckResults.metrics.totalFiles} / 10
- **Total Directories**: ${safetyCheckResults.metrics.totalDirectories} / 4
- **Status**: ✅ All safety checks passed

### Review Checklist

- [ ] Changes align with project goals
- [ ] No security concerns
- [ ] No breaking changes
- [ ] Documentation updated if needed

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

References: #751, #752`;

  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      title,
      body,
      head: branchName,
      base: 'main',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create PR: ${response.status} - ${error}`);
  }

  const pr: any = await response.json();

  // Add labels
  await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${pr.number}/labels`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      labels: ['self-evolution', 'ai-ops'],
    }),
  });

  // Request reviewers (CODEOWNERS)
  // This would be handled by CODEOWNERS file automatically

  return {
    number: pr.number,
    url: pr.html_url,
  };
}

/**
 * Record individual changes in database
 */
async function recordChanges(runId: number, changes: any[]): Promise<void> {
  // In production, this would insert into self_evolution_change table
  console.log(`   Recorded ${changes.length} changes for run ${runId}`);
}

// Run the orchestrator
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
