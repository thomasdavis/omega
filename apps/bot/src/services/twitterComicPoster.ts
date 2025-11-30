/**
 * Twitter Comic Poster Service
 * Posts generated PR comics to Twitter/X with PR information
 */

import { TwitterApi } from 'twitter-api-v2';
import { Buffer } from 'buffer';

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
 * Posts a PR comic to Twitter
 * @param options - Comic and PR information
 * @returns Result with tweet ID and URL if successful
 */
export async function postComicToTwitter(
  options: TwitterPostOptions
): Promise<TwitterPostResult> {
  const { imageData, prNumber: _prNumber, prTitle, prUrl } = options;

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

    // Format tweet text
    const tweetText = `🎨 ${prTitle}\n\n🔗 ${prUrl}\n\n#DevComics #GitHub #OpenSource #AIGenerated`;

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
