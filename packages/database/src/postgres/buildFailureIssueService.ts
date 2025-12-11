/**
 * Build Failure Issue Service
 * Tracks Discord messages that triggered GitHub issue creation for build failures
 */

import { prisma } from './prismaClient.js';

export interface BuildFailureIssueRecord {
  id: number;
  discord_message_id: string;
  channel_id: string;
  issue_number: number;
  created_at: Date;
  message_snippet: string | null;
}

/**
 * Check if a Discord message has already triggered issue creation
 */
export async function hasIssueForMessage(
  discordMessageId: string
): Promise<boolean> {
  const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS(
      SELECT 1 FROM build_failure_issues
      WHERE discord_message_id = ${discordMessageId}
    ) as exists
  `;

  return result[0]?.exists || false;
}

/**
 * Record that a GitHub issue was created for a Discord message
 */
export async function recordBuildFailureIssue(data: {
  discordMessageId: string;
  channelId: string;
  issueNumber: number;
  messageSnippet?: string;
}): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO build_failure_issues (
      discord_message_id,
      channel_id,
      issue_number,
      message_snippet,
      created_at
    ) VALUES (
      ${data.discordMessageId},
      ${data.channelId},
      ${data.issueNumber},
      ${data.messageSnippet || null},
      NOW()
    )
    ON CONFLICT (discord_message_id) DO NOTHING
  `;
}

/**
 * Get issue number for a Discord message (if one was created)
 */
export async function getIssueForMessage(
  discordMessageId: string
): Promise<number | null> {
  const result = await prisma.$queryRaw<Array<{ issue_number: number }>>`
    SELECT issue_number
    FROM build_failure_issues
    WHERE discord_message_id = ${discordMessageId}
    LIMIT 1
  `;

  return result[0]?.issue_number || null;
}

/**
 * List recent build failure issues (for debugging/monitoring)
 */
export async function listRecentBuildFailureIssues(
  limit: number = 50
): Promise<BuildFailureIssueRecord[]> {
  const results = await prisma.$queryRaw<BuildFailureIssueRecord[]>`
    SELECT
      id,
      discord_message_id,
      channel_id,
      issue_number,
      created_at,
      message_snippet
    FROM build_failure_issues
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return results;
}
