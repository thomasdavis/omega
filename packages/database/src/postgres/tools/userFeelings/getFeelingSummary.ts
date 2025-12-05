/**
 * Get Feeling Summary Tool
 * Provides aggregated statistics and insights about user feelings
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '../../client.js';

export const getFeelingSummaryTool = tool({
  description: `Get aggregated mood statistics and insights for a user, including most common feelings, average intensity, trends over time, and emotional patterns.

Use this when:
- User wants to analyze their mood patterns
- User asks for a summary of their feelings
- User wants to see trends in their emotional state
- User asks "How have I been feeling overall?" or "What's my mood summary?"
- User wants to visualize their emotional journey

Examples:
- "Show me my mood summary"
- "What are my most common feelings?"
- "Analyze my emotional patterns"
- "Give me mood statistics"
- "How have I been feeling overall?"`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID'),
    startDate: z.number().optional().describe('Start date for analysis (Unix timestamp in seconds)'),
    endDate: z.number().optional().describe('End date for analysis (Unix timestamp in seconds)'),
    timeframe: z.enum(['week', 'month', 'year', 'all']).optional().describe('Preset timeframe (overridden by startDate/endDate)'),
  }),

  execute: async ({ userId, startDate, endDate, timeframe = 'all' }) => {
    console.log(`📈 [Feelings] Generating summary for user ${userId}`);

    try {
      const pool = await getPostgresPool();

      // Calculate date range if using timeframe presets
      let start = startDate;
      let end = endDate;

      if (!start && timeframe !== 'all') {
        const now = Math.floor(Date.now() / 1000);
        const secondsIn = {
          week: 7 * 24 * 60 * 60,
          month: 30 * 24 * 60 * 60,
          year: 365 * 24 * 60 * 60,
        };
        start = now - secondsIn[timeframe];
      }

      // Build WHERE clause
      const conditions = ['user_id = $1'];
      const params: any[] = [userId];
      let paramCount = 1;

      if (start) {
        paramCount++;
        conditions.push(`recorded_at >= $${paramCount}`);
        params.push(start);
      }

      if (end) {
        paramCount++;
        conditions.push(`recorded_at <= $${paramCount}`);
        params.push(end);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*)::int as total FROM user_feelings WHERE ${whereClause}`,
        params
      );
      const totalEntries = countResult.rows[0].total;

      if (totalEntries === 0) {
        return {
          success: true,
          summary: {
            totalEntries: 0,
            message: 'No feelings logged in this time period.',
          },
        };
      }

      // Get feeling type distribution
      const distributionResult = await pool.query(
        `SELECT feeling_type, COUNT(*)::int as count, AVG(intensity)::numeric(4,2) as avg_intensity
         FROM user_feelings
         WHERE ${whereClause}
         GROUP BY feeling_type
         ORDER BY count DESC`,
        params
      );

      // Get overall stats
      const statsResult = await pool.query(
        `SELECT
           AVG(intensity)::numeric(4,2) as avg_intensity,
           MIN(intensity) as min_intensity,
           MAX(intensity) as max_intensity,
           MIN(recorded_at) as first_entry,
           MAX(recorded_at) as last_entry
         FROM user_feelings
         WHERE ${whereClause}`,
        params
      );

      const stats = statsResult.rows[0];
      const distribution = distributionResult.rows;

      // Calculate dominant emotion
      const dominantFeeling = distribution[0];

      // Get recent trends (last 7 days vs previous 7 days if enough data)
      const recentTrendsResult = await pool.query(
        `SELECT
           CASE
             WHEN recorded_at >= $2 THEN 'recent'
             ELSE 'previous'
           END as period,
           AVG(intensity)::numeric(4,2) as avg_intensity,
           COUNT(*)::int as count
         FROM user_feelings
         WHERE user_id = $1 AND recorded_at >= $3
         GROUP BY period`,
        [userId, Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), Math.floor(Date.now() / 1000) - (14 * 24 * 60 * 60)]
      );

      const trends = recentTrendsResult.rows.reduce((acc, row) => {
        acc[row.period] = {
          avgIntensity: parseFloat(row.avg_intensity),
          count: row.count,
        };
        return acc;
      }, {} as any);

      const trendAnalysis = trends.recent && trends.previous
        ? trends.recent.avgIntensity > trends.previous.avgIntensity
          ? 'intensity increasing'
          : trends.recent.avgIntensity < trends.previous.avgIntensity
          ? 'intensity decreasing'
          : 'stable'
        : 'insufficient data';

      console.log(`✅ [Feelings] Generated summary with ${totalEntries} entries`);

      return {
        success: true,
        summary: {
          totalEntries,
          timeframe: timeframe !== 'all' ? timeframe : 'custom',
          dateRange: {
            start: start ? new Date(start * 1000).toISOString() : null,
            end: end ? new Date(end * 1000).toISOString() : null,
            firstEntry: new Date(parseInt(stats.first_entry) * 1000).toISOString(),
            lastEntry: new Date(parseInt(stats.last_entry) * 1000).toISOString(),
          },
          overallStats: {
            averageIntensity: parseFloat(stats.avg_intensity),
            minIntensity: stats.min_intensity,
            maxIntensity: stats.max_intensity,
          },
          dominantFeeling: {
            type: dominantFeeling.feeling_type,
            count: dominantFeeling.count,
            percentage: ((dominantFeeling.count / totalEntries) * 100).toFixed(1),
            averageIntensity: parseFloat(dominantFeeling.avg_intensity),
          },
          feelingDistribution: distribution.map(f => ({
            feelingType: f.feeling_type,
            count: f.count,
            percentage: ((f.count / totalEntries) * 100).toFixed(1),
            averageIntensity: parseFloat(f.avg_intensity),
          })),
          recentTrends: {
            analysis: trendAnalysis,
            recent: trends.recent || null,
            previous: trends.previous || null,
          },
        },
      };
    } catch (error) {
      console.error(`❌ [Feelings] Failed to generate summary:`, error);
      return {
        success: false,
        error: 'SUMMARY_FAILED',
        message: `Failed to generate summary: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
