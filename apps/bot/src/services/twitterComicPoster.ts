/**
 * Twitter Comic Poster Service
 * Posts generated PR comics to Twitter/X with PR information
 */

import { TwitterApi } from 'twitter-api-v2';
import { Buffer } from 'buffer';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

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
 * Generates an engaging, concise tweet summary for a PR
 * @param prTitle - The PR title (may be a branch name or description)
 * @param prNumber - The PR number
 * @returns A friendly, engaging summary (max 60 chars) or the original title if generation fails
 */
async function generateTweetSummary(prTitle: string, prNumber: number): Promise<string> {
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.log('ℹ️ OPENAI_API_KEY not set, using PR title directly for tweet');
    return prTitle.substring(0, 60);
  }

  try {
    const prompt = `Generate a very short, engaging tweet summary (max 60 characters) for this GitHub PR:

PR #${prNumber}: ${prTitle}

Requirements:
- Maximum 60 characters
- Engaging and descriptive
- No hashtags or emojis
- Focus on what the PR does, not technical branch names
- If the title is a branch name like "claude/issue-502-20251130-0533", create a meaningful description instead

Return ONLY the summary text, nothing else.`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.7,
    });

    // Trim and limit to 60 chars
    const summary = text.trim().substring(0, 60);
    console.log(`✨ Generated tweet summary: "${summary}"`);
    return summary;
  } catch (error) {
    console.warn('⚠️ Failed to generate tweet summary, using PR title:', error);
    // Fallback to original title, truncated if needed
    return prTitle.substring(0, 60);
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

    // Generate engaging tweet summary
    console.log('✨ Generating tweet summary...');
    const tweetSummary = await generateTweetSummary(prTitle, prNumber);

    // Upload media (image)
    console.log('📤 Uploading comic image to Twitter...');
    const mediaId = await client.v1.uploadMedia(imageData, {
      mimeType: 'image/png',
    });
    console.log(`✅ Media uploaded successfully. Media ID: ${mediaId}`);

    // Format tweet text with AI-generated summary
    const tweetText = `🎨 ${tweetSummary}\n\n🔗 ${prUrl}\n\n#DevComics #GitHub #OpenSource #AIGenerated`;

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
