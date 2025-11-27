# PR Comic Generation Feature

This feature automatically generates comic images for merged pull requests using Google's Gemini API and posts them to Discord.

## Overview

When a pull request is merged, a GitHub Action triggers that:
1. Fetches the PR conversation context (title, description, comments, commits)
2. Uses Gemini API (`gemini-3-pro-image-preview` model) to generate a comic image
3. Posts the comic to a designated Discord channel
4. Comments on the PR with the result

## Setup

### 1. Get a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure GitHub Secrets

Add the following secret to your GitHub repository:

- `GEMINI_API_KEY`: Your Gemini API key from step 1

(Note: `DISCORD_BOT_TOKEN` and `GITHUB_TOKEN` should already be configured)

### 3. Configure Discord Channel

The workflow file is already installed at:
```
.github/workflows/generate-comic-on-merge.yml
```

Configure the Discord channel via GitHub Secrets by adding:
- `DISCORD_CHANNEL_ID`: Your Discord channel ID (e.g., `1438147272855523358`)

**This should be a GitHub Secret**, not hardcoded in the workflow file.

To get a Discord channel ID:
1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click on the channel
3. Click "Copy Channel ID"

### 5. Install Dependencies

Run the following command to install the required npm packages:

```bash
pnpm install
```

This will install:
- `@google/genai`: Google Generative AI SDK
- `@octokit/rest`: GitHub API client

## How It Works

### Workflow Trigger

The GitHub Action (`comic-generation.yml`) triggers when:
- A pull request is closed
- AND the PR was merged (not just closed)

### Comic Generation Process

1. **Fetch PR Data**: Uses GitHub API to fetch:
   - PR title, description, author
   - All comments on the PR
   - Commit messages

2. **Build Context**: Extracts relevant conversation context from the PR data

3. **Generate Comic**: Calls Gemini API with a prompt that:
   - Describes the PR conversation
   - Requests a single-panel comic illustration
   - Specifies style (cartoon/comic book, family-friendly)
   - Asks for speech bubbles and coding references

4. **Save Image**: The generated image is:
   - Saved to `apps/bot/public/comics/pr-{number}-{timestamp}.png`
   - Stored in memory for Discord posting

5. **Post to Discord**: The bot posts:
   - An embed with PR information
   - The comic image as an attachment
   - A link back to the PR

6. **Comment on PR**: The action comments on the PR with:
   - Success/failure status
   - Image size
   - Link to Discord message (if successful)

## Files

### Service Files

- `apps/bot/src/services/geminiComicService.ts`: Gemini API integration
- `apps/bot/src/services/discordComicPoster.ts`: Discord posting logic

### Script Files

- `apps/bot/scripts/generate-pr-comic.ts`: Main script run by GitHub Action
- `.github/workflows/generate-comic-on-merge.yml`: GitHub Action workflow

### Configuration

- `apps/bot/.env.example`: Updated with `GEMINI_API_KEY`
- `apps/bot/package.json`: Added `@google/genai` and `@octokit/rest` dependencies

## Testing

To test the comic generation locally:

```bash
# Set environment variables
export GEMINI_API_KEY="your_key"
export DISCORD_BOT_TOKEN="your_token"
export GITHUB_TOKEN="your_github_token"
export PR_NUMBER="123"
export PR_TITLE="Test PR"
export PR_AUTHOR="username"
export PR_URL="https://github.com/owner/repo/pull/123"
export DISCORD_CHANNEL_ID="1438147272855523358"
export GITHUB_REPOSITORY="owner/repo"

# Run the script
cd apps/bot
npx tsx scripts/generate-pr-comic.ts
```

## Troubleshooting

### "GEMINI_API_KEY not configured"

Make sure you've added the `GEMINI_API_KEY` secret to your GitHub repository settings.

### "Channel not found"

Verify:
- The Discord channel ID is correct
- The bot has access to the channel
- The bot has permissions to post messages and upload files

### "Failed to generate comic"

Check:
- Your Gemini API key is valid and has available quota
- The API endpoint is accessible from GitHub Actions
- The PR data being sent is valid

### Comics not being generated

Verify:
- The workflow file is in `.github/workflows/` (not in `apps/bot/scripts/`)
- The PR was actually merged (not just closed)
- GitHub Actions has the necessary secrets configured

## Cost Considerations

Gemini API pricing (as of 2025):
- `gemini-3-pro-image-preview`: Check current pricing at [Google AI Pricing](https://ai.google.dev/pricing)
- Free tier: May be available for limited use
- Typical cost: Very low per image generation

Estimated cost for 100 PRs/month: ~$1-5 (varies based on pricing tier)

## Future Enhancements

Potential improvements:
- [ ] Add configurable comic styles (manga, western, minimalist, etc.)
- [ ] Support multiple Discord channels based on PR labels
- [ ] Generate comics for specific events (first contribution, major release, etc.)
- [ ] Add image moderation/filtering
- [ ] Support custom prompts via PR labels or comments
- [ ] Store comics in cloud storage (S3, Cloudinary, etc.)
- [ ] Add gallery page to view all generated comics

## License

This feature is part of the omega project and follows the same license.
