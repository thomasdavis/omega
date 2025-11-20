/**
 * Query Persistence Service
 * Handles storing and retrieving user queries and their results
 */

import { getDatabase } from './client.js';
import type { QueryRecord } from './schema.js';
import { randomUUID } from 'crypto';

/**
 * Save a query execution to the database
 */
export async function saveQuery(params: {
  userId: string;
  username: string;
  queryText: string;
  translatedSql?: string;
  aiSummary?: string;
  queryResult?: string;
  resultCount?: number;
  error?: string;
  executionTimeMs?: number;
}): Promise<string> {
  const db = getDatabase();
  const id = randomUUID();
  const timestamp = Date.now();

  await db.execute({
    sql: `INSERT INTO queries (
      id, timestamp, user_id, username, query_text,
      translated_sql, ai_summary, query_result, result_count,
      error, execution_time_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      timestamp,
      params.userId,
      params.username,
      params.queryText,
      params.translatedSql || null,
      params.aiSummary || null,
      params.queryResult || null,
      params.resultCount || null,
      params.error || null,
      params.executionTimeMs || null,
    ],
  });

  return id;
}

/**
 * Get recent queries for a user
 */
export async function getRecentQueries(params: {
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<QueryRecord[]> {
  const db = getDatabase();
  const args: any[] = [];
  let whereClause = '';

  if (params.userId) {
    whereClause = 'WHERE user_id = ?';
    args.push(params.userId);
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;
  args.push(limit, offset);

  const result = await db.execute({
    sql: `
      SELECT * FROM queries
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `,
    args,
  });

  return result.rows as unknown as QueryRecord[];
}

/**
 * Get query by ID
 */
export async function getQueryById(id: string): Promise<QueryRecord | null> {
  const db = getDatabase();

  const result = await db.execute({
    sql: 'SELECT * FROM queries WHERE id = ?',
    args: [id],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as unknown as QueryRecord;
}

/**
 * Get total query count with optional filters
 */
export async function getQueryCount(params: { userId?: string }): Promise<number> {
  const db = getDatabase();
  const args: any[] = [];
  let whereClause = '';

  if (params.userId) {
    whereClause = 'WHERE user_id = ?';
    args.push(params.userId);
  }

  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM queries ${whereClause}`,
    args,
  });

  return (result.rows[0] as any).count;
}
