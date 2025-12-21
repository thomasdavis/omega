# Val Town Discord Bookmarks Integration

This directory contains Val Town code examples for the Discord link bookmark system.

## Overview

The Omega bot now automatically extracts links from Discord messages and sends them to a Val Town webhook. This allows you to build a searchable bookmark UI hosted on Val Town without modifying the Omega database.

## Quick Start

### 1. Set Up the Webhook Receiver Val

Create a new HTTP Val on [Val Town](https://val.town) with the code from `webhook-receiver.ts`.

This val will:
- Receive bookmark data from the Discord bot
- Store links in Val Town's built-in SQLite storage
- Return success/error responses

### 2. Set Up the Bookmarks UI Val

Create a new HTTP Val with the code from `bookmarks-ui.tsx`.

This val will:
- Display all saved bookmarks in a searchable table
- Allow filtering by user, channel, or link content
- Provide a clean, responsive interface

### 3. Configure the Discord Bot

Add your Val Town webhook URL to the environment variables:

```bash
# In Railway or your .env file
VAL_TOWN_WEBHOOK_URL=https://yourusername-bookmarkswebhook.web.val.run
```

Replace `yourusername` with your Val Town username and the val name with whatever you named your webhook receiver val.

### 4. Deploy and Test

1. Deploy your vals on Val Town
2. Set the webhook URL in Railway
3. Post a message with a link in Discord
4. Check your bookmarks UI to see the link appear!

## Architecture

```
Discord Message (with links)
    ↓
Omega Bot (apps/bot/src/handlers/messageHandler.ts)
    ↓
Extract Links (apps/bot/src/utils/valTownBookmarks.ts)
    ↓
POST to Val Town Webhook
    ↓
Val Town Webhook Receiver (webhook-receiver.ts)
    ↓
Store in Val Town SQLite
    ↓
Display in Bookmarks UI (bookmarks-ui.tsx)
```

## Features

- **Automatic Link Extraction**: Bot automatically detects and extracts all HTTP/HTTPS URLs
- **Non-blocking**: Webhook calls don't slow down Discord bot responses
- **Error Resilient**: Val Town failures don't break the bot
- **Rich Metadata**: Stores user, channel, timestamp, and message context
- **Searchable UI**: Full-text search across all bookmark data

## Customization

You can customize the vals to:
- Add link deduplication
- Integrate with other APIs (OpenGraph, screenshots, etc.)
- Add tagging or categorization
- Export to other services
- Add authentication/privacy controls

## Val Town Resources

- [Val Town Docs](https://docs.val.town)
- [Val Town Use Cases](https://www.val.town/explore/use-cases)
- [Val Town SQLite Docs](https://docs.val.town/std/sqlite/)
- [Val Town HTTP Vals](https://docs.val.town/types/http/)

## Troubleshooting

### Links not appearing in UI

1. Check that `VAL_TOWN_WEBHOOK_URL` is set correctly
2. Verify your webhook receiver val is deployed and public
3. Check Discord bot logs for webhook errors
4. Test webhook manually with curl:

```bash
curl -X POST https://yourusername-bookmarkswebhook.web.val.run \
  -H "Content-Type: application/json" \
  -d '{
    "links": ["https://example.com"],
    "user": {"id": "123", "username": "test"},
    "channel": {"id": "456", "name": "general"},
    "message": {
      "id": "789",
      "content": "Check out https://example.com",
      "timestamp": "2025-12-21T09:00:00Z"
    }
  }'
```

### Webhook timeouts

- The Discord bot has a 5-second timeout for webhook calls
- If your webhook is slow, consider using Val Town's background jobs
- Keep webhook logic simple and fast

### SQLite storage limits

- Val Town SQLite has storage limits depending on your plan
- Monitor your database size in the Val Town dashboard
- Consider archiving old bookmarks or using external storage for large datasets
