/**
 * Decision Log Service
 * Append-only audit trail for all bot decisions with blame history
 */

import { prisma } from './prismaClient.js';

export interface DecisionLogRecord {
  id: number;
  timestamp: Date;
  user_id: string | null;
  username: string | null;
  decision_description: string;
  blame: string | null;
  metadata: Record<string, any> | null;
}

export interface LogDecisionParams {
  userId?: string;
  username?: string;
  decisionDescription: string;
  blame?: string;
  metadata?: Record<string, any>;
}

/**
 * Log a decision to the append-only audit trail
 * This is the primary function for recording all bot decisions
 */
export async function logDecision(params: LogDecisionParams): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO decision_logs (
      user_id,
      username,
      decision_description,
      blame,
      metadata,
      timestamp
    ) VALUES (
      ${params.userId || null},
      ${params.username || null},
      ${params.decisionDescription},
      ${params.blame || null},
      ${params.metadata ? JSON.stringify(params.metadata) : null}::jsonb,
      NOW()
    )
    RETURNING id
  `;

  return result[0]?.id || 0;
}

/**
 * Query decision logs with optional filters
 */
export async function queryDecisionLogs(options: {
  userId?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}): Promise<DecisionLogRecord[]> {
  const { userId, startTime, endTime, limit = 100, offset = 0 } = options;

  // Build dynamic query based on filters
  let query = `
    SELECT
      id,
      timestamp,
      user_id,
      username,
      decision_description,
      blame,
      metadata
    FROM decision_logs
    WHERE 1=1
  `;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    params.push(userId);
  }

  if (startTime) {
    conditions.push(`timestamp >= $${paramIndex++}`);
    params.push(startTime);
  }

  if (endTime) {
    conditions.push(`timestamp <= $${paramIndex++}`);
    params.push(endTime);
  }

  if (conditions.length > 0) {
    query += ' AND ' + conditions.join(' AND ');
  }

  query += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const results = await prisma.$queryRawUnsafe<DecisionLogRecord[]>(
    query,
    ...params
  );

  return results;
}

/**
 * Get decision logs for a specific user
 */
export async function getUserDecisionLogs(
  userId: string,
  limit: number = 50
): Promise<DecisionLogRecord[]> {
  const results = await prisma.$queryRaw<DecisionLogRecord[]>`
    SELECT
      id,
      timestamp,
      user_id,
      username,
      decision_description,
      blame,
      metadata
    FROM decision_logs
    WHERE user_id = ${userId}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Get recent decision logs (for debugging/monitoring)
 */
export async function getRecentDecisionLogs(
  limit: number = 100
): Promise<DecisionLogRecord[]> {
  const results = await prisma.$queryRaw<DecisionLogRecord[]>`
    SELECT
      id,
      timestamp,
      user_id,
      username,
      decision_description,
      blame,
      metadata
    FROM decision_logs
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Count total decision logs (optionally filtered by user)
 */
export async function countDecisionLogs(userId?: string): Promise<number> {
  if (userId) {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM decision_logs
      WHERE user_id = ${userId}
    `;
    return Number(result[0]?.count || 0);
  }

  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM decision_logs
  `;

  return Number(result[0]?.count || 0);
}

/**
 * Search decision logs by description text
 */
export async function searchDecisionLogs(
  searchTerm: string,
  limit: number = 50
): Promise<DecisionLogRecord[]> {
  const results = await prisma.$queryRaw<DecisionLogRecord[]>`
    SELECT
      id,
      timestamp,
      user_id,
      username,
      decision_description,
      blame,
      metadata
    FROM decision_logs
    WHERE decision_description ILIKE ${`%${searchTerm}%`}
       OR blame ILIKE ${`%${searchTerm}%`}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;

  return results;
}
