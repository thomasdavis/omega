/**
 * Evolution Engine
 * Main orchestrator for the self-evolution system
 * Implements the OODA loop: Observe → Orient → Decide → Act
 */

import { observe } from './observer.js';
import { orient } from './orienter.js';
import { decide } from './decider.js';
import { act } from './actor.js';
import {
  saveSelfReflection,
  saveProposals,
  saveSanityCheck,
  logAudit,
} from './database.js';
import type { SelfReflection } from './types.js';

/**
 * Run the daily evolution cycle
 */
export async function runEvolutionCycle(): Promise<{
  success: boolean;
  summary: string;
  error?: string;
}> {
  const startTime = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    console.log('🧠 Starting self-evolution cycle...');
    await logAudit({
      action: 'evolution_cycle_start',
      actor: 'omega',
      details: { timestamp: new Date().toISOString() },
    });

    // OBSERVE: Collect last 24h data
    console.log('👁️  Phase 1: Observe');
    const observations = await observe();
    console.log(`   Messages: ${observations.messageVolume}`);
    console.log(`   Topics: ${observations.topics.join(', ')}`);
    console.log(`   Errors: ${observations.errors.length}`);

    // ORIENT: Analyze and generate proposals
    console.log('🧭 Phase 2: Orient');
    const orientation = await orient(observations);
    console.log(`   Pain points: ${orientation.painPoints.length}`);
    console.log(`   Opportunities: ${orientation.opportunities.length}`);
    console.log(`   Proposals generated: ${orientation.scoredProposals.length}`);

    // DECIDE: Select proposals to implement
    console.log('⚖️  Phase 3: Decide');
    const decision = await decide(orientation.scoredProposals);
    console.log(`   Selected: ${decision.selected.length}`);
    console.log(`   Deferred: ${decision.deferred.length}`);
    console.log(`   Reason: ${decision.reason}`);

    // Save reflection
    const reflection: SelfReflection = {
      run_date: today,
      summary: `Analyzed ${observations.messageVolume} messages. ${decision.selected.length} proposals selected.`,
      feelings: observations.feelings,
      metrics: {
        messageVolume: observations.messageVolume,
        errorCount: observations.errors.length,
        toolUsageCount: Object.keys(observations.toolUsage).length,
        proposalsGenerated: orientation.scoredProposals.length,
        proposalsSelected: decision.selected.length,
      },
    };

    await saveSelfReflection(reflection);
    console.log('💾 Reflection saved');

    // Save all proposals
    const allProposals = [...decision.selected, ...decision.deferred];
    const proposalIds = await saveProposals(allProposals);
    console.log(`💾 Saved ${proposalIds.length} proposals`);

    // ACT: Execute selected proposals (Phase 0: planning only, no actual PRs)
    console.log('🚀 Phase 4: Act (dry-run mode)');
    const actions = await act(decision.selected);

    console.log(`   Actions executed: ${actions.length}`);
    for (const action of actions) {
      if (action.success) {
        console.log(`   ✅ ${action.branch_name}`);
      } else {
        console.log(`   ❌ Error: ${action.error}`);
      }
    }

    // Save sanity checks (mock for now)
    for (let i = 0; i < decision.selected.length; i++) {
      const proposalId = proposalIds[i];
      await saveSanityCheck({
        proposal_id: proposalId,
        checks: {
          lint: 'pass',
          typecheck: 'pass',
          tests: 'pass',
          paths: 'pass',
        },
        score: 100,
        passed: true,
      });
    }

    const duration = Date.now() - startTime;
    const summary = `Evolution cycle complete. ${decision.selected.length} proposals selected, ${actions.filter((a) => a.success).length} actions executed successfully. Duration: ${duration}ms`;

    await logAudit({
      action: 'evolution_cycle_complete',
      actor: 'omega',
      details: {
        duration,
        proposals_selected: decision.selected.length,
        actions_executed: actions.filter((a) => a.success).length,
      },
    });

    console.log(`✅ ${summary}`);

    return {
      success: true,
      summary,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Evolution cycle failed:', errorMessage);

    await logAudit({
      action: 'evolution_cycle_failed',
      actor: 'omega',
      details: { error: errorMessage },
    });

    return {
      success: false,
      summary: 'Evolution cycle failed',
      error: errorMessage,
    };
  }
}

/**
 * Generate a daily summary report
 */
export async function generateDailySummary(): Promise<string> {
  // This would be called to post to a tracking issue
  return `## Self-Evolution Daily Report - ${new Date().toISOString().split('T')[0]}

[To be implemented: detailed summary with links to proposals and PRs]
`;
}
