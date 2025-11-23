# Railway Error Detection Scripts

This directory contains scripts for automated Railway error detection and GitHub issue creation.

## Scripts Overview

### 1. `railway-webhook-handler.ts` (Production)

**Purpose:** HTTP server that receives Railway webhooks and processes errors with AI.

**Features:**
- Receives Railway webhooks (deployment failures, runtime errors, crashes, OOM)
- Uses GPT-4.1-mini for error summarization
- Intelligent duplicate detection
- Environment variable analysis
- Creates/updates GitHub issues with @claude mention

**Usage:**
```bash
# Set environment variables
export OPENAI_API_KEY="sk-..."
export GITHUB_TOKEN="ghp_..."
export PORT="3000"

# Run the server
tsx scripts/railway-webhook-handler.ts
```

**Endpoints:**
- `GET /health` - Health check
- `POST /railway-webhook` - Webhook handler

**Deploy to Railway:**
```bash
railway up
```

### 2. `railway-error-processor.ts` (CLI Tool)

**Purpose:** Command-line tool for processing Railway errors from JSON files.

**Features:**
- Processes error payloads from files
- Used by GitHub Actions workflow
- Same AI processing as webhook handler
- Outputs results to stdout

**Usage:**
```bash
# Create error payload
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

### 3. `railway-webhook-proxy.ts` (Legacy)

**Purpose:** Simple webhook proxy that forwards Railway webhooks to GitHub repository_dispatch.

**Note:** This is the legacy implementation. Use `railway-webhook-handler.ts` instead for AI-powered processing.

**Usage:**
```bash
export GITHUB_DISPATCH_TOKEN="ghp_..."
tsx scripts/railway-webhook-proxy.ts
```

## Environment Variables

### Required

- `OPENAI_API_KEY` - OpenAI API key for GPT-4.1-mini
- `GITHUB_TOKEN` - GitHub Personal Access Token with `repo` scope

### Optional

- `GITHUB_REPO` - Repository name (default: `thomasdavis/omega`)
- `PORT` - Server port (default: `3000`)

## Testing

### Test Webhook Handler

```bash
# Start the handler
tsx scripts/railway-webhook-handler.ts

# In another terminal, send a test webhook
curl -X POST http://localhost:3000/railway-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "runtime",
    "service": {"name": "bot"},
    "log": {
      "level": "error",
      "message": "TypeError: Cannot read property '\''foo'\'' of undefined"
    },
    "timestamp": "2025-11-23T00:00:00Z"
  }'
```

### Test Error Processor

```bash
# Create test file
echo '{
  "type": "deployment",
  "service": {"name": "bot"},
  "deployment": {
    "id": "test-123",
    "status": "FAILED",
    "meta": {
      "commitSha": "abc123"
    }
  },
  "snapshot": {
    "error": "Build failed: Missing dependency"
  }
}' > test-error.json

# Process it
tsx scripts/railway-error-processor.ts test-error.json
```

## Response Format

Both scripts return detailed processing results:

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
    "title": "Runtime error in bot service",
    "severity": "high",
    "category": "Runtime Error",
    "missingEnvVars": ["OPENAI_API_KEY"]
  }
}
```

## Deployment

### Option 1: Deploy to Railway as Separate Service

1. Create new Railway service
2. Connect to repository
3. Set start command: `tsx scripts/railway-webhook-handler.ts`
4. Add environment variables:
   - `OPENAI_API_KEY`
   - `GITHUB_TOKEN`
   - `GITHUB_REPO`
5. Deploy
6. Configure Railway webhook to point to deployed URL

### Option 2: Use with GitHub Actions

The `railway-error-processor.ts` script is designed to work with GitHub Actions. See `.github/workflows/railway-error-monitor.yml` for the workflow configuration.

## Error Types Supported

- **runtime** - Runtime errors from application logs
- **deployment** - Deployment failures
- **crash** - Application crashes
- **oom** - Out of memory errors (exit code 137)
- **healthcheck** - Health check failures

## AI Processing Flow

1. **Error Detection** - Parse Railway webhook to extract error details
2. **AI Summarization** - Use GPT-4.1-mini to analyze and summarize
3. **Duplicate Check** - Fetch existing issues and compare similarity
4. **Environment Analysis** - Detect missing environment variables
5. **Issue Management** - Create new or update existing GitHub issue
6. **@claude Tagging** - Mention @claude for investigation

## Troubleshooting

### Handler won't start

**Check:**
- Environment variables are set correctly
- Port is not already in use
- Node.js version is 18+
- Dependencies are installed (`pnpm install`)

### Webhooks not processing

**Check:**
- Webhook URL is correct
- Railway webhook is configured for error events
- Check handler logs for errors
- Verify GitHub token has `repo` scope

### AI summarization fails

**Check:**
- `OPENAI_API_KEY` is valid
- API has available credits
- Not hitting rate limits
- Check logs for OpenAI API errors

## Related Documentation

- [Railway Error Automation Guide](../docs/RAILWAY_ERROR_AUTOMATION.md) - Complete setup guide
- [Railway Deployment Monitoring](../docs/RAILWAY_DEPLOYMENT_MONITORING.md) - Legacy deployment monitoring
- [Deployment Failure Automation](../docs/DEPLOYMENT_FAILURE_AUTOMATION.md) - Quick start guide

## Support

For issues or questions:
- Check logs in Railway dashboard
- Review GitHub Actions workflow runs
- Create issue in repository with `bug` label

---

**Version:** 2.0.0
**Last Updated:** 2025-11-23
