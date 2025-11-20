# Deployment Failure Automation - Quick Start

This document provides a quick overview of the automated deployment failure monitoring system.

## What Does This Do?

When a deployment fails (either in GitHub CI or Railway), the system automatically:

1. ✅ **Detects** the failure immediately
2. ✅ **Creates/updates** a tracking issue
3. ✅ **Notifies** Claude via `@claude` mention
4. ✅ **Claude investigates** and creates a PR with fixes
5. ✅ **Auto-merges** the PR when all checks pass

## Two Implementation Options

We've implemented **two complementary approaches** for maximum reliability:

### Option 1: GitHub Workflow Monitor (✅ Already Working)

**File:** `.github/workflows/railway-deploy-failure-monitor.yml`

Monitors the existing `CI Checks` workflow for failures. When the build or type-check fails:
- Automatically creates/updates a deployment failure issue
- Comments with error details and mentions `@claude`
- Sends Discord notification

**Pros:**
- ✅ Works immediately, no external setup required
- ✅ Monitors the existing CI workflow
- ✅ Catches build failures before they reach Railway
- ✅ Already integrated with your workflow

**Cons:**
- ❌ Only catches GitHub CI failures, not Railway-specific errors
- ❌ Doesn't monitor Railway deployment health checks

### Option 2: Railway Webhook Monitor (Requires Setup)

**Files:**
- `.github/workflows/railway-deployment-monitor.yml`
- `scripts/railway-webhook-proxy.ts`

Receives webhooks directly from Railway when deployments fail:
- Monitors Railway deployment status in real-time
- Catches Railway-specific failures (healthcheck, runtime crashes, OOM, etc.)
- Provides Railway deployment ID and detailed error logs

**Pros:**
- ✅ Catches Railway-specific runtime failures
- ✅ Monitors actual production deployment health
- ✅ More detailed Railway error information

**Cons:**
- ❌ Requires Railway webhook configuration
- ❌ May need a webhook proxy service
- ❌ Additional setup steps

## Quick Start

### Step 1: Verify GitHub Workflow Monitor (Already Active)

The workflow monitor is already in place and will automatically trigger on CI failures.

Test it:

```bash
# View the workflow file
cat .github/workflows/railway-deploy-failure-monitor.yml

# Check if it's running
gh workflow list | grep "Railway Deploy Failure Monitor"
```

### Step 2: (Optional) Set Up Railway Webhook Monitor

For comprehensive monitoring including Railway runtime failures, follow the detailed guide:

📖 **[Full Railway Setup Guide](./RAILWAY_DEPLOYMENT_MONITORING.md)**

Quick summary:
1. Configure Railway webhook to trigger on `deployment.failed`
2. Point webhook to GitHub repository_dispatch endpoint
3. Add GitHub token to Railway environment variables

## How It Works

```mermaid
graph TD
    A[Code Push to main] --> B{CI Checks}
    B -->|Pass| C[Deploy to Railway]
    B -->|Fail| D[Workflow Monitor Triggers]
    D --> E[Create/Update Issue]
    E --> F[@claude mention in comment]
    F --> G[Claude investigates]
    G --> H[Claude creates PR]
    H --> I{CI Checks Pass?}
    I -->|Yes| J[Auto-merge PR]
    I -->|No| G
    J --> C

    C --> K{Railway Deploy}
    K -->|Success| L[All Good!]
    K -->|Fail| M[Railway Webhook Monitor]
    M --> E
```

## Testing

### Test GitHub Workflow Monitor

1. Create a branch with a type error:
   ```bash
   git checkout -b test-failure
   echo "const broken: string = 123;" >> apps/bot/src/test.ts
   git add . && git commit -m "test: intentional type error"
   git push origin test-failure
   ```

2. Create a PR to main
3. Wait for CI to fail
4. Check that the workflow monitor creates an issue

### Test Railway Webhook Monitor

See the [full setup guide](./RAILWAY_DEPLOYMENT_MONITORING.md#test-the-workflow) for Railway webhook testing instructions.

## Monitoring

### View Recent Workflow Runs

```bash
# GitHub Workflow Monitor
gh run list --workflow=railway-deploy-failure-monitor.yml --limit 5

# Railway Webhook Monitor (if configured)
gh run list --workflow=railway-deployment-monitor.yml --limit 5
```

### View Deployment Failure Issues

```bash
# List all open deployment failure issues
gh issue list --label deployment-failure --state open

# View a specific issue
gh issue view <issue-number>
```

### Check Claude's Activity

```bash
# List PRs from Claude
gh pr list --author app/github-actions --state all --limit 10

# Check Claude workflow runs
gh run list --workflow=claude.yml --limit 10
```

## Troubleshooting

### Workflow Not Triggering

1. **Check workflow is enabled:**
   ```bash
   gh workflow list
   gh workflow enable railway-deploy-failure-monitor.yml
   ```

2. **Verify permissions:**
   - Go to repo Settings → Actions → General
   - Ensure "Read and write permissions" is enabled
   - Ensure "Allow GitHub Actions to create and approve pull requests" is checked

3. **Check workflow file syntax:**
   ```bash
   # Validate YAML syntax
   cat .github/workflows/railway-deploy-failure-monitor.yml | yq eval
   ```

### Claude Not Responding

1. **Verify Claude workflow is enabled:**
   ```bash
   gh workflow list | grep "Claude Code"
   ```

2. **Check CLAUDE_CODE_OAUTH_TOKEN secret:**
   ```bash
   gh secret list | grep CLAUDE
   ```

3. **Verify @claude mention format:**
   - Must be exactly `@claude` (case-sensitive)
   - Must be in issue comment, not issue body (for workflow monitor)

### Auto-Merge Not Working

1. **Verify auto-merge workflow:**
   ```bash
   gh workflow list | grep "Auto-Merge"
   ```

2. **Check PR branch name:**
   - Must start with `claude/`
   - Check: `gh pr view <pr-number> --json headRefName`

3. **Verify PR references issue:**
   - PR body must contain "Fixes #123" or similar
   - Check: `gh pr view <pr-number> --json body`

## Configuration

### Customize Issue Labels

Edit the workflow files to change labels:

```yaml
# .github/workflows/railway-deploy-failure-monitor.yml
--label "bug,deployment-failure,automated"
```

### Adjust Monitoring Frequency

The workflow monitor triggers on every CI workflow completion. To reduce noise:

```yaml
# Only trigger on repeated failures
if: ${{ github.event.workflow_run.conclusion == 'failure' && github.event.workflow_run.run_attempt > 1 }}
```

### Change Discord Notifications

Edit the Discord webhook step in the workflow files:

```yaml
- name: Send Discord notification
  uses: tsickert/discord-webhook@v6.0.0
  with:
    webhook-url: ${{ secrets.DISCORD_WEBHOOK_URL }}
    embed-title: "Your custom title"
```

## Best Practices

1. **Monitor the tracking issue**: Keep an eye on the main deployment failure issue
2. **Review Claude's PRs**: Always review PRs even though they auto-merge
3. **Check logs regularly**: Review workflow runs to catch issues early
4. **Update Railway config**: Keep `railway.toml` healthcheck settings appropriate
5. **Test thoroughly**: Use the test procedures to verify the system works

## Architecture

### Files Structure

```
.github/workflows/
├── railway-deploy-failure-monitor.yml    # Monitors CI workflow failures
├── railway-deployment-monitor.yml        # Receives Railway webhooks
├── claude.yml                            # Claude integration (existing)
└── auto-merge-claude.yml                 # Auto-merge Claude PRs (existing)

scripts/
└── railway-webhook-proxy.ts              # Optional webhook proxy

docs/
├── DEPLOYMENT_FAILURE_AUTOMATION.md      # This file - Quick start
└── RAILWAY_DEPLOYMENT_MONITORING.md      # Detailed Railway setup
```

### Workflow Dependencies

```
CI Checks Workflow
    ↓ (on failure)
Railway Deploy Failure Monitor
    ↓
Create/Update Issue + @claude mention
    ↓
Claude Code Workflow
    ↓
Claude creates PR
    ↓
Auto-Merge Claude PRs Workflow
    ↓
PR merged when checks pass
```

## Security

- GitHub tokens are stored as secrets
- Workflows use minimal required permissions
- Auto-merge only works for `claude/*` branches
- All actions are logged and auditable

## Cost

- **GitHub Actions**: Free for public repos, included in plan for private repos
- **Railway**: No additional cost, webhooks are included
- **Claude API**: Usage-based, only triggered on actual failures

## Support

- **Documentation**: See [RAILWAY_DEPLOYMENT_MONITORING.md](./RAILWAY_DEPLOYMENT_MONITORING.md)
- **Issues**: Create an issue in the repository
- **Logs**: Check GitHub Actions tab for workflow run details

---

**Status**: ✅ Active (GitHub Workflow Monitor)
**Last Updated**: 2025-11-20
**Maintained By**: Automated system + Claude
