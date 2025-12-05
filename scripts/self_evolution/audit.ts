#!/usr/bin/env tsx
/**
 * Self-Evolution Audit Script
 *
 * Collects and analyzes metrics from self-evolution runs:
 * - Guardrail pass rate
 * - PR cycle time
 * - Rollback count
 * - Categories chosen vs rejected
 * - Wildcard feature adoption
 *
 * Outputs metrics to database and JSON file for dashboard
 */

import { PrismaClient } from '@repo/database';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface RunMetrics {
  runId: string;
  runTimestamp: number;
  triggerType: string;
  totalPrs: number;
  mergedPrs: number;
  rolledBackPrs: number;
  guardrailPassRate: number;
  avgCycleTimeHours: number;
  wildcardFeaturesUsed: number;
  categoriesChosen: number;
  categoriesRejected: number;
  status: string;
}

interface AuditReport {
  generatedAt: number;
  lastNRuns: number;
  runs: RunMetrics[];
  aggregateMetrics: {
    avgGuardrailPassRate: number;
    avgCycleTime: number;
    totalRollbacks: number;
    wildcardAdoptionRate: number;
    mostChosenCategories: Array<{ category: string; count: number }>;
    mostRejectedCategories: Array<{ category: string; count: number }>;
  };
}

async function collectRunMetrics(prisma: PrismaClient, runId: string): Promise<RunMetrics | null> {
  const run = await prisma.$queryRaw<any[]>`
    SELECT
      id,
      run_timestamp,
      trigger_type,
      total_prs_created,
      total_prs_merged,
      total_prs_rolled_back,
      guardrail_pass_rate,
      avg_pr_cycle_time_hours,
      wildcard_features_used,
      status
    FROM self_evolution_runs
    WHERE id = ${runId}
  `;

  if (!run || run.length === 0) return null;

  const runData = run[0];

  const categories = await prisma.$queryRaw<any[]>`
    SELECT
      category,
      was_chosen
    FROM self_evolution_categories
    WHERE run_id = ${runId}
  `;

  const categoriesChosen = categories.filter(c => c.was_chosen).length;
  const categoriesRejected = categories.filter(c => !c.was_chosen).length;

  return {
    runId: runData.id,
    runTimestamp: Number(runData.run_timestamp),
    triggerType: runData.trigger_type,
    totalPrs: runData.total_prs_created || 0,
    mergedPrs: runData.total_prs_merged || 0,
    rolledBackPrs: runData.total_prs_rolled_back || 0,
    guardrailPassRate: runData.guardrail_pass_rate || 0,
    avgCycleTimeHours: runData.avg_pr_cycle_time_hours || 0,
    wildcardFeaturesUsed: runData.wildcard_features_used || 0,
    categoriesChosen,
    categoriesRejected,
    status: runData.status
  };
}

async function generateAuditReport(daysBack: number = 30): Promise<AuditReport> {
  const prisma = new PrismaClient();

  try {
    // Get last N runs (default 30 days)
    const cutoffTimestamp = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60);

    const runs = await prisma.$queryRaw<any[]>`
      SELECT id
      FROM self_evolution_runs
      WHERE run_timestamp >= ${cutoffTimestamp}
      AND status = 'completed'
      ORDER BY run_timestamp DESC
      LIMIT 100
    `;

    const runMetrics: RunMetrics[] = [];
    for (const run of runs) {
      const metrics = await collectRunMetrics(prisma, run.id);
      if (metrics) {
        runMetrics.push(metrics);
      }
    }

    // Calculate aggregate metrics
    const avgGuardrailPassRate = runMetrics.length > 0
      ? runMetrics.reduce((sum, r) => sum + r.guardrailPassRate, 0) / runMetrics.length
      : 0;

    const avgCycleTime = runMetrics.length > 0
      ? runMetrics.reduce((sum, r) => sum + r.avgCycleTimeHours, 0) / runMetrics.length
      : 0;

    const totalRollbacks = runMetrics.reduce((sum, r) => sum + r.rolledBackPrs, 0);

    const totalPrs = runMetrics.reduce((sum, r) => sum + r.totalPrs, 0);
    const totalWildcards = runMetrics.reduce((sum, r) => sum + r.wildcardFeaturesUsed, 0);
    const wildcardAdoptionRate = totalPrs > 0 ? (totalWildcards / totalPrs) * 100 : 0;

    // Get most chosen/rejected categories
    const allCategories = await prisma.$queryRaw<any[]>`
      SELECT
        category,
        was_chosen,
        COUNT(*) as count
      FROM self_evolution_categories
      WHERE run_id IN (
        SELECT id FROM self_evolution_runs
        WHERE run_timestamp >= ${cutoffTimestamp}
        AND status = 'completed'
      )
      GROUP BY category, was_chosen
      ORDER BY count DESC
    `;

    const chosenCategories = allCategories
      .filter(c => c.was_chosen)
      .slice(0, 10)
      .map(c => ({ category: c.category, count: Number(c.count) }));

    const rejectedCategories = allCategories
      .filter(c => !c.was_chosen)
      .slice(0, 10)
      .map(c => ({ category: c.category, count: Number(c.count) }));

    return {
      generatedAt: Math.floor(Date.now() / 1000),
      lastNRuns: runMetrics.length,
      runs: runMetrics,
      aggregateMetrics: {
        avgGuardrailPassRate,
        avgCycleTime,
        totalRollbacks,
        wildcardAdoptionRate,
        mostChosenCategories: chosenCategories,
        mostRejectedCategories: rejectedCategories
      }
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🔍 Starting self-evolution audit...');

  const daysBack = parseInt(process.env.AUDIT_DAYS_BACK || '30', 10);
  console.log(`📅 Analyzing last ${daysBack} days of runs`);

  const report = await generateAuditReport(daysBack);

  console.log(`✅ Generated report with ${report.runs.length} runs`);
  console.log(`📊 Avg guardrail pass rate: ${report.aggregateMetrics.avgGuardrailPassRate.toFixed(2)}%`);
  console.log(`⏱️  Avg cycle time: ${report.aggregateMetrics.avgCycleTime.toFixed(2)} hours`);
  console.log(`🔄 Total rollbacks: ${report.aggregateMetrics.totalRollbacks}`);
  console.log(`🎲 Wildcard adoption rate: ${report.aggregateMetrics.wildcardAdoptionRate.toFixed(2)}%`);

  // Export to JSON file
  const outputDir = join(process.cwd(), 'docs', 'metrics');
  const outputPath = join(outputDir, 'self-evolution-latest.json');

  // Create directory if it doesn't exist
  try {
    const fs = await import('fs');
    await fs.promises.mkdir(outputDir, { recursive: true });
  } catch (err) {
    // Directory might already exist, ignore error
  }

  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`💾 Report saved to ${outputPath}`);

  console.log('✅ Audit complete');
}

main().catch((error) => {
  console.error('❌ Audit failed:', error);
  process.exit(1);
});
