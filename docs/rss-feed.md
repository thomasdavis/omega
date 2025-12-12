# RSS Feed Feature

## Overview

The RSS feed feature provides an intelligent, AI-summarized feed of Discord messages and links posted in the Omega server. Messages are automatically summarized using OpenAI's GPT-4, and duplicate summaries are prevented by storing processed messages in the database.

## Database Schema

### Table: `rss_feed_items`

Stores summarized Discord messages for RSS feed generation.

```sql
CREATE TABLE rss_feed_items (
  id TEXT PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE NOT NULL,
  summary TEXT NOT NULL,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX rss_feed_items_message_id_key ON rss_feed_items(message_id);
CREATE INDEX idx_rss_message_id ON rss_feed_items(message_id);
CREATE INDEX idx_rss_created_at ON rss_feed_items(created_at DESC);
```

**Fields:**
- `id` - UUID primary key
- `message_id` - Discord message ID (unique constraint prevents duplicates)
- `summary` - AI-generated summary of the message
- `link` - First URL found in the message (if any)
- `created_at` - Timestamp when RSS item was created

## API Endpoints

### GET /api/rss

Generates an RSS feed from stored feed items.

**Query Parameters:**
- `limit` (optional) - Number of items to include (default: 50, max: 100)
- `generate` (optional) - If 'true', processes new Discord messages before generating feed (default: false)

**Examples:**

```bash
# Get RSS feed with default settings
curl https://omega-app.railway.app/api/rss

# Get feed with 100 items
curl https://omega-app.railway.app/api/rss?limit=100

# Generate new summaries and return feed
curl https://omega-app.railway.app/api/rss?generate=true
```

**Response:**
- Content-Type: `application/rss+xml`
- Cache-Control: `public, s-maxage=3600, stale-while-revalidate=7200`

## How It Works

### 1. Message Processing

When `generate=true` is passed:

1. Fetches the 50 most recent human messages from Discord
2. For each message:
   - Checks if it already exists in `rss_feed_items` (by `message_id`)
   - If new:
     - Uses existing AI summary from message analysis, or generates new one
     - Extracts first URL from message content (if any)
     - Saves to `rss_feed_items` table
   - If duplicate: skips

### 2. RSS Feed Generation

1. Fetches feed items from database (ordered by newest first)
2. Builds RSS feed with:
   - Title: First 100 characters of summary
   - Description: Full summary
   - URL: Extracted link, or fallback to message URL
   - GUID: RSS item UUID
   - Date: Creation timestamp

### 3. Duplicate Prevention

The `message_id` field has a UNIQUE constraint, preventing the same Discord message from being processed multiple times. The `saveRssFeedItem` function returns `null` if a duplicate is detected (PostgreSQL error code 23505).

## Database Service

### Functions

Located in `packages/database/src/postgres/rssService.ts`:

#### `saveRssFeedItem(input: CreateRssFeedItemInput): Promise<RssFeedItemRecord | null>`

Saves a new RSS feed item. Returns `null` if `message_id` already exists.

```typescript
const item = await saveRssFeedItem({
  messageId: 'discord-message-id-123',
  summary: 'User discusses new feature ideas for the bot',
  link: 'https://example.com/feature-docs'
});
```

#### `rssFeedItemExists(messageId: string): Promise<boolean>`

Checks if an RSS item already exists for a message.

```typescript
const exists = await rssFeedItemExists('discord-message-id-123');
```

#### `listRssFeedItems(limit?: number, offset?: number): Promise<RssFeedItemRecord[]>`

Lists RSS feed items, ordered by newest first.

```typescript
const items = await listRssFeedItems(50, 0);
```

#### `getRssFeedItemByMessageId(messageId: string): Promise<RssFeedItemRecord | null>`

Gets a specific RSS item by Discord message ID.

#### `getRssFeedItemCount(): Promise<number>`

Returns total count of RSS feed items.

#### `deleteRssFeedItem(messageId: string): Promise<boolean>`

Deletes an RSS item by message ID.

## Migration

### Running the Migration

The migration script is located at `packages/database/scripts/create-rss-feed-items-table.sh`.

**On Railway:**

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-rss-feed-items-table.sh'
```

**Locally:**

```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
bash packages/database/scripts/create-rss-feed-items-table.sh
```

### After Migration

Update the Prisma schema to match production:

```bash
cd packages/database
pnpm prisma db pull
pnpm prisma generate
```

## Usage Examples

### Subscribe to RSS Feed

Add this URL to your RSS reader:
```
https://omega-app.railway.app/api/rss
```

### Trigger Summary Generation

To process new Discord messages and generate summaries:
```bash
curl "https://omega-app.railway.app/api/rss?generate=true"
```

This can be automated with a cron job or GitHub Actions workflow.

### Integration with Discord Bot

You could extend the Discord bot to automatically create RSS items when interesting messages are posted:

```typescript
import { saveRssFeedItem } from '@repo/database';
import { generateMessageSummary } from '@repo/shared';

// In message handler
if (shouldIncludeInRss(message)) {
  const summary = await generateMessageSummary(message.content);
  await saveRssFeedItem({
    messageId: message.id,
    summary: `${message.author.username}: ${summary}`,
    link: extractFirstUrl(message.content)
  });
}
```

## Caching

The RSS feed includes cache headers:
- `s-maxage=3600` - CDN can cache for 1 hour
- `stale-while-revalidate=7200` - Serve stale content for 2 hours while revalidating

This reduces load on the database and AI API while keeping the feed reasonably fresh.

## Future Enhancements

Potential improvements:
1. **Channel Filtering** - Allow filtering by Discord channel (`/api/rss/channel/general`)
2. **User Filtering** - RSS feed for specific users (`/api/rss/user/:userId`)
3. **Automatic Generation** - Scheduled job to run `generate=true` every hour
4. **Rich Media** - Include embedded images, videos, and link previews
5. **Categories** - Categorize items by topic using AI classification
6. **Search** - Full-text search within RSS items
7. **Analytics** - Track which RSS items get the most engagement
