/**
 * PostgreSQL Query Persistence Service
 * Refactored to use Prisma ORM for type-safe database operations
 */

import { prisma } from './prismaClient.js';
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
  const id = randomUUID();
  const timestamp = BigInt(Date.now());

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

  await prisma.query.create({
    data: {
      id,
      timestamp,
      userId: params.userId,
      username: params.username,
      queryText: params.queryText,
      translatedSql: params.translatedSql || null,
      aiSummary: params.aiSummary || null,
      queryResult: queryResultJsonb,
      resultCount: params.resultCount || null,
      error: params.error || null,
      executionTimeMs: params.executionTimeMs || null,
      sentimentAnalysis: sentimentAnalysis || null,
      queryComplexity: queryComplexity || null,
      userSatisfaction: userSatisfaction || null,
    },
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
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  const where: any = {};
  if (params.userId) {
    where.userId = params.userId;
  }

  const queries = await prisma.query.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
    skip: offset,
  });

  return queries as any as QueryRecord[];
}

/**
 * Get query by ID
 */
export async function getQueryById(id: string): Promise<QueryRecord | null> {
  const query = await prisma.query.findUnique({
    where: { id },
  });

  if (!query) {
    return null;
  }

  return query as any as QueryRecord;
}

/**
 * Get total query count with optional filters
 */
export async function getQueryCount(params: { userId?: string }): Promise<number> {
  const where: any = {};

  if (params.userId) {
    where.userId = params.userId;
  }

  const count = await prisma.query.count({ where });

  return count;
}
