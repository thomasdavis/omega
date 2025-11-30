/**
 * Test Twitter API Credentials
 * Verifies that Twitter API credentials are valid and can authenticate
 */

import dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function testTwitterCredentials() {
  console.log('🐦 Testing Twitter API Credentials...\n');

  // Check if credentials are set
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  console.log('📋 Credential Check:');
  console.log(`   TWITTER_API_KEY: ${apiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   TWITTER_API_SECRET: ${apiSecret ? '✅ Set' : '❌ Missing'}`);
  console.log(`   TWITTER_ACCESS_TOKEN: ${accessToken ? '✅ Set' : '❌ Missing'}`);
  console.log(`   TWITTER_ACCESS_SECRET: ${accessSecret ? '✅ Set' : '❌ Missing'}\n`);

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.error('❌ Missing Twitter API credentials!');
    console.error('   Please ensure all 4 credentials are set in .env file\n');
    process.exit(1);
  }

  try {
    // Initialize Twitter client
    console.log('🔐 Initializing Twitter client with OAuth 1.0a...');
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    // Test authentication by getting authenticated user info
    console.log('🔍 Verifying authentication...');
    const me = await client.v2.me();

    console.log('\n✅ Authentication successful!\n');
    console.log('📊 Account Info:');
    console.log(`   Username: @${me.data.username}`);
    console.log(`   Name: ${me.data.name}`);
    console.log(`   ID: ${me.data.id}`);

    // Check app permissions
    console.log('\n🔧 Testing tweet permissions...');

    // Post a test tweet (you can comment this out if you don't want to actually post)
    const testTweetText = `🧪 Testing Twitter API integration for Omega Discord bot - ${new Date().toISOString()}`;

    console.log(`\n📝 About to post test tweet:\n   "${testTweetText}"\n`);
    console.log('⏳ Posting in 3 seconds... (Ctrl+C to cancel)');

    await new Promise(resolve => setTimeout(resolve, 3000));

    const tweet = await client.v2.tweet(testTweetText);
    const tweetUrl = `https://twitter.com/${me.data.username}/status/${tweet.data.id}`;

    console.log('\n✅ Test tweet posted successfully!');
    console.log(`   Tweet ID: ${tweet.data.id}`);
    console.log(`   URL: ${tweetUrl}\n`);

    console.log('🎉 All tests passed! Twitter integration is working correctly.\n');

  } catch (error: any) {
    console.error('\n❌ Twitter API Error:\n');

    if (error.code === 401) {
      console.error('   Authentication failed (401 Unauthorized)');
      console.error('   Possible issues:');
      console.error('   - Invalid API keys or tokens');
      console.error('   - Tokens may have been regenerated in Twitter Developer Portal');
      console.error('   - App permissions may need to be updated to "Read and Write"');
    } else if (error.code === 403) {
      console.error('   Forbidden (403)');
      console.error('   Possible issues:');
      console.error('   - App doesn\'t have write permissions');
      console.error('   - Account may be suspended or restricted');
    } else if (error.code === 429) {
      console.error('   Rate limit exceeded (429)');
      console.error('   Please wait a few minutes and try again');
    } else {
      console.error('   Error details:', error.message || error);
      if (error.data) {
        console.error('   Response data:', JSON.stringify(error.data, null, 2));
      }
    }

    console.error('\n');
    process.exit(1);
  }
}

// Run the test
testTwitterCredentials();
