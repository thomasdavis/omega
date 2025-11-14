# Discord Bot Setup - GitHub Integration

## GitHub Actions Setup

### 1. Create Discord Webhook

1. Go to your Discord server
2. Select the channel where you want deployment notifications (#omega)
3. Click the gear icon (Edit Channel)
4. Go to "Integrations" → "Webhooks"
5. Click "New Webhook"
6. Name it "GitHub Deployments"
7. Copy the webhook URL

### 2. Set up GitHub Secrets

Go to your repository settings → Secrets and variables → Actions, and add:

**Required secrets:**
- `FLY_API_TOKEN` - Your Fly.io API token
  - Get it from: `flyctl auth token`

- `DISCORD_WEBHOOK_URL` - The webhook URL from step 1

- `GITHUB_TOKEN` - Personal Access Token for creating issues
  - Go to https://github.com/settings/tokens
  - Click "Generate new token (classic)"
  - Select scopes: `repo` (full control of private repositories)
  - Copy the token

### 3. Add GitHub Token to Fly.io Secrets

```bash
flyctl secrets set GITHUB_TOKEN=your_github_token_here -a omega-nrhptq
flyctl secrets set GITHUB_REPO=thomasdavis/omega -a omega-nrhptq
```

## How It Works

### Automatic Deployments
1. Push to `main` branch
2. GitHub Actions runs
3. Deploys to Fly.io
4. Posts deployment notification to Discord #omega channel

### Bot Can Create GitHub Issues
The bot can now create issues in the repository:

**Example usage:**
- "@bot create an issue to add a new search command"
- "@bot file a bug report about the calculator tool"
- "@bot we need to improve the response time"

The bot will use the `githubCreateIssue` tool to create a properly formatted issue with:
- Clear title
- Detailed description
- Appropriate labels (enhancement, bug, etc.)

### Workflow for Claude Code

1. **Bot creates issue** → Issue appears in GitHub
2. **Claude Code picks up issue** → Implements the feature/fix
3. **Claude Code commits** → Pushes to main
4. **GitHub Actions deploys** → Notification sent to Discord
5. **Repeat!**

This creates a self-improving bot that can identify its own improvements and execute them!

## Testing

Push this commit and you should see a deployment notification in Discord!
