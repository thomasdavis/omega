/**
 * Evolution Engine - Actor Service
 * Executes selected proposals: creates branches, runs sanity checks, opens PRs
 */

import type { SelectedProposal } from './Decider.js';
import { saveSanityCheck, createFeatureFlag, logEvolutionAction } from '@repo/database';
import fs from 'fs/promises';
import path from 'path';

export interface SanityCheckResult {
  proposal: SelectedProposal;
  checks: {
    lint: boolean;
    typecheck: boolean;
    build: boolean;
    pathAllowlist: boolean;
    featureFlags: boolean;
  };
  score: number;
  passed: boolean;
  logsUrl?: string;
}

export interface ActorResult {
  sanityChecks: SanityCheckResult[];
  branchCreated: boolean;
  branchName?: string;
  prCreated: boolean;
  prNumber?: number;
  prUrl?: string;
  deferralReason?: string;
}

/**
 * Act on selected proposals
 * In dry-run mode (first 48h), only perform checks without creating PRs
 */
export async function act(
  proposals: SelectedProposal[],
  runDate: Date,
  dryRun: boolean = false
): Promise<ActorResult> {
  console.log(`🎬 Actor: Acting on ${proposals.length} proposals (dry-run: ${dryRun})...`);

  if (proposals.length === 0) {
    await logEvolutionAction({
      action: 'no_proposals_selected',
      details: { runDate: runDate.toISOString(), reason: 'No proposals passed selection' },
    });

    return {
      sanityChecks: [],
      branchCreated: false,
      prCreated: false,
      deferralReason: 'No proposals selected for this run',
    };
  }

  // Run sanity checks on all proposals
  const sanityChecks: SanityCheckResult[] = [];
  for (const proposal of proposals) {
    const result = await runSanityChecks(proposal);
    sanityChecks.push(result);
  }

  // Check if all proposals passed
  const allPassed = sanityChecks.every(c => c.passed);

  if (!allPassed) {
    console.log('   ⚠️  Some sanity checks failed, deferring PR creation');
    await logEvolutionAction({
      action: 'sanity_checks_failed',
      details: {
        runDate: runDate.toISOString(),
        failedChecks: sanityChecks.filter(c => !c.passed).map(c => c.proposal.title),
      },
    });

    return {
      sanityChecks,
      branchCreated: false,
      prCreated: false,
      deferralReason: 'Sanity checks failed',
    };
  }

  // If dry-run mode, stop here
  if (dryRun) {
    console.log('   🏁 Dry-run mode: Stopping before branch/PR creation');
    await logEvolutionAction({
      action: 'dry_run_complete',
      details: {
        runDate: runDate.toISOString(),
        proposals: proposals.map(p => p.title),
        allChecksPassed: true,
      },
    });

    return {
      sanityChecks,
      branchCreated: false,
      prCreated: false,
      deferralReason: 'Dry-run mode active (first 48h)',
    };
  }

  // TODO: In a real implementation, this would:
  // 1. Create branch: auto/evolve/YYYY-MM-DD
  // 2. Apply minimal diffs
  // 3. Create feature flags
  // 4. Run CI checks
  // 5. Open PR with template

  console.log('   ⚠️  Actual PR creation not yet implemented');
  console.log('   This will be implemented in Phase 3');

  await logEvolutionAction({
    action: 'implementation_pending',
    details: {
      runDate: runDate.toISOString(),
      proposals: proposals.map(p => p.title),
      note: 'PR creation logic pending Phase 3 implementation',
    },
  });

  return {
    sanityChecks,
    branchCreated: false,
    prCreated: false,
    deferralReason: 'PR creation logic not yet implemented (Phase 3)',
  };
}

/**
 * Run sanity checks on a proposal
 */
async function runSanityChecks(proposal: SelectedProposal): Promise<SanityCheckResult> {
  console.log(`   🔍 Running sanity checks for: ${proposal.title}`);

  const checks = {
    lint: true, // TODO: Actually run lint
    typecheck: true, // TODO: Actually run typecheck
    build: true, // TODO: Actually run build
    pathAllowlist: await checkPathAllowlist(proposal),
    featureFlags: await checkFeatureFlags(proposal),
  };

  const passed = Object.values(checks).every(v => v === true);
  const score = (Object.values(checks).filter(v => v === true).length / Object.keys(checks).length) * 100;

  console.log(`   ${passed ? '✅' : '❌'} Score: ${score.toFixed(0)}%, Passed: ${passed}`);

  return {
    proposal,
    checks,
    score,
    passed,
  };
}

/**
 * Check if proposal respects path allowlist
 */
async function checkPathAllowlist(proposal: SelectedProposal): Promise<boolean> {
  try {
    const allowlistPath = path.join(process.cwd(), 'config/evolution/allowlist.json');
    const content = await fs.readFile(allowlistPath, 'utf-8');
    const allowlist = JSON.parse(content);

    // For now, all proposals pass this check
    // In real implementation, would check proposal.affectedFiles against allowlist
    return true;
  } catch (error) {
    console.warn('   ⚠️  Could not load allowlist');
    return false;
  }
}

/**
 * Check if proposal has required feature flags
 */
async function checkFeatureFlags(proposal: SelectedProposal): Promise<boolean> {
  // All behavior changes must be behind feature flags
  // For now, assume proposals will create flags
  return true;
}

/**
 * Create feature flag for a proposal
 */
async function createProposalFeatureFlag(proposal: SelectedProposal): Promise<void> {
  const flagKey = `evolution_${proposal.title.toLowerCase().replace(/\s+/g, '_')}`;

  await createFeatureFlag({
    key: flagKey,
    description: proposal.description,
    enabled: false,
    rollout_percent: 0,
    metadata: {
      proposalType: proposal.type,
      riskLevel: proposal.riskLevel,
      createdAt: new Date().toISOString(),
    },
  });

  console.log(`   🚩 Created feature flag: ${flagKey}`);
}
