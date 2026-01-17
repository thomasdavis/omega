/**
 * Antigravity Roasts Service
 * Records AI-generated roasts when users mention antigravity keywords
 */

import { prisma } from './prismaClient.js';

export interface AntigravityRoastRecord {
  id: number;
  user_id: string;
  username: string | null;
  message_content: string | null;
  matched_keyword: string;
  roast_content: string;
  user_profile_data: any;
  ai_model: string | null;
  generation_time_ms: number | null;
  banned_but_no_perm: boolean;
  channel_id: string | null;
  guild_id: string | null;
  roast_timestamp: Date;
  created_at: Date;
}

export interface LogAntigravityRoastParams {
  userId: string;
  username?: string;
  messageContent?: string;
  matchedKeyword: string;
  roastContent: string;
  userProfileData?: any;
  aiModel?: string;
  generationTimeMs?: number;
  bannedButNoPerm?: boolean;
  channelId?: string;
  guildId?: string;
}

/**
 * Log an antigravity roast to the database
 */
export async function logAntigravityRoast(params: LogAntigravityRoastParams): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO antigravity_roasts (
      user_id,
      username,
      message_content,
      matched_keyword,
      roast_content,
      user_profile_data,
      ai_model,
      generation_time_ms,
      banned_but_no_perm,
      channel_id,
      guild_id,
      roast_timestamp,
      created_at
    ) VALUES (
      ${params.userId},
      ${params.username || null},
      ${params.messageContent || null},
      ${params.matchedKeyword},
      ${params.roastContent},
      ${params.userProfileData ? JSON.stringify(params.userProfileData) : null}::jsonb,
      ${params.aiModel || null},
      ${params.generationTimeMs || null},
      ${params.bannedButNoPerm || false},
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
 * Get all roasts for a specific user
 */
export async function getUserRoasts(userId: string): Promise<AntigravityRoastRecord[]> {
  const results = await prisma.$queryRaw<AntigravityRoastRecord[]>`
    SELECT *
    FROM antigravity_roasts
    WHERE user_id = ${userId}
    ORDER BY roast_timestamp DESC
  `;

  return results;
}

/**
 * Get recent roasts across all users
 */
export async function getRecentRoasts(limit: number = 50): Promise<AntigravityRoastRecord[]> {
  const results = await prisma.$queryRaw<AntigravityRoastRecord[]>`
    SELECT *
    FROM antigravity_roasts
    ORDER BY roast_timestamp DESC
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Get roasts by keyword
 */
export async function getRoastsByKeyword(keyword: string): Promise<AntigravityRoastRecord[]> {
  const results = await prisma.$queryRaw<AntigravityRoastRecord[]>`
    SELECT *
    FROM antigravity_roasts
    WHERE matched_keyword = ${keyword}
    ORDER BY roast_timestamp DESC
  `;

  return results;
}

/**
 * Count total roasts
 */
export async function countRoasts(): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM antigravity_roasts
  `;

  return Number(result[0]?.count || 0);
}

/**
 * Get average generation time for AI roasts
 */
export async function getAverageGenerationTime(): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ avg: number | null }>>`
    SELECT AVG(generation_time_ms) as avg
    FROM antigravity_roasts
    WHERE generation_time_ms IS NOT NULL
  `;

  return result[0]?.avg || 0;
}
