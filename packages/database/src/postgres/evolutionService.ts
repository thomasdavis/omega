/**
 * Evolution Engine Database Service
 * Provides type-safe database operations for the self-evolution system
 */

import { prisma } from './prismaClient.js';

// Types matching our database schema
export interface SelfReflection {
  id: number;
  run_date: Date;
  summary: string;
  feelings: any; // JSONB
  metrics: any; // JSONB
  created_at: Date;
}

export interface EvolutionProposal {
  id: number;
  run_date: Date;
  type: 'capability' | 'anticipatory' | 'wildcard' | 'other';
  title: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high';
  expected_impact: any; // JSONB
  status: 'proposed' | 'selected' | 'deferred' | 'rejected' | 'implemented';
  issue_number?: number | null;
  pr_number?: number | null;
  branch_name?: string | null;
  created_at: Date;
}

export interface SanityCheck {
  id: number;
  proposal_id: number;
  checks: any; // JSONB
  score: number;
  passed: boolean;
  logs_url?: string | null;
  created_at: Date;
}

export interface Experiment {
  id: number;
  proposal_id?: number | null;
  flag_key?: string | null;
  rollout_percent?: number | null;
  start_at?: Date | null;
  end_at?: Date | null;
  result: any; // JSONB
  created_at: Date;
}

export interface FeatureFlag {
  id: number;
  key: string;
  description?: string | null;
  enabled: boolean;
  rollout_percent: number;
  metadata: any; // JSONB
  created_at: Date;
}

export interface EvolutionAuditLog {
  id: number;
  action: string;
  actor: string;
  details: any; // JSONB
  created_at: Date;
}

/**
 * Self Reflections
 */

export async function saveSelfReflection(params: {
  run_date: Date;
  summary: string;
  feelings: any;
  metrics: any;
}): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO self_reflections (run_date, summary, feelings, metrics)
    VALUES (${params.run_date}, ${params.summary}, ${JSON.stringify(params.feelings)}::jsonb, ${JSON.stringify(params.metrics)}::jsonb)
    ON CONFLICT (run_date) DO UPDATE
    SET summary = EXCLUDED.summary,
        feelings = EXCLUDED.feelings,
        metrics = EXCLUDED.metrics
    RETURNING id
  `;
  return result[0].id;
}

export async function getSelfReflection(run_date: Date): Promise<SelfReflection | null> {
  const result = await prisma.$queryRaw<SelfReflection[]>`
    SELECT * FROM self_reflections WHERE run_date = ${run_date}
  `;
  return result[0] || null;
}

export async function getRecentReflections(limit: number = 7): Promise<SelfReflection[]> {
  return prisma.$queryRaw<SelfReflection[]>`
    SELECT * FROM self_reflections ORDER BY run_date DESC LIMIT ${limit}
  `;
}

/**
 * Evolution Proposals
 */

export async function createProposal(params: {
  run_date: Date;
  type: 'capability' | 'anticipatory' | 'wildcard' | 'other';
  title: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high';
  expected_impact?: any;
}): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO evolution_proposals (run_date, type, title, description, risk_level, expected_impact)
    VALUES (${params.run_date}, ${params.type}, ${params.title}, ${params.description}, ${params.risk_level}, ${JSON.stringify(params.expected_impact || {})}::jsonb)
    RETURNING id
  `;
  return result[0].id;
}

export async function updateProposalStatus(
  id: number,
  status: 'proposed' | 'selected' | 'deferred' | 'rejected' | 'implemented',
  updates?: {
    issue_number?: number;
    pr_number?: number;
    branch_name?: string;
  }
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE evolution_proposals
    SET status = ${status},
        issue_number = COALESCE(${updates?.issue_number}, issue_number),
        pr_number = COALESCE(${updates?.pr_number}, pr_number),
        branch_name = COALESCE(${updates?.branch_name}, branch_name)
    WHERE id = ${id}
  `;
}

export async function getProposalsByDate(run_date: Date): Promise<EvolutionProposal[]> {
  return prisma.$queryRaw<EvolutionProposal[]>`
    SELECT * FROM evolution_proposals WHERE run_date = ${run_date} ORDER BY created_at ASC
  `;
}

export async function getProposalsByStatus(status: string): Promise<EvolutionProposal[]> {
  return prisma.$queryRaw<EvolutionProposal[]>`
    SELECT * FROM evolution_proposals WHERE status = ${status} ORDER BY run_date DESC
  `;
}

/**
 * Sanity Checks
 */

export async function saveSanityCheck(params: {
  proposal_id: number;
  checks: any;
  score: number;
  passed: boolean;
  logs_url?: string;
}): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO sanity_checks (proposal_id, checks, score, passed, logs_url)
    VALUES (${params.proposal_id}, ${JSON.stringify(params.checks)}::jsonb, ${params.score}, ${params.passed}, ${params.logs_url})
    RETURNING id
  `;
  return result[0].id;
}

export async function getSanityChecksByProposal(proposal_id: number): Promise<SanityCheck[]> {
  return prisma.$queryRaw<SanityCheck[]>`
    SELECT * FROM sanity_checks WHERE proposal_id = ${proposal_id} ORDER BY created_at DESC
  `;
}

/**
 * Feature Flags
 */

export async function createFeatureFlag(params: {
  key: string;
  description?: string;
  enabled?: boolean;
  rollout_percent?: number;
  metadata?: any;
}): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO feature_flags (key, description, enabled, rollout_percent, metadata)
    VALUES (${params.key}, ${params.description}, ${params.enabled || false}, ${params.rollout_percent || 0}, ${JSON.stringify(params.metadata || {})}::jsonb)
    ON CONFLICT (key) DO UPDATE
    SET description = EXCLUDED.description,
        enabled = EXCLUDED.enabled,
        rollout_percent = EXCLUDED.rollout_percent,
        metadata = EXCLUDED.metadata
    RETURNING id
  `;
  return result[0].id;
}

export async function getFeatureFlag(key: string): Promise<FeatureFlag | null> {
  const result = await prisma.$queryRaw<FeatureFlag[]>`
    SELECT * FROM feature_flags WHERE key = ${key}
  `;
  return result[0] || null;
}

export async function updateFeatureFlag(key: string, updates: {
  enabled?: boolean;
  rollout_percent?: number;
  metadata?: any;
}): Promise<void> {
  const metadataJson = updates.metadata ? JSON.stringify(updates.metadata) : null;

  await prisma.$executeRaw`
    UPDATE feature_flags
    SET enabled = COALESCE(${updates.enabled}, enabled),
        rollout_percent = COALESCE(${updates.rollout_percent}, rollout_percent),
        metadata = COALESCE(${metadataJson}::jsonb, metadata)
    WHERE key = ${key}
  `;
}

/**
 * Experiments
 */

export async function createExperiment(params: {
  proposal_id?: number;
  flag_key?: string;
  rollout_percent?: number;
  start_at?: Date;
  end_at?: Date;
  result?: any;
}): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO experiments (proposal_id, flag_key, rollout_percent, start_at, end_at, result)
    VALUES (${params.proposal_id}, ${params.flag_key}, ${params.rollout_percent}, ${params.start_at}, ${params.end_at}, ${JSON.stringify(params.result || {})}::jsonb)
    RETURNING id
  `;
  return result[0].id;
}

export async function updateExperiment(id: number, result: any, end_at?: Date): Promise<void> {
  await prisma.$executeRaw`
    UPDATE experiments
    SET result = ${JSON.stringify(result)}::jsonb,
        end_at = COALESCE(${end_at}, end_at)
    WHERE id = ${id}
  `;
}

/**
 * Audit Log
 */

export async function logEvolutionAction(params: {
  action: string;
  actor?: string;
  details?: any;
}): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO evolution_audit_log (action, actor, details)
    VALUES (${params.action}, ${params.actor || 'omega'}, ${JSON.stringify(params.details || {})}::jsonb)
    RETURNING id
  `;
  return result[0].id;
}

export async function getAuditLog(limit: number = 100): Promise<EvolutionAuditLog[]> {
  return prisma.$queryRaw<EvolutionAuditLog[]>`
    SELECT * FROM evolution_audit_log ORDER BY created_at DESC LIMIT ${limit}
  `;
}
