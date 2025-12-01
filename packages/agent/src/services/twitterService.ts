/**
 * Twitter Service
 * Generic Twitter posting service for tweets with optional media
 */

import { TwitterApi } from 'twitter-api-v2';
import { Buffer } from 'buffer';

interface TweetOptions {
  text: string;
  imageData?: Buffer;
  imageType?: 'image/png' | 'image/jpeg' | 'image/gif';
}

interface TweetResult {
  success: boolean;
  tweetId?: string;
  tweetUrl?: string;
  error?: string;
}

/**
 * Posts a tweet to Twitter
 * @param options - Tweet content and optional media
 * @returns Result with tweet ID and URL if successful
 */
export async function postTweet(options: TweetOptions): Promise<TweetResult> {
  const { text, imageData, imageType = 'image/png' } = options;

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

    let mediaId: string | undefined;

    // Upload media if provided
    if (imageData) {
      console.log('📤 Uploading media to Twitter...');
      mediaId = await client.v1.uploadMedia(imageData, {
        mimeType: imageType,
      });
      console.log(`✅ Media uploaded successfully. Media ID: ${mediaId}`);
    }

    // Create tweet
    console.log('📝 Creating tweet...');
    const tweetData: any = { text };

    if (mediaId) {
      tweetData.media = { media_ids: [mediaId] };
    }

    const tweet = await client.v2.tweet(tweetData);

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
