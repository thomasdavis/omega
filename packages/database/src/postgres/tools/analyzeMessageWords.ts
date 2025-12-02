/**
 * Analyze Message Words Tool
 * Counts the most commonly used words in recent messages
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '../client.js';

// Common stop words to exclude from word counting
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
  'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
  'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
  'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
  'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day',
  'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had', 'were', 'said', 'did',
  'having', 'may', 'should', 'am', 'being', 'does', 'did', 'done',
]);

export const analyzeMessageWordsTool = tool({
  description: `Analyze the messages table and count the most commonly used words in recent messages.

Use this when:
- User wants to see frequently used words in recent conversations
- User wants to analyze vocabulary or topics in message history
- User wants keyword analysis or conversation insights

Examples:
- "What are the most common words in the last 100 messages?"
- "Show me the top 20 words used in recent messages"
- "Analyze the last 50 messages for common keywords"`,

  inputSchema: z.object({
    messageCount: z.number().int().positive().max(1000).default(100).describe('Number of recent messages to analyze (default: 100, max: 1000)'),
    topN: z.number().int().positive().max(100).default(10).describe('Number of top words to return (default: 10, max: 100)'),
    excludeStopWords: z.boolean().default(true).describe('Exclude common stop words like "the", "a", "is", etc. (default: true)'),
    minWordLength: z.number().int().min(1).max(20).default(3).describe('Minimum word length to include (default: 3)'),
    channelId: z.string().optional().describe('Filter messages by channel ID (optional)'),
    userId: z.string().optional().describe('Filter messages by user ID (optional)'),
  }),

  execute: async ({ messageCount, topN, excludeStopWords, minWordLength, channelId, userId }) => {
    console.log(`🔍 [Analyze Message Words] Analyzing ${messageCount} messages, returning top ${topN} words`);

    try {
      const pool = await getPostgresPool();

      // Build WHERE clause for filters
      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (channelId) {
        whereConditions.push(`channel_id = $${paramIndex++}`);
        params.push(channelId);
      }

      if (userId) {
        whereConditions.push(`user_id = $${paramIndex++}`);
        params.push(userId);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Query to fetch recent messages
      const fetchSql = `
        SELECT message_content
        FROM messages
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${paramIndex}
      `;
      params.push(messageCount);

      const result = await pool.query(fetchSql, params);

      if (result.rowCount === 0) {
        return {
          success: true,
          wordCounts: [],
          totalMessagesAnalyzed: 0,
          totalWordsProcessed: 0,
          message: 'No messages found matching the criteria',
        };
      }

      // Process messages and count words
      const wordFrequency = new Map<string, number>();
      let totalWordsProcessed = 0;

      for (const row of result.rows) {
        const content = row.message_content || '';

        // Extract words using regex (alphanumeric sequences)
        const words = content.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];

        for (const word of words) {
          // Apply filters
          if (word.length < minWordLength) continue;
          if (excludeStopWords && STOP_WORDS.has(word)) continue;

          totalWordsProcessed++;
          wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
        }
      }

      // Sort by frequency and get top N
      const sortedWords = Array.from(wordFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([word, count]) => ({ word, count }));

      console.log(`✅ [Analyze Message Words] Found ${sortedWords.length} top words from ${result.rowCount} messages`);

      return {
        success: true,
        wordCounts: sortedWords,
        totalMessagesAnalyzed: result.rowCount,
        totalWordsProcessed,
        filters: {
          messageCount,
          topN,
          excludeStopWords,
          minWordLength,
          channelId: channelId || null,
          userId: userId || null,
        },
      };
    } catch (error) {
      console.error(`❌ [Analyze Message Words] Failed:`, error);
      return {
        success: false,
        error: 'ANALYSIS_FAILED',
        message: `Failed to analyze message words: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
