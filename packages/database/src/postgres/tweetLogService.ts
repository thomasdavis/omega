/**
 * Tweet Log Service
 * Audit trail for all tweets posted by the bot
 */

import { prisma } from './prismaClient.js';

export interface TweetLogRecord {
  id: number;
  user_id: string;
  username: string | null;
  tweet_content: string;
  tweet_id: string | null;
  tweet_url: string | null;
  status: string;
  error_message: string | null;
  channel_id: string | null;
  channel_name: string | null;
  guild_id: string | null;
  message_id: string | null;
  request_type: string | null;
  metadata: Record<string, any> | null;
  moderation_flags: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface LogTweetParams {
  userId: string;
  username?: string;
  tweetContent: string;
  tweetId?: string;
  tweetUrl?: string;
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string;
  channelId?: string;
  channelName?: string;
  guildId?: string;
  messageId?: string;
  requestType?: 'manual' | 'comic' | 'automated';
  metadata?: Record<string, any>;
  moderationFlags?: Record<string, any>;
}

/**
 * Log a tweet to the audit trail
 */
export async function logTweet(params: LogTweetParams): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO tweet_logs (
      user_id,
      username,
      tweet_content,
      tweet_id,
      tweet_url,
      status,
      error_message,
      channel_id,
      channel_name,
      guild_id,
      message_id,
      request_type,
      metadata,
      moderation_flags,
      created_at,
      updated_at
    ) VALUES (
      ${params.userId},
      ${params.username || null},
      ${params.tweetContent},
      ${params.tweetId || null},
      ${params.tweetUrl || null},
      ${params.status},
      ${params.errorMessage || null},
      ${params.channelId || null},
      ${params.channelName || null},
      ${params.guildId || null},
      ${params.messageId || null},
      ${params.requestType || 'manual'},
      ${params.metadata ? JSON.stringify(params.metadata) : null}::jsonb,
      ${params.moderationFlags ? JSON.stringify(params.moderationFlags) : null}::jsonb,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return result[0]?.id || 0;
}

/**
 * Update a tweet log status (e.g., after posting succeeds or fails)
 */
export async function updateTweetLog(
  id: number,
  updates: {
    tweetId?: string;
    tweetUrl?: string;
    status?: 'pending' | 'success' | 'failed';
    errorMessage?: string;
    moderationFlags?: Record<string, any>;
  }
): Promise<void> {
  const setClauses: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.tweetId !== undefined) {
    setClauses.push(`tweet_id = $${paramIndex++}`);
    params.push(updates.tweetId);
  }

  if (updates.tweetUrl !== undefined) {
    setClauses.push(`tweet_url = $${paramIndex++}`);
    params.push(updates.tweetUrl);
  }

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    params.push(updates.status);
  }

  if (updates.errorMessage !== undefined) {
    setClauses.push(`error_message = $${paramIndex++}`);
    params.push(updates.errorMessage);
  }

  if (updates.moderationFlags !== undefined) {
    setClauses.push(`moderation_flags = $${paramIndex++}::jsonb`);
    params.push(JSON.stringify(updates.moderationFlags));
  }

  // Always update the updated_at timestamp
  setClauses.push(`updated_at = NOW()`);

  if (setClauses.length === 0) {
    return;
  }

  const query = `
    UPDATE tweet_logs
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex}
  `;
  params.push(id);

  await prisma.$queryRawUnsafe(query, ...params);
}

/**
 * Query tweet logs with optional filters
 */
export async function queryTweetLogs(options: {
  userId?: string;
  status?: 'pending' | 'success' | 'failed';
  channelId?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}): Promise<TweetLogRecord[]> {
  const { userId, status, channelId, startTime, endTime, limit = 100, offset = 0 } = options;

  let query = `
    SELECT
      id,
      user_id,
      username,
      tweet_content,
      tweet_id,
      tweet_url,
      status,
      error_message,
      channel_id,
      channel_name,
      guild_id,
      message_id,
      request_type,
      metadata,
      moderation_flags,
      created_at,
      updated_at
    FROM tweet_logs
    WHERE 1=1
  `;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    params.push(userId);
  }

  if (status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  if (channelId) {
    conditions.push(`channel_id = $${paramIndex++}`);
    params.push(channelId);
  }

  if (startTime) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(startTime);
  }

  if (endTime) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(endTime);
  }

  if (conditions.length > 0) {
    query += ' AND ' + conditions.join(' AND ');
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const results = await prisma.$queryRawUnsafe<TweetLogRecord[]>(
    query,
    ...params
  );

  return results;
}

/**
 * Get tweet logs for a specific user
 */
export async function getUserTweetLogs(
  userId: string,
  limit: number = 50
): Promise<TweetLogRecord[]> {
  const results = await prisma.$queryRaw<TweetLogRecord[]>`
    SELECT
      id,
      user_id,
      username,
      tweet_content,
      tweet_id,
      tweet_url,
      status,
      error_message,
      channel_id,
      channel_name,
      guild_id,
      message_id,
      request_type,
      metadata,
      moderation_flags,
      created_at,
      updated_at
    FROM tweet_logs
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Get recent tweet logs (for debugging/monitoring)
 */
export async function getRecentTweetLogs(
  limit: number = 100
): Promise<TweetLogRecord[]> {
  const results = await prisma.$queryRaw<TweetLogRecord[]>`
    SELECT
      id,
      user_id,
      username,
      tweet_content,
      tweet_id,
      tweet_url,
      status,
      error_message,
      channel_id,
      channel_name,
      guild_id,
      message_id,
      request_type,
      metadata,
      moderation_flags,
      created_at,
      updated_at
    FROM tweet_logs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Count total tweet logs (optionally filtered by user or status)
 */
export async function countTweetLogs(options?: {
  userId?: string;
  status?: 'pending' | 'success' | 'failed';
}): Promise<number> {
  const { userId, status } = options || {};

  if (userId && status) {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM tweet_logs
      WHERE user_id = ${userId} AND status = ${status}
    `;
    return Number(result[0]?.count || 0);
  }

  if (userId) {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM tweet_logs
      WHERE user_id = ${userId}
    `;
    return Number(result[0]?.count || 0);
  }

  if (status) {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM tweet_logs
      WHERE status = ${status}
    `;
    return Number(result[0]?.count || 0);
  }

  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM tweet_logs
  `;

  return Number(result[0]?.count || 0);
}

/**
 * Search tweet logs by content
 */
export async function searchTweetLogs(
  searchTerm: string,
  limit: number = 50
): Promise<TweetLogRecord[]> {
  const results = await prisma.$queryRaw<TweetLogRecord[]>`
    SELECT
      id,
      user_id,
      username,
      tweet_content,
      tweet_id,
      tweet_url,
      status,
      error_message,
      channel_id,
      channel_name,
      guild_id,
      message_id,
      request_type,
      metadata,
      moderation_flags,
      created_at,
      updated_at
    FROM tweet_logs
    WHERE tweet_content ILIKE ${`%${searchTerm}%`}
       OR username ILIKE ${`%${searchTerm}%`}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Get tweet statistics for a user
 */
export async function getUserTweetStats(userId: string): Promise<{
  total: number;
  successful: number;
  failed: number;
  pending: number;
}> {
  const result = await prisma.$queryRaw<Array<{
    status: string;
    count: bigint;
  }>>`
    SELECT status, COUNT(*) as count
    FROM tweet_logs
    WHERE user_id = ${userId}
    GROUP BY status
  `;

  const stats = {
    total: 0,
    successful: 0,
    failed: 0,
    pending: 0,
  };

  for (const row of result) {
    const count = Number(row.count);
    stats.total += count;

    if (row.status === 'success') {
      stats.successful = count;
    } else if (row.status === 'failed') {
      stats.failed = count;
    } else if (row.status === 'pending') {
      stats.pending = count;
    }
  }

  return stats;
}
