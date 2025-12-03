# Daily User Analysis Cronjob

This document describes the automated daily user analysis system that runs the `analyze-all-users.ts` script once per day to keep user personality profiles and feelings up to date.

## Overview

The user analysis cronjob performs comprehensive psychological analysis of all users who have sent messages, updating their:
- Personality profiles
- Emotional states and feelings
- Behavioral patterns
- Communication preferences

## Implementation Options

Three complementary approaches have been implemented, each with different use cases:

### 1. In-App node-cron Scheduler (Active by Default)

**Status**: ✅ **Active** - Runs automatically when the bot starts

The scheduler is integrated into the bot service and runs as part of the main application.

**Configuration**: `apps/bot/src/services/scheduler.ts`

**Schedule**: Daily at **00:00 UTC**

**How it works**:
- Initialized automatically when the bot starts (`initializeScheduler()`)
- Uses the `node-cron` library already in dependencies
- Runs within the main bot process
- Includes concurrency protection (prevents overlapping runs)
- Comprehensive logging and error handling

**Advantages**:
- ✅ No additional setup required
- ✅ Works immediately on deployment
- ✅ Shares database connections with bot
- ✅ Easy to test and debug

**Disadvantages**:
- ⚠️ Runs within bot process (could impact bot performance during analysis)
- ⚠️ If bot restarts during analysis, the job is interrupted

**Manual trigger**:
```typescript
import { triggerUserAnalysisNow } from './services/scheduler.js';
await triggerUserAnalysisNow();
```

---

### 2. Railway Cron Job Service (Recommended for Production)

**Status**: 📋 **Requires Setup** - Must be manually configured in Railway

A dedicated Railway service that runs the analysis script on a schedule, separate from the main bot.

**Configuration**: `apps/bot/railway-cron.json`

**Schedule**: Daily at **00:00 UTC** (configured via `cronSchedule` field)

**How to set up**:

1. **Create a new service in Railway**:
   - Go to your Railway project dashboard
   - Click "New" → "Service"
   - Connect to the same GitHub repository

2. **Configure the service**:
   - **Name**: `omega-user-analysis-cron`
   - **Root Directory**: Leave blank (uses repo root)
   - **Config file**: Point to `apps/bot/railway-cron.json`

3. **Set environment variables** (same as main bot service):
   ```
   DATABASE_URL=<your-database-url>
   DATABASE_AUTH_TOKEN=<your-auth-token>
   OPENAI_API_KEY=<your-openai-key>
   ```

4. **Deploy**: Railway will automatically detect the cron schedule in the config

**Configuration file** (`apps/bot/railway-cron.json`):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks",
    "buildCommand": "cd ../.. && pnpm install && pnpm build --filter=bot"
  },
  "deploy": {
    "startCommand": "cd apps/bot && node dist/scripts/analyze-all-users.js",
    "restartPolicyType": "never",
    "cronSchedule": "0 0 * * *"
  }
}
```

**Advantages**:
- ✅ Runs independently from bot (no performance impact)
- ✅ Isolated resource usage
- ✅ Native Railway cron support
- ✅ Automatic retries on failure (Railway built-in)
- ✅ Easy to monitor via Railway dashboard

**Disadvantages**:
- ⚠️ Requires manual Railway setup (one-time)
- ⚠️ Additional Railway service (may incur extra costs)

**Testing**:
- Use Railway CLI: `railway run npm run analyze-users --service omega-user-analysis-cron`
- Or trigger manually via Railway dashboard

---

### 3. GitHub Actions Workflow (Alternative)

**Status**: 📋 **Requires Manual File Creation** - GitHub permissions prevent automated setup

A GitHub Actions workflow that runs on schedule, useful for development and backup.

**Configuration**: `.github/workflows/daily-user-analysis.yml` (must be created manually)

**Schedule**: Daily at **00:00 UTC**

**Why manual setup is required**:
GitHub Apps cannot create or modify workflow files without special `workflows` permission. This is a security feature to prevent unauthorized code execution.

**How to set up**:

1. **Create the workflow file**:
   Create `.github/workflows/daily-user-analysis.yml` with the following content:

```yaml
name: Daily User Analysis

on:
  schedule:
    # Run daily at 00:00 UTC
    - cron: '0 0 * * *'
  workflow_dispatch: # Allow manual triggering

jobs:
  analyze-users:
    name: Analyze All Users
    runs-on: ubuntu-latest

    # Prevent concurrent executions
    concurrency:
      group: user-analysis
      cancel-in-progress: false

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.0.0

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build bot
        run: pnpm build --filter=bot

      - name: Run user analysis
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DATABASE_AUTH_TOKEN: ${{ secrets.DATABASE_AUTH_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          cd apps/bot
          npm run analyze-users

      - name: Notify on success
        if: success()
        run: |
          echo "✅ Daily user analysis completed successfully"

      - name: Notify on failure
        if: failure()
        run: |
          echo "❌ Daily user analysis failed - check logs"
          exit 1
```

2. **Configure secrets** (if not already set):
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Add required secrets:
     - `DATABASE_URL`
     - `DATABASE_AUTH_TOKEN`
     - `OPENAI_API_KEY`

3. **Test the workflow**:
   - Go to **Actions** → **Daily User Analysis**
   - Click **Run workflow**
   - Select branch and click **Run workflow**

**Advantages**:
- ✅ Runs independently from Railway
- ✅ Free GitHub Actions minutes (within limits)
- ✅ Easy to test manually via Actions UI
- ✅ Good for development/staging environments

**Disadvantages**:
- ⚠️ Requires manual file creation
- ⚠️ Uses GitHub Actions minutes
- ⚠️ Less suitable for production (Railway is better)

---

## Choosing the Right Approach

| Scenario | Recommended Approach |
|----------|---------------------|
| **Production** | Railway Cron Job Service |
| **Development** | In-App node-cron (already active) |
| **Testing/Backup** | GitHub Actions |
| **Quick Start** | In-App node-cron (no setup needed) |

## The Analysis Process

### What the script does:

1. **Initializes database** - Ensures schema is up to date
2. **Fetches all users** - Gets all user profiles from database
3. **Analyzes each user** with messages:
   - Retrieves message history
   - Runs psychological analysis via GPT-4
   - Updates personality profiles
   - Updates emotional states
   - Saves to database
4. **Reports results**:
   - Total users processed
   - Success count
   - Skipped count (users with no messages)
   - Error count

### Performance characteristics:

- **Duration**: Depends on user count and message volume
  - ~2-5 seconds per user with messages
  - Includes 500ms delay between users to avoid overwhelming the database
- **API costs**: Uses OpenAI GPT-4 for analysis
  - Approximate cost: $0.01-0.05 per user (varies by message count)
- **Database load**: Read-heavy with periodic writes
  - Consider running during low-traffic hours (hence 00:00 UTC default)

## Monitoring and Troubleshooting

### Logs

All approaches include comprehensive logging:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Starting user analysis...
⏰ Time: 2025-12-03T00:00:00.000Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 Found 15 users

[1/15] Analyzing john_doe (123456789)...
   Message count: 42
   ✅ Analysis complete

[2/15] Analyzing jane_smith (987654321)...
   Message count: 0
   ⏭️  Skipped (no messages)

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 User Analysis Complete!

Total users:     15
✅ Analyzed:     12
⏭️  Skipped:      2 (no messages)
❌ Errors:       1
⏱️  Duration:     38.42s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Checking status

**In-App node-cron**:
- Check bot logs for cron trigger messages
- Look for `⏰ Cron job triggered: Daily user analysis`

**Railway Cron Job**:
- View logs in Railway dashboard
- Check service deployment history
- Monitor resource usage

**GitHub Actions**:
- View workflow runs in Actions tab
- Check run logs for detailed output
- Set up notifications for failures

### Common issues

**Issue**: Analysis is taking too long
- **Cause**: Large number of users or high message volume
- **Solution**: Consider running less frequently or splitting into batches

**Issue**: OpenAI rate limits
- **Cause**: Too many API requests in short time
- **Solution**: Increase delay between users (edit `scheduler.ts`)

**Issue**: Database connection errors
- **Cause**: Database credentials or network issues
- **Solution**: Verify `DATABASE_URL` and `DATABASE_AUTH_TOKEN` are set correctly

**Issue**: Out of memory errors
- **Cause**: Processing too many users at once
- **Solution**: Split analysis into smaller batches (modify script to process in chunks)

## Maintenance

### Changing the schedule

**In-App node-cron**:
Edit `apps/bot/src/services/scheduler.ts`:
```typescript
const userAnalysisSchedule = '0 0 * * *'; // Change this cron expression
```

**Railway Cron Job**:
Edit `apps/bot/railway-cron.json`:
```json
{
  "deploy": {
    "cronSchedule": "0 0 * * *"  // Change this cron expression
  }
}
```

**GitHub Actions**:
Edit `.github/workflows/daily-user-analysis.yml`:
```yaml
on:
  schedule:
    - cron: '0 0 * * *'  # Change this cron expression
```

**Cron expression format**: `minute hour day month dayOfWeek`
- `0 0 * * *` = 00:00 UTC daily
- `0 */6 * * *` = Every 6 hours
- `0 9 * * 1` = 09:00 UTC every Monday

### Updating environment variables

**Railway**:
1. Go to service settings
2. Update environment variables
3. Redeploy if needed

**GitHub Actions**:
1. Go to Settings → Secrets and variables → Actions
2. Update the secret value
3. Re-run workflow to use new value

### Disabling the cronjob

**In-App node-cron**:
Comment out the scheduler initialization in `apps/bot/src/services/scheduler.ts`:
```typescript
// cron.schedule(userAnalysisSchedule, async () => {
//   ...
// });
```

**Railway Cron Job**:
- Stop or delete the service in Railway dashboard

**GitHub Actions**:
- Disable the workflow in Actions settings
- Or delete the workflow file

## Manual Execution

You can manually trigger user analysis at any time:

### Via package.json script:
```bash
cd apps/bot
npm run analyze-users
```

### Via Railway CLI:
```bash
railway run npm run analyze-users
```

### Via TypeScript/JavaScript code:
```typescript
import { triggerUserAnalysisNow } from './services/scheduler.js';
await triggerUserAnalysisNow();
```

### Via the original script:
```bash
cd apps/bot
node dist/scripts/analyze-all-users.js
```

## Security Considerations

1. **Environment variables**: Never commit database credentials or API keys
2. **Rate limiting**: The script includes delays to avoid overwhelming services
3. **Concurrency**: Overlapping runs are prevented to avoid duplicate work
4. **Error handling**: Individual user failures don't stop the entire analysis
5. **Logging**: Sensitive information is not logged (user IDs are anonymized in logs)

## Future Improvements

Potential enhancements to consider:

- Discord/Slack notifications on completion or failure
- Metrics collection (success rate, duration, errors)
- Configurable batch size and concurrency
- Delta analysis (only analyze users with new messages)
- Priority queue (analyze active users more frequently)
- Incremental analysis (continue from where it left off on failure)

## Support

For issues or questions:
- Check logs for error messages
- Review this documentation
- Open an issue in the repository
- Contact the development team

---

**Last updated**: 2025-12-03
**Related files**:
- `apps/bot/scripts/analyze-all-users.ts` - Original standalone script
- `apps/bot/src/services/scheduler.ts` - In-app scheduler
- `apps/bot/railway-cron.json` - Railway cron configuration
- `apps/bot/src/schedulers/userAnalysisScheduler.ts` - Dedicated scheduler module (alternative implementation)
