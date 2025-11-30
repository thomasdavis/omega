/**
 * Twitter Comic Poster Service
 * Posts generated PR comics to Twitter/X with PR information
 */

import { TwitterApi } from 'twitter-api-v2';
import { Buffer } from 'buffer';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

interface TwitterPostOptions {
  imageData: Buffer;
  prNumber: number;
  prTitle: string;
  prUrl: string;
}

interface TwitterPostResult {
  success: boolean;
  tweetId?: string;
  tweetUrl?: string;
  error?: string;
}

/**
 * Generates a concise, engaging tweet summary for a PR comic
 * @param prTitle - The PR title/branch name
 * @param prNumber - The PR number
 * @returns A short, descriptive summary suitable for tweeting
 */
async function generateTweetSummary(prTitle: string, prNumber: number): Promise<string> {
  try {
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const result = await generateText({
      model: openai('gpt-4.1-mini'),
      prompt: `Generate a concise, engaging tweet title/summary (max 50 characters) for a GitHub PR comic.

PR Title/Branch: ${prTitle}
PR Number: #${prNumber}

Create a brief, appealing description that captures what the PR is about. Make it friendly and engaging for Twitter.
If the PR title is just a branch name like "claude/issue-502-20251130-0533", try to infer what it might be about.
If you can't infer anything specific, use a generic but engaging phrase like "New feature implementation" or "Code improvements".

Return ONLY the summary text, nothing else. No quotes, no extra formatting.`,
      maxTokens: 50,
    });

    const summary = result.text.trim();

    // Ensure it's not too long (leave room for emojis and links)
    if (summary.length > 60) {
      return summary.substring(0, 57) + '...';
    }

    return summary;
  } catch (error) {
    console.warn('⚠️ Failed to generate AI summary, using PR title:', error);
    // Fallback to PR title if AI generation fails
    return prTitle.length > 60 ? prTitle.substring(0, 57) + '...' : prTitle;
  }
}

/**
 * Posts a PR comic to Twitter
 * @param options - Comic and PR information
 * @returns Result with tweet ID and URL if successful
 */
export async function postComicToTwitter(
  options: TwitterPostOptions
): Promise<TwitterPostResult> {
  const { imageData, prNumber, prTitle, prUrl } = options;

  try {
    // Validate required environment variables
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      return {
        success: false,
        error: 'Missing Twitter API credentials. Required: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET',
      };
    }

    // Initialize Twitter client with OAuth 1.0a
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    // Upload media (image)
    console.log('📤 Uploading comic image to Twitter...');
    const mediaId = await client.v1.uploadMedia(imageData, {
      mimeType: 'image/png',
    });
    console.log(`✅ Media uploaded successfully. Media ID: ${mediaId}`);

    // Generate engaging tweet summary
    console.log('🤖 Generating tweet summary...');
    const summary = await generateTweetSummary(prTitle, prNumber);
    console.log(`📝 Generated summary: ${summary}`);

    // Format tweet text with summary
    const tweetText = `🎨 ${summary}\n\n🔗 ${prUrl}\n\n#DevComics #GitHub #OpenSource #AIGenerated`;

    // Create tweet with media
    console.log('📝 Creating tweet with comic...');
    const tweet = await client.v2.tweet({
      text: tweetText,
      media: {
        media_ids: [mediaId],
      },
    });

    const tweetId = tweet.data.id;
    const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;

    console.log(`✅ Tweet posted successfully: ${tweetUrl}`);

    return {
      success: true,
      tweetId,
      tweetUrl,
    };
  } catch (error) {
    console.error('❌ Error posting to Twitter:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
