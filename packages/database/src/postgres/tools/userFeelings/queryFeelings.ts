/**
 * Query Feelings Tool
 * Queries user feelings history with filters
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '../../client.js';

export const queryFeelingsTool = tool({
  description: `Query and retrieve user feelings history with flexible filtering options.

Use this when:
- User wants to see their mood history
- User asks about past feelings
- User wants to analyze their emotional patterns
- User wants to filter feelings by date, type, or intensity
- User asks "How have I been feeling?" or "Show my mood history"

Examples:
- "Show me my mood history"
- "What were my feelings last week?"
- "Show all times I felt anxious"
- "List my feelings from the past month"
- "Show high intensity feelings"`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID to query feelings for'),
    feelingType: z.string().optional().describe('Filter by specific feeling type'),
    minIntensity: z.number().int().min(1).max(10).optional().describe('Filter by minimum intensity'),
    maxIntensity: z.number().int().min(1).max(10).optional().describe('Filter by maximum intensity'),
    startDate: z.number().optional().describe('Start date filter (Unix timestamp in seconds)'),
    endDate: z.number().optional().describe('End date filter (Unix timestamp in seconds)'),
    limit: z.number().int().positive().max(100).optional().describe('Maximum number of results (default: 50)'),
    orderDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction by recorded_at (default: desc)'),
  }),

  execute: async ({ userId, feelingType, minIntensity, maxIntensity, startDate, endDate, limit = 50, orderDirection = 'desc' }) => {
    console.log(`📊 [Feelings] Querying feelings for user ${userId}`);

    try {
      const pool = await getPostgresPool();

      // Build dynamic query
      const conditions = ['user_id = $1'];
      const params: any[] = [userId];
      let paramCount = 1;

      if (feelingType) {
        paramCount++;
        conditions.push(`feeling_type = $${paramCount}`);
        params.push(feelingType.toLowerCase());
      }

      if (minIntensity !== undefined) {
        paramCount++;
        conditions.push(`intensity >= $${paramCount}`);
        params.push(minIntensity);
      }

      if (maxIntensity !== undefined) {
        paramCount++;
        conditions.push(`intensity <= $${paramCount}`);
        params.push(maxIntensity);
      }

      if (startDate) {
        paramCount++;
        conditions.push(`recorded_at >= $${paramCount}`);
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        conditions.push(`recorded_at <= $${paramCount}`);
        params.push(endDate);
      }

      const whereClause = conditions.join(' AND ');
      const query = `
        SELECT *
        FROM user_feelings
        WHERE ${whereClause}
        ORDER BY recorded_at ${orderDirection}
        LIMIT ${limit}
      `;

      const result = await pool.query(query, params);
      const feelings = result.rows;

      console.log(`✅ [Feelings] Found ${feelings.length} feeling(s)`);

      return {
        success: true,
        count: feelings.length,
        feelings: feelings.map(f => ({
          id: f.id,
          userId: f.user_id,
          username: f.username,
          feelingType: f.feeling_type,
          intensity: f.intensity,
          notes: f.notes,
          context: f.context,
          recordedAt: new Date(f.recorded_at * 1000).toISOString(),
          createdAt: new Date(f.created_at * 1000).toISOString(),
        })),
      };
    } catch (error) {
      console.error(`❌ [Feelings] Failed to query feelings:`, error);
      return {
        success: false,
        error: 'QUERY_FAILED',
        message: `Failed to query feelings: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
