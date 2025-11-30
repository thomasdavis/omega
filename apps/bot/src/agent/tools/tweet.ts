/**
 * Tweet Tool - Post tweets to Twitter/X
 * Allows Omega to compose and post tweets with optional media
 */

import { tool } from 'ai';
import { z } from 'zod';
import { postTweet } from '../../services/twitterService.js';

export const tweetTool = tool({
  description: `Post a tweet to Twitter/X. Compose witty, engaging tweets based on the user's request.
  Be funny when appropriate, but stay true to Omega's philosophical personality.
  Include relevant links when available (GitHub repos, Discord server, etc.).
  Keep tweets under 280 characters. Use hashtags strategically (2-3 max).`,
  inputSchema: z.object({
    tweetText: z
      .string()
      .max(280)
      .describe('The tweet content (max 280 characters). Be clever, funny when appropriate, and include relevant links.'),
    reasoning: z
      .string()
      .optional()
      .describe('Brief explanation of why this tweet text was chosen (not posted, just for tracking)'),
  }),
  execute: async ({ tweetText, reasoning }) => {
    try {
      // Check if Twitter credentials are configured
      if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_ACCESS_TOKEN) {
        return {
          success: false,
          error: 'Twitter API credentials not configured. Cannot post tweet.',
          tweetText,
        };
      }

      console.log('🐦 Posting tweet to Twitter...');
      if (reasoning) {
        console.log(`📝 Reasoning: ${reasoning}`);
      }

      // Post the tweet
      const result = await postTweet({
        text: tweetText,
      });

      if (result.success) {
        return {
          success: true,
          tweetText,
          tweetUrl: result.tweetUrl,
          tweetId: result.tweetId,
          message: `Tweet posted successfully! View it at: ${result.tweetUrl}`,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to post tweet',
          tweetText,
        };
      }
    } catch (error) {
      console.error('❌ Error in tweet tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        tweetText,
      };
    }
  },
});
