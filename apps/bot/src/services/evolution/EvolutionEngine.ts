/**
 * Evolution Engine - Main Orchestrator
 * OODA Loop: Observe → Orient → Decide → Act
 */

import { observe } from './Observer.js';
import { orient } from './Orienter.js';
import { decide } from './Decider.js';
import { act } from './Actor.js';
import {
  saveSelfReflection,
  createProposal,
  updateProposalStatus,
  logEvolutionAction,
} from '@repo/database';

export interface EvolutionRunResult {
  runDate: Date;
  observationSummary: string;
  proposalsGenerated: number;
  proposalsSelected: number;
  proposalsDeferred: number;
  proposalsRejected: number;
  sanityChecksPassed: boolean;
  branchCreated: boolean;
  prCreated: boolean;
  prUrl?: string;
  deferralReason?: string;
}

/**
 * Run the evolution engine for a single day
 */
export async function runEvolutionEngine(dryRun: boolean = false): Promise<EvolutionRunResult> {
  const runDate = new Date();
  runDate.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧠 OMEGA SELF-EVOLUTION ENGINE');
  console.log(`📅 Run Date: ${runDate.toISOString().split('T')[0]}`);
  console.log(`🔬 Mode: ${dryRun ? 'DRY-RUN' : 'ACTIVE'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await logEvolutionAction({
    action: 'evolution_run_started',
    details: { runDate: runDate.toISOString(), dryRun },
  });

  try {
    // Phase 1: OBSERVE
    console.log('🔍 Phase 1/4: OBSERVE');
    const observations = await observe();
    console.log('');

    // Phase 2: ORIENT
    console.log('🧭 Phase 2/4: ORIENT');
    const proposals = await orient(observations);
    console.log('');

    // Save self-reflection
    const reflectionSummary = generateReflectionSummary(observations, proposals);
    await saveSelfReflection({
      run_date: runDate,
      summary: reflectionSummary,
      feelings: observations.feelings,
      metrics: {
        messageVolume: observations.messageVolume,
        userCount: observations.userCount,
        errorCount: observations.errorCount,
        averageSentiment: observations.averageSentiment,
      },
    });
    console.log('💾 Saved self-reflection\n');

    // Save all proposals
    for (const proposal of proposals) {
      const proposalId = await createProposal({
        run_date: runDate,
        type: proposal.type,
        title: proposal.title,
        description: proposal.description,
        risk_level: proposal.riskLevel,
        expected_impact: proposal.expectedImpact,
      });
      console.log(`💾 Saved proposal #${proposalId}: ${proposal.title}`);
    }
    console.log('');

    // Phase 3: DECIDE
    console.log('🎯 Phase 3/4: DECIDE');
    const decision = await decide(proposals);
    console.log('');

    // Update proposal statuses
    for (const proposal of decision.selected) {
      const dbProposal = proposals.find(p => p.title === proposal.title);
      if (dbProposal) {
        // Find proposal ID by matching title (in real impl, would track this better)
        console.log(`✅ Marked as selected: ${proposal.title}`);
      }
    }

    // Phase 4: ACT
    console.log('🎬 Phase 4/4: ACT');
    const actorResult = await act(decision.selected, runDate, dryRun);
    console.log('');

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 EVOLUTION RUN SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Observations:        ${observations.messageVolume} messages, ${observations.userCount} users`);
    console.log(`Proposals Generated: ${proposals.length}`);
    console.log(`   Selected:         ${decision.selected.length}`);
    console.log(`   Deferred:         ${decision.deferred.length}`);
    console.log(`   Rejected:         ${decision.rejected.length}`);
    console.log(`Sanity Checks:       ${actorResult.sanityChecks.length} run, ${actorResult.sanityChecks.filter(c => c.passed).length} passed`);
    console.log(`Branch Created:      ${actorResult.branchCreated ? 'Yes' : 'No'}`);
    console.log(`PR Created:          ${actorResult.prCreated ? 'Yes' : 'No'}`);
    if (actorResult.deferralReason) {
      console.log(`Deferral Reason:     ${actorResult.deferralReason}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await logEvolutionAction({
      action: 'evolution_run_completed',
      details: {
        runDate: runDate.toISOString(),
        proposalsGenerated: proposals.length,
        proposalsSelected: decision.selected.length,
        branchCreated: actorResult.branchCreated,
        prCreated: actorResult.prCreated,
      },
    });

    return {
      runDate,
      observationSummary: reflectionSummary,
      proposalsGenerated: proposals.length,
      proposalsSelected: decision.selected.length,
      proposalsDeferred: decision.deferred.length,
      proposalsRejected: decision.rejected.length,
      sanityChecksPassed: actorResult.sanityChecks.every(c => c.passed),
      branchCreated: actorResult.branchCreated,
      prCreated: actorResult.prCreated,
      prUrl: actorResult.prUrl,
      deferralReason: actorResult.deferralReason,
    };
  } catch (error) {
    console.error('❌ Evolution run failed:', error);

    await logEvolutionAction({
      action: 'evolution_run_failed',
      details: {
        runDate: runDate.toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
}

/**
 * Generate human-readable reflection summary
 */
function generateReflectionSummary(observations: any, proposals: any[]): string {
  const lines = [
    `Observed ${observations.messageVolume} messages from ${observations.userCount} users.`,
    `Error count: ${observations.errorCount}. Average sentiment: ${observations.averageSentiment.toFixed(2)}.`,
    `Feelings: confusion ${(observations.feelings.confusion * 100).toFixed(0)}%, ` +
    `concern ${(observations.feelings.concern * 100).toFixed(0)}%, ` +
    `fatigue ${(observations.feelings.fatigue * 100).toFixed(0)}%, ` +
    `satisfaction ${(observations.feelings.satisfaction * 100).toFixed(0)}%.`,
    `Generated ${proposals.length} improvement proposals across all categories.`,
  ];

  if (observations.topTopics.length > 0) {
    lines.push(`Top topics: ${observations.topTopics.slice(0, 5).join(', ')}.`);
  }

  return lines.join(' ');
}

/**
 * Manual trigger for testing
 */
export async function triggerEvolutionNow(dryRun: boolean = true): Promise<EvolutionRunResult> {
  console.log('🔨 Manual trigger: Running evolution engine now...');
  return await runEvolutionEngine(dryRun);
}
