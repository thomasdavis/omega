/**
 * PostgreSQL Query Persistence Service
 * Port of libsql/queryService.ts for PostgreSQL
 */

import { getPostgresPool } from './client.js';
import type { QueryRecord } from './schema.js';
import { randomUUID } from 'crypto';
import { analyzeQuery } from '@repo/shared';

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
  const pool = await getPostgresPool();
  const id = randomUUID();
  const timestamp = Date.now();

  // Generate sentiment analysis and query metrics
  let sentimentAnalysis: any = null;
  let queryComplexity = '';
  let userSatisfaction = '';

  try {
    const analysis = await analyzeQuery(
      params.queryText,
      params.username,
      params.queryResult,
      params.error,
      params.resultCount
    );

    sentimentAnalysis = analysis.sentimentAnalysis;
    queryComplexity = analysis.queryMetrics.queryComplexity;
    userSatisfaction = analysis.queryMetrics.userSatisfaction;

    console.log(`📊 Query analysis for ${params.username}:`, {
      sentiment: analysis.sentimentAnalysis.sentiment,
      queryComplexity,
      userSatisfaction,
    });
  } catch (error) {
    console.error('Failed to generate query analysis:', error);
    // Continue saving the query even if analysis fails
  }

  // Parse queryResult to JSONB if it's a string
  let queryResultJsonb = null;
  if (params.queryResult) {
    try {
      queryResultJsonb = JSON.parse(params.queryResult);
    } catch {
      // If not valid JSON, store as string in JSONB
      queryResultJsonb = { result: params.queryResult };
    }
  }

  await pool.query(
    `INSERT INTO queries (
      id, timestamp, user_id, username, query_text,
      translated_sql, ai_summary, query_result, result_count,
      error, execution_time_ms, sentiment_analysis, query_complexity, user_satisfaction
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      id,
      timestamp,
      params.userId,
      params.username,
      params.queryText,
      params.translatedSql || null,
      params.aiSummary || null,
      queryResultJsonb,
      params.resultCount || null,
      params.error || null,
      params.executionTimeMs || null,
      sentimentAnalysis,
      queryComplexity || null,
      userSatisfaction || null,
    ]
  );

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
  const pool = await getPostgresPool();
  const args: any[] = [];
  let whereClause = '';
  let paramIndex = 1;

  if (params.userId) {
    whereClause = `WHERE user_id = $${paramIndex++}`;
    args.push(params.userId);
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;
  args.push(limit, offset);

  const result = await pool.query(
    `SELECT * FROM queries
     ${whereClause}
     ORDER BY timestamp DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    args
  );

  return result.rows as QueryRecord[];
}

/**
 * Get query by ID
 */
export async function getQueryById(id: string): Promise<QueryRecord | null> {
  const pool = await getPostgresPool();

  const result = await pool.query('SELECT * FROM queries WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as QueryRecord;
}

/**
 * Get total query count with optional filters
 */
export async function getQueryCount(params: { userId?: string }): Promise<number> {
  const pool = await getPostgresPool();
  const args: any[] = [];
  let whereClause = '';

  if (params.userId) {
    whereClause = 'WHERE user_id = $1';
    args.push(params.userId);
  }

  const result = await pool.query(`SELECT COUNT(*) as count FROM queries ${whereClause}`, args);

  return parseInt(result.rows[0].count, 10);
}
