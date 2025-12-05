/**
 * Self-Evolution Service
 * Manages daily self-improvement cycles for Omega
 */

import { prisma } from './prismaClient.js';
import type {
  SelfEvolutionCycleRecord,
  SelfEvolutionActionRecord,
  SelfEvolutionSanityCheckRecord,
  SelfEvolutionMetricRecord,
  SelfEvolutionBranchRecord,
} from './schema.js';

/**
 * Create a new evolution cycle
 */
export async function createCycle(params: {
  cycleDate: string;
  summary?: string;
  wildcardTitle?: string;
}): Promise<number> {
  const result = await prisma.$executeRaw`
    INSERT INTO self_evolution_cycles (cycle_date, summary, wildcard_title, status, started_at)
    VALUES (${params.cycleDate}::date, ${params.summary || null}, ${params.wildcardTitle || null}, 'running', NOW())
    ON CONFLICT (cycle_date) DO UPDATE
      SET started_at = NOW(), status = 'running', summary = ${params.summary || null}, wildcard_title = ${params.wildcardTitle || null}
    RETURNING id
  `;

  // Get the cycle ID
  const cycle = await prisma.$queryRaw<Array<{ id: number }>>`
    SELECT id FROM self_evolution_cycles WHERE cycle_date = ${params.cycleDate}::date
  `;

  return cycle[0].id;
}

/**
 * Update cycle status and summary
 */
export async function updateCycle(params: {
  cycleId: number;
  status?: 'planned' | 'running' | 'completed' | 'failed' | 'reverted';
  summary?: string;
  endedAt?: Date;
}): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (params.status) {
    updates.push(`status = $${updates.length + 2}`);
    values.push(params.status);
  }

  if (params.summary) {
    updates.push(`summary = $${updates.length + 2}`);
    values.push(params.summary);
  }

  if (params.endedAt) {
    updates.push(`ended_at = $${updates.length + 2}`);
    values.push(params.endedAt);
  }

  if (updates.length === 0) return;

  await prisma.$executeRawUnsafe(
    `UPDATE self_evolution_cycles SET ${updates.join(', ')} WHERE id = $1`,
    params.cycleId,
    ...values
  );
}

/**
 * Get the most recent cycle
 */
export async function getLatestCycle(): Promise<SelfEvolutionCycleRecord | null> {
  const cycles = await prisma.$queryRaw<SelfEvolutionCycleRecord[]>`
    SELECT * FROM self_evolution_cycles ORDER BY cycle_date DESC LIMIT 1
  `;

  return cycles.length > 0 ? cycles[0] : null;
}

/**
 * Get cycle by date
 */
export async function getCycleByDate(
  cycleDate: string
): Promise<SelfEvolutionCycleRecord | null> {
  const cycles = await prisma.$queryRaw<SelfEvolutionCycleRecord[]>`
    SELECT * FROM self_evolution_cycles WHERE cycle_date = ${cycleDate}::date
  `;

  return cycles.length > 0 ? cycles[0] : null;
}

/**
 * Add an action to a cycle
 */
export async function createAction(params: {
  cycleId: number;
  type: 'capability' | 'future' | 'wildcard' | 'prompt' | 'persona';
  title: string;
  description?: string;
  issueNumber?: number;
  prNumber?: number;
  branchName?: string;
}): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO self_evolution_actions (cycle_id, type, title, description, issue_number, pr_number, branch_name, status)
    VALUES (
      ${params.cycleId},
      ${params.type},
      ${params.title},
      ${params.description || null},
      ${params.issueNumber || null},
      ${params.prNumber || null},
      ${params.branchName || null},
      'planned'
    )
    RETURNING id
  `;

  return result[0].id;
}

/**
 * Update action status
 */
export async function updateAction(params: {
  actionId: number;
  status?: 'planned' | 'in_progress' | 'done' | 'skipped' | 'reverted' | 'failed';
  notes?: string;
  prNumber?: number;
}): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (params.status) {
    updates.push(`status = $${updates.length + 2}`);
    values.push(params.status);
  }

  if (params.notes) {
    updates.push(`notes = $${updates.length + 2}`);
    values.push(params.notes);
  }

  if (params.prNumber !== undefined) {
    updates.push(`pr_number = $${updates.length + 2}`);
    values.push(params.prNumber);
  }

  if (updates.length === 0) return;

  await prisma.$executeRawUnsafe(
    `UPDATE self_evolution_actions SET ${updates.join(', ')} WHERE id = $1`,
    params.actionId,
    ...values
  );
}

/**
 * Get all actions for a cycle
 */
export async function getActionsByCycle(
  cycleId: number
): Promise<SelfEvolutionActionRecord[]> {
  return prisma.$queryRaw<SelfEvolutionActionRecord[]>`
    SELECT * FROM self_evolution_actions WHERE cycle_id = ${cycleId} ORDER BY created_at ASC
  `;
}

/**
 * Record a sanity check result
 */
export async function createSanityCheck(params: {
  cycleId: number;
  checkName: string;
  passed: boolean;
  result: 'pass' | 'warn' | 'fail';
  details?: any;
}): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO self_evolution_sanity_checks (cycle_id, check_name, passed, result, details)
    VALUES (
      ${params.cycleId},
      ${params.checkName},
      ${params.passed},
      ${params.result},
      ${JSON.stringify(params.details || {})}::jsonb
    )
    RETURNING id
  `;

  return result[0].id;
}

/**
 * Get all sanity checks for a cycle
 */
export async function getSanityChecksByCycle(
  cycleId: number
): Promise<SelfEvolutionSanityCheckRecord[]> {
  return prisma.$queryRaw<SelfEvolutionSanityCheckRecord[]>`
    SELECT * FROM self_evolution_sanity_checks WHERE cycle_id = ${cycleId} ORDER BY created_at ASC
  `;
}

/**
 * Record a metric for a cycle
 */
export async function createMetric(params: {
  cycleId: number;
  metricName: string;
  metricValue?: number;
  unit?: string;
  details?: any;
}): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO self_evolution_metrics (cycle_id, metric_name, metric_value, unit, details)
    VALUES (
      ${params.cycleId},
      ${params.metricName},
      ${params.metricValue || null},
      ${params.unit || null},
      ${JSON.stringify(params.details || {})}::jsonb
    )
    RETURNING id
  `;

  return result[0].id;
}

/**
 * Get all metrics for a cycle
 */
export async function getMetricsByCycle(
  cycleId: number
): Promise<SelfEvolutionMetricRecord[]> {
  return prisma.$queryRaw<SelfEvolutionMetricRecord[]>`
    SELECT * FROM self_evolution_metrics WHERE cycle_id = ${cycleId} ORDER BY created_at ASC
  `;
}

/**
 * Record a branch for a cycle
 */
export async function createBranch(params: {
  cycleId: number;
  branchName: string;
  baseBranch?: string;
  prNumber?: number;
}): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO self_evolution_branches (cycle_id, branch_name, base_branch, pr_number)
    VALUES (
      ${params.cycleId},
      ${params.branchName},
      ${params.baseBranch || 'main'},
      ${params.prNumber || null}
    )
    ON CONFLICT (branch_name) DO UPDATE
      SET pr_number = ${params.prNumber || null}
    RETURNING id
  `;

  return result[0].id;
}

/**
 * Update branch status
 */
export async function updateBranch(params: {
  branchName: string;
  prNumber?: number;
  merged?: boolean;
  closed?: boolean;
}): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (params.prNumber !== undefined) {
    updates.push(`pr_number = $${updates.length + 2}`);
    values.push(params.prNumber);
  }

  if (params.merged !== undefined) {
    updates.push(`merged = $${updates.length + 2}`);
    values.push(params.merged);
  }

  if (params.closed !== undefined) {
    updates.push(`closed = $${updates.length + 2}`);
    values.push(params.closed);
  }

  if (updates.length === 0) return;

  await prisma.$executeRawUnsafe(
    `UPDATE self_evolution_branches SET ${updates.join(', ')} WHERE branch_name = $1`,
    params.branchName,
    ...values
  );
}

/**
 * Get all branches for a cycle
 */
export async function getBranchesByCycle(
  cycleId: number
): Promise<SelfEvolutionBranchRecord[]> {
  return prisma.$queryRaw<SelfEvolutionBranchRecord[]>`
    SELECT * FROM self_evolution_branches WHERE cycle_id = ${cycleId} ORDER BY created_at ASC
  `;
}

/**
 * Get recent cycles with stats
 */
export async function getRecentCycles(limit: number = 30): Promise<any[]> {
  return prisma.$queryRaw`
    SELECT
      c.id,
      c.cycle_date,
      c.started_at,
      c.ended_at,
      c.summary,
      c.wildcard_title,
      c.status,
      COUNT(DISTINCT a.id) as action_count,
      COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'done') as completed_actions,
      COUNT(DISTINCT sc.id) as check_count,
      COUNT(DISTINCT sc.id) FILTER (WHERE sc.passed = true) as passed_checks
    FROM self_evolution_cycles c
    LEFT JOIN self_evolution_actions a ON a.cycle_id = c.id
    LEFT JOIN self_evolution_sanity_checks sc ON sc.cycle_id = c.id
    GROUP BY c.id
    ORDER BY c.cycle_date DESC
    LIMIT ${limit}
  `;
}

/**
 * Clean up old cycle data (retention policy)
 */
export async function cleanupOldCycles(retentionDays: number = 180): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.$executeRaw`
    DELETE FROM self_evolution_cycles
    WHERE cycle_date < ${cutoffDate.toISOString().split('T')[0]}::date
    AND status IN ('completed', 'failed', 'reverted')
  `;

  return result;
}
