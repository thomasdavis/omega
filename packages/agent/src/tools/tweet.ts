/**
 * Tweet Tool - Post tweets to Twitter/X
 * Allows Omega to compose and post tweets with optional media
 * Includes comprehensive audit logging
 */

import { tool } from 'ai';
import { z } from 'zod';
import { postTweet } from '../services/twitterService.js';
import { logTweet, updateTweetLog } from '@repo/database';

export const tweetTool = tool({
  description: `Post a tweet to Twitter/X on behalf of a user who explicitly requested it. Compose witty, engaging tweets based on the user's request.
  Be funny when appropriate, but stay true to Omega's philosophical personality.
  Include relevant links when available (GitHub repos, Discord server, etc.).
  Keep tweets under 280 characters. Do NOT use hashtags or emoji - plain text only.

  IMPORTANT: Only use this when a user explicitly asks you to post a tweet. All tweets are logged for audit purposes.`,
  inputSchema: z.object({
    tweetText: z
      .string()
      .max(280)
      .describe('The tweet content (max 280 characters). Be clever, funny when appropriate, and include relevant links. No hashtags or emoji.'),
    reasoning: z
      .string()
      .optional()
      .describe('Brief explanation of why this tweet text was chosen (not posted, just for tracking)'),
    userId: z
      .string()
      .optional()
      .describe('Discord user ID who requested this tweet (for audit logging)'),
    username: z
      .string()
      .optional()
      .describe('Discord username who requested this tweet (for audit logging)'),
    channelId: z
      .string()
      .optional()
      .describe('Discord channel ID where the request was made (for audit logging)'),
    channelName: z
      .string()
      .optional()
      .describe('Discord channel name where the request was made (for audit logging)'),
    guildId: z
      .string()
      .optional()
      .describe('Discord guild ID where the request was made (for audit logging)'),
    messageId: z
      .string()
      .optional()
      .describe('Discord message ID of the request (for audit logging)'),
  }),
  execute: async ({
    tweetText,
    reasoning,
    userId,
    username,
    channelId,
    channelName,
    guildId,
    messageId
  }) => {
    // Default userId and username if not provided (for backwards compatibility)
    const effectiveUserId = userId || 'system';
    const effectiveUsername = username || 'omega-bot';

    // Log the tweet attempt to database
    let logId: number | undefined;
    try {
      logId = await logTweet({
        userId: effectiveUserId,
        username: effectiveUsername,
        tweetContent: tweetText,
        status: 'pending',
        channelId,
        channelName,
        guildId,
        messageId,
        requestType: 'manual',
        metadata: {
          reasoning,
          requestedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log tweet attempt:', error);
      // Continue even if logging fails
    }

    try {
      // Check if Twitter credentials are configured
      if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_ACCESS_TOKEN) {
        const errorMessage = 'Twitter API credentials not configured. Cannot post tweet.';

        // Update log with failure if we have a logId
        if (logId!) {
          try {
            await updateTweetLog(logId, {
              status: 'failed',
              errorMessage,
            });
          } catch (err) {
            console.error('Failed to update tweet log:', err);
          }
        }

        return {
          success: false,
          error: errorMessage,
          tweetText,
        };
      }

      console.log('🐦 Posting tweet to Twitter...');
      if (reasoning) {
        console.log(`📝 Reasoning: ${reasoning}`);
      }
      console.log(`👤 Requested by: ${effectiveUsername} (${effectiveUserId})`);

      // Post the tweet
      const result = await postTweet({
        text: tweetText,
      });

      if (result.success) {
        // Update log with success
        if (logId!) {
          try {
            await updateTweetLog(logId, {
              tweetId: result.tweetId,
              tweetUrl: result.tweetUrl,
              status: 'success',
            });
          } catch (err) {
            console.error('Failed to update tweet log:', err);
          }
        }

        return {
          success: true,
          tweetText,
          tweetUrl: result.tweetUrl,
          tweetId: result.tweetId,
          logId,
          message: `Tweet posted successfully! View it at: ${result.tweetUrl}`,
        };
      } else {
        // Update log with failure
        if (logId!) {
          try {
            await updateTweetLog(logId, {
              status: 'failed',
              errorMessage: result.error,
            });
          } catch (err) {
            console.error('Failed to update tweet log:', err);
          }
        }

        return {
          success: false,
          error: result.error || 'Failed to post tweet',
          tweetText,
          logId,
        };
      }
    } catch (error) {
      console.error('❌ Error in tweet tool:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update log with failure
      if (logId!) {
        try {
          await updateTweetLog(logId, {
            status: 'failed',
            errorMessage,
          });
        } catch (err) {
          console.error('Failed to update tweet log:', err);
        }
      }

      return {
        success: false,
        error: errorMessage,
        tweetText,
        logId,
      };
    }
  },
});
