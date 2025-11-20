# Railway Deployment Monitoring Setup Guide

This guide explains how to set up automated Railway deployment failure monitoring with Claude auto-remediation.

## Overview

When a Railway deployment fails, this system automatically:
1. Detects the failure via Railway webhook
2. Creates/updates a GitHub issue tracking the failure
3. Notifies Claude via `@claude` mention in the issue
4. Claude investigates and creates a PR with fixes
5. Auto-merge workflow merges the PR once checks pass

## Architecture

```
Railway Deployment Failure
         ↓
Railway Webhook → GitHub Repository Dispatch Event
         ↓
GitHub Action: railway-deployment-monitor.yml
         ↓
Creates/Updates Issue + @claude mention
         ↓
GitHub Action: claude.yml (triggered by @claude)
         ↓
Claude investigates and creates PR
         ↓
GitHub Action: auto-merge-claude.yml
         ↓
PR auto-merged when checks pass
```

## Setup Instructions

### 1. Configure Railway Webhook

Railway supports webhook notifications for deployment events. You need to configure a webhook that triggers on deployment failures.

#### Option A: Using Railway CLI

```bash
# Install Railway CLI if not already installed
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Add webhook for deployment failures
railway webhooks add \
  --event deployment.failed \
  --url "https://api.github.com/repos/thomasdavis/omega/dispatches"
```

#### Option B: Using Railway Dashboard

1. Go to your Railway project: https://railway.app/project/211e3c65-73ad-4e79-8b74-ff3762fcda73
2. Navigate to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Configure:
   - **URL**: `https://api.github.com/repos/thomasdavis/omega/dispatches`
   - **Events**: Select `deployment.failed`
   - **Headers**: Add authorization header (see below)

#### Option C: Using Railway API

```bash
curl -X POST https://backboard.railway.app/graphql \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { webhookCreate(input: { projectId: \"211e3c65-73ad-4e79-8b74-ff3762fcda73\", url: \"https://api.github.com/repos/thomasdavis/omega/dispatches\", event: \"deployment.failed\" }) { id } }"
  }'
```

### 2. Configure GitHub Repository Dispatch

To allow Railway webhooks to trigger GitHub Actions, you need to set up authentication.

#### Create a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name: "Railway Webhook Dispatcher"
4. Select scopes:
   - `repo` (all)
   - `workflow`
5. Generate and copy the token

#### Add Token to Railway Environment

Add the token to Railway so it can authenticate with GitHub:

```bash
railway variables set GITHUB_DISPATCH_TOKEN=ghp_your_token_here
```

Or via Railway Dashboard:
1. Go to project settings
2. Navigate to **Variables**
3. Add `GITHUB_DISPATCH_TOKEN` with your token value

### 3. Create Webhook Transformer (If Needed)

Railway's webhook payload may need transformation to match GitHub's repository_dispatch format. There are two approaches:

#### Option 1: Direct Integration (Simplest)

If Railway allows custom payload formatting, configure the webhook to send:

```json
{
  "event_type": "railway_deployment_failed",
  "client_payload": {
    "deployment_id": "{{deployment.id}}",
    "error_message": "{{deployment.error}}",
    "service_name": "{{service.name}}",
    "commit_sha": "{{deployment.meta.commitSha}}",
    "commit_message": "{{deployment.meta.commitMessage}}"
  }
}
```

#### Option 2: Webhook Proxy (If Railway doesn't support custom payloads)

Create a simple webhook proxy service that receives Railway webhooks and forwards them to GitHub:

```typescript
// webhook-proxy.ts - Deploy this as a separate Railway service or serverless function
import { Hono } from 'hono';

const app = new Hono();

app.post('/railway-webhook', async (c) => {
  const payload = await c.req.json();

  // Transform Railway payload to GitHub repository_dispatch format
  const githubPayload = {
    event_type: 'railway_deployment_failed',
    client_payload: {
      deployment_id: payload.deployment?.id || 'unknown',
      error_message: payload.deployment?.error || payload.error || 'Unknown error',
      service_name: payload.service?.name || 'bot',
      commit_sha: payload.deployment?.meta?.commitSha || payload.meta?.commitSha,
      commit_message: payload.deployment?.meta?.commitMessage || payload.meta?.commitMessage || 'No message',
    },
  };

  // Forward to GitHub
  const response = await fetch(
    'https://api.github.com/repos/thomasdavis/omega/dispatches',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_DISPATCH_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(githubPayload),
    }
  );

  if (!response.ok) {
    console.error('Failed to dispatch to GitHub:', await response.text());
    return c.json({ error: 'Failed to dispatch' }, 500);
  }

  return c.json({ success: true });
});

export default app;
```

Deploy this proxy and point Railway webhook to: `https://your-proxy.railway.app/railway-webhook`

### 4. Test the Workflow

#### Manual Test

You can manually trigger the workflow to test it:

```bash
# Using GitHub CLI
gh workflow run railway-deployment-monitor.yml \
  -f deployment_id="test-123" \
  -f error_message="Test deployment failure" \
  -f service_name="bot"

# Or via API
curl -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/thomasdavis/omega/actions/workflows/railway-deployment-monitor.yml/dispatches \
  -d '{"ref":"main","inputs":{"deployment_id":"test-123","error_message":"Test error","service_name":"bot"}}'
```

#### Test with Actual Deployment Failure

1. Push a commit that will intentionally fail Railway deployment (e.g., syntax error)
2. Wait for Railway to detect the failure
3. Check that:
   - Webhook triggers the GitHub Action
   - Issue is created/updated with `railway-deployment-failure` label
   - Claude is mentioned in a comment
   - Discord notification is sent

### 5. Monitor and Maintain

#### View Workflow Runs

```bash
gh run list --workflow=railway-deployment-monitor.yml
```

#### View Workflow Logs

```bash
gh run view <run-id> --log
```

#### Tracking Issues

All deployment failures are tracked in a single issue with the label `railway-deployment-failure`. You can view it:

```bash
gh issue list --label railway-deployment-failure
```

## How It Works

### Step 1: Railway Webhook Triggers

When a Railway deployment fails, Railway sends a webhook to GitHub's repository_dispatch endpoint.

### Step 2: GitHub Action Runs

The `railway-deployment-monitor.yml` workflow is triggered and:
1. Extracts deployment information from the webhook payload
2. Finds or creates a tracking issue with label `railway-deployment-failure`
3. Comments on the issue with deployment details and mentions `@claude`
4. Sends a Discord notification

### Step 3: Claude Investigates

The mention of `@claude` in the comment triggers the `claude.yml` workflow, which:
1. Gives Claude access to the repository
2. Claude reads the error message and logs
3. Claude investigates the codebase to find the root cause
4. Claude creates a PR with fixes

### Step 4: Auto-Merge

The `auto-merge-claude.yml` workflow:
1. Detects PRs from `claude/*` branches
2. Enables auto-merge if the PR references an issue
3. Merges automatically when all CI checks pass

## Troubleshooting

### Webhook Not Triggering

Check:
- Railway webhook is configured correctly
- URL is correct: `https://api.github.com/repos/thomasdavis/omega/dispatches`
- Authorization header is set with valid GitHub token
- Token has `repo` and `workflow` scopes

View Railway webhook logs:
```bash
railway webhooks list
railway webhooks logs <webhook-id>
```

### GitHub Action Not Running

Check:
- Workflow file is in `.github/workflows/` directory
- Workflow has correct `on.repository_dispatch.types` configuration
- GitHub repository has Actions enabled
- Check Actions tab for any errors

### Claude Not Responding

Check:
- `@claude` is mentioned in the comment (case-sensitive)
- `claude.yml` workflow is enabled
- `CLAUDE_CODE_OAUTH_TOKEN` secret is set correctly
- Check Claude workflow runs in Actions tab

### Auto-Merge Not Working

Check:
- PR is from a `claude/*` branch
- PR body contains "Fixes #X" or similar reference
- All CI checks are passing
- `auto-merge-claude.yml` workflow is enabled

## Security Considerations

1. **GitHub Token**: Store the GitHub Personal Access Token securely in Railway environment variables
2. **Webhook Authentication**: Consider adding webhook signature verification
3. **Rate Limiting**: Railway webhooks may trigger multiple times - implement idempotency
4. **Permissions**: The GitHub token only needs `repo` and `workflow` scopes

## Cost Considerations

- **GitHub Actions**: Free for public repositories, usage-based for private
- **Railway Webhooks**: Free, included in Railway plans
- **Claude API**: Usage-based, triggered only on actual deployment failures

## Future Enhancements

1. **Webhook Signature Verification**: Add HMAC signature validation for Railway webhooks
2. **Failure Pattern Detection**: Track common failure patterns and suggest preventive measures
3. **Automated Rollback**: Automatically rollback to last known good deployment
4. **Deployment Analytics**: Track deployment success rates and common failure causes
5. **Smart Notifications**: Only notify on repeated failures, not transient issues

## Support

For issues or questions:
- Check GitHub Actions logs: https://github.com/thomasdavis/omega/actions
- Review Railway logs: https://railway.app/project/211e3c65-73ad-4e79-8b74-ff3762fcda73
- Create an issue: https://github.com/thomasdavis/omega/issues

---

**Last Updated**: 2025-11-20
**Status**: ✅ Ready for deployment
