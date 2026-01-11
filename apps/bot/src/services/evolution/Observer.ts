/**
 * Evolution Engine - Observer Service
 * Collects data from the last 24h: messages, tool usage, errors, and internal feelings
 */

import { queryMessages } from '@repo/database';

export interface ObservationData {
  messageVolume: number;
  userCount: number;
  topTopics: string[];
  toolUsage: Record<string, number>;
  errorCount: number;
  commonErrors: string[];
  averageSentiment: number;
  feelings: {
    confusion: number;
    concern: number;
    fatigue: number;
    satisfaction: number;
  };
}

/**
 * Observe interactions and signals from the last 24 hours
 */
export async function observe(): Promise<ObservationData> {
  console.log('🔍 Observer: Collecting last 24h data...');

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // Query messages from last 24h
  const messages = await queryMessages({
    timestampFrom: oneDayAgo.toString(),
    timestampTo: now.toString(),
    limit: 10000, // Get all recent messages
  });

  console.log(`   Found ${messages.length} messages in last 24h`);

  // Analyze message volume and users
  const userIds = new Set<string>();
  const topics = new Map<string, number>();
  const toolUsage = new Map<string, number>();
  const errors: string[] = [];
  let totalSentiment = 0;
  let sentimentCount = 0;

  for (const msg of messages) {
    // Track unique users
    if (msg.userId) {
      userIds.add(msg.userId);
    }

    // Track tool usage
    if (msg.toolName) {
      toolUsage.set(msg.toolName, (toolUsage.get(msg.toolName) || 0) + 1);
    }

    // Track errors
    if (msg.error) {
      errors.push(msg.error);
    }

    // Track sentiment if available
    if (msg.sentimentAnalysis && typeof msg.sentimentAnalysis === 'object') {
      const sentiment = (msg.sentimentAnalysis as any).sentiment;
      if (sentiment) {
        // Map sentiment to numeric value
        const sentimentValue = sentiment === 'positive' ? 1 : sentiment === 'negative' ? -1 : 0;
        totalSentiment += sentimentValue;
        sentimentCount++;
      }
    }
  }

  // Extract top topics (simple keyword extraction from content)
  const topTopicsArray = extractTopTopics(messages.map(m => m.content).join(' '));

  // Calculate average sentiment
  const averageSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0;

  // Simulate internal feelings based on observed data
  // In a real implementation, these would come from introspectFeelings tool
  const feelings = calculateFeelings({
    messageVolume: messages.length,
    errorCount: errors.length,
    averageSentiment,
  });

  console.log(`   Users: ${userIds.size}, Topics: ${topTopicsArray.length}, Errors: ${errors.length}`);

  return {
    messageVolume: messages.length,
    userCount: userIds.size,
    topTopics: topTopicsArray,
    toolUsage: Object.fromEntries(toolUsage),
    errorCount: errors.length,
    commonErrors: findCommonErrors(errors),
    averageSentiment,
    feelings,
  };
}

/**
 * Extract top topics from message content (simple keyword extraction)
 */
function extractTopTopics(text: string): string[] {
  // Simple implementation: extract common technical terms
  const keywords = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const frequency = new Map<string, number>();

  // Filter out common words
  const stopWords = new Set([
    'that', 'this', 'with', 'from', 'have', 'will', 'would', 'could', 'should',
    'about', 'make', 'when', 'what', 'where', 'which', 'there', 'their', 'they',
  ]);

  for (const word of keywords) {
    if (!stopWords.has(word)) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }
  }

  // Sort by frequency and take top 10
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Find common error patterns
 */
function findCommonErrors(errors: string[]): string[] {
  if (errors.length === 0) return [];

  const errorPatterns = new Map<string, number>();

  for (const error of errors) {
    // Extract error type (first line or first 50 chars)
    const pattern = error.split('\n')[0].substring(0, 50);
    errorPatterns.set(pattern, (errorPatterns.get(pattern) || 0) + 1);
  }

  // Return top 5 error patterns
  return Array.from(errorPatterns.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pattern, count]) => `${pattern} (${count}x)`);
}

/**
 * Calculate internal feelings based on observations
 * TODO: Replace with actual introspectFeelings tool integration
 */
function calculateFeelings(params: {
  messageVolume: number;
  errorCount: number;
  averageSentiment: number;
}): ObservationData['feelings'] {
  const { messageVolume, errorCount, averageSentiment } = params;

  // Simple heuristics for now
  const confusion = errorCount > 10 ? Math.min(errorCount / 20, 1) : 0;
  const concern = errorCount > 5 ? Math.min(errorCount / 15, 1) : 0;
  const fatigue = messageVolume > 100 ? Math.min(messageVolume / 500, 1) : 0;
  const satisfaction = Math.max(0, Math.min(1, (averageSentiment + 1) / 2));

  return {
    confusion: Math.round(confusion * 100) / 100,
    concern: Math.round(concern * 100) / 100,
    fatigue: Math.round(fatigue * 100) / 100,
    satisfaction: Math.round(satisfaction * 100) / 100,
  };
}
