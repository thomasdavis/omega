/**
 * Self-Evolution Database Service
 * Manages daily autonomous improvement runs, candidates, actions, and metrics
 */

import { prisma } from './prismaClient.js';

export interface CreateRunParams {
  runDate: Date;
  status: 'planned' | 'in_progress' | 'queued_pr' | 'merged' | 'rolled_back' | 'skipped' | 'failed';
  summary?: string;
}

export interface CreateCandidateParams {
  runId: number;
  category: 'capability' | 'anticipatory' | 'wildcard' | 'persona';
  title: string;
  description?: string;
  riskScore?: number;
  impactScore?: number;
  effortScore?: number;
  noveltyScore?: number;
  priority?: number;
  selected?: boolean;
  rejectionReason?: string;
}

export interface CreateActionParams {
  runId: number;
  candidateId?: number;
  branchName?: string;
  prNumber?: number;
  issueNumber?: number;
  commitSha?: string;
  featureFlagKey?: string;
  canaryPercentage?: number;
  testsPassed?: boolean;
  checks?: Record<string, any>;
}

export interface CreateMetricParams {
  runId: number;
  metricKey: string;
  metricValue?: number;
  details?: Record<string, any>;
}

export interface CreateSanityParams {
  runId: number;
  rules?: Record<string, any>;
  passed?: boolean;
  details?: string;
}

export interface CreateApprovalParams {
  runId: number;
  required?: boolean;
  approver?: string;
  decision?: 'approved' | 'rejected';
  approvedAt?: Date;
  notes?: string;
}

/**
 * Create a new evolution run
 */
export async function createRun(params: CreateRunParams) {
  return await prisma.selfEvolutionRun.create({
    data: {
      runDate: params.runDate,
      status: params.status,
      summary: params.summary,
    },
  });
}

/**
 * Update run status and finish time
 */
export async function updateRun(
  runId: number,
  data: {
    status?: string;
    finishedAt?: Date;
    summary?: string;
  }
) {
  return await prisma.selfEvolutionRun.update({
    where: { id: runId },
    data,
  });
}

/**
 * Get run by ID with all relations
 */
export async function getRunById(runId: number) {
  return await prisma.selfEvolutionRun.findUnique({
    where: { id: runId },
    include: {
      candidates: true,
      actions: true,
      metrics: true,
      sanity: true,
      approvals: true,
    },
  });
}

/**
 * Get recent runs
 */
export async function getRecentRuns(limit: number = 10) {
  return await prisma.selfEvolutionRun.findMany({
    orderBy: { runDate: 'desc' },
    take: limit,
    include: {
      candidates: {
        where: { selected: true },
      },
      actions: true,
    },
  });
}

/**
 * Get run by date
 */
export async function getRunByDate(date: Date) {
  return await prisma.selfEvolutionRun.findFirst({
    where: {
      runDate: date,
    },
    include: {
      candidates: true,
      actions: true,
      metrics: true,
      sanity: true,
      approvals: true,
    },
  });
}

/**
 * Create a candidate proposal
 */
export async function createCandidate(params: CreateCandidateParams) {
  return await prisma.selfEvolutionCandidate.create({
    data: {
      runId: params.runId,
      category: params.category,
      title: params.title,
      description: params.description,
      riskScore: params.riskScore,
      impactScore: params.impactScore,
      effortScore: params.effortScore,
      noveltyScore: params.noveltyScore,
      priority: params.priority,
      selected: params.selected ?? false,
      rejectionReason: params.rejectionReason,
    },
  });
}

/**
 * Mark candidates as selected
 */
export async function selectCandidates(candidateIds: number[]) {
  return await prisma.selfEvolutionCandidate.updateMany({
    where: {
      id: { in: candidateIds },
    },
    data: {
      selected: true,
    },
  });
}

/**
 * Create an action record
 */
export async function createAction(params: CreateActionParams) {
  return await prisma.selfEvolutionAction.create({
    data: {
      runId: params.runId,
      candidateId: params.candidateId,
      branchName: params.branchName,
      prNumber: params.prNumber,
      issueNumber: params.issueNumber,
      commitSha: params.commitSha,
      featureFlagKey: params.featureFlagKey,
      canaryPercentage: params.canaryPercentage,
      testsPassed: params.testsPassed,
      checks: params.checks,
    },
  });
}

/**
 * Update action with PR/commit details
 */
export async function updateAction(
  actionId: number,
  data: {
    prNumber?: number;
    commitSha?: string;
    testsPassed?: boolean;
    checks?: Record<string, any>;
  }
) {
  return await prisma.selfEvolutionAction.update({
    where: { id: actionId },
    data,
  });
}

/**
 * Create a metric record
 */
export async function createMetric(params: CreateMetricParams) {
  return await prisma.selfEvolutionMetric.create({
    data: {
      runId: params.runId,
      metricKey: params.metricKey,
      metricValue: params.metricValue,
      details: params.details,
    },
  });
}

/**
 * Create sanity check record
 */
export async function createSanity(params: CreateSanityParams) {
  return await prisma.selfEvolutionSanity.create({
    data: {
      runId: params.runId,
      rules: params.rules,
      passed: params.passed ?? false,
      details: params.details,
    },
  });
}

/**
 * Create approval record
 */
export async function createApproval(params: CreateApprovalParams) {
  return await prisma.selfEvolutionApproval.create({
    data: {
      runId: params.runId,
      required: params.required ?? false,
      approver: params.approver,
      decision: params.decision,
      approvedAt: params.approvedAt,
      notes: params.notes,
    },
  });
}

/**
 * Get metrics for a run
 */
export async function getMetricsByRun(runId: number) {
  return await prisma.selfEvolutionMetric.findMany({
    where: { runId },
    orderBy: { metricKey: 'asc' },
  });
}

/**
 * Get historical success rate
 */
export async function getSuccessRate(days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const runs = await prisma.selfEvolutionRun.findMany({
    where: {
      runDate: { gte: since },
    },
  });

  const total = runs.length;
  const successful = runs.filter(
    (r) => r.status === 'merged' || r.status === 'queued_pr'
  ).length;
  const rolledBack = runs.filter((r) => r.status === 'rolled_back').length;

  return {
    total,
    successful,
    rolledBack,
    successRate: total > 0 ? successful / total : 0,
    rollbackRate: total > 0 ? rolledBack / total : 0,
  };
}
