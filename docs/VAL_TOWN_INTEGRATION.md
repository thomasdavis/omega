# Val Town Integration

## Overview

Omega integrates with [Val Town](https://val.town) to enable rapid prototyping and deployment of live webpages, APIs, and webhooks without requiring database migrations or infrastructure changes.

## What is Val Town?

Val Town is a serverless JavaScript/TypeScript platform that lets you deploy code instantly with:
- No build step
- Automatic HTTPS endpoints
- Built-in key-value storage
- Scheduled execution
- Email triggers

## Why Use Val Town with Omega?

1. **Rapid Deployment**: Go from concept to live URL in seconds
2. **No Database Migrations**: Use Val Town's KV storage or fetch from Omega's API
3. **Minimal Infrastructure**: No need to modify Omega's codebase for prototypes
4. **Public Sharing**: Easily create public-facing tools and dashboards
5. **Experimentation**: Test ideas without committing to permanent code changes

## Setup

### 1. Get Val Town API Key

1. Create a Val Town account at [val.town](https://val.town)
2. Go to [Settings → API](https://val.town/settings/api)
3. Generate an API token

### 2. Configure Omega

Add your Val Town API key to Railway environment variables:

```bash
railway variables set VAL_TOWN_API_KEY=vt_xxx...
```

Or add to your local `.env` file:

```env
VAL_TOWN_API_KEY=vt_xxx...
```

## Available AI Tools

Omega includes three Val Town tools accessible to the AI agent:

### 1. valTownCreateVal

Create a new val on Val Town.

**Use cases:**
- Deploy a bookmark page for Discord links
- Create a webhook endpoint
- Build a quick API prototype
- Deploy a public dashboard

**Example:**
```
@omega deploy a bookmark page on Val Town that shows all Discord links
```

**Parameters:**
- `name`: Val name (alphanumeric and underscores)
- `code`: JavaScript/TypeScript code
- `type`: 'http', 'script', 'email', or 'interval'
- `privacy`: 'public', 'unlisted', or 'private'
- `readme`: Optional markdown documentation

### 2. valTownUpdateVal

Update an existing val.

**Use cases:**
- Fix bugs in deployed vals
- Add new features
- Update documentation
- Change privacy settings

**Example:**
```
@omega update my bookmarks val to add filtering by date
```

**Parameters:**
- `valId`: Val ID (from valTownListVals)
- `code`: Updated code (optional)
- `privacy`: Updated privacy (optional)
- `readme`: Updated README (optional)

### 3. valTownListVals

List all your deployed vals.

**Example:**
```
@omega show my Val Town deployments
```

## Use Case: Discord Bookmarks

The primary use case is creating a searchable bookmark page for Discord links without database modifications.

### How It Works

1. **Link Collection**: Links are already collected from Discord messages and stored in Omega's PostgreSQL database with AI-generated metadata
2. **Val Deployment**: Deploy a val that fetches links from Omega's API
3. **Live Page**: Get an instant public URL for browsing and searching links

### Deployment

Ask Omega to deploy a bookmark page:

```
@omega create a Val Town bookmark page for Discord links with search and tag filtering
```

Omega will:
1. Generate HTML/CSS/JavaScript code
2. Create the val using the Val Town API
3. Return the live URL
4. Provide the Val Town edit link

### Features

- 🔍 Search functionality
- 🏷️ Filter by tags
- 👤 Filter by user
- 📁 Filter by category
- 📅 Sort by date
- 📱 Responsive design
- ⚡ Fast loading (cached)

## Templates

Omega includes pre-built templates for common use cases:

### 1. Discord Bookmarks Page (`DISCORD_BOOKMARKS_VAL_TEMPLATE`)

A fully-featured bookmark page with:
- Search bar
- Tag filtering
- Responsive grid layout
- Beautiful gradient design
- Link metadata display

### 2. Webhook Receiver (`WEBHOOK_RECEIVER_VAL_TEMPLATE`)

Simple webhook endpoint that:
- Receives POST requests
- Stores data in Val Town KV storage
- Returns confirmation with timestamp

### 3. Link Collector API (`LINK_COLLECTOR_VAL_TEMPLATE`)

RESTful API for link management:
- GET: Retrieve all links
- POST: Add new links
- Built-in KV storage
- JSON responses

## Val Town API Service

Omega includes a comprehensive Val Town API client:

```typescript
import { createVal, updateVal, listVals, getVal, deleteVal, runVal } from '@repo/agent/services/valTownService';

// Create a new val
const result = await createVal({
  name: 'my_bookmark_page',
  code: '...',
  type: 'http',
  privacy: 'unlisted',
});

// Update a val
await updateVal('val_id', {
  code: 'updated code...',
});

// List all vals
const { data: vals } = await listVals();

// Run a val
await runVal('username', 'valName', { query: 'params' });
```

## Best Practices

### 1. Start with Unlisted Privacy

Default to 'unlisted' for new vals. Only make them 'public' when ready to share widely.

### 2. Use Omega's API for Data

Instead of duplicating data in Val Town:
- Fetch from Omega's API: `https://omegaai.dev/api/shared-links`
- Use caching headers for performance
- Let Omega handle data management

### 3. Add README Documentation

Always include a README in your val explaining:
- What it does
- How to use it
- Any required parameters
- Related Omega features

### 4. Keep Code Simple

Vals are for rapid prototyping:
- Avoid complex dependencies
- Use standard library when possible
- Inline CSS/HTML for single-file deployment
- Optimize for readability

### 5. Test Before Deploying

While vals are easy to update, test code logic before deployment:
- Verify API endpoints
- Check error handling
- Test edge cases
- Validate HTML/CSS

## Troubleshooting

### API Key Not Configured

```
Error: VAL_TOWN_API_KEY environment variable not configured
```

**Solution**: Add your Val Town API key to Railway environment variables or local `.env` file.

### Val Creation Failed

**Common causes:**
- Invalid val name (must be alphanumeric and underscores)
- Syntax errors in code
- Rate limiting (too many requests)

**Solution**: Check error message for details and retry.

### Val Not Loading

**Check:**
- Val privacy setting (might be private)
- Code has syntax errors
- CORS settings if making API calls
- Browser console for JavaScript errors

## Examples

### Example 1: Create Bookmark Page

```typescript
// Omega will execute this when you ask:
// "@omega deploy a bookmark page on Val Town"

import { valTownCreateVal } from './tools/valTownCreateVal';
import { DISCORD_BOOKMARKS_VAL_TEMPLATE } from './templates/valTownBookmarks';

const result = await valTownCreateVal.execute({
  name: 'discord_bookmarks',
  code: DISCORD_BOOKMARKS_VAL_TEMPLATE,
  type: 'http',
  privacy: 'unlisted',
  readme: '# Discord Bookmarks\n\nSearchable page for Discord community links.',
});

console.log(`Deployed at: ${result.val.url}`);
```

### Example 2: Create Webhook

```typescript
// "@omega create a webhook endpoint on Val Town"

await valTownCreateVal.execute({
  name: 'discord_webhook',
  code: WEBHOOK_RECEIVER_VAL_TEMPLATE,
  type: 'http',
  privacy: 'private',
});
```

### Example 3: Update Existing Val

```typescript
// "@omega update my bookmarks val to add dark mode"

const vals = await valTownListVals.execute({ limit: 20 });
const bookmarksVal = vals.vals.find(v => v.name === 'discord_bookmarks');

await valTownUpdateVal.execute({
  valId: bookmarksVal.id,
  code: `/* Updated code with dark mode... */`,
});
```

## API Endpoints

Omega provides these API endpoints that vals can consume:

### Shared Links

```
GET https://omegaai.dev/api/shared-links
```

**Query Parameters:**
- `limit`: Max links to return (default: 50)
- `tag`: Filter by tag
- `search`: Search in title/description/url
- `userId`: Filter by Discord user ID
- `channelId`: Filter by Discord channel ID

### Popular Tags

```
GET https://omegaai.dev/api/shared-links/tags
```

Returns all tags with usage counts.

## Advanced Usage

### Custom Data Sources

Vals can fetch from any API, not just Omega:

```javascript
export default async function(req) {
  const [omegaLinks, hackerNews] = await Promise.all([
    fetch('https://omegaai.dev/api/shared-links').then(r => r.json()),
    fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then(r => r.json()),
  ]);

  // Combine and display...
}
```

### Scheduled Vals

Use `type: 'interval'` for vals that run on a schedule:

```typescript
await createVal({
  name: 'daily_digest',
  code: `export default async function() {
    // Fetch links from last 24 hours
    // Send digest to Discord webhook
  }`,
  type: 'interval',
});
```

### Email-Triggered Vals

Use `type: 'email'` for vals triggered by email:

```typescript
await createVal({
  name: 'email_processor',
  code: `export default async function(email) {
    // Process incoming email
    // Extract links, forward to Omega
  }`,
  type: 'email',
});
```

## Resources

- [Val Town Documentation](https://docs.val.town)
- [Val Town API Reference](https://docs.val.town/api)
- [Val Town Examples](https://val.town/explore)
- [Omega API Documentation](https://omegaai.dev/docs)

## Contributing

To add new Val Town templates:

1. Create template in `packages/agent/src/templates/valTownBookmarks.ts`
2. Export as a const with descriptive name
3. Add JSDoc comment explaining use case
4. Update this documentation

## Support

For issues with Val Town integration:

1. Check Railway logs for API errors
2. Verify VAL_TOWN_API_KEY is set
3. Test Val Town API directly via curl
4. Create GitHub issue with error details
