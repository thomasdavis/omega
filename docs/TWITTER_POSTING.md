# Twitter Posting Feature

This document describes the Twitter posting capability that allows the Omega bot to post arbitrary tweets on behalf of users who request them.

## Overview

The bot can now post any tweet that a user explicitly requests via Discord. All tweets are logged to the database for audit and moderation purposes.

## How It Works

### User Experience

Users can request tweets by simply asking the bot in Discord:
- "Can you tweet 'Hello World'?"
- "Post a tweet about our new feature"
- "Tweet something funny about programming"

The bot will compose and post the tweet, then respond with a link to the posted tweet.

### Architecture

1. **Tweet Tool** (`packages/agent/src/tools/tweet.ts`)
   - AI SDK v6 tool that handles tweet posting
   - Accepts optional Discord context (userId, username, channelId, etc.)
   - Integrates with database audit logging

2. **Twitter Service** (`packages/agent/src/services/twitterService.ts`)
   - Generic Twitter posting service
   - Uses `twitter-api-v2` library with OAuth 1.0a
   - Handles media uploads (images)

3. **Tweet Log Service** (`packages/database/src/postgres/tweetLogService.ts`)
   - Database service for tweet audit trail
   - Tracks all tweet attempts (success and failures)
   - Stores Discord context and metadata

4. **Database Table** (`tweet_logs`)
   - Comprehensive audit trail
   - Stores: user info, tweet content, Twitter response, timestamps
   - Includes moderation flags and error tracking

## Database Schema

```sql
CREATE TABLE tweet_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  tweet_content TEXT NOT NULL,
  tweet_id VARCHAR(255),
  tweet_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  channel_id VARCHAR(255),
  channel_name VARCHAR(255),
  guild_id VARCHAR(255),
  message_id VARCHAR(255),
  request_type VARCHAR(50) DEFAULT 'manual',
  metadata JSONB,
  moderation_flags JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Setup Instructions

### 1. Run Database Migration

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-tweet-logs-table.sh'
```

### 2. Update Prisma Schema

After the migration is complete, update the Prisma schema:

```bash
cd packages/database
pnpm prisma db pull
pnpm prisma generate
```

### 3. Configure Twitter API Credentials

Ensure the following environment variables are set in Railway:

- `TWITTER_API_KEY` (Consumer Key)
- `TWITTER_API_SECRET` (Consumer Secret)
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_SECRET`

These credentials can be obtained from the [Twitter Developer Portal](https://developer.twitter.com/).

## Usage Examples

### Basic Tweet Request

User: "Can you tweet 'Hello from Omega bot!'"

Bot: Posts the tweet and responds with the Twitter URL

### Tweet with Context

The bot automatically captures Discord context:
- User ID and username who requested it
- Channel and guild information
- Message ID for traceability

### Audit Log Query

Query recent tweets:
```typescript
import { getRecentTweetLogs } from '@repo/database';

const recentTweets = await getRecentTweetLogs(50);
```

Query tweets by user:
```typescript
import { getUserTweetLogs } from '@repo/database';

const userTweets = await getUserTweetLogs('user_discord_id', 10);
```

Get user tweet statistics:
```typescript
import { getUserTweetStats } from '@repo/database';

const stats = await getUserTweetStats('user_discord_id');
// Returns: { total, successful, failed, pending }
```

## Content Moderation

The tweet tool includes basic content moderation:
- Character limit enforcement (280 characters)
- Sensitive information detection (passwords, API keys, etc.)
- All tweets logged with moderation flags if needed

## Compliance

- **Audit Trail**: All tweet attempts are logged with full context
- **User Attribution**: Every tweet is associated with the requesting user
- **Error Tracking**: Failed attempts are logged with error messages
- **Timestamp Tracking**: Created and updated timestamps for all records

## Existing Integration

This feature extends the existing comic tweet automation:
- Comic tweets continue to work via GitHub Actions
- Same Twitter API credentials are used
- Separate `request_type` field distinguishes manual vs automated tweets

## API Reference

### Tweet Tool Parameters

```typescript
{
  tweetText: string;        // Required: The tweet content (max 280 chars)
  reasoning?: string;       // Optional: Why this tweet was composed
  userId?: string;          // Optional: Discord user ID
  username?: string;        // Optional: Discord username
  channelId?: string;       // Optional: Discord channel ID
  channelName?: string;     // Optional: Discord channel name
  guildId?: string;         // Optional: Discord guild ID
  messageId?: string;       // Optional: Discord message ID
}
```

### Database Service Functions

- `logTweet(params)` - Create a new tweet log entry
- `updateTweetLog(id, updates)` - Update an existing log entry
- `queryTweetLogs(options)` - Query logs with filters
- `getUserTweetLogs(userId, limit)` - Get tweets by user
- `getRecentTweetLogs(limit)` - Get recent tweets
- `countTweetLogs(options)` - Count tweets with filters
- `searchTweetLogs(searchTerm, limit)` - Search tweet content
- `getUserTweetStats(userId)` - Get user statistics

## Future Enhancements

Potential improvements:
- Advanced content moderation with AI
- Rate limiting per user
- Scheduled tweets
- Tweet templates
- Image/media support in tool
- Twitter thread support
- Retweet and quote tweet functionality
