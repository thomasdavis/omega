/**
 * Evolution Observer
 * Collects data about the past 24 hours of operation
 */

import { queryMessages } from '@repo/database';
import type { ObservationData } from './types.js';

/**
 * Observe the last 24 hours of interactions and internal signals
 */
export async function observe(): Promise<ObservationData> {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // Collect message data
  const messages = await queryMessages({
    start_time: oneDayAgo,
    end_time: now,
    limit: 10000,
  });

  // Analyze message volume and topics
  const messageVolume = messages.length;
  const topics = extractTopics(messages);
  const errors = extractErrors(messages);
  const toolUsage = extractToolUsage(messages);
  const failures = extractFailures(messages);

  // Query internal feelings - simplified for Phase 0
  // In future phases, this would query user_feelings table or use introspection service
  const feelings = {
    satisfaction: 0.7,
    confusion: 0.2,
    concern: 0.1,
    fatigue: 0.3,
  };

  return {
    messageVolume,
    topics,
    errors,
    toolUsage,
    failures,
    feelings,
  };
}

/**
 * Extract topics from messages using simple keyword analysis
 */
function extractTopics(messages: Array<{ content?: string }>): string[] {
  const topicKeywords = [
    'github',
    'database',
    'discord',
    'image',
    'music',
    'error',
    'feature',
    'bug',
    'performance',
    'test',
    'deploy',
    'api',
  ];

  const topicCounts = new Map<string, number>();

  for (const msg of messages) {
    const content = msg.content?.toLowerCase() || '';
    for (const keyword of topicKeywords) {
      if (content.includes(keyword)) {
        topicCounts.set(keyword, (topicCounts.get(keyword) || 0) + 1);
      }
    }
  }

  // Return top 5 topics
  return Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
}

/**
 * Extract error messages
 */
function extractErrors(messages: Array<{ content?: string; role?: string }>): string[] {
  const errors: string[] = [];

  for (const msg of messages) {
    const content = msg.content || '';
    if (
      content.toLowerCase().includes('error') ||
      content.toLowerCase().includes('failed') ||
      content.toLowerCase().includes('exception')
    ) {
      // Extract first 200 chars as error summary
      errors.push(content.substring(0, 200));
    }
  }

  return errors.slice(0, 10); // Return up to 10 recent errors
}

/**
 * Extract tool usage statistics
 */
function extractToolUsage(messages: Array<{ tool_name?: string }>): Record<string, number> {
  const usage: Record<string, number> = {};

  for (const msg of messages) {
    if (msg.tool_name) {
      usage[msg.tool_name] = (usage[msg.tool_name] || 0) + 1;
    }
  }

  return usage;
}

/**
 * Extract failure patterns
 */
function extractFailures(messages: Array<{ content?: string }>): string[] {
  const failures: string[] = [];

  const failurePatterns = [
    /failed to/i,
    /cannot/i,
    /unable to/i,
    /timeout/i,
    /rate limit/i,
  ];

  for (const msg of messages) {
    const content = msg.content || '';
    for (const pattern of failurePatterns) {
      if (pattern.test(content)) {
        failures.push(content.substring(0, 150));
        break;
      }
    }
  }

  return failures.slice(0, 10);
}
