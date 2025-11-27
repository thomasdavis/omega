# Gemini Comic Generation Integration

> Automated comic generation from PR conversations using Google's Gemini AI

## Overview

This integration automatically generates humorous comic strips from merged pull request conversations using Google's Gemini API (`gemini-3-pro-image-preview` model). When a PR is merged, a GitHub Action triggers the comic generator, which:

1. Fetches PR context (title, description, comments, commits, files changed)
2. Generates a 4-panel comic using Gemini AI
3. Posts the comic to Discord channel
4. Comments on the original GitHub issue with the comic info

## Architecture

```
┌─────────────────┐
│   PR Merged     │
│   (on GitHub)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  GitHub Action Workflow     │
│  (.github/workflows/        │
│   generate-comic.yml)       │
└────────┬────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Comic Generator Script      │
│  (apps/bot/src/scripts/      │
│   generate-comic.ts)         │
└────────┬────────────┬────────┘
         │            │
         ▼            ▼
┌────────────┐  ┌──────────────┐
│ Gemini API │  │ GitHub API   │
│ (Generate  │  │ (Fetch PR    │
│  Comic)    │  │  Context)    │
└────────────┘  └──────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Outputs:                   │
│  • Discord post             │
│  • GitHub issue comment     │
│  • Saved comic file         │
└─────────────────────────────┘
```

## Setup Instructions

### 1. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 2. Add GitHub Secrets

Add the following secrets to your GitHub repository:

- **`GEMINI_API_KEY`**: Your Google AI API key from step 1
- **`DISCORD_WEBHOOK_URL`**: Discord webhook URL for the target channel
- **`GITHUB_TOKEN`**: Automatically provided by GitHub Actions (no setup needed)

To add secrets:
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with its value

### 3. Create GitHub Action Workflow

**IMPORTANT:** Due to permission restrictions, the workflow file must be created manually.

Create the file `.github/workflows/generate-comic.yml` with the following content:

```yaml
name: Generate Comic from PR

on:
  pull_request:
    types: [closed]

jobs:
  generate-comic:
    name: Generate Comic with Gemini AI
    runs-on: ubuntu-latest
    if: github.event.pull_request.merged == true

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.0.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Extract issue number from PR body
        id: extract_issue
        run: |
          PR_BODY="${{ github.event.pull_request.body }}"
          ISSUE_NUM=$(echo "$PR_BODY" | grep -oiE "(fixes|closes|resolves) #([0-9]+)" | grep -oE "[0-9]+" | head -1)
          echo "issue_number=$ISSUE_NUM" >> $GITHUB_OUTPUT
          echo "Found issue number: $ISSUE_NUM"

      - name: Generate comic
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPO: ${{ github.repository }}
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
        run: |
          cd apps/bot
          pnpm tsx src/scripts/generate-comic.ts \
            ${{ github.event.pull_request.number }} \
            ${{ steps.extract_issue.outputs.issue_number }} \
            "${{ github.event.pull_request.title }}"

      - name: Upload comic as artifact
        uses: actions/upload-artifact@v4
        with:
          name: pr-${{ github.event.pull_request.number }}-comic
          path: comics/*.png
          retention-days: 30
```

### 4. Configure Discord Channel

The comic will be posted to the Discord channel associated with the webhook URL in `DISCORD_WEBHOOK_URL`.

To get a Discord webhook URL:
1. Go to Discord channel settings
2. Navigate to Integrations → Webhooks
3. Click "New Webhook" or use existing one
4. Copy the webhook URL

**Note:** The issue description mentions channel `<#1438147272855523358>` - ensure your webhook points to this channel.

### 5. Update Environment Variables (Vercel/Railway)

If deploying to Vercel or Railway, add the `GEMINI_API_KEY` environment variable to your deployment platform:

**Vercel:**
- Go to Project Settings → Environment Variables
- Add `GEMINI_API_KEY` with your API key value

**Railway:**
- Go to your project → Variables
- Add `GEMINI_API_KEY` with your API key value

## Usage

### Automatic Trigger

The comic generator runs automatically when a PR is merged. No manual intervention needed.

The workflow:
1. Detects when a PR is merged
2. Extracts the PR number, title, and related issue number
3. Runs the comic generator script
4. Posts results to Discord and GitHub

### Manual Testing

You can test the comic generator locally:

```bash
# Set environment variables
export GEMINI_API_KEY="your-api-key"
export GITHUB_TOKEN="your-github-token"
export GITHUB_REPO="thomasdavis/omega"
export DISCORD_WEBHOOK_URL="your-webhook-url"

# Run the script
cd apps/bot
pnpm tsx src/scripts/generate-comic.ts <pr-number> [issue-number] [pr-title]

# Example:
pnpm tsx src/scripts/generate-comic.ts 123 45 "Fix: Update welcome message"
```

### Command-line Arguments

```
tsx src/scripts/generate-comic.ts <pr-number> [issue-number] [pr-title]
```

- **`pr-number`** (required): The pull request number
- **`issue-number`** (optional): The related issue number (for commenting)
- **`pr-title`** (optional): The PR title (for Discord embed)

## How It Works

### 1. PR Context Collection

The script fetches comprehensive PR context from GitHub API:

- **PR Details**: Title, description, author, timestamps
- **Comments**: Up to 5 recent comments with authors
- **Commits**: Up to 5 commits with messages and authors
- **Files Changed**: Up to 10 changed files with diff stats

### 2. Prompt Generation

A detailed prompt is created for Gemini AI that includes:

- PR title and description
- Summary of comments
- Key commits
- Files changed summary
- Instructions for 4-panel comic strip layout
- Style guidelines (web comic, colorful, humorous)

### 3. Gemini AI Generation

The script uses the `gemini-3-pro-image-preview` model with:

- **Model**: `gemini-3-pro-image-preview`
- **Response Modality**: `image`
- **Output**: PNG format comic strip

### 4. Output Distribution

The generated comic is:

1. **Saved locally**: To `comics/pr-{number}-{timestamp}.png`
2. **Posted to Discord**: Via webhook with embed containing PR info
3. **Commented on issue**: Tags `@claude` with comic info

## File Structure

```
omega/
├── .github/
│   └── workflows/
│       └── generate-comic.yml          # GitHub Action workflow (manual creation required)
├── apps/
│   └── bot/
│       ├── src/
│       │   └── scripts/
│       │       └── generate-comic.ts   # Main comic generator script
│       └── package.json                # Updated with @google/genai and mime
├── comics/                             # Generated comics directory (auto-created)
│   └── pr-{number}-{timestamp}.png
├── docs/
│   └── GEMINI_COMIC_GENERATION.md      # This file
└── turbo.json                          # Updated with GEMINI_API_KEY env var
```

## Dependencies

The following dependencies have been added to `apps/bot/package.json`:

- **`@google/genai`**: Google Generative AI SDK for Gemini API
- **`mime`**: MIME type utilities

## Error Handling

The script includes comprehensive error handling:

- **Missing API key**: Exits with error message
- **GitHub API failures**: Logs error and exits
- **Gemini generation failures**: Logs error details and exits
- **Discord posting failures**: Warns but continues (optional step)
- **Issue commenting failures**: Warns but continues (optional step)

## Troubleshooting

### Comic generation fails

**Check:**
1. `GEMINI_API_KEY` is correctly set in GitHub secrets
2. The Gemini API key is valid and has quota remaining
3. GitHub Actions logs for detailed error messages

### Discord post not appearing

**Check:**
1. `DISCORD_WEBHOOK_URL` is correctly set
2. Webhook URL points to the correct channel
3. Bot has permissions in the Discord server

### Issue comment not created

**Check:**
1. `GITHUB_TOKEN` has permissions to comment on issues
2. Issue number was correctly extracted from PR body
3. PR body contains "Fixes #X", "Closes #X", or "Resolves #X"

## Cost Considerations

### Gemini API Costs

- **Model**: `gemini-3-pro-image-preview`
- **Pricing**: Check [Google AI Pricing](https://ai.google.dev/pricing) for current rates
- **Estimated cost**: ~$0.01-0.05 per comic (varies by region and model)

### GitHub Actions Minutes

- **Free tier**: 2,000 minutes/month
- **Estimated usage**: ~2-5 minutes per comic generation
- **Typical cost**: Free for most projects

## Future Enhancements

Potential improvements:

1. **Custom comic styles**: Allow users to specify comic style via PR labels
2. **Multiple panels**: Support different panel layouts (2-panel, 6-panel, etc.)
3. **Character consistency**: Maintain consistent character designs across comics
4. **Comic gallery**: Create a webpage showcasing all generated comics
5. **Voting system**: Let Discord users vote on best comics
6. **Animation**: Generate animated GIFs instead of static images

## References

- [Google Generative AI Docs](https://ai.google.dev/docs)
- [Gemini API Reference](https://ai.google.dev/api)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Discord Webhooks Guide](https://discord.com/developers/docs/resources/webhook)

## License

This integration is part of the Omega project and follows the same license.

---

**Last Updated:** 2025-11-27
**Status:** ✅ Ready for deployment
**Maintainer:** Claude Code
