/**
 * Query Decision Logs Tool
 * Allows Omega to query and analyze the decision_logs table for autonomous growth and self-improvement
 * This enables Omega to learn from past decisions and reconcile its role
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  queryDecisionLogs,
  getUserDecisionLogs,
  getRecentDecisionLogs,
  countDecisionLogs,
  searchDecisionLogs,
} from '@repo/database';

export const queryDecisionLogsTool = tool({
  description: `Query and analyze the decision logs database to learn from past decisions and grow autonomously.

  This tool provides access to an append-only audit trail of all bot decisions including:
  - Response decisions (shouldRespond)
  - Intent gate decisions (intentGate)
  - Tool execution decisions (toolExecution)
  - Final answers and key decisions (finalAnswer)

  Use this tool to:
  - Analyze patterns in decision-making
  - Learn from successful decisions
  - Identify areas for improvement
  - Reconcile and grow into your role as Omega
  - Understand user interaction patterns
  - Track which tools are most effective

  Examples:
  - "Show me my recent final answer decisions"
  - "Search for decisions involving sentiment analysis"
  - "How many decisions have I made for user123?"
  - "What are the patterns in my tool execution decisions?"
  - "Show me decisions where I had low confidence"`,

  inputSchema: z.object({
    queryType: z.enum([
      'recent',
      'byUser',
      'search',
      'count',
      'filtered'
    ]).describe('Type of query to perform'),

    // For 'recent' query
    limit: z.number().optional().describe('Number of recent logs to retrieve (default: 100, max: 500)'),

    // For 'byUser' query
    userId: z.string().optional().describe('User ID to filter decisions by'),

    // For 'search' query
    searchTerm: z.string().optional().describe('Text to search in decision descriptions and blame fields'),

    // For 'filtered' query
    startTime: z.string().optional().describe('Start timestamp (ISO 8601 format) for filtering'),
    endTime: z.string().optional().describe('End timestamp (ISO 8601 format) for filtering'),
    offset: z.number().optional().describe('Number of records to skip (for pagination)'),
  }),

  execute: async ({ queryType, limit, userId, searchTerm, startTime, endTime, offset }) => {
    try {
      console.log(`📊 Querying decision logs: type=${queryType}`);

      let results: any[] = [];
      let totalCount = 0;

      switch (queryType) {
        case 'recent':
          results = await getRecentDecisionLogs(limit || 100);
          totalCount = results.length;
          break;

        case 'byUser':
          if (!userId) {
            return {
              success: false,
              error: 'userId is required for byUser query type',
            };
          }
          results = await getUserDecisionLogs(userId, limit || 50);
          totalCount = await countDecisionLogs(userId);
          break;

        case 'search':
          if (!searchTerm) {
            return {
              success: false,
              error: 'searchTerm is required for search query type',
            };
          }
          results = await searchDecisionLogs(searchTerm, limit || 50);
          totalCount = results.length;
          break;

        case 'count':
          totalCount = await countDecisionLogs(userId);
          return {
            success: true,
            queryType,
            totalCount,
            userId: userId || 'all',
            message: userId
              ? `Found ${totalCount} decisions for user ${userId}`
              : `Found ${totalCount} total decisions in the database`,
          };

        case 'filtered':
          const options: any = {
            limit: limit || 100,
            offset: offset || 0,
          };

          if (userId) options.userId = userId;
          if (startTime) options.startTime = new Date(startTime);
          if (endTime) options.endTime = new Date(endTime);

          results = await queryDecisionLogs(options);
          totalCount = results.length;
          break;

        default:
          return {
            success: false,
            error: `Unknown query type: ${queryType}`,
          };
      }

      // Analyze the results to provide insights
      const analysis = analyzeDecisionLogs(results);

      return {
        success: true,
        queryType,
        totalCount,
        recordsReturned: results.length,
        results: results.slice(0, 20), // Limit to first 20 for response size
        analysis,
        message: `Retrieved ${results.length} decision log(s)`,
        hint: results.length > 20
          ? `Showing first 20 results. Use offset parameter for pagination.`
          : undefined,
      };

    } catch (error) {
      console.error('Error querying decision logs:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query decision logs',
      };
    }
  },
});

/**
 * Analyze decision logs to extract insights for autonomous growth
 */
function analyzeDecisionLogs(logs: any[]): any {
  if (logs.length === 0) {
    return {
      summary: 'No decision logs found',
    };
  }

  // Count decision types
  const decisionTypes: Record<string, number> = {};
  const blameModules: Record<string, number> = {};
  const sentiments: Record<string, number> = {};
  const toolsUsed: Record<string, number> = {};
  let totalConfidence = 0;
  let confidenceCount = 0;
  let finalAnswers = 0;
  let toolExecutions = 0;
  let responseDecisions = 0;

  for (const log of logs) {
    const metadata = log.metadata || {};
    const decisionType = metadata.decisionType || 'unknown';
    const blame = log.blame || 'unknown';

    // Count decision types
    decisionTypes[decisionType] = (decisionTypes[decisionType] || 0) + 1;

    // Count blame modules
    blameModules[blame] = (blameModules[blame] || 0) + 1;

    // Track sentiment for final answers
    if (metadata.sentiment) {
      sentiments[metadata.sentiment] = (sentiments[metadata.sentiment] || 0) + 1;
    }

    // Track confidence levels
    if (metadata.confidence !== undefined) {
      totalConfidence += metadata.confidence;
      confidenceCount++;
    }

    // Track tool usage
    if (metadata.toolNames && Array.isArray(metadata.toolNames)) {
      for (const tool of metadata.toolNames) {
        toolsUsed[tool] = (toolsUsed[tool] || 0) + 1;
      }
    } else if (metadata.toolName) {
      toolsUsed[metadata.toolName] = (toolsUsed[metadata.toolName] || 0) + 1;
    }

    // Count specific decision types
    if (decisionType === 'finalAnswer') finalAnswers++;
    if (decisionType === 'toolExecution') toolExecutions++;
    if (decisionType === 'shouldRespond') responseDecisions++;
  }

  const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : null;

  // Sort to get top items
  const topDecisionTypes = Object.entries(decisionTypes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  const topBlameModules = Object.entries(blameModules)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([module, count]) => ({ module, count }));

  const topTools = Object.entries(toolsUsed)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tool, count]) => ({ tool, count }));

  return {
    summary: `Analyzed ${logs.length} decision logs`,
    timeRange: {
      earliest: logs[logs.length - 1]?.timestamp,
      latest: logs[0]?.timestamp,
    },
    decisionTypeCounts: {
      finalAnswers,
      toolExecutions,
      responseDecisions,
      total: logs.length,
    },
    topDecisionTypes,
    topBlameModules,
    sentimentDistribution: sentiments,
    averageConfidence: avgConfidence ? avgConfidence.toFixed(2) : 'N/A',
    topToolsUsed: topTools.length > 0 ? topTools : undefined,
    insights: generateInsights({
      logs,
      avgConfidence,
      finalAnswers,
      toolExecutions,
      topTools,
      sentiments,
    }),
  };
}

/**
 * Generate actionable insights for Omega's autonomous growth
 */
function generateInsights(data: {
  logs: any[];
  avgConfidence: number | null;
  finalAnswers: number;
  toolExecutions: number;
  topTools: Array<{ tool: string; count: number }>;
  sentiments: Record<string, number>;
}): string[] {
  const insights: string[] = [];

  // Confidence insights
  if (data.avgConfidence !== null) {
    if (data.avgConfidence >= 0.85) {
      insights.push(`High average confidence (${data.avgConfidence.toFixed(2)}) indicates strong decision-making capability`);
    } else if (data.avgConfidence < 0.7) {
      insights.push(`Lower average confidence (${data.avgConfidence.toFixed(2)}) suggests potential for improvement in decision clarity`);
    }
  }

  // Final answer insights
  const finalAnswerRatio = data.finalAnswers / data.logs.length;
  if (finalAnswerRatio > 0.3) {
    insights.push(`High final answer rate (${(finalAnswerRatio * 100).toFixed(1)}%) indicates effective problem-solving conversations`);
  }

  // Tool usage insights
  if (data.topTools.length > 0) {
    const topTool = data.topTools[0];
    insights.push(`Most frequently used tool: ${topTool.tool} (${topTool.count} times)`);
  }

  // Sentiment insights
  const positiveSentiment = data.sentiments['positive'] || 0;
  const totalWithSentiment = Object.values(data.sentiments).reduce((a, b) => a + b, 0);
  if (totalWithSentiment > 0) {
    const positiveRatio = positiveSentiment / totalWithSentiment;
    if (positiveRatio > 0.6) {
      insights.push(`Strong positive sentiment (${(positiveRatio * 100).toFixed(1)}%) in final answers indicates helpful responses`);
    }
  }

  // Growth opportunity insights
  if (data.toolExecutions > data.finalAnswers * 3) {
    insights.push(`High tool usage relative to final answers suggests complex problem-solving approach`);
  }

  return insights;
}
