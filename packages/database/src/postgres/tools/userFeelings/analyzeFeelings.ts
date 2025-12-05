/**
 * Analyze User Feelings Tool
 * Generates analytics and insights from user feelings data
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const analyzeFeelingsTool = tool({
  description: `Analyze a user's feelings and generate insights about their emotional trends.

Use this when:
- User wants to see mood trends
- User asks about emotional patterns
- User wants a feelings summary
- User asks "how have I been feeling overall"

Examples:
- "Analyze my mood trends"
- "Show me my emotional patterns"
- "What are my most common feelings?"
- "Generate a feelings report"`,

  inputSchema: z.object({
    userId: z.string().describe('User ID to analyze'),
    startTimestamp: z.number().optional().describe('Start timestamp (unix seconds)'),
    endTimestamp: z.number().optional().describe('End timestamp (unix seconds)'),
  }),

  execute: async ({ userId, startTimestamp, endTimestamp }) => {
    console.log(`📊 [UserFeeling] Analyzing feelings for user ${userId}`);

    try {
      // Build where clause
      const where: any = { userId };

      if (startTimestamp || endTimestamp) {
        where.timestamp = {};
        if (startTimestamp) {
          where.timestamp.gte = BigInt(startTimestamp);
        }
        if (endTimestamp) {
          where.timestamp.lte = BigInt(endTimestamp);
        }
      }

      // Get all feelings
      const feelings = await prisma.userFeeling.findMany({
        where,
        orderBy: { timestamp: 'asc' },
      });

      if (feelings.length === 0) {
        return {
          success: true,
          totalEntries: 0,
          message: 'No feelings logged in the specified time period',
        };
      }

      // Calculate analytics
      const feelingTypeCounts: Record<string, number> = {};
      const valenceCounts: Record<string, number> = {};
      const intensitySum: Record<string, { total: number; count: number }> = {};
      let totalIntensity = 0;
      let intensityCount = 0;

      feelings.forEach(feeling => {
        // Count feeling types
        feelingTypeCounts[feeling.feelingType] = (feelingTypeCounts[feeling.feelingType] || 0) + 1;

        // Count valences
        if (feeling.valence) {
          valenceCounts[feeling.valence] = (valenceCounts[feeling.valence] || 0) + 1;
        }

        // Calculate average intensity per feeling type
        if (feeling.intensity !== null) {
          if (!intensitySum[feeling.feelingType]) {
            intensitySum[feeling.feelingType] = { total: 0, count: 0 };
          }
          intensitySum[feeling.feelingType].total += feeling.intensity;
          intensitySum[feeling.feelingType].count += 1;
          totalIntensity += feeling.intensity;
          intensityCount += 1;
        }
      });

      // Calculate average intensities
      const averageIntensityByType: Record<string, number> = {};
      Object.entries(intensitySum).forEach(([type, data]) => {
        averageIntensityByType[type] = Number((data.total / data.count).toFixed(2));
      });

      // Get most common feelings
      const mostCommonFeelings = Object.entries(feelingTypeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count, percentage: Number(((count / feelings.length) * 100).toFixed(1)) }));

      // Get overall stats
      const overallAverageIntensity = intensityCount > 0
        ? Number((totalIntensity / intensityCount).toFixed(2))
        : null;

      // Time range
      const firstTimestamp = Number(feelings[0].timestamp);
      const lastTimestamp = Number(feelings[feelings.length - 1].timestamp);
      const daysCovered = Math.ceil((lastTimestamp - firstTimestamp) / (60 * 60 * 24));

      // Get recent trend (last 7 entries)
      const recentFeelings = feelings.slice(-7);
      const recentTrend = recentFeelings.map(f => ({
        feelingType: f.feelingType,
        intensity: f.intensity,
        valence: f.valence,
        timestamp: Number(f.timestamp),
      }));

      console.log(`✅ [UserFeeling] Analysis complete: ${feelings.length} entries`);

      return {
        success: true,
        totalEntries: feelings.length,
        timeRange: {
          start: firstTimestamp,
          end: lastTimestamp,
          daysCovered,
        },
        mostCommonFeelings,
        valenceCounts,
        overallAverageIntensity,
        averageIntensityByType,
        recentTrend,
        insights: {
          dominantValence: Object.entries(valenceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown',
          mostFrequentFeeling: mostCommonFeelings[0]?.type || 'unknown',
          entriesPerDay: daysCovered > 0 ? Number((feelings.length / daysCovered).toFixed(2)) : feelings.length,
        },
      };
    } catch (error) {
      console.error(`❌ [UserFeeling] Failed to analyze feelings:`, error);
      return {
        success: false,
        error: 'ANALYSIS_FAILED',
        message: `Failed to analyze feelings: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
