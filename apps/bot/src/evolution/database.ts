/**
 * Evolution Database Service
 * Handles all database operations for the evolution system
 */

import { getPostgresPool } from '@repo/database';
import type {
  SelfReflection,
  EvolutionProposal,
  SanityCheck,
  Experiment,
  FeatureFlag,
  AuditLogEntry,
} from './types.js';

/**
 * Save a self-reflection to the database
 */
export async function saveSelfReflection(reflection: SelfReflection): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(
    `INSERT INTO self_reflections (run_date, summary, feelings, metrics)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (run_date) DO UPDATE
     SET summary = $2, feelings = $3, metrics = $4`,
    [reflection.run_date, reflection.summary, reflection.feelings, reflection.metrics]
  );
}

/**
 * Save evolution proposals
 */
export async function saveProposals(proposals: EvolutionProposal[]): Promise<number[]> {
  const pool = getPostgresPool();
  const ids: number[] = [];

  for (const proposal of proposals) {
    const result = await pool.query(
      `INSERT INTO evolution_proposals
       (run_date, type, title, description, risk_level, expected_impact, status, branch_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        proposal.run_date,
        proposal.type,
        proposal.title,
        proposal.description,
        proposal.risk_level,
        proposal.expected_impact || {},
        proposal.status,
        proposal.branch_name,
      ]
    );
    ids.push(result.rows[0].id);
  }

  return ids;
}

/**
 * Update proposal status
 */
export async function updateProposalStatus(
  id: number,
  status: EvolutionProposal['status'],
  prNumber?: number
): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(
    `UPDATE evolution_proposals
     SET status = $1, pr_number = $2
     WHERE id = $3`,
    [status, prNumber, id]
  );
}

/**
 * Save sanity check results
 */
export async function saveSanityCheck(check: SanityCheck): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(
    `INSERT INTO sanity_checks (proposal_id, checks, score, passed, logs_url)
     VALUES ($1, $2, $3, $4, $5)`,
    [check.proposal_id, check.checks, check.score, check.passed, check.logs_url]
  );
}

/**
 * Get feature flag value
 */
export async function getFeatureFlag(key: string): Promise<FeatureFlag | null> {
  const pool = getPostgresPool();
  const result = await pool.query(
    `SELECT * FROM feature_flags WHERE key = $1`,
    [key]
  );

  return result.rows.length > 0 ? (result.rows[0] as FeatureFlag) : null;
}

/**
 * Create or update feature flag
 */
export async function upsertFeatureFlag(flag: FeatureFlag): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(
    `INSERT INTO feature_flags (key, description, enabled, rollout_percent, metadata)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (key) DO UPDATE
     SET description = $2, enabled = $3, rollout_percent = $4, metadata = $5`,
    [flag.key, flag.description, flag.enabled, flag.rollout_percent, flag.metadata || {}]
  );
}

/**
 * Log audit entry
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(
    `INSERT INTO evolution_audit_log (action, actor, details)
     VALUES ($1, $2, $3)`,
    [entry.action, entry.actor, entry.details || {}]
  );
}

/**
 * Get recent reflections
 */
export async function getRecentReflections(days: number = 7): Promise<SelfReflection[]> {
  const pool = getPostgresPool();
  const result = await pool.query(
    `SELECT * FROM self_reflections
     WHERE run_date >= CURRENT_DATE - $1
     ORDER BY run_date DESC`,
    [days]
  );

  return result.rows as SelfReflection[];
}

/**
 * Get proposals by status
 */
export async function getProposalsByStatus(
  status: EvolutionProposal['status']
): Promise<EvolutionProposal[]> {
  const pool = getPostgresPool();
  const result = await pool.query(
    `SELECT * FROM evolution_proposals
     WHERE status = $1
     ORDER BY created_at DESC`,
    [status]
  );

  return result.rows as EvolutionProposal[];
}

/**
 * Get proposals for a specific date
 */
export async function getProposalsForDate(date: Date): Promise<EvolutionProposal[]> {
  const pool = getPostgresPool();
  const result = await pool.query(
    `SELECT * FROM evolution_proposals
     WHERE run_date = $1
     ORDER BY created_at DESC`,
    [date]
  );

  return result.rows as EvolutionProposal[];
}
