# Val Town Discord Bookmarks - Setup Guide

## Step-by-Step Setup

### 1. Create Your Val Town Account

1. Go to [val.town](https://val.town)
2. Sign up or log in
3. Note your username (you'll need it for URLs)

### 2. Deploy the Webhook Receiver Val

1. In Val Town, click **New Val** → **HTTP Val**
2. Name it `bookmarksWebhook` (or any name you prefer)
3. Copy the entire contents of `webhook-receiver.ts` into the val
4. Click **Save**
5. Copy the val's URL - it will look like:
   ```
   https://yourusername-bookmarkswebhook.web.val.run
   ```

### 3. Deploy the Bookmarks UI Val

1. Create another **New Val** → **HTTP Val**
2. Name it `bookmarksUI`
3. Copy the entire contents of `bookmarks-ui.tsx` into the val
4. Click **Save**
5. Your bookmarks UI will be available at:
   ```
   https://yourusername-bookmarksui.web.val.run
   ```

### 4. Configure the Omega Discord Bot

#### Option A: Using Railway (Recommended for Production)

1. Go to your Railway project dashboard
2. Select your Omega bot service
3. Click on **Variables**
4. Add a new variable:
   - **Key:** `VAL_TOWN_WEBHOOK_URL`
   - **Value:** `https://yourusername-bookmarkswebhook.web.val.run`
5. Click **Add** and redeploy if necessary

#### Option B: Using Environment Variables Locally

Add to your `.env` file in the `apps/bot` directory:

```bash
VAL_TOWN_WEBHOOK_URL=https://yourusername-bookmarkswebhook.web.val.run
```

### 5. Test the Integration

1. Restart your Omega Discord bot (or redeploy on Railway)
2. Post a message with a link in Discord:
   ```
   Check out this cool article: https://www.val.town/blog/val-town-newsletter-13
   ```
3. Check your bot logs - you should see:
   ```
   🔖 Sending 1 link(s) to Val Town...
   ✅ Successfully sent 1 link(s) to Val Town
   ```
4. Visit your bookmarks UI URL to see the link!

### 6. Share Your Bookmarks Page

Your bookmarks UI is now live and public at:
```
https://yourusername-bookmarksui.web.val.run
```

You can share this URL with your Discord community so everyone can browse saved links!

## Advanced Configuration

### Making the UI Private

If you want to restrict access to your bookmarks UI, you can add authentication:

```typescript
// At the top of bookmarks-ui.tsx
export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  // Simple token-based auth
  if (token !== "your-secret-token") {
    return new Response("Unauthorized", { status: 401 });
  }

  // ... rest of the code
}
```

Then access with: `https://yourusername-bookmarksui.web.val.run?token=your-secret-token`

### Adding Link Deduplication

To prevent the same link from appearing multiple times, the webhook receiver already uses:

```sql
UNIQUE(link, message_id)
```

This means the same link from different messages will be stored, but duplicates within the same message are skipped.

If you want to deduplicate across ALL messages (store each unique link only once), change the schema:

```sql
CREATE TABLE IF NOT EXISTS bookmarks (
  ...
  UNIQUE(link)  -- Only this line changed
)
```

### Custom Metadata Extraction

You can extend the webhook receiver to fetch Open Graph metadata:

```typescript
// Add to webhook-receiver.ts
async function fetchMetadata(url: string) {
  try {
    const response = await fetch(url);
    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : url;

    // Extract description
    const descMatch = html.match(/<meta name="description" content="(.*?)"/);
    const description = descMatch ? descMatch[1] : '';

    return { title, description };
  } catch {
    return { title: url, description: '' };
  }
}

// Then store in database:
const metadata = await fetchMetadata(link);
await sqlite.execute({
  sql: `INSERT INTO bookmarks (..., title, description) VALUES (..., ?, ?)`,
  args: [..., metadata.title, metadata.description]
});
```

### Archiving Old Bookmarks

To automatically archive bookmarks older than 90 days:

```typescript
// Add to webhook-receiver.ts
await sqlite.execute(`
  DELETE FROM bookmarks
  WHERE created_at < datetime('now', '-90 days')
`);
```

## Troubleshooting

### "Webhook URL not configured" in logs

**Solution:** Make sure `VAL_TOWN_WEBHOOK_URL` is set in your environment variables and the bot has been restarted.

### No bookmarks appearing in UI

1. Check that the webhook receiver val is deployed and public
2. Test the webhook manually:
   ```bash
   curl -X POST https://yourusername-bookmarkswebhook.web.val.run \
     -H "Content-Type: application/json" \
     -d '{
       "links": ["https://example.com"],
       "user": {"id": "123", "username": "test"},
       "channel": {"id": "456", "name": "general"},
       "message": {
         "id": "789",
         "content": "Test",
         "timestamp": "2025-12-21T09:00:00Z"
       }
     }'
   ```
3. Check Val Town logs for errors

### Webhook timeouts

The Discord bot has a 5-second timeout. If your webhook is slow:

1. Keep the webhook logic simple
2. Consider using background processing for heavy operations
3. Return a response quickly, then process in the background

### SQLite storage limits

Free Val Town accounts have storage limits. To check your usage:

```typescript
const result = await sqlite.execute(`
  SELECT
    COUNT(*) as total_bookmarks,
    SUM(LENGTH(message_content)) as total_bytes
  FROM bookmarks
`);
console.log(result.rows[0]);
```

## Next Steps

- **Customize the UI:** Modify `bookmarks-ui.tsx` to match your brand
- **Add Tags:** Extend the schema to support tagging bookmarks
- **RSS Feed:** Create another val that generates an RSS feed of bookmarks
- **Discord Commands:** Add a Discord command to search bookmarks directly
- **Analytics:** Track which links are most popular

Happy bookmarking! 🔖
