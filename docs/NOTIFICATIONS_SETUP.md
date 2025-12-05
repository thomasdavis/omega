# Feature Notifications Setup Guide

This guide provides step-by-step instructions for ops/admins to set up the feature completion notification system.

## Prerequisites

- Access to GitHub repository settings
- Access to Railway project environment variables
- Access to Discord bot configuration
- Railway CLI installed (for running migrations)

## Step 1: Database Setup

### Run Database Migrations

Execute these commands to create the required database tables and columns:

```bash
# 1. Add notify_on_feature_complete column to user_profiles
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/add-notification-settings.sh'

# 2. Create notifications table
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-notifications-table.sh'
```

### Verify Migrations

```bash
# Check that column was added
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = '\''user_profiles'\''
AND column_name = '\''notify_on_feature_complete'\'';"'

# Check that table was created
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = '\''notifications'\''
ORDER BY ordinal_position;"'
```

Expected output for user_profiles:
```
         column_name          | data_type | column_default
------------------------------+-----------+----------------
 notify_on_feature_complete   | boolean   | true
```

Expected output for notifications:
```
 column_name  |            data_type
--------------+----------------------------------
 id           | text
 user_id      | text
 event_type   | character varying
 source_type  | character varying
 source_id    | integer
 source_url   | text
 payload      | jsonb
 status       | character varying
 error        | text
 created_at   | timestamp with time zone
 sent_at      | timestamp with time zone
```

## Step 2: GitHub Webhook Configuration

### Generate Webhook Secret

Generate a secure random secret for webhook signature verification:

```bash
# Generate a secure random secret (32 bytes)
openssl rand -hex 32
# Output: <your-webhook-secret>
```

Save this secret - you'll need it for both GitHub and Railway.

### Configure GitHub Webhook

1. Navigate to your GitHub repository
2. Go to **Settings** → **Webhooks** → **Add webhook**

3. Configure webhook settings:
   - **Payload URL:** `https://omega-web.up.railway.app/api/notifications/webhook`
     (Replace with your actual Railway web service URL)
   - **Content type:** `application/json`
   - **Secret:** Paste the webhook secret you generated above
   - **SSL verification:** Enable SSL verification
   - **Which events would you like to trigger this webhook?**
     - Select "Let me select individual events"
     - Check ☑️ **Pull requests**
     - Check ☑️ **Issues**
     - Uncheck all others
   - **Active:** ☑️ Checked

4. Click **Add webhook**

### Test Webhook

After adding the webhook:

1. GitHub will send a ping event
2. Check that the ping was successful (green checkmark)
3. Click on the webhook to view delivery details
4. If failed, check the error message and response

## Step 3: Environment Variables

### Add to Railway

Add the following environment variable to your Railway project:

**For omega-web service:**
```bash
railway variables set GITHUB_WEBHOOK_SECRET=<your-webhook-secret>
```

**For omega-bot service:**
No additional environment variables needed (bot already has DATABASE_URL and DISCORD_BOT_TOKEN).

### Verify Environment Variables

```bash
# Check omega-web
railway run -s omega-web bash -c 'echo "GITHUB_WEBHOOK_SECRET set: $([ -n "$GITHUB_WEBHOOK_SECRET" ] && echo "Yes" || echo "No")"'

# Check omega-bot
railway run -s omega-bot bash -c 'echo "DISCORD_BOT_TOKEN set: $([ -n "$DISCORD_BOT_TOKEN" ] && echo "Yes" || echo "No")"'
railway run -s omega-bot bash -c 'echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo "Yes" || echo "No")"'
```

## Step 4: Deploy Updated Code

### Regenerate Prisma Client

After database migrations, regenerate the Prisma client:

```bash
cd packages/database
pnpm prisma generate
```

### Deploy to Railway

```bash
# Commit changes
git add .
git commit -m "feat: add feature completion notifications"
git push

# Railway will auto-deploy both services
```

### Verify Deployment

Check Railway logs for both services:

**omega-bot logs:**
```bash
railway logs -s omega-bot
```

Look for:
- ✅ "Database initialized and ready"
- ✅ "Bot is online as <bot-name>"
- ✅ "Notification worker started (interval: 30000ms)"

**omega-web logs:**
```bash
railway logs -s omega-web
```

Look for:
- ✅ Next.js server started successfully
- ✅ No errors about missing environment variables

## Step 5: Testing

### Test the Full Flow

1. **Create a test notification manually:**

```bash
# SSH into Railway omega-bot service or use railway run
railway run -s omega-bot node << 'EOF'
import { createNotification } from '@repo/database/services/notificationService.js';

await createNotification({
  userId: '<your-discord-user-id>',
  eventType: 'feature_complete',
  sourceType: 'pr',
  sourceId: 999,
  sourceUrl: 'https://github.com/thomasdavis/omega/pull/999',
  payload: {
    title: 'Test notification',
    repository: 'thomasdavis/omega',
    action: 'closed',
  },
});

console.log('Test notification created! Check Discord DMs in 30 seconds.');
EOF
```

2. **Wait 30 seconds** for the notification worker to process it

3. **Check your Discord DMs** for the notification

4. **Verify in database:**

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "
SELECT id, user_id, status, error, created_at, sent_at
FROM notifications
ORDER BY created_at DESC
LIMIT 5;"'
```

### Test Webhook Endpoint

Test that the webhook endpoint is accessible and responding:

```bash
# Health check
curl https://omega-web.up.railway.app/api/notifications/webhook

# Expected response:
# {
#   "status": "ok",
#   "service": "github-notification-webhook",
#   "timestamp": "2025-12-05T19:00:00.000Z"
# }
```

### Test Complete Flow with GitHub

1. Create a test issue with body:
   ```markdown
   Test issue for notifications

   Requested by: <@YOUR_DISCORD_USER_ID>
   ```

2. Add label: `completed` or `deployed`

3. Close the issue

4. Check webhook delivery in GitHub:
   - Go to Settings → Webhooks
   - Click on your webhook
   - Check "Recent Deliveries"
   - Verify response was 200 OK

5. Wait 30 seconds and check your Discord DMs

## Step 6: User Access

### UI Access

Users can now access:

- **Settings:** `https://omega-web.up.railway.app/profiles/<username>/settings`
- **Notification History:** `https://omega-web.up.railway.app/profiles/<username>/notifications`

### Inform Users

Send an announcement in Discord:

```markdown
📬 **New Feature: Completion Notifications**

You'll now receive a Discord DM when features you request are completed and merged!

**How it works:**
- When you request a feature, we track it
- Once it's merged and deployed, you get notified automatically
- Notifications include links to the PR and deployment info

**Settings:**
- View your notification preferences: https://omega-web.up.railway.app/profiles/<your-username>/settings
- View notification history: https://omega-web.up.railway.app/profiles/<your-username>/notifications
- You can disable notifications at any time

Questions? Ask in #support
```

## Monitoring

### Check Notification Processing

```bash
# View recent notifications
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM notifications
GROUP BY status;"'
```

### Check Failed Notifications

```bash
# View failed notifications with errors
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "
SELECT
  user_id,
  source_url,
  error,
  created_at
FROM notifications
WHERE status = '\''failed'\''
ORDER BY created_at DESC
LIMIT 10;"'
```

### Monitor Bot Worker

Check that the notification worker is running:

```bash
# Check omega-bot logs
railway logs -s omega-bot --tail 50

# Look for:
# "🚀 Starting notification worker..."
# "✅ Notification worker started (interval: 30000ms)"
# "📬 Processing X pending notifications..."
# "✅ Notification sent to user <userId>"
```

## Troubleshooting

### Webhook Not Triggering

**Symptom:** GitHub shows failed webhook deliveries

**Solutions:**
1. Verify webhook URL is correct and accessible
2. Check `GITHUB_WEBHOOK_SECRET` is set correctly in Railway
3. Check omega-web service is running
4. Review webhook delivery details in GitHub for error messages

### Notifications Not Sending

**Symptom:** Notifications stuck in 'pending' status

**Solutions:**
1. Check omega-bot service is running: `railway logs -s omega-bot`
2. Verify notification worker started: Look for "Notification worker started" in logs
3. Check Discord bot token is valid
4. Verify user has DMs enabled and shares a server with the bot

### Notifications Failing

**Symptom:** Notifications marked as 'failed' in database

**Solutions:**
1. Check error message in database:
   ```bash
   railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "
   SELECT error FROM notifications WHERE status = '\''failed'\'' ORDER BY created_at DESC LIMIT 5;"'
   ```
2. Common errors:
   - "User not found": Discord user ID is incorrect
   - "Cannot send messages to this user": User has DMs disabled
   - Rate limit errors: Too many notifications sent too quickly

### Database Connection Issues

**Symptom:** Services can't connect to database

**Solutions:**
1. Verify `DATABASE_URL` or `DATABASE_PUBLIC_URL` is set in Railway
2. Check database is running and accessible
3. Test connection: `railway run bash -c 'psql "$DATABASE_PUBLIC_URL" -c "SELECT 1;"'`

## Rollback Procedure

If you need to rollback the feature:

### 1. Disable Webhook

Go to GitHub Settings → Webhooks → Edit webhook → Uncheck "Active"

### 2. Stop Notification Worker

Comment out the worker initialization in `apps/bot/src/index.ts`:

```typescript
// startNotificationWorker(readyClient);
```

Redeploy the bot service.

### 3. Remove Database Tables (Optional)

Only do this if you want to completely remove the feature:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" << EOF
DROP TABLE IF EXISTS notifications;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS notify_on_feature_complete;
EOF'
```

## Support

For issues or questions:
- Check logs: `railway logs -s <service-name>`
- Review GitHub webhook deliveries
- Check database notification status
- Contact DevOps team
