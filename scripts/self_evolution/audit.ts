#!/usr/bin/env tsx
/**
 * Self-Evolution Audit Script
 *
 * Analyzes self-evolution runs and calculates metrics for the observatory dashboard.
 * Generates snapshot data for visualization and exports JSON for last 30 runs.
 *
 * Usage:
 *   tsx scripts/self_evolution/audit.ts
 *   DATABASE_URL=<url> tsx scripts/self_evolution/audit.ts
 *
 * Metrics calculated:
 * - Guardrail pass rate
 * - PR cycle time (avg)
 * - Rollback count
 * - Categories chosen vs rejected
 * - Wildcard feature adoption rate
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface AuditMetrics {
  runId: string;
  startedAt: string;
  status: string;
  guardrailPassRate: number;
  avgPrCycleTimeMs: number | null;
  rollbackCount: number;
  categoriesChosenCount: number;
  categoriesRejectedCount: number;
  wildcardAdoptionRate: number;
  totalDurationMs: number | null;
}

interface ExportData {
  generatedAt: string;
  totalRuns: number;
  runs: AuditMetrics[];
}

async function connectToDatabase() {
  const { Client } = await import('pg');

  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL or DATABASE_PUBLIC_URL environment variable not set');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  return client;
}

async function calculateMetricsForRun(client: any, runId: string): Promise<AuditMetrics | null> {
  try {
    // Get run info
    const runResult = await client.query(
      `SELECT run_id, started_at, status, total_duration_ms
       FROM self_evolution_runs
       WHERE run_id = $1`,
      [runId]
    );

    if (runResult.rows.length === 0) {
      return null;
    }

    const run = runResult.rows[0];

    // Calculate guardrail pass rate
    const guardrailsResult = await client.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN passed THEN 1 ELSE 0 END) as passed_count
       FROM self_evolution_guardrails
       WHERE run_id = $1`,
      [runId]
    );

    const guardrailTotal = parseInt(guardrailsResult.rows[0].total) || 0;
    const guardrailPassed = parseInt(guardrailsResult.rows[0].passed_count) || 0;
    const guardrailPassRate = guardrailTotal > 0 ? (guardrailPassed / guardrailTotal) * 100 : 0;

    // Calculate average PR cycle time
    const prCycleResult = await client.query(
      `SELECT AVG(cycle_time_ms) as avg_cycle_time
       FROM self_evolution_pr_cycles
       WHERE run_id = $1 AND cycle_time_ms IS NOT NULL`,
      [runId]
    );

    const avgPrCycleTimeMs = prCycleResult.rows[0].avg_cycle_time
      ? parseFloat(prCycleResult.rows[0].avg_cycle_time)
      : null;

    // Count rollbacks
    const rollbackResult = await client.query(
      `SELECT COUNT(*) as rollback_count
       FROM self_evolution_rollbacks
       WHERE run_id = $1`,
      [runId]
    );

    const rollbackCount = parseInt(rollbackResult.rows[0].rollback_count) || 0;

    // Count categories chosen vs rejected
    const categoriesResult = await client.query(
      `SELECT
        SUM(CASE WHEN chosen THEN 1 ELSE 0 END) as chosen_count,
        SUM(CASE WHEN NOT chosen THEN 1 ELSE 0 END) as rejected_count
       FROM self_evolution_categories
       WHERE run_id = $1`,
      [runId]
    );

    const categoriesChosenCount = parseInt(categoriesResult.rows[0].chosen_count) || 0;
    const categoriesRejectedCount = parseInt(categoriesResult.rows[0].rejected_count) || 0;

    // Calculate wildcard adoption rate
    const wildcardsResult = await client.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN adopted THEN 1 ELSE 0 END) as adopted_count
       FROM self_evolution_wildcards
       WHERE run_id = $1`,
      [runId]
    );

    const wildcardTotal = parseInt(wildcardsResult.rows[0].total) || 0;
    const wildcardAdopted = parseInt(wildcardsResult.rows[0].adopted_count) || 0;
    const wildcardAdoptionRate = wildcardTotal > 0 ? (wildcardAdopted / wildcardTotal) * 100 : 0;

    // Store metrics snapshot
    await client.query(
      `INSERT INTO self_evolution_metrics
       (run_id, guardrail_pass_rate, avg_pr_cycle_time_ms, rollback_count,
        categories_chosen_count, categories_rejected_count, wildcard_adoption_rate,
        snapshot_timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (run_id)
       DO UPDATE SET
         guardrail_pass_rate = EXCLUDED.guardrail_pass_rate,
         avg_pr_cycle_time_ms = EXCLUDED.avg_pr_cycle_time_ms,
         rollback_count = EXCLUDED.rollback_count,
         categories_chosen_count = EXCLUDED.categories_chosen_count,
         categories_rejected_count = EXCLUDED.categories_rejected_count,
         wildcard_adoption_rate = EXCLUDED.wildcard_adoption_rate,
         snapshot_timestamp = NOW()`,
      [
        runId,
        guardrailPassRate,
        avgPrCycleTimeMs,
        rollbackCount,
        categoriesChosenCount,
        categoriesRejectedCount,
        wildcardAdoptionRate,
      ]
    );

    return {
      runId: run.run_id,
      startedAt: run.started_at,
      status: run.status,
      guardrailPassRate,
      avgPrCycleTimeMs,
      rollbackCount,
      categoriesChosenCount,
      categoriesRejectedCount,
      wildcardAdoptionRate,
      totalDurationMs: run.total_duration_ms,
    };
  } catch (error) {
    console.error(`❌ Error calculating metrics for run ${runId}:`, error);
    return null;
  }
}

async function auditAllRuns(client: any): Promise<AuditMetrics[]> {
  console.log('📊 Auditing all self-evolution runs...');

  // Get all run IDs
  const runsResult = await client.query(
    `SELECT run_id FROM self_evolution_runs
     ORDER BY started_at DESC
     LIMIT 30`
  );

  const runIds = runsResult.rows.map((row: any) => row.run_id);

  console.log(`   Found ${runIds.length} run(s) to audit`);

  const metrics: AuditMetrics[] = [];

  for (const runId of runIds) {
    const runMetrics = await calculateMetricsForRun(client, runId);
    if (runMetrics) {
      metrics.push(runMetrics);
      console.log(`   ✅ Audited run: ${runId}`);
    }
  }

  return metrics;
}

async function exportMetricsJson(metrics: AuditMetrics[], outputPath: string) {
  const exportData: ExportData = {
    generatedAt: new Date().toISOString(),
    totalRuns: metrics.length,
    runs: metrics,
  };

  writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
  console.log(`📄 Exported metrics to: ${outputPath}`);
}

async function main() {
  console.log('🔍 Self-Evolution Audit Tool v1.0.0');
  console.log('');

  const client = await connectToDatabase();

  try {
    // Audit all runs and calculate metrics
    const metrics = await auditAllRuns(client);

    if (metrics.length === 0) {
      console.log('ℹ️  No self-evolution runs found to audit');
      console.log('   This is expected if no self-evolution runs have been executed yet.');
      console.log('');

      // Create empty export file
      const outputPath = join(process.cwd(), 'apps/bot/public/data/self-evolution-metrics.json');
      const emptyData: ExportData = {
        generatedAt: new Date().toISOString(),
        totalRuns: 0,
        runs: [],
      };
      writeFileSync(outputPath, JSON.stringify(emptyData, null, 2), 'utf-8');
      console.log(`📄 Created empty metrics file: ${outputPath}`);
      return;
    }

    // Export to JSON file for dashboard
    const outputPath = join(process.cwd(), 'apps/bot/public/data/self-evolution-metrics.json');
    await exportMetricsJson(metrics, outputPath);

    // Print summary
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 AUDIT SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Total Runs Audited: ${metrics.length}`);

    if (metrics.length > 0) {
      const avgGuardrailPassRate =
        metrics.reduce((sum, m) => sum + m.guardrailPassRate, 0) / metrics.length;
      const avgRollbackCount =
        metrics.reduce((sum, m) => sum + m.rollbackCount, 0) / metrics.length;
      const avgWildcardAdoption =
        metrics.reduce((sum, m) => sum + m.wildcardAdoptionRate, 0) / metrics.length;

      console.log(`   Avg Guardrail Pass Rate: ${avgGuardrailPassRate.toFixed(1)}%`);
      console.log(`   Avg Rollback Count: ${avgRollbackCount.toFixed(1)}`);
      console.log(`   Avg Wildcard Adoption: ${avgWildcardAdoption.toFixed(1)}%`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✅ Audit completed successfully');
  } catch (error) {
    console.error('❌ Error during audit:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
