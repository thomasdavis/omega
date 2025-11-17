/**
 * Evalite Query Tool
 * Allows users to query and view evaluation data for Omega's responses
 */

import { tool } from 'ai';
import { z } from 'zod';
import { evaliteService } from '../../evaluation/evaliteService.js';

export const evaliteQueryTool = tool({
  description: `Query Evalite evaluation data for Omega's responses. Use this tool when users want to:
- View quality metrics and scores for past responses
- See evaluation statistics and performance trends
- Query evaluations by user, channel, date range, or score threshold
- Get transparency into response quality assessment

The tool provides access to persistent evaluation data including quality, relevance, accuracy, coherence, and helpfulness scores.`,
  parameters: z.object({
    action: z.enum(['query', 'statistics']).describe(
      'Action to perform: "query" to retrieve individual evaluations, "statistics" to get summary stats'
    ),
    username: z.string().optional().describe('Filter by specific username'),
    channelName: z.string().optional().describe('Filter by specific channel name'),
    minScore: z.number().min(0).max(100).optional().describe(
      'Minimum overall score threshold (0-100)'
    ),
    startDate: z.string().optional().describe('Start date for filtering (ISO 8601 format)'),
    endDate: z.string().optional().describe('End date for filtering (ISO 8601 format)'),
    limit: z.number().min(1).max(100).default(10).describe(
      'Maximum number of results to return (default 10, max 100)'
    ),
  }),
  execute: async ({
    action,
    username,
    channelName,
    minScore,
    startDate,
    endDate,
    limit,
  }) => {
    console.log('[EvaliteQuery] Tool invoked with action:', action);

    try {
      const filters = {
        username,
        channelName,
        minScore,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit,
      };

      if (action === 'statistics') {
        const stats = await evaliteService.getStatistics(filters);

        return {
          success: true,
          action: 'statistics',
          data: {
            totalEvaluations: stats.totalEvaluations,
            averageScores: stats.averageScores,
            scoreDistribution: stats.scoreDistribution,
            filters: filters,
          },
          message: `Retrieved statistics for ${stats.totalEvaluations} evaluations`,
        };
      } else {
        // Query action
        const evaluations = await evaliteService.queryEvaluations(filters);

        // Format evaluations for display
        const formattedEvaluations = evaluations.map(e => ({
          id: e.id,
          timestamp: e.timestamp.toISOString(),
          username: e.context.username,
          channel: e.context.channelName,
          prompt: e.prompt.substring(0, 100) + (e.prompt.length > 100 ? '...' : ''),
          response: e.response.substring(0, 100) + (e.response.length > 100 ? '...' : ''),
          scores: e.metrics,
        }));

        return {
          success: true,
          action: 'query',
          data: {
            evaluations: formattedEvaluations,
            count: formattedEvaluations.length,
            filters: filters,
          },
          message: `Found ${formattedEvaluations.length} evaluation(s)`,
        };
      }
    } catch (error) {
      console.error('[EvaliteQuery] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});
