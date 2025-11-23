# Railway Error Automation - Intelligent Error Detection and GitHub Issue Creation

> Automated system for detecting Railway runtime errors, summarizing them with AI, and creating GitHub issues with intelligent deduplication.

## Overview

This system provides comprehensive automated error monitoring for Railway deployments:

1. **Detects Railway Errors** - Runtime errors, deployment failures, crashes, OOM, health check failures
2. **AI Summarization** - Uses GPT-4.1-mini to analyze and summarize errors
3. **Intelligent Deduplication** - Checks for existing similar issues before creating new ones
4. **Environment Variable Analysis** - Automatically detects missing or misconfigured env vars
5. **Automatic Issue Management** - Creates or updates GitHub issues with @claude tagging
6. **Multi-layer Detection** - Works with webhooks, logs, and GitHub Actions

## Features

### ✅ AI-Powered Error Summarization

- Uses GPT-4.1-mini to analyze error messages, stack traces, and logs
- Generates concise, actionable issue titles
- Identifies severity levels (critical, high, medium, low)
- Categorizes errors (build failure, runtime error, OOM, etc.)
- Suggests potential causes and fixes
- Extracts related file paths from stack traces

### ✅ Intelligent Duplicate Detection

- Fetches existing open issues with `railway-error` label
- Uses AI to compare new errors with existing issues
- Calculates similarity scores (0.0 - 1.0)
- **Duplicate (≥90% similar)**: Updates existing issue
- **Similar (60-89% similar)**: Updates related issue
- **Different (<60% similar)**: Creates new issue
- Prevents duplicate issues for the same error

### ✅ Environment Variable Analysis

- Scans error messages for missing environment variables
- Identifies common patterns (undefined, not found, required)
- Extracts potential env var names from errors
- Includes analysis in GitHub issue
- Helps @claude identify configuration problems

### ✅ Automatic @claude Tagging

- Every issue automatically mentions @claude
- Claude investigates errors and creates PRs with fixes
- Environment variable analysis helps Claude identify config issues
- Seamless integration with existing Claude workflows

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Railway Application                       │
│  (Detects: Runtime Errors, Crashes, OOM, Failures)          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
           ┌────────────────────────────────┐
           │   Railway Webhook (Optional)   │
           │   POST /railway-webhook        │
           └────────────┬───────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │  Railway Webhook Handler         │
         │  (scripts/railway-webhook-       │
         │   handler.ts)                    │
         └──────────────┬───────────────────┘
                        │
                        ▼
    ┌───────────────────────────────────────────┐
    │  Railway Error Orchestrator               │
    │  (apps/bot/src/services/                  │
    │   railwayErrorOrchestrator.ts)            │
    └─────┬──────────────┬───────────────┬──────┘
          │              │               │
          ▼              ▼               ▼
   ┌──────────┐  ┌──────────────┐  ┌──────────────┐
   │  Error   │  │     AI       │  │   GitHub     │
   │ Detector │  │ Summarizer   │  │    Issue     │
   │          │  │ (GPT-4.1-mini)│  │   Manager    │
   └──────────┘  └──────────────┘  └──────────────┘
          │              │               │
          └──────────────┴───────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  GitHub Issue        │
              │  - railway-error     │
              │  - @claude mention   │
              │  - Env var analysis  │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Claude Investigates │
              │  Creates PR with fix │
              └──────────────────────┘
```

## Implementation

### 1. Core Services

#### Railway Error Detector (`apps/bot/src/services/railwayErrorDetector.ts`)

Detects and parses Railway errors from webhooks:

```typescript
export interface RailwayError {
  type: 'runtime' | 'deployment' | 'healthcheck' | 'oom' | 'crash';
  timestamp: string;
  message: string;
  stackTrace?: string;
  serviceName: string;
  // ... more fields
}

// Parse Railway webhook payload
const error = parseRailwayWebhook(webhookPayload);

// Summarize with AI
const summary = await summarizeError(error);

// Analyze environment variables
const missingVars = analyzeEnvironmentVariables(error);
```

#### GitHub Issue Manager (`apps/bot/src/services/githubIssueManager.ts`)

Manages GitHub issues with intelligent deduplication:

```typescript
// Fetch existing issues
const existingIssues = await fetchExistingIssues(githubToken);

// Check for duplicates using AI
const result = await findDuplicateIssue(summary, existingIssues);

if (result.isDuplicate) {
  // Update existing issue
  await updateGitHubIssue(githubToken, issueNumber, error, summary);
} else {
  // Create new issue
  await createGitHubIssue(githubToken, error, summary);
}
```

#### Error Orchestrator (`apps/bot/src/services/railwayErrorOrchestrator.ts`)

Main orchestrator that coordinates the entire flow:

```typescript
const result = await processRailwayError(webhookPayload, githubToken);

// Returns:
// - success: boolean
// - action: 'created' | 'updated' | 'skipped' | 'failed'
// - issueNumber: number
// - isDuplicate: boolean
// - similarityScore: number
```

### 2. Webhook Handler (`scripts/railway-webhook-handler.ts`)

HTTP server that receives Railway webhooks:

```bash
# Start the webhook handler
tsx scripts/railway-webhook-handler.ts

# Or deploy as a Railway service
railway up
```

**Features:**
- Health check endpoint: `GET /health`
- Webhook endpoint: `POST /railway-webhook`
- Environment validation
- Graceful shutdown
- CORS support
- Response with processing details

### 3. GitHub Actions Workflow (`.github/workflows/railway-error-monitor.yml`)

Can be triggered by Railway webhooks via GitHub repository_dispatch:

```yaml
on:
  repository_dispatch:
    types: [railway_error_detected]
  workflow_dispatch:
    inputs:
      error_type: ...
      service_name: ...
      error_message: ...
```

## Setup Instructions

### Step 1: Install Dependencies

```bash
# From repository root
pnpm install
```

### Step 2: Configure Environment Variables

#### For Local Development / Webhook Handler:

```bash
# Required
export OPENAI_API_KEY="sk-..."
export GITHUB_TOKEN="ghp_..."

# Optional
export GITHUB_REPO="thomasdavis/omega"
export PORT="3000"
```

#### For Railway Deployment:

Add to Railway environment variables:
- `OPENAI_API_KEY` - OpenAI API key
- `GITHUB_TOKEN` - GitHub Personal Access Token with `repo` scope
- `GITHUB_REPO` - Your repository name (default: `thomasdavis/omega`)

#### For GitHub Actions:

Add to repository secrets:
- `OPENAI_API_KEY` - OpenAI API key
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions
- `DISCORD_WEBHOOK_URL` - (Optional) Discord webhook for notifications

### Step 3: Choose Deployment Option

#### Option A: Deploy Webhook Handler to Railway

1. Create a new Railway service
2. Connect to your repository
3. Set build command: `pnpm install && pnpm build`
4. Set start command: `tsx scripts/railway-webhook-handler.ts`
5. Add environment variables
6. Deploy

#### Option B: Use GitHub Actions Only

The GitHub Actions workflow can be triggered manually or via repository_dispatch events without needing a separate webhook handler.

### Step 4: Configure Railway Webhook (Optional)

If using the webhook handler:

1. Go to Railway project settings
2. Navigate to Webhooks
3. Add webhook:
   - **URL**: `https://your-webhook-handler.railway.app/railway-webhook`
   - **Events**: Select deployment failures, crashes, errors
4. Save

### Step 5: Test the System

#### Manual Test via GitHub Actions:

```bash
gh workflow run railway-error-monitor.yml \
  -f error_type="runtime" \
  -f service_name="bot" \
  -f error_message="TypeError: Cannot read property 'foo' of undefined"
```

#### Test Webhook Handler:

```bash
curl -X POST http://localhost:3000/railway-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "RUNTIME_ERROR",
    "service": {"name": "bot"},
    "log": {
      "level": "error",
      "message": "Test error message"
    },
    "timestamp": "2025-11-23T00:00:00Z"
  }'
```

## Usage

### Processing Errors from Command Line

```bash
# Create a webhook payload JSON file
cat > error.json <<EOF
{
  "type": "runtime",
  "service": {"name": "bot"},
  "log": {
    "level": "error",
    "message": "Error: OPENAI_API_KEY is not defined"
  }
}
EOF

# Process it
tsx scripts/railway-error-processor.ts error.json
```

### Webhook Handler Response

```json
{
  "status": "success",
  "action": "created",
  "issueNumber": 123,
  "issueUrl": "https://github.com/thomasdavis/omega/issues/123",
  "isDuplicate": false,
  "similarityScore": 0,
  "processingTime": "2547ms",
  "summary": {
    "title": "Missing OPENAI_API_KEY environment variable",
    "severity": "critical",
    "category": "Configuration Error",
    "missingEnvVars": ["OPENAI_API_KEY"]
  }
}
```

## Issue Format

Created issues follow this format:

```markdown
## Railway Error Detected

**Severity:** CRITICAL
**Category:** Runtime Error
**Service:** bot
**Timestamp:** 2025-11-23T04:30:00Z

### Description

The application crashed due to missing OPENAI_API_KEY environment variable...

### Error Details

Error: OPENAI_API_KEY is not defined
    at validateEnvironment (/app/src/config.ts:15:11)
    at main (/app/src/index.ts:5:3)

### Potential Causes

1. Environment variable not set in Railway
2. Typo in variable name
3. Variable removed during deployment

### Suggested Fixes

1. Add OPENAI_API_KEY to Railway environment variables
2. Verify variable name matches expected value
3. Check Railway deployment logs for configuration errors

### Missing Environment Variables

- `OPENAI_API_KEY`

### Deployment Info

- **Deployment ID:** abc123
- **Commit:** a1b2c3d
- **Message:** Update configuration

---

@claude Please analyze this Railway error and investigate potential fixes.
```

## Deduplication Examples

### Example 1: Exact Duplicate (Score: 0.95)

**Existing Issue #42:**
> Missing OPENAI_API_KEY environment variable

**New Error:**
> Error: OPENAI_API_KEY is not defined

**Action:** Update issue #42 with new occurrence

### Example 2: Similar Issue (Score: 0.75)

**Existing Issue #43:**
> Database connection timeout in user service

**New Error:**
> Connection timeout connecting to database in auth service

**Action:** Update issue #43 noting similar error in different service

### Example 3: Different Error (Score: 0.25)

**Existing Issue #44:**
> Out of memory error

**New Error:**
> TypeError: Cannot read property 'foo' of undefined

**Action:** Create new issue #45

## Environment Variable Detection

The system automatically detects missing environment variables from error messages:

**Detected Patterns:**
- "VARIABLE_NAME is not defined"
- "VARIABLE_NAME is undefined"
- "Cannot find VARIABLE_NAME"
- "Missing required VARIABLE_NAME"
- "process.env.VARIABLE_NAME is undefined"

**Example:**

```
Error: DATABASE_URL is required but not defined
       at Object.<anonymous> (/app/src/database/client.ts:5:11)
```

**Detected Variables:**
- `DATABASE_URL`

## Cost Analysis

### OpenAI API Costs

**GPT-4.1-mini pricing (approximate):**
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens

**Estimated cost per error:**
- Error summarization: ~1,000 tokens (~$0.0015)
- Duplicate detection: ~500 tokens per comparison (~$0.00075)
- **Total per error: ~$0.002 - $0.005**

**Monthly estimate (100 errors):**
- ~$0.50/month

### GitHub API Costs

- Free for public repositories
- Included in GitHub Pro/Team plans for private repos

## Troubleshooting

### Issue: AI Summarization Fails

**Symptoms:**
- Generic error summaries
- Missing suggested fixes

**Solutions:**
1. Verify `OPENAI_API_KEY` is set correctly
2. Check API key has available credits
3. Review error logs for API rate limits
4. Fallback to basic summarization works automatically

### Issue: Duplicate Detection Not Working

**Symptoms:**
- Multiple issues created for same error
- Existing issues not found

**Solutions:**
1. Verify `GITHUB_TOKEN` has `repo` scope
2. Check issue label is exactly `railway-error`
3. Ensure issues are in `open` state
4. Review similarity threshold (default: 0.9 for duplicates)

### Issue: Environment Variables Not Detected

**Symptoms:**
- Missing env vars not listed in issues

**Solutions:**
1. Verify error message contains variable names in UPPER_CASE
2. Check error includes keywords like "undefined", "not defined", "missing"
3. Manual env var detection uses pattern matching - complex cases may need manual review

## Best Practices

1. **Monitor Issue Activity**: Regularly review created issues and Claude's PRs
2. **Adjust Similarity Threshold**: Tune duplicate detection sensitivity as needed
3. **Review AI Summaries**: Verify AI analysis accuracy, provide feedback
4. **Keep Environment Variables Documented**: Maintain list of required vars
5. **Test Regularly**: Use manual triggers to verify system works
6. **Check Costs**: Monitor OpenAI API usage monthly
7. **Update Patterns**: Add new error patterns as you discover them

## Future Enhancements

- [ ] Slack/Discord notifications with error summaries
- [ ] Trending error detection (same error increasing in frequency)
- [ ] Automatic rollback on critical errors
- [ ] Integration with Railway CLI for log streaming
- [ ] Custom AI prompts per service
- [ ] Error pattern learning (ML-based categorization)
- [ ] Automatic PR creation for common fixes
- [ ] Dashboard for error analytics

## Security Considerations

1. **API Keys**: Never commit API keys - use environment variables
2. **GitHub Token Scope**: Use minimum required scope (`repo`)
3. **Webhook Authentication**: Consider adding signature verification
4. **Rate Limiting**: Implement rate limits to prevent abuse
5. **Log Sanitization**: Ensure logs don't contain sensitive data

## Support

- **Documentation**: This file and related docs in `/docs`
- **Issues**: Create issue in repository with `bug` label
- **Logs**: Check GitHub Actions logs for workflow errors
- **Railway Logs**: Review Railway logs for webhook handler issues

---

**Version:** 2.0.0
**Last Updated:** 2025-11-23
**Status:** ✅ Ready for deployment
**Maintained By:** Automated system + Claude
