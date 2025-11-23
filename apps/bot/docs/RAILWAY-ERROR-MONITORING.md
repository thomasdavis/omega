# Railway Error Monitoring & Automated GitHub Issue Creation

Automated system for detecting Railway errors, AI-powered summarization, and intelligent GitHub issue management.

## Overview

This system automatically:
1. **Detects errors** from Railway runtime logs and webhooks
2. **Summarizes errors** using GPT-4.1-mini AI analysis
3. **Checks for duplicates** to avoid creating redundant issues
4. **Creates/updates GitHub issues** with comprehensive error context
5. **Tags @claude** automatically to trigger analysis and fixes
6. **Analyzes environment variables** for missing or misconfigured settings

## Architecture

### Components

1. **Error Monitoring Service** (`src/services/errorMonitoringService.ts`)
   - Captures runtime errors with deduplication
   - Global error handlers (unhandled rejections, uncaught exceptions)
   - Cooldown mechanism (5 minutes) to prevent spam
   - Automatic cleanup of old error tracking

2. **GitHub Issue Service** (`src/services/githubIssueService.ts`)
   - AI-powered error summarization
   - Duplicate issue detection using GPT-4.1-mini
   - Environment variable analysis
   - Issue creation and comment updates

3. **Railway Webhook Endpoint** (`/api/railway-webhook`)
   - Receives error notifications from Railway
   - Async processing to avoid blocking
   - JSON payload validation

### Flow Diagram

```
┌─────────────────┐
│ Railway Error   │
│ (logs/webhook)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Error Capture   │
│ (deduplication) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI Analysis     │
│ (GPT-4.1-mini)  │
├─────────────────┤
│ • Summarize     │
│ • Check env     │
│ • Severity      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fetch Existing  │
│ GitHub Issues   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI Duplicate    │
│ Detection       │
└────┬───────┬────┘
     │       │
  Dup│       │New
     │       │
     ▼       ▼
 ┌─────┐  ┌──────┐
 │Comment│ │Create│
 │Update│  │Issue │
 └──┬──┘  └──┬───┘
    │        │
    └────┬───┘
         │
         ▼
    ┌─────────┐
    │Tag      │
    │@claude  │
    └─────────┘
```

## Configuration

### Required Environment Variables

```bash
# GitHub Integration (Required)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx
GITHUB_REPO=thomasdavis/omega

# Railway (Auto-detected in production)
RAILWAY_ENVIRONMENT=production
RAILWAY_SERVICE_NAME=omega-bot

# Enable in non-production (Optional)
ENABLE_ERROR_MONITORING=true
```

### Environment Variable Setup

1. **GitHub Token**: Create a Personal Access Token with `repo` scope
   - Go to: https://github.com/settings/tokens
   - Permissions needed: `repo` (full control of private repositories)

2. **Add to Railway**:
   ```bash
   railway variables set GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx
   railway variables set GITHUB_REPO=thomasdavis/omega
   ```

## Usage

### Automatic Error Capture

The system automatically monitors:

```typescript
// Unhandled promise rejections
Promise.reject(new Error('Something went wrong'));
// → Automatically captured and reported

// Uncaught exceptions
throw new Error('Critical failure');
// → Automatically captured and reported
```

### Manual Error Capture

Use in try/catch blocks for important operations:

```typescript
import { captureError } from './services/errorMonitoringService.js';

try {
  await riskyOperation();
} catch (error) {
  await captureError(error, {
    railwayService: 'my-service',
    environment: 'production',
    logContext: ['Additional context line 1', 'Additional context line 2'],
  });
  throw error; // Re-throw if needed
}
```

### Function Wrapper

Wrap async functions with automatic monitoring:

```typescript
import { withErrorMonitoring } from './services/errorMonitoringService.js';

const monitoredFunction = withErrorMonitoring(
  async () => {
    // Your code here
  },
  { railwayService: 'my-service' }
);
```

### Railway Webhook Integration

Send errors from Railway logs to the webhook:

**Webhook URL**: `https://your-domain.railway.app/api/railway-webhook`

**Payload**:
```json
{
  "error": "Error message here",
  "stackTrace": "Stack trace...",
  "timestamp": "2025-11-23T04:46:32Z",
  "environment": "production",
  "service": "omega-bot",
  "logContext": [
    "Log line before error",
    "Log line with error",
    "Log line after error"
  ]
}
```

**Example with curl**:
```bash
curl -X POST https://your-domain.railway.app/api/railway-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "error": "Connection timeout to database",
    "stackTrace": "Error: ETIMEDOUT...",
    "timestamp": "2025-11-23T04:46:32Z",
    "environment": "production",
    "service": "omega-bot"
  }'
```

## GitHub Issue Format

### New Issue

```markdown
## 🚨 Automated Railway Error Report

**Detected**: 2025-11-23T04:46:32Z
**Environment**: production
**Service**: omega-bot

### Error Message
```
Error: Connection timeout to database
```

### Stack Trace
```
Error: ETIMEDOUT
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1148:16)
```

### AI-Generated Summary
**Root Cause**: Database connection timeout...
**Impact**: Users unable to access stored data...
**Urgency**: High
**Suggested Fix**: Check DATABASE_URL environment variable...

### Environment Variable Analysis
- **DATABASE_URL**: Appears to be misconfigured or missing
- **Recommendation**: Verify the connection string format...

---

@claude please analyze this error and determine the root cause. If you can fix it, please implement a solution. Pay special attention to any missing or misconfigured environment variables.
```

### Duplicate Issue Comment

```markdown
## 🔄 Error Occurred Again

**Timestamp**: 2025-11-23T05:00:00Z
**Environment**: production
**Service**: omega-bot

### Error Details
```
Error: Connection timeout to database
```

### AI Analysis
[Same format as new issue]

---

@claude please analyze this recurring error and investigate potential fixes. Check if any environment variables are missing or misconfigured.
```

## Features

### Intelligent Duplicate Detection

Uses GPT-4.1-mini to compare:
- Error messages (semantic similarity, not just string matching)
- Stack traces (root cause analysis)
- Error types and contexts

### Deduplication & Rate Limiting

- **1-minute dedup window**: Identical errors within 1 minute are batched
- **5-minute cooldown**: Prevents spamming GitHub with the same error
- **Auto cleanup**: Old error tracking removed after 30 minutes

### Environment Variable Analysis

AI checks for common issues:
- Missing required variables
- Incorrect format (e.g., malformed URLs)
- Security issues (e.g., exposed in logs)
- Recommendations for fixes

### Labels Applied

- `railway-error`: All automated railway errors
- `automated`: Bot-generated issue
- `bug`: Indicates a bug/error

## Testing

### Test the Webhook

```bash
# Test webhook endpoint
curl -X POST http://localhost:3001/api/railway-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "error": "Test error from Railway",
    "timestamp": "2025-11-23T04:46:32Z",
    "environment": "test",
    "service": "test-service"
  }'
```

### Test Error Capture

```typescript
import { captureError } from './services/errorMonitoringService.js';

// Set ENABLE_ERROR_MONITORING=true for testing in development
process.env.ENABLE_ERROR_MONITORING = 'true';
process.env.GITHUB_TOKEN = 'your-token';

await captureError(
  new Error('Test error'),
  {
    railwayService: 'test',
    environment: 'development',
  }
);
```

## Monitoring

### Check Logs

```bash
# Railway logs
railway logs

# Look for these indicators:
# ✅ Error monitoring initialized
# 🚨 Capturing error for GitHub issue creation...
# ✅ Created GitHub issue #123: https://...
# 📝 Updated GitHub issue #123: https://...
```

### Verify GitHub Issues

Check: https://github.com/thomasdavis/omega/issues?q=label%3Arailway-error

## Limitations

- **Cooldown Period**: Same error reported only once per 5 minutes
- **AI Costs**: Each error triggers 2-3 GPT-4.1-mini calls (~$0.0006 per error)
- **Production Only**: Disabled by default in development (use `ENABLE_ERROR_MONITORING=true` to override)
- **GitHub Rate Limits**: Standard GitHub API rate limits apply (5000 req/hour for authenticated)

## Troubleshooting

### Error monitoring not initializing

**Check**:
1. `GITHUB_TOKEN` is set
2. Running in production OR `ENABLE_ERROR_MONITORING=true`
3. No errors in startup logs

### Issues not being created

**Check**:
1. GitHub token has `repo` permissions
2. Error is not in cooldown period (check logs for "Skipping duplicate")
3. AI API (OpenAI) is accessible
4. `OPENAI_API_KEY` is valid

### Too many duplicate issues

**Adjust** the cooldown in `errorMonitoringService.ts`:
```typescript
const ERROR_COOLDOWN = 10 * 60 * 1000; // Increase to 10 minutes
```

### Webhook not receiving errors

**Check**:
1. Railway webhook URL is correctly configured
2. Webhook endpoint is accessible (try curl test)
3. Payload format matches expected schema

## Future Enhancements

- [ ] Slack/Discord notifications for critical errors
- [ ] Error trending and analytics dashboard
- [ ] Auto-close issues when error stops occurring
- [ ] Integration with Railway's native logging API
- [ ] Custom error severity levels
- [ ] Error grouping by root cause
- [ ] Auto-deployment rollback for critical errors

## Related Files

- `src/services/errorMonitoringService.ts` - Main error capture
- `src/services/githubIssueService.ts` - GitHub integration
- `src/server/artifactServer.ts` - Webhook endpoint
- `src/index.ts` - Initialization

## Support

For issues or questions:
- GitHub Issues: https://github.com/thomasdavis/omega/issues
- Tag @claude in any Railway error issue for automated analysis
