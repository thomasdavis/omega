/**
 * Build Failure Issue Service
 * Automatically creates GitHub issues when build failure messages are detected in Discord
 */

import type { Message } from 'discord.js';
import { hasIssueForMessage, recordBuildFailureIssue } from '@repo/database';
import { processRailwayError, type ErrorContext } from './githubIssueService.js';

/**
 * Process a Discord message that contains a build failure and create a GitHub issue
 */
export async function handleBuildFailureMessage(message: Message): Promise<void> {
  try {
    console.log(`🔍 Processing potential build failure message from ${message.author.tag}`);

    // Check if we've already created an issue for this message
    const alreadyProcessed = await hasIssueForMessage(message.id);
    if (alreadyProcessed) {
      console.log(`   ⏭️  Issue already exists for message ${message.id}, skipping`);
      return;
    }

    // Extract error context from the Discord message
    const errorContext: ErrorContext = {
      errorMessage: message.content,
      timestamp: message.createdAt.toISOString(),
      environment: 'discord',
      railwayService: extractRailwayService(message.content),
      logContext: [
        `Discord User: ${message.author.tag}`,
        `Channel: ${message.channel.id}`,
        `Message ID: ${message.id}`,
      ],
    };

    // Extract stack trace if present
    const stackTrace = extractStackTrace(message.content);
    if (stackTrace) {
      errorContext.stackTrace = stackTrace;
    }

    console.log(`   🚀 Creating GitHub issue for build failure...`);

    // Create or update GitHub issue using existing service
    const result = await processRailwayError(errorContext);

    console.log(
      `   ✅ ${result.wasNewIssue ? 'Created' : 'Updated'} issue #${result.issueNumber}: ${result.issueUrl}`
    );

    // Record in database to prevent duplicate issues
    await recordBuildFailureIssue({
      discordMessageId: message.id,
      channelId: message.channel.id,
      issueNumber: result.issueNumber,
      messageSnippet: message.content.substring(0, 500),
    });

    console.log(`   📝 Recorded build failure issue in database`);
  } catch (error) {
    console.error(`❌ Failed to process build failure message:`, error);
    // Don't throw - we don't want to break message handling if issue creation fails
  }
}

/**
 * Extract Railway service name from message content if mentioned
 */
function extractRailwayService(content: string): string | undefined {
  // Look for common Railway service mentions
  const servicePatterns = [
    /service[:\s]+([a-zA-Z0-9-_]+)/i,
    /railway[:\s]+([a-zA-Z0-9-_]+)/i,
    /deployment[:\s]+([a-zA-Z0-9-_]+)/i,
  ];

  for (const pattern of servicePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Extract stack trace from message content
 */
function extractStackTrace(content: string): string | undefined {
  // Look for common stack trace patterns
  const stackTracePatterns = [
    // Standard stack trace format
    /(?:at\s+.+\(.+:\d+:\d+\)[\s\S]*)+/,
    // Error with stack trace
    /Error:[\s\S]+(?:at\s+.+\(.+:\d+:\d+\)[\s\S]*)+/,
    // Code blocks containing stack traces
    /```[\s\S]*?(?:at\s+.+\(.+:\d+:\d+\)[\s\S]*)+```/,
  ];

  for (const pattern of stackTracePatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return undefined;
}
