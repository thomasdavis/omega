/**
 * Generate Standup Summary Tool
 * Automatically compiles and summarizes daily project standup information
 * Extracts progress, blockers, and plans from recent conversations
 */

import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { getDatabase } from '@repo/database';// OLD:client.js';
import { OMEGA_MODEL } from '@repo/shared';

/**
 * Parse time period string to hours
 * Supports formats: "24h", "48h", "7d", "2w"
 */
function parseTimePeriod(period: string): number {
  const match = period.match(/^(\d+)(h|d|w)$/);
  if (!match) {
    throw new Error('Invalid time period format. Use format like "24h", "48h", "7d", or "2w"');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'h':
      return value;
    case 'd':
      return value * 24;
    case 'w':
      return value * 24 * 7;
    default:
      return 24; // Default to 24 hours
  }
}

interface Message {
  timestamp: number;
  username: string;
  content: string;
  channelName: string;
}

/**
 * Fetch recent messages from the database
 */
async function fetchRecentMessages(hours: number, channelFilter?: string): Promise<Message[]> {
  const db = getDatabase();

  // Calculate the timestamp threshold (in milliseconds)
  const sinceTimestamp = Date.now() - (hours * 60 * 60 * 1000);

  let query = `
    SELECT timestamp, username, message_content, channel_name
    FROM messages
    WHERE sender_type = 'human'
      AND timestamp >= ?
  `;

  const params: any[] = [sinceTimestamp];

  if (channelFilter) {
    query += ' AND channel_name = ?';
    params.push(channelFilter);
  }

  query += ' ORDER BY timestamp ASC';

  const result = await db.execute({
    sql: query,
    args: params,
  });

  return result.rows.map((row: any) => ({
    timestamp: row.timestamp as number,
    username: row.username as string,
    content: row.message_content as string,
    channelName: row.channel_name as string,
  }));
}

/**
 * Use AI to generate a standup summary from messages
 */
async function generateSummary(messages: Message[], timePeriod: string): Promise<string> {
  if (messages.length === 0) {
    return 'No messages found in the specified time period for standup summary.';
  }

  // Prepare message data for AI analysis
  const conversationText = messages
    .map(m => {
      const date = new Date(m.timestamp).toLocaleString();
      return `[${date}] ${m.username} in #${m.channelName}: ${m.content}`;
    })
    .join('\n');

  const prompt = `You are analyzing team conversations to generate a daily project standup summary.

Your task: Extract and organize key information into a clear standup summary with these sections:

1. **Progress & Accomplishments**: What has been completed or worked on
2. **Blockers & Issues**: Any problems, challenges, or things preventing progress
3. **Plans & Next Steps**: What's planned next or upcoming work
4. **Other Updates**: Any other relevant information or context

Guidelines:
- Be concise and bullet-point focused
- Group similar items together
- Attribute important items to team members when relevant
- Skip sections if no relevant information is found
- Focus on actionable information
- Maintain a professional, organized tone

Conversation messages from the last ${timePeriod}:
${conversationText}

Standup Summary:`;

  try {
    const result = await generateText({
      model: openai.chat(OMEGA_MODEL),
      prompt,
      temperature: 0.4, // Balanced temperature for organized but natural summaries
    });

    return result.text;
  } catch (error) {
    console.error('Error generating standup summary:', error);
    throw error;
  }
}

export const generateStandupSummaryTool = tool({
  description: `Generate a daily project standup summary from recent team conversations.

  Automatically compiles and summarizes key points from recent messages, organized into:
  - Progress & Accomplishments
  - Blockers & Issues
  - Plans & Next Steps
  - Other Updates

  Useful for:
  - Automated standup reports
  - Team status updates
  - Project tracking and documentation
  - Quick team sync reviews
  - Daily or weekly summaries

  Time period format:
  - "24h" - last 24 hours (default for daily standups)
  - "48h" - last 48 hours
  - "7d" - last 7 days (for weekly summaries)
  - "2w" - last 2 weeks`,

  inputSchema: z.object({
    timePeriod: z.string().optional().describe('Time period to analyze (e.g., "24h", "48h", "7d", "2w"). Default: "24h"'),
    channel: z.string().optional().describe('Optional: Filter to specific channel name (e.g., "general", "dev-team")'),
  }),

  execute: async ({ timePeriod = '24h', channel }) => {
    try {
      // Parse time period
      const hours = parseTimePeriod(timePeriod);

      console.log(`📊 Generating standup summary for last ${hours} hours (${timePeriod})${channel ? ` in #${channel}` : ''}...`);

      // Fetch messages
      const messages = await fetchRecentMessages(hours, channel);

      console.log(`📊 Found ${messages.length} messages to analyze`);

      if (messages.length === 0) {
        return {
          success: true,
          timePeriod,
          channel: channel || 'all channels',
          messageCount: 0,
          summary: 'No messages found in the specified time period.',
          message: `No messages found${channel ? ` in #${channel}` : ''} for the last ${timePeriod}.`,
        };
      }

      // Generate AI summary
      console.log('🤖 Generating standup summary with AI...');
      const summary = await generateSummary(messages, timePeriod);

      // Get date range
      const oldestMessage = messages[0];
      const newestMessage = messages[messages.length - 1];
      const dateRange = {
        from: new Date(oldestMessage.timestamp).toISOString(),
        to: new Date(newestMessage.timestamp).toISOString(),
      };

      return {
        success: true,
        timePeriod,
        channel: channel || 'all channels',
        messageCount: messages.length,
        dateRange,
        summary,
        message: `Successfully generated standup summary from ${messages.length} messages over the last ${timePeriod}.`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate standup summary',
      };
    }
  },
});
