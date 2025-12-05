/**
 * Self-Evolution Service
 * Manages the daily reflective improvement loop for Omega
 */

import { prisma } from './prismaClient.js';

export interface CreateCycleParams {
  cycleDate: Date;
  summary?: string;
  wildcardTitle?: string;
  status?: 'planned' | 'running' | 'completed' | 'failed' | 'reverted';
}

export interface CreateActionParams {
  cycleId: number;
  type: 'capability' | 'future' | 'wildcard' | 'prompt' | 'persona';
  title: string;
  description?: string;
  issueNumber?: number;
  prNumber?: number;
  branchName?: string;
  status?: 'planned' | 'in_progress' | 'done' | 'skipped' | 'reverted' | 'failed';
  notes?: string;
}

export interface CreateSanityCheckParams {
  cycleId: number;
  checkName: string;
  passed: boolean;
  result?: 'pass' | 'warn' | 'fail';
  details?: Record<string, any>;
}

export interface CreateMetricParams {
  cycleId: number;
  metricName: string;
  metricValue?: number;
  unit?: string;
  details?: Record<string, any>;
}

export interface CreateBranchParams {
  cycleId: number;
  branchName: string;
  baseBranch?: string;
  prNumber?: number;
  merged?: boolean;
  closed?: boolean;
}

/**
 * Create a new self-evolution cycle
 */
export async function createCycle(params: CreateCycleParams) {
  return await prisma.selfEvolutionCycle.create({
    data: {
      cycleDate: params.cycleDate,
      summary: params.summary,
      wildcardTitle: params.wildcardTitle,
      status: params.status || 'planned',
    },
  });
}

/**
 * Get cycle by date
 */
export async function getCycleByDate(date: Date) {
  return await prisma.selfEvolutionCycle.findUnique({
    where: { cycleDate: date },
    include: {
      actions: true,
      sanityChecks: true,
      metrics: true,
      branches: true,
    },
  });
}

/**
 * Get cycle by ID
 */
export async function getCycleById(id: number) {
  return await prisma.selfEvolutionCycle.findUnique({
    where: { id },
    include: {
      actions: true,
      sanityChecks: true,
      metrics: true,
      branches: true,
    },
  });
}

/**
 * Update cycle status
 */
export async function updateCycleStatus(
  id: number,
  status: 'planned' | 'running' | 'completed' | 'failed' | 'reverted',
  endedAt?: Date
) {
  return await prisma.selfEvolutionCycle.update({
    where: { id },
    data: {
      status,
      ...(endedAt && { endedAt }),
    },
  });
}

/**
 * Update cycle summary
 */
export async function updateCycleSummary(id: number, summary: string) {
  return await prisma.selfEvolutionCycle.update({
    where: { id },
    data: { summary },
  });
}

/**
 * Create a new action
 */
export async function createAction(params: CreateActionParams) {
  return await prisma.selfEvolutionAction.create({
    data: {
      cycleId: params.cycleId,
      type: params.type,
      title: params.title,
      description: params.description,
      issueNumber: params.issueNumber,
      prNumber: params.prNumber,
      branchName: params.branchName,
      status: params.status || 'planned',
      notes: params.notes,
    },
  });
}

/**
 * Update action status
 */
export async function updateActionStatus(
  id: number,
  status: 'planned' | 'in_progress' | 'done' | 'skipped' | 'reverted' | 'failed',
  notes?: string
) {
  return await prisma.selfEvolutionAction.update({
    where: { id },
    data: {
      status,
      ...(notes && { notes }),
    },
  });
}

/**
 * Create a sanity check result
 */
export async function createSanityCheck(params: CreateSanityCheckParams) {
  return await prisma.selfEvolutionSanityCheck.create({
    data: {
      cycleId: params.cycleId,
      checkName: params.checkName,
      passed: params.passed,
      result: params.result,
      details: params.details,
    },
  });
}

/**
 * Create a metric
 */
export async function createMetric(params: CreateMetricParams) {
  return await prisma.selfEvolutionMetric.create({
    data: {
      cycleId: params.cycleId,
      metricName: params.metricName,
      metricValue: params.metricValue,
      unit: params.unit,
      details: params.details,
    },
  });
}

/**
 * Create a branch record
 */
export async function createBranch(params: CreateBranchParams) {
  return await prisma.selfEvolutionBranch.create({
    data: {
      cycleId: params.cycleId,
      branchName: params.branchName,
      baseBranch: params.baseBranch || 'main',
      prNumber: params.prNumber,
      merged: params.merged || false,
      closed: params.closed || false,
    },
  });
}

/**
 * Update branch with PR number
 */
export async function updateBranchPR(branchName: string, prNumber: number) {
  return await prisma.selfEvolutionBranch.update({
    where: { branchName },
    data: { prNumber },
  });
}

/**
 * Mark branch as merged
 */
export async function markBranchMerged(branchName: string) {
  return await prisma.selfEvolutionBranch.update({
    where: { branchName },
    data: { merged: true },
  });
}

/**
 * Mark branch as closed
 */
export async function markBranchClosed(branchName: string) {
  return await prisma.selfEvolutionBranch.update({
    where: { branchName },
    data: { closed: true },
  });
}

/**
 * Get recent cycles
 */
export async function getRecentCycles(limit: number = 10) {
  return await prisma.selfEvolutionCycle.findMany({
    orderBy: { cycleDate: 'desc' },
    take: limit,
    include: {
      actions: true,
      sanityChecks: true,
      metrics: true,
      branches: true,
    },
  });
}

/**
 * Get metrics for a time range
 */
export async function getMetricsForDateRange(startDate: Date, endDate: Date) {
  const cycles = await prisma.selfEvolutionCycle.findMany({
    where: {
      cycleDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      metrics: true,
    },
  });

  return cycles;
}

/**
 * Get all actions with a specific status
 */
export async function getActionsByStatus(
  status: 'planned' | 'in_progress' | 'done' | 'skipped' | 'reverted' | 'failed'
) {
  return await prisma.selfEvolutionAction.findMany({
    where: { status },
    include: {
      cycle: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get failed sanity checks
 */
export async function getFailedSanityChecks(cycleId?: number) {
  return await prisma.selfEvolutionSanityCheck.findMany({
    where: {
      passed: false,
      ...(cycleId && { cycleId }),
    },
    include: {
      cycle: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Delete old cycles (for retention policy)
 */
export async function deleteOldCycles(beforeDate: Date) {
  return await prisma.selfEvolutionCycle.deleteMany({
    where: {
      cycleDate: {
        lt: beforeDate,
      },
    },
  });
}
