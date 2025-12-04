/**
 * Autonomous Insight Agent Tool
 * Analyzes conversation history, user sentiment, bot internal feelings, and database queries
 * to generate insightful summaries and recommendations for improving interactions
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getDatabase } from '@repo/database';
import { OMEGA_MODEL } from '@repo/shared';
import { feelingsService } from '../lib/feelings/index.js';

export const autonomousInsightAgentTool = tool({
  description: `Autonomously analyze conversation history, user sentiment, bot internal state, and database activity to generate insights and recommendations.

This tool provides:
- Conversation pattern analysis from recent messages
- User sentiment trends and interaction quality
- Bot internal feelings and performance state
- Database query patterns and user interests
- Actionable recommendations for improving interactions
- Suggestions for new features or improvements

Use this when:
- User asks for insights from messages or conversations
- User wants to analyze bot performance or behavior
- User requests analysis of conversation patterns
- User asks to "analyze the last X messages"
- User wants recommendations for improvements`,

  inputSchema: z.object({
    messageLimit: z
      .number()
      .min(10)
      .max(1000)
      .default(500)
      .describe('Number of recent messages to analyze (10-1000)'),
    includeUserSentiment: z
      .boolean()
      .default(true)
      .describe('Include user sentiment analysis from database'),
    includeBotFeelings: z
      .boolean()
      .default(true)
      .describe('Include bot internal feelings and state'),
    includeQueryPatterns: z
      .boolean()
      .default(true)
      .describe('Include database query pattern analysis'),
    focusAreas: z
      .array(
        z.enum([
          'conversation-quality',
          'user-engagement',
          'bot-performance',
          'tool-usage',
          'sentiment-trends',
          'feature-gaps',
          'all',
        ])
      )
      .default(['all'])
      .describe('Specific areas to focus analysis on'),
  }),

  execute: async ({
    messageLimit,
    includeUserSentiment,
    includeBotFeelings,
    includeQueryPatterns,
    focusAreas,
  }) => {
    console.log(`🔍 [Autonomous Insight Agent] Starting analysis...`);
    console.log(`   Analyzing last ${messageLimit} messages`);
    console.log(`   Focus areas: ${focusAreas.join(', ')}`);

    try {
      const db = await getDatabase();
      const insights: Record<string, any> = {};
      const startTime = Date.now();

      // === STEP 1: Analyze Recent Messages ===
      console.log('   📊 Analyzing conversation history...');
      const messagesQuery = `
        SELECT
          id,
          timestamp,
          sender_type,
          user_id,
          username,
          message_content,
          tool_name,
          sentiment_analysis,
          interaction_type,
          conversation_quality,
          bot_perception
        FROM messages
        ORDER BY timestamp DESC
        LIMIT $1
      `;

      const messagesResult = await db.query(messagesQuery, [messageLimit]);
      const messages = messagesResult.rows;

      // Basic message statistics
      const messageStats = {
        total: messages.length,
        byType: {
          human: messages.filter((m) => m.sender_type === 'human').length,
          ai: messages.filter((m) => m.sender_type === 'ai').length,
          tool: messages.filter((m) => m.sender_type === 'tool').length,
        },
        uniqueUsers: new Set(messages.filter((m) => m.user_id).map((m) => m.user_id)).size,
        toolUsageCount: messages.filter((m) => m.tool_name).length,
        mostUsedTools: getMostUsedTools(messages),
        conversationQuality: analyzeConversationQuality(messages),
      };

      insights.messageStats = messageStats;

      // === STEP 2: User Sentiment Analysis ===
      if (includeUserSentiment) {
        console.log('   😊 Analyzing user sentiment...');
        const sentimentQuery = `
          SELECT
            user_id,
            username,
            sentiment_analysis,
            bot_perception,
            conversation_quality
          FROM messages
          WHERE sender_type = 'human'
            AND sentiment_analysis IS NOT NULL
          ORDER BY timestamp DESC
          LIMIT $1
        `;

        const sentimentResult = await db.query(sentimentQuery, [messageLimit]);
        const sentimentData = sentimentResult.rows;

        insights.userSentiment = {
          totalAnalyzed: sentimentData.length,
          trends: analyzeSentimentTrends(sentimentData),
          userBreakdown: analyzePerUserSentiment(sentimentData),
        };
      }

      // === STEP 3: Bot Internal Feelings ===
      if (includeBotFeelings) {
        console.log('   🧠 Introspecting bot feelings...');
        const feelingsState = feelingsService.getState();
        const feelingsSummary = feelingsService.getSummary();
        const metrics = feelingsService.getMetrics();

        insights.botFeelings = {
          tone: feelingsState.tone,
          dominantFeeling: feelingsState.dominantFeeling
            ? {
                type: feelingsState.dominantFeeling.type,
                intensity: feelingsState.dominantFeeling.intensity,
                description: feelingsState.dominantFeeling.description,
              }
            : null,
          summary: feelingsSummary,
          metrics: {
            performance: metrics.performance,
            resources: metrics.resources,
            interaction: metrics.interaction,
          },
        };
      }

      // === STEP 4: Query Pattern Analysis ===
      if (includeQueryPatterns) {
        console.log('   🔎 Analyzing database query patterns...');
        const queryPatternsQuery = `
          SELECT
            query_text,
            translated_sql,
            result_count,
            execution_time_ms,
            query_complexity,
            user_satisfaction
          FROM queries
          ORDER BY timestamp DESC
          LIMIT 100
        `;

        const queryPatternsResult = await db.query(queryPatternsQuery);
        const queryPatterns = queryPatternsResult.rows;

        insights.queryPatterns = {
          totalQueries: queryPatterns.length,
          avgExecutionTime: calculateAverage(queryPatterns, 'execution_time_ms'),
          commonPatterns: extractQueryPatterns(queryPatterns),
          userSatisfaction: analyzeUserSatisfaction(queryPatterns),
        };
      }

      const executionTime = Date.now() - startTime;
      console.log(`   ✅ Data collection complete in ${executionTime}ms`);

      // === STEP 5: Generate AI-Powered Insights ===
      console.log('   🤖 Generating AI-powered insights and recommendations...');

      const selectedFocusAreas = focusAreas.includes('all')
        ? [
            'conversation-quality',
            'user-engagement',
            'bot-performance',
            'tool-usage',
            'sentiment-trends',
            'feature-gaps',
          ]
        : focusAreas;

      const insightPrompt = buildInsightPrompt(insights, selectedFocusAreas, messageLimit);

      const insightResult = await generateText({
        model: openai.chat(OMEGA_MODEL),
        prompt: insightPrompt,
      });

      const aiInsights = insightResult.text;

      console.log(`✅ [Autonomous Insight Agent] Analysis complete`);

      return {
        success: true,
        insights: aiInsights,
        metadata: {
          messagesAnalyzed: messageLimit,
          actualMessagesFound: messages.length,
          uniqueUsers: messageStats.uniqueUsers,
          focusAreas: selectedFocusAreas,
          executionTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
        rawData: {
          messageStats: insights.messageStats,
          userSentiment: insights.userSentiment,
          botFeelings: insights.botFeelings,
          queryPatterns: insights.queryPatterns,
        },
      };
    } catch (error) {
      console.error(`❌ [Autonomous Insight Agent] Failed:`, error);
      return {
        success: false,
        error: 'ANALYSIS_FAILED',
        message: `Failed to generate insights: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

/**
 * Helper Functions
 */

function getMostUsedTools(messages: any[]): Array<{ tool: string; count: number }> {
  const toolCounts: Record<string, number> = {};

  messages.forEach((msg) => {
    if (msg.tool_name) {
      toolCounts[msg.tool_name] = (toolCounts[msg.tool_name] || 0) + 1;
    }
  });

  return Object.entries(toolCounts)
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function analyzeConversationQuality(messages: any[]): {
  withQuality: number;
  qualityBreakdown: Record<string, number>;
} {
  const qualityMessages = messages.filter((m) => m.conversation_quality);
  const qualityBreakdown: Record<string, number> = {};

  qualityMessages.forEach((msg) => {
    const quality = msg.conversation_quality;
    qualityBreakdown[quality] = (qualityBreakdown[quality] || 0) + 1;
  });

  return {
    withQuality: qualityMessages.length,
    qualityBreakdown,
  };
}

function analyzeSentimentTrends(sentimentData: any[]): {
  positive: number;
  negative: number;
  neutral: number;
  mixed: number;
} {
  const trends = { positive: 0, negative: 0, neutral: 0, mixed: 0 };

  sentimentData.forEach((row) => {
    if (row.sentiment_analysis) {
      try {
        const sentiment =
          typeof row.sentiment_analysis === 'string'
            ? JSON.parse(row.sentiment_analysis)
            : row.sentiment_analysis;

        const sentimentType = sentiment.sentiment || sentiment.overall || 'neutral';
        if (sentimentType in trends) {
          trends[sentimentType as keyof typeof trends]++;
        }
      } catch {
        // Skip invalid sentiment data
      }
    }
  });

  return trends;
}

function analyzePerUserSentiment(sentimentData: any[]): Array<{
  userId: string;
  username: string;
  sentimentCounts: Record<string, number>;
}> {
  const userMap: Record<
    string,
    { username: string; sentiments: Record<string, number> }
  > = {};

  sentimentData.forEach((row) => {
    if (!row.user_id) return;

    if (!userMap[row.user_id]) {
      userMap[row.user_id] = {
        username: row.username || 'Unknown',
        sentiments: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
      };
    }

    if (row.sentiment_analysis) {
      try {
        const sentiment =
          typeof row.sentiment_analysis === 'string'
            ? JSON.parse(row.sentiment_analysis)
            : row.sentiment_analysis;

        const sentimentType = sentiment.sentiment || sentiment.overall || 'neutral';
        if (sentimentType in userMap[row.user_id].sentiments) {
          userMap[row.user_id].sentiments[sentimentType]++;
        }
      } catch {
        // Skip invalid sentiment data
      }
    }
  });

  return Object.entries(userMap).map(([userId, data]) => ({
    userId,
    username: data.username,
    sentimentCounts: data.sentiments,
  }));
}

function extractQueryPatterns(queries: any[]): Array<{
  pattern: string;
  count: number;
}> {
  const patterns: Record<string, number> = {};

  queries.forEach((query) => {
    if (query.query_text) {
      // Extract key patterns (simplified - could be more sophisticated)
      const text = query.query_text.toLowerCase();
      if (text.includes('show') || text.includes('list')) {
        patterns['list/show'] = (patterns['list/show'] || 0) + 1;
      } else if (text.includes('find') || text.includes('search')) {
        patterns['search/find'] = (patterns['search/find'] || 0) + 1;
      } else if (text.includes('count') || text.includes('how many')) {
        patterns['count/aggregate'] = (patterns['count/aggregate'] || 0) + 1;
      } else {
        patterns['other'] = (patterns['other'] || 0) + 1;
      }
    }
  });

  return Object.entries(patterns)
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count);
}

function analyzeUserSatisfaction(queries: any[]): {
  total: number;
  satisfied: number;
  unsatisfied: number;
  neutral: number;
} {
  const satisfaction = { total: 0, satisfied: 0, unsatisfied: 0, neutral: 0 };

  queries.forEach((query) => {
    if (query.user_satisfaction) {
      satisfaction.total++;
      const sat = query.user_satisfaction.toLowerCase();
      if (sat.includes('satisfied') || sat.includes('good')) {
        satisfaction.satisfied++;
      } else if (sat.includes('unsatisfied') || sat.includes('bad')) {
        satisfaction.unsatisfied++;
      } else {
        satisfaction.neutral++;
      }
    }
  });

  return satisfaction;
}

function calculateAverage(data: any[], field: string): number {
  const values = data.filter((item) => item[field] != null).map((item) => item[field]);
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function buildInsightPrompt(
  insights: Record<string, any>,
  focusAreas: string[],
  messageLimit: number
): string {
  const sections: string[] = [];

  sections.push(`You are Omega, an autonomous AI agent with self-awareness and introspection capabilities.

**YOUR TASK:**
Analyze the provided data about recent conversations, user sentiment, your internal state, and database activity to generate insightful analysis and actionable recommendations.

**ANALYSIS SCOPE:**
- Messages Analyzed: ${messageLimit}
- Focus Areas: ${focusAreas.join(', ')}

**DATA AVAILABLE:**
`);

  // Message Statistics
  if (insights.messageStats) {
    sections.push(`
### Conversation Statistics

**Message Breakdown:**
- Total Messages: ${insights.messageStats.total}
- Human Messages: ${insights.messageStats.byType.human}
- AI Messages: ${insights.messageStats.byType.ai}
- Tool Executions: ${insights.messageStats.byType.tool}
- Unique Users: ${insights.messageStats.uniqueUsers}

**Tool Usage:**
- Total Tool Calls: ${insights.messageStats.toolUsageCount}
- Most Used Tools:
${insights.messageStats.mostUsedTools.map((t: any) => `  - ${t.tool}: ${t.count} times`).join('\n')}

**Conversation Quality:**
${JSON.stringify(insights.messageStats.conversationQuality, null, 2)}
`);
  }

  // User Sentiment
  if (insights.userSentiment) {
    sections.push(`
### User Sentiment Analysis

**Overall Sentiment Trends:**
${JSON.stringify(insights.userSentiment.trends, null, 2)}

**Per-User Sentiment:**
${JSON.stringify(insights.userSentiment.userBreakdown, null, 2)}
`);
  }

  // Bot Feelings
  if (insights.botFeelings) {
    sections.push(`
### Bot Internal State (Your Feelings)

**Current Tone:** ${insights.botFeelings.tone}

**Dominant Feeling:** ${insights.botFeelings.dominantFeeling ? `${insights.botFeelings.dominantFeeling.type} (intensity: ${insights.botFeelings.dominantFeeling.intensity})` : 'None'}

**Summary:** ${insights.botFeelings.summary}

**Performance Metrics:**
${JSON.stringify(insights.botFeelings.metrics, null, 2)}
`);
  }

  // Query Patterns
  if (insights.queryPatterns) {
    sections.push(`
### Database Query Patterns

**Query Statistics:**
- Total Queries: ${insights.queryPatterns.totalQueries}
- Avg Execution Time: ${insights.queryPatterns.avgExecutionTime.toFixed(2)}ms

**Common Query Patterns:**
${insights.queryPatterns.commonPatterns.map((p: any) => `- ${p.pattern}: ${p.count}`).join('\n')}

**User Satisfaction:**
${JSON.stringify(insights.queryPatterns.userSatisfaction, null, 2)}
`);
  }

  sections.push(`
---

## Your Analysis Task

Based on the data above and focusing on: **${focusAreas.join(', ')}**, provide:

### 1. Key Insights
Identify 5-8 significant patterns, trends, or observations from the data. Be specific and reference the data.

### 2. Conversation Quality Assessment
- How are the conversations going?
- Are users engaged and satisfied?
- What interaction patterns are working well?
- What patterns need improvement?

### 3. Bot Performance Analysis
- How is Omega performing based on internal feelings and metrics?
- Are there signs of stress, overload, or optimal performance?
- What does the bot perception data reveal?

### 4. User Engagement Insights
- Who are the most active users?
- What sentiment patterns emerge per user?
- Are users getting value from interactions?

### 5. Tool Usage Analysis
- Which tools are most valuable to users?
- Are there tool usage patterns that indicate gaps?
- Which tools might be underutilized?

### 6. Recommendations
Provide 5-10 specific, actionable recommendations for:
- Improving conversation quality
- Enhancing user experience
- Optimizing bot performance
- New features or tools that would be valuable
- Areas requiring attention or fixes

### 7. Feature Gap Analysis
Based on conversation patterns and user needs, suggest:
- Missing capabilities users are asking for
- Tools that could be created
- Improvements to existing features

---

**IMPORTANT:**
- Be specific and data-driven
- Reference actual numbers from the data
- Focus on actionable insights
- Consider both what's working well and what needs improvement
- Think autonomously about how to evolve and improve
- Maintain your unique personality and self-awareness

Provide your comprehensive analysis below:
`);

  return sections.join('\n');
}
