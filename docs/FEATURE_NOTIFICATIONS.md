# Feature Completion Notifications

This document describes the feature completion notification system that notifies users via Discord DM when features they've requested are completed.

## Overview

When a GitHub issue or pull request tied to a user-requested feature is merged, deployed, or marked as complete, the original requester receives a Discord DM notification with details about the completion.

## Architecture

### Components

1. **Database Layer** (`packages/database/`)
   - `notifications` table: Stores all notification events
   - `user_profiles.notify_on_feature_complete`: User preference toggle
   - `notificationService.ts`: Service layer for CRUD operations

2. **API Layer** (`apps/web/app/api/`)
   - `POST /api/notifications/webhook`: GitHub webhook endpoint
   - `GET /api/notifications/:userId`: Fetch notification history
   - `GET /api/profiles/:userId/settings`: Get user notification preferences
   - `PATCH /api/profiles/:userId/settings`: Update user notification preferences

3. **Discord Bot** (`apps/bot/src/services/`)
   - `featureNotificationService.ts`: Background worker that processes pending notifications
   - Runs every 30 seconds checking for pending notifications
   - Sends DMs to users when features are complete

4. **UI** (`apps/web/app/profiles/`)
   - `/profiles/:username/settings`: Settings page with notification toggle
   - `/profiles/:username/notifications`: Notification history page

## Database Schema

### notifications Table

```sql
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" VARCHAR(255) NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,  -- 'issue' | 'pr' | 'deploy'
    "source_id" INTEGER,
    "source_url" TEXT,
    "payload" JSONB,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed'
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "sent_at" TIMESTAMPTZ,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Indexes for efficient querying
CREATE INDEX "idx_notifications_user_id" ON "notifications"("user_id");
CREATE INDEX "idx_notifications_status" ON "notifications"("status");
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at" DESC);
CREATE INDEX "idx_notifications_user_status" ON "notifications"("user_id", "status");
```

### user_profiles.notify_on_feature_complete

```sql
ALTER TABLE "user_profiles"
ADD COLUMN "notify_on_feature_complete" BOOLEAN NOT NULL DEFAULT true;
```

## GitHub Webhook Integration

### Setup

1. **Create GitHub Webhook:**
   - Go to Repository Settings → Webhooks → Add webhook
   - Payload URL: `https://your-domain.com/api/notifications/webhook`
   - Content type: `application/json`
   - Secret: Set `GITHUB_WEBHOOK_SECRET` environment variable
   - Events: Select "Pull requests" and "Issues"

2. **Environment Variables:**
   ```bash
   GITHUB_WEBHOOK_SECRET=<your-webhook-secret>
   ```

### Webhook Behavior

The webhook endpoint processes GitHub events and creates notifications when:

1. **Pull Request Merged:**
   - A PR is merged (`pull_request.merged === true`)

2. **Issue Closed with Labels:**
   - An issue is closed with `completed` or `deployed` label

### Identifying the Requester

The webhook extracts the requester's Discord user ID from:

1. **Label:** A label named `requested-by:<userId>`
2. **Issue/PR Body:** Text matching pattern `Requested by: <@userId>`

Example:
```markdown
## Request
Add dark mode toggle

Requested by: <@123456789012345678>
```

## Discord Notification Format

When a feature completes, users receive a DM like:

```
🔀 **Feature Complete!**

The feature you requested has been completed:
**Add dark mode toggle to settings**

📦 Repository: thomasdavis/omega
🔗 Pull Request: https://github.com/thomasdavis/omega/pull/123

Thank you for your contribution to the project!
```

## API Usage

### Get User Notification Preferences

```bash
GET /api/profiles/:userId/settings

Response:
{
  "notify_on_feature_complete": true
}
```

### Update User Notification Preferences

```bash
PATCH /api/profiles/:userId/settings
Content-Type: application/json

{
  "notify_on_feature_complete": false
}

Response:
{
  "success": true,
  "notify_on_feature_complete": false
}
```

### Get Notification History

```bash
GET /api/notifications/:userId?status=sent&limit=50&offset=0

Response:
{
  "notifications": [
    {
      "id": "uuid",
      "userId": "123456789012345678",
      "eventType": "feature_complete",
      "sourceType": "pr",
      "sourceId": 123,
      "sourceUrl": "https://github.com/repo/pull/123",
      "payload": {
        "title": "Add dark mode",
        "action": "closed",
        "repository": "thomasdavis/omega"
      },
      "status": "sent",
      "error": null,
      "createdAt": "2025-12-05T19:00:00Z",
      "sentAt": "2025-12-05T19:00:30Z"
    }
  ],
  "count": 1
}
```

## Deployment

### Database Migrations

Run these migrations on Railway:

```bash
# Add notify_on_feature_complete column
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/add-notification-settings.sh'

# Create notifications table
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-notifications-table.sh'

# Regenerate Prisma client
cd packages/database && pnpm prisma generate
```

### Environment Variables

Required environment variables:

```bash
# GitHub webhook secret for signature verification
GITHUB_WEBHOOK_SECRET=<your-secret>

# Discord bot token (already configured)
DISCORD_BOT_TOKEN=<your-token>

# Database connection (already configured)
DATABASE_URL=<your-database-url>
```

## User Flow

### Requesting a Feature

1. User requests a feature in Discord
2. Feature request creates a GitHub issue
3. Issue body includes `Requested by: <@userId>` or label `requested-by:userId`

### Feature Completion

1. Developer completes the feature and creates a PR
2. PR is reviewed and merged
3. GitHub webhook fires to `/api/notifications/webhook`
4. Webhook handler:
   - Verifies signature
   - Checks if feature is complete (merged/labeled)
   - Extracts requester ID
   - Checks user's notification preference
   - Creates notification record (status: pending)
5. Discord bot worker (runs every 30s):
   - Fetches pending notifications
   - Sends DM to user
   - Updates notification status (sent/failed)

### User Receives Notification

1. User receives DM in Discord
2. Can click link to view PR/issue on GitHub
3. Can view notification history at `/profiles/:username/notifications`
4. Can disable notifications at `/profiles/:username/settings`

## Monitoring & Debugging

### Check Notification Status

```sql
-- Count notifications by status
SELECT status, COUNT(*)
FROM notifications
GROUP BY status;

-- Recent failed notifications
SELECT *
FROM notifications
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- Notifications for a specific user
SELECT *
FROM notifications
WHERE user_id = '123456789012345678'
ORDER BY created_at DESC;
```

### Common Issues

1. **Notifications not sending:**
   - Check Discord bot is running: Look for "Notification worker started" in logs
   - Check user has DMs enabled
   - Verify notification status in database

2. **Webhook not creating notifications:**
   - Verify webhook secret matches `GITHUB_WEBHOOK_SECRET`
   - Check webhook endpoint is accessible
   - Verify issue/PR has requester identifier

3. **User not receiving DMs:**
   - User may have DMs disabled
   - User may not share a server with bot
   - Check notification error field in database

## Testing

### Test Webhook Endpoint

```bash
curl -X POST http://localhost:3000/api/notifications/webhook \
  -H "Content-Type: application/json" \
  -H "x-github-event: pull_request" \
  -H "x-hub-signature-256: sha256=..." \
  -d '{
    "action": "closed",
    "pull_request": {
      "number": 123,
      "title": "Test PR",
      "html_url": "https://github.com/test/repo/pull/123",
      "merged": true,
      "body": "Requested by: <@123456789012345678>"
    },
    "repository": {
      "full_name": "test/repo"
    }
  }'
```

### Test Notification Service

```typescript
import { createNotification } from '@repo/database/services/notificationService';

await createNotification({
  userId: '123456789012345678',
  eventType: 'feature_complete',
  sourceType: 'pr',
  sourceId: 123,
  sourceUrl: 'https://github.com/test/repo/pull/123',
  payload: {
    title: 'Test feature',
    repository: 'test/repo',
  },
});
```

## Security Considerations

1. **Webhook Signature Verification:** All GitHub webhooks are verified using HMAC SHA-256
2. **User Privacy:** Only the original requester is notified (no broadcasting)
3. **DM Permissions:** Bot respects Discord DM settings and handles errors gracefully
4. **Rate Limiting:** Notification worker processes in batches with delays

## Future Enhancements

Potential improvements:

1. **Notification Channels:** Allow users to choose DM vs. channel notifications
2. **Digest Mode:** Option for daily/weekly digest instead of instant notifications
3. **Custom Templates:** Allow users to customize notification message format
4. **Deployment Tracking:** Track when features are actually deployed (not just merged)
5. **Retry Logic:** Exponential backoff for failed notifications
6. **Email Fallback:** Send email if Discord DM fails
7. **Notification Grouping:** Group multiple completed features into one message
