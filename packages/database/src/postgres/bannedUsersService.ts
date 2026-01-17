/**
 * Banned Users Log Service
 * Records when users are automatically banned for violating content policies
 */

import { prisma } from './prismaClient.js';

export interface BannedUserLogRecord {
  id: number;
  user_id: string;
  username: string | null;
  message_content: string | null;
  ban_reason: string;
  banned_keyword: string | null;
  channel_id: string | null;
  guild_id: string | null;
  ban_timestamp: Date;
  created_at: Date;
}

export interface LogBanParams {
  userId: string;
  username?: string;
  messageContent?: string;
  banReason: string;
  bannedKeyword?: string;
  channelId?: string;
  guildId?: string;
}

/**
 * Log a user ban to the database
 */
export async function logBan(params: LogBanParams): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO banned_users_log (
      user_id,
      username,
      message_content,
      ban_reason,
      banned_keyword,
      channel_id,
      guild_id,
      ban_timestamp,
      created_at
    ) VALUES (
      ${params.userId},
      ${params.username || null},
      ${params.messageContent || null},
      ${params.banReason},
      ${params.bannedKeyword || null},
      ${params.channelId || null},
      ${params.guildId || null},
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return result[0]?.id || 0;
}

/**
 * Get all bans for a specific user
 */
export async function getUserBans(userId: string): Promise<BannedUserLogRecord[]> {
  const results = await prisma.$queryRaw<BannedUserLogRecord[]>`
    SELECT *
    FROM banned_users_log
    WHERE user_id = ${userId}
    ORDER BY ban_timestamp DESC
  `;

  return results;
}

/**
 * Get recent bans across all users
 */
export async function getRecentBans(limit: number = 50): Promise<BannedUserLogRecord[]> {
  const results = await prisma.$queryRaw<BannedUserLogRecord[]>`
    SELECT *
    FROM banned_users_log
    ORDER BY ban_timestamp DESC
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Get bans by keyword
 */
export async function getBansByKeyword(keyword: string): Promise<BannedUserLogRecord[]> {
  const results = await prisma.$queryRaw<BannedUserLogRecord[]>`
    SELECT *
    FROM banned_users_log
    WHERE banned_keyword = ${keyword}
    ORDER BY ban_timestamp DESC
  `;

  return results;
}

/**
 * Count total bans
 */
export async function countBans(): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM banned_users_log
  `;

  return Number(result[0]?.count || 0);
}
