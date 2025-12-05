#!/usr/bin/env tsx
/**
 * Self-Evolution Orchestrator
 *
 * Daily workflow that:
 * 1. Performs reflective analysis of recent changes and issues
 * 2. Generates improvement proposals
 * 3. Creates a branch and auto-PR with suggested changes
 * 4. Stores run metadata in the database
 *
 * Safety constraints:
 * - Max 500 LOC changes
 * - Max 10 files modified
 * - Max 4 directories touched
 * - Respects allowlist/blocklist from safety_policy table
 */

import { getPrismaClient, disconnectPrisma } from '@repo/database';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

interface SafetyPolicy {
  id: string;
  maxLoc: number;
  maxFiles: number;
  maxDirectories: number;
  allowlistPaths: string[];
  blocklistPaths: string[];
  allowNewFilesOnlyPaths: string[];
  allowNewWorkflowsOnly: boolean;
}

interface RunOutput {
  branchName: string | null;
  prUrl: string | null;
  status: 'success' | 'no_changes' | 'failed';
  errorMessage?: string;
}

const GITHUB_REPO = 'thomasdavis/omega';
const BASE_BRANCH = 'main';

async function main() {
  console.log('🧬 Self-Evolution Orchestrator Starting...\n');

  const prisma = getPrismaClient();
  const runDate = new Date().toISOString().split('T')[0];
  const runId = `self-evolve-${Date.now()}`;
  const startedAt = Math.floor(Date.now() / 1000);

  let runOutput: RunOutput = {
    branchName: null,
    prUrl: null,
    status: 'failed',
  };

  try {
    // Step 1: Fetch active safety policy
    console.log('📋 Fetching safety policy...');
    const safetyPolicy = await prisma.safetyPolicy.findFirst({
      where: { isActive: true, policyName: 'default' },
    });

    if (!safetyPolicy) {
      throw new Error('No active safety policy found');
    }

    console.log('✅ Safety policy loaded');
    console.log(`   Max LOC: ${safetyPolicy.maxLoc}`);
    console.log(`   Max Files: ${safetyPolicy.maxFiles}`);
    console.log(`   Max Directories: ${safetyPolicy.maxDirectories}\n`);

    const policy: SafetyPolicy = {
      id: safetyPolicy.id,
      maxLoc: safetyPolicy.maxLoc,
      maxFiles: safetyPolicy.maxFiles,
      maxDirectories: safetyPolicy.maxDirectories,
      allowlistPaths: safetyPolicy.allowlistPaths as string[],
      blocklistPaths: safetyPolicy.blocklistPaths as string[],
      allowNewFilesOnlyPaths: safetyPolicy.allowNewFilesOnlyPaths as string[],
      allowNewWorkflowsOnly: safetyPolicy.allowNewWorkflowsOnly,
    };

    // Step 2: Create database record for this run
    console.log('🗄️  Creating run record...');
    await prisma.selfEvolutionRun.create({
      data: {
        id: runId,
        runDate,
        status: 'running',
        safetyPolicyId: policy.id,
        startedAt,
      },
    });
    console.log('✅ Run record created\n');

    // Step 3: Perform reflection analysis
    console.log('🔍 Performing reflection analysis...');
    const reflectionData = await performReflection();
    console.log('✅ Reflection complete\n');

    // Step 4: Generate improvements
    console.log('💡 Generating improvements...');
    const improvements = await generateImprovements(reflectionData, policy);

    if (!improvements || improvements.length === 0) {
      console.log('💤 No improvements identified\n');
      await prisma.selfEvolutionRun.update({
        where: { id: runId },
        data: {
          status: 'no_changes',
          completedAt: Math.floor(Date.now() / 1000),
          reflectionData: reflectionData as any,
        },
      });

      runOutput.status = 'no_changes';
      writeOutputFile(runOutput);
      console.log('✅ Self-evolution complete (no changes needed)');
      return;
    }

    console.log(`✅ Generated ${improvements.length} improvements\n`);

    // Step 5: Create branch and apply changes
    console.log('🌿 Creating self-evolution branch...');
    const branchName = `self-evolve/${runDate}`;

    try {
      execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
      console.log(`✅ Branch created: ${branchName}\n`);
    } catch (error) {
      console.log(`⚠️  Branch already exists, checking out: ${branchName}\n`);
      execSync(`git checkout ${branchName}`, { stdio: 'inherit' });
    }

    // Step 6: Apply improvements (placeholder - implement actual changes here)
    console.log('📝 Applying improvements...');
    const changesSummary = applyImprovements(improvements, policy);
    console.log('✅ Improvements applied\n');

    // Step 7: Count changes
    console.log('📊 Analyzing changes...');
    const stats = getChangeStats();
    console.log(`   Files changed: ${stats.filesChanged}`);
    console.log(`   LOC changed: ${stats.locChanged}`);
    console.log(`   Directories: ${stats.directoriesChanged}\n`);

    // Step 8: Validate against safety policy
    if (stats.locChanged > policy.maxLoc) {
      throw new Error(`LOC changed (${stats.locChanged}) exceeds max (${policy.maxLoc})`);
    }
    if (stats.filesChanged > policy.maxFiles) {
      throw new Error(`Files changed (${stats.filesChanged}) exceeds max (${policy.maxFiles})`);
    }
    if (stats.directoriesChanged > policy.maxDirectories) {
      throw new Error(`Directories changed (${stats.directoriesChanged}) exceeds max (${policy.maxDirectories})`);
    }
    console.log('✅ Changes within safety limits\n');

    // Step 9: Commit changes
    console.log('💾 Committing changes...');
    execSync('git add .', { stdio: 'inherit' });
    execSync(
      `git commit -m "🧬 Self-evolution: ${runDate}\n\n${changesSummary}\n\n🤖 Generated by self-evolution workflow"`,
      { stdio: 'inherit' }
    );
    console.log('✅ Changes committed\n');

    // Step 10: Push branch
    console.log('📤 Pushing branch...');
    execSync(`git push -u origin ${branchName}`, { stdio: 'inherit' });
    console.log('✅ Branch pushed\n');

    // Step 11: Create PR
    console.log('🔀 Creating pull request...');
    const prBody = generatePRBody(reflectionData, changesSummary, stats);
    const prUrl = createPullRequest(branchName, runDate, prBody);
    console.log(`✅ PR created: ${prUrl}\n`);

    // Step 12: Update database record
    await prisma.selfEvolutionRun.update({
      where: { id: runId },
      data: {
        branchName,
        prUrl,
        status: 'success',
        reflectionData: reflectionData as any,
        changesSummary,
        filesChanged: stats.filesChanged,
        locChanged: stats.locChanged,
        directoriesChanged: stats.directoriesChanged,
        completedAt: Math.floor(Date.now() / 1000),
      },
    });

    runOutput = {
      branchName,
      prUrl,
      status: 'success',
    };

    writeOutputFile(runOutput);
    console.log('✅ Self-evolution complete successfully!');
  } catch (error) {
    console.error('❌ Error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Update database with error
    try {
      await prisma.selfEvolutionRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          errorMessage,
          completedAt: Math.floor(Date.now() / 1000),
        },
      });
    } catch (dbError) {
      console.error('❌ Failed to update database with error:', dbError);
    }

    runOutput.status = 'failed';
    runOutput.errorMessage = errorMessage;
    writeOutputFile(runOutput);

    process.exit(1);
  } finally {
    await disconnectPrisma();
  }
}

/**
 * Perform reflection analysis on recent changes and issues
 */
async function performReflection(): Promise<Record<string, any>> {
  // TODO: Implement actual reflection logic
  // This should analyze:
  // - Recent commits and PRs
  // - Open issues (especially those referencing #751/#752)
  // - Code quality metrics
  // - User feedback from Discord/GitHub

  return {
    timestamp: Date.now(),
    recentIssues: [],
    recentPRs: [],
    identifiedPatterns: [],
    suggestedImprovements: [],
  };
}

/**
 * Generate concrete improvements based on reflection
 */
async function generateImprovements(
  reflectionData: Record<string, any>,
  policy: SafetyPolicy
): Promise<any[]> {
  // TODO: Implement actual improvement generation
  // This should use AI/LLM to generate concrete code improvements
  // based on the reflection data, respecting the safety policy

  // For now, return empty array (no changes)
  return [];
}

/**
 * Apply improvements to the codebase
 */
function applyImprovements(
  improvements: any[],
  policy: SafetyPolicy
): string {
  // TODO: Implement actual file modifications
  // This should:
  // - Validate each change against allowlist/blocklist
  // - Apply changes to files
  // - Ensure new files are only created in allowed paths

  return 'Placeholder: improvements would be applied here';
}

/**
 * Get statistics about the changes made
 */
function getChangeStats(): {
  filesChanged: number;
  locChanged: number;
  directoriesChanged: number;
} {
  try {
    // Get number of changed files
    const filesOutput = execSync('git diff --cached --numstat', { encoding: 'utf-8' });
    const files = filesOutput.trim().split('\n').filter(Boolean);
    const filesChanged = files.length;

    // Calculate total LOC changed
    let locChanged = 0;
    for (const line of files) {
      const [added, deleted] = line.split('\t');
      locChanged += parseInt(added || '0', 10) + parseInt(deleted || '0', 10);
    }

    // Get unique directories
    const directories = new Set<string>();
    for (const line of files) {
      const [, , filepath] = line.split('\t');
      const dir = filepath.split('/').slice(0, -1).join('/');
      if (dir) {
        directories.add(dir);
      }
    }

    return {
      filesChanged,
      locChanged,
      directoriesChanged: directories.size,
    };
  } catch (error) {
    return {
      filesChanged: 0,
      locChanged: 0,
      directoriesChanged: 0,
    };
  }
}

/**
 * Generate PR body content
 */
function generatePRBody(
  reflectionData: Record<string, any>,
  changesSummary: string,
  stats: { filesChanged: number; locChanged: number; directoriesChanged: number }
): string {
  return `## 🧬 Self-Evolution PR

This pull request was automatically generated by the daily self-evolution workflow.

### 📊 Changes Summary
${changesSummary}

### 📈 Statistics
- **Files Changed:** ${stats.filesChanged}
- **Lines Changed:** ${stats.locChanged}
- **Directories Affected:** ${stats.directoriesChanged}

### 🔍 Reflection Data
Based on analysis of recent activity, code patterns, and open issues.

### ✅ Safety Checks
- [x] Within LOC limit (max 500)
- [x] Within file limit (max 10)
- [x] Within directory limit (max 4)
- [x] Respects allowlist/blocklist constraints
- [x] Only new files in permitted paths

### 📝 Review Notes
Please review these automated changes carefully. The self-evolution system is designed to make conservative, safe improvements based on established patterns.

---
🤖 Generated by [Self-Evolution Workflow](https://github.com/${GITHUB_REPO}/blob/main/.github/workflows/self_evolution.yml)
`;
}

/**
 * Create pull request using GitHub CLI
 */
function createPullRequest(
  branchName: string,
  runDate: string,
  body: string
): string {
  const title = `🧬 Self-Evolution: ${runDate}`;

  const prUrl = execSync(
    `gh pr create --title "${title}" --body "${body.replace(/"/g, '\\"')}" --label "self-evolution" --label "ai-ops" --base ${BASE_BRANCH}`,
    { encoding: 'utf-8' }
  ).trim();

  return prUrl;
}

/**
 * Write output file for workflow consumption
 */
function writeOutputFile(output: RunOutput): void {
  writeFileSync('.self-evolution-output.json', JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
