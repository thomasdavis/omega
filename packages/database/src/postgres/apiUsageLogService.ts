/**
 * API Usage Log Service
 * Tracks every request to the chat completions API endpoint
 */

import { createHash } from 'crypto';
import { prisma } from './prismaClient.js';

export interface ApiUsageLogRecord {
  id: string;
  request_id: string;
  api_key_prefix: string | null;
  api_key_hash: string | null;
  model_requested: string | null;
  endpoint: string;
  http_status: number;
  duration_ms: number | null;
  message_count: number | null;
  response_length: number | null;
  error_type: string | null;
  error_message: string | null;
  metadata: Record<string, any> | null;
  created_at: bigint;
}

export interface LogApiUsageParams {
  requestId: string;
  apiKey?: string;
  modelRequested?: string;
  endpoint: string;
  httpStatus: number;
  durationMs?: number;
  messageCount?: number;
  responseLength?: number;
  errorType?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

function hashApiKey(key: string): { prefix: string; hash: string } {
  const hash = createHash('sha256').update(key).digest('hex');
  const prefix = key.slice(0, 8);
  return { prefix, hash };
}

/**
 * Log an API usage record
 */
export async function logApiUsage(params: LogApiUsageParams): Promise<string> {
  let apiKeyPrefix: string | null = null;
  let apiKeyHash: string | null = null;

  if (params.apiKey) {
    const { prefix, hash } = hashApiKey(params.apiKey);
    apiKeyPrefix = prefix;
    apiKeyHash = hash;
  }

  const result = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO api_usage_logs (
      request_id,
      api_key_prefix,
      api_key_hash,
      model_requested,
      endpoint,
      http_status,
      duration_ms,
      message_count,
      response_length,
      error_type,
      error_message,
      metadata
    ) VALUES (
      ${params.requestId},
      ${apiKeyPrefix},
      ${apiKeyHash},
      ${params.modelRequested || null},
      ${params.endpoint},
      ${params.httpStatus},
      ${params.durationMs ?? null},
      ${params.messageCount ?? null},
      ${params.responseLength ?? null},
      ${params.errorType || null},
      ${params.errorMessage || null},
      ${params.metadata ? JSON.stringify(params.metadata) : null}::jsonb
    )
    RETURNING id
  `;

  return result[0]?.id || '';
}

/**
 * Get recent API usage logs
 */
export async function getRecentApiUsageLogs(
  limit: number = 100
): Promise<ApiUsageLogRecord[]> {
  const results = await prisma.$queryRaw<ApiUsageLogRecord[]>`
    SELECT
      id, request_id, api_key_prefix, api_key_hash,
      model_requested, endpoint, http_status, duration_ms,
      message_count, response_length, error_type, error_message,
      metadata, created_at
    FROM api_usage_logs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Get API usage logs filtered by key prefix
 */
export async function getApiUsageByKeyPrefix(
  prefix: string,
  limit: number = 100
): Promise<ApiUsageLogRecord[]> {
  const results = await prisma.$queryRaw<ApiUsageLogRecord[]>`
    SELECT
      id, request_id, api_key_prefix, api_key_hash,
      model_requested, endpoint, http_status, duration_ms,
      message_count, response_length, error_type, error_message,
      metadata, created_at
    FROM api_usage_logs
    WHERE api_key_prefix = ${prefix}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Get aggregate API usage stats
 */
export async function getApiUsageStats(options?: {
  apiKeyPrefix?: string;
  endpoint?: string;
}): Promise<{
  total: number;
  successCount: number;
  errorCount: number;
  avgDurationMs: number;
}> {
  const { apiKeyPrefix, endpoint } = options || {};

  let result: Array<{
    total: bigint;
    success_count: bigint;
    error_count: bigint;
    avg_duration: number | null;
  }>;

  if (apiKeyPrefix && endpoint) {
    result = await prisma.$queryRaw`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE http_status >= 200 AND http_status < 300) as success_count,
        COUNT(*) FILTER (WHERE http_status >= 400) as error_count,
        AVG(duration_ms) as avg_duration
      FROM api_usage_logs
      WHERE api_key_prefix = ${apiKeyPrefix} AND endpoint = ${endpoint}
    `;
  } else if (apiKeyPrefix) {
    result = await prisma.$queryRaw`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE http_status >= 200 AND http_status < 300) as success_count,
        COUNT(*) FILTER (WHERE http_status >= 400) as error_count,
        AVG(duration_ms) as avg_duration
      FROM api_usage_logs
      WHERE api_key_prefix = ${apiKeyPrefix}
    `;
  } else if (endpoint) {
    result = await prisma.$queryRaw`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE http_status >= 200 AND http_status < 300) as success_count,
        COUNT(*) FILTER (WHERE http_status >= 400) as error_count,
        AVG(duration_ms) as avg_duration
      FROM api_usage_logs
      WHERE endpoint = ${endpoint}
    `;
  } else {
    result = await prisma.$queryRaw`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE http_status >= 200 AND http_status < 300) as success_count,
        COUNT(*) FILTER (WHERE http_status >= 400) as error_count,
        AVG(duration_ms) as avg_duration
      FROM api_usage_logs
    `;
  }

  const row = result[0];
  return {
    total: Number(row?.total || 0),
    successCount: Number(row?.success_count || 0),
    errorCount: Number(row?.error_count || 0),
    avgDurationMs: Math.round(Number(row?.avg_duration || 0)),
  };
}

/**
 * Count API usage logs with optional filters
 */
export async function countApiUsageLogs(options?: {
  apiKeyPrefix?: string;
  httpStatus?: number;
  endpoint?: string;
}): Promise<number> {
  const { apiKeyPrefix, httpStatus, endpoint } = options || {};

  if (apiKeyPrefix && httpStatus !== undefined) {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM api_usage_logs
      WHERE api_key_prefix = ${apiKeyPrefix} AND http_status = ${httpStatus}
    `;
    return Number(result[0]?.count || 0);
  }

  if (apiKeyPrefix) {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM api_usage_logs
      WHERE api_key_prefix = ${apiKeyPrefix}
    `;
    return Number(result[0]?.count || 0);
  }

  if (httpStatus !== undefined) {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM api_usage_logs
      WHERE http_status = ${httpStatus}
    `;
    return Number(result[0]?.count || 0);
  }

  if (endpoint) {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM api_usage_logs
      WHERE endpoint = ${endpoint}
    `;
    return Number(result[0]?.count || 0);
  }

  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM api_usage_logs
  `;

  return Number(result[0]?.count || 0);
}
