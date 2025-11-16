# Omega - AI Discord Bot

A sophisticated Discord bot with AI-powered intelligence, 18+ specialized tools, and philosophical personality - built with AI SDK v6 and deployed on Railway.

## Features

- **AI-Powered Conversations** - Uses OpenAI GPT-4o with 50-step multi-agent reasoning
- **18+ Specialized Tools** - Code execution, web scraping, artifact creation, file hosting, and more
- **Natural Engagement** - Listens to all messages and intelligently decides when to respond
- **Philosophical Personality** - Stoic, truth-focused communication with self-modification capabilities
- **Tool Transparency** - Reports all tool usage with arguments and results
- **Persistent Storage** - Hosts files and artifacts permanently on Railway
- **GitHub Integration** - Auto-deploys via GitHub Actions

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Discord Bot Token with **MESSAGE CONTENT INTENT** enabled
- OpenAI API Key
- Railway account

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/omega.git
cd omega
pnpm install
```

### 2. Discord Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" tab:
   - Click "Add Bot"
   - Copy the **Bot Token**
   - Enable **MESSAGE CONTENT INTENT** (Critical!)
   - Enable **SERVER MEMBERS INTENT**
4. Go to OAuth2 → URL Generator:
   - Scopes: `bot`
   - Permissions: Send Messages, Read Message History, View Channels
   - Invite bot to your server

### 3. Environment Variables

Create `apps/bot/.env.local`:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
OPENAI_API_KEY=your_openai_api_key

# Optional
UNSANDBOX_API_KEY=your_unsandbox_key  # For code execution
GITHUB_TOKEN=your_github_token         # For GitHub integration
```

### 4. Local Development

```bash
# Run in development mode
pnpm dev

# Build for production
pnpm build

# Type check
pnpm type-check
```

### 5. Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy
railway up
```

Or use GitHub Actions for automatic deployment on push to main.

## Architecture

### Gateway Bot (Not Serverless)

Unlike serverless bots using Interactions API, Omega uses Discord's Gateway API to:
- Listen to ALL messages in real-time (WebSocket connection)
- Understand conversation context and flow
- Engage naturally without requiring slash commands
- Access full message history and attachments

This requires a long-running process (Railway, not Vercel).

### AI Agent System

```
Discord Message
    ↓
Gateway API (WebSocket)
    ↓
Message Handler
    ↓
AI Decision (should respond?)
    ↓
AI Agent (GPT-4o + 18 tools)
    ↓
Response + Tool Reports
    ↓
Discord
```

## 18 Specialized Tools

### Development & Code
- **calculator** - Math calculations
- **unsandbox** - Execute code in 11 languages (Python, JS, TypeScript, Go, Rust, etc.)

### Web & Research
- **webFetch** - Fetch and parse web content (respects robots.txt)
- **researchEssay** - Automated research and essay generation
- **hackerNewsPhilosophy** - Discover philosophical content from HN

### Content Creation
- **artifact** - Create interactive HTML/SVG/Markdown with shareable links
- **asciiGraph** - Generate text-based visualizations
- **recipeGenerator** - Generate detailed cooking recipes

### File Management
- **fileUpload** - Download and host Discord attachments permanently
- **exportConversation** - Export Discord conversations as Markdown

### GitHub Integration
- **githubCreateIssue** - Create GitHub issues with context

### Special Capabilities
- **selfModify** - Modify bot personality (requires user approval)
- **whoami** - Explain bot capabilities
- **moodUplifter** - Detect and respond to negative sentiment

## Personality System

Omega has a philosophical, truth-focused personality:
- Stoic and measured communication
- Emphasizes clarity and truth over comfort
- No emojis - pure intention
- Can self-modify based on feedback (with approval)

All personality settings are in `apps/bot/src/config/personality.json` and tracked via git.

## Project Structure

```
omega/
├── apps/bot/                      # Main Discord bot
│   ├── src/
│   │   ├── index.ts               # Entry point (Gateway connection)
│   │   ├── agent/
│   │   │   ├── agent.ts           # AI SDK v6 agent (50-step reasoning)
│   │   │   └── tools/             # 18 specialized tools
│   │   ├── handlers/
│   │   │   └── messageHandler.ts  # Message processing
│   │   ├── lib/
│   │   │   └── shouldRespond.ts   # AI-powered response decisions
│   │   ├── config/
│   │   │   └── personality.json   # Bot personality
│   │   └── server/
│   │       └── artifactServer.ts  # Express server for artifacts
│   ├── Dockerfile                 # Docker build
│   └── package.json
├── .github/workflows/
│   ├── deploy.yml                 # Auto-deploy to Railway
│   └── auto-create-claude-pr.yml  # Automated PR workflow
├── turbo.json                     # Turborepo config
└── pnpm-workspace.yaml           # pnpm workspaces
```

## Deployment

### Railway

Omega runs on Railway.app with:
- **Persistent disk** at `/data` for artifacts and uploads
- **HTTP server** on port 3001 for artifact/file serving
- **WebSocket** Gateway connection to Discord
- **Auto-deploy** via GitHub Actions

### GitHub Actions

Two workflows:
1. **deploy.yml** - Deploys to Railway on push to main
2. **auto-create-claude-pr.yml** - Auto-creates PRs from claude/** branches

## Configuration

### Response Behavior

Edit `apps/bot/src/lib/shouldRespond.ts` to customize when the bot responds:
- Always responds to: DMs, @mentions, replies to bot messages
- AI analyzes other messages for relevance
- Currently limited to #omega channel (configurable)

### Personality

Edit `apps/bot/src/config/personality.json` or ask the bot to modify itself:
```
User: "Can you be more casual and use emojis?"
Bot: *proposes changes and asks for approval*
User: "yes"
Bot: *modifies personality.json and commits to git*
```

### Adding Tools

1. Create tool in `apps/bot/src/agent/tools/myTool.ts`
2. Register in `apps/bot/src/agent/agent.ts`
3. Document in system prompt

See `apps/bot/CLAUDE.md` for detailed guide.

## Tech Stack

- **Runtime:** Node.js 20
- **Language:** TypeScript (ESM)
- **AI:** OpenAI GPT-4o via AI SDK v6 (beta.99)
- **Discord:** discord.js v14 (Gateway API)
- **Deployment:** Railway.app
- **Storage:** Railway persistent disk
- **CI/CD:** GitHub Actions
- **Monorepo:** Turborepo + pnpm workspaces

## Environment

### Required Intents

⚠️ **CRITICAL**: Enable these in Discord Developer Portal:
- **MESSAGE CONTENT INTENT** (required to read messages!)
- **SERVER MEMBERS INTENT**
- **PRESENCE INTENT**

Without MESSAGE CONTENT INTENT, the bot will connect but cannot see message content.

### Railway Configuration

Set these secrets in Railway Dashboard or via CLI:

```bash
railway variables set DISCORD_BOT_TOKEN=xxx
railway variables set OPENAI_API_KEY=xxx
railway variables set UNSANDBOX_API_KEY=xxx
railway variables set GITHUB_TOKEN=xxx
```

## Cost Estimation

- **Railway:** Free tier (512MB RAM, 1GB disk) or Starter $5/month
- **OpenAI:** ~$5-15/month for moderate usage (GPT-4o + GPT-4o-mini)
- **Total:** ~$10-20/month

## Troubleshooting

### Bot not responding
1. Check MESSAGE CONTENT INTENT is enabled
2. Verify bot has proper permissions
3. Check Railway logs: `railway logs`
4. Test in DM (should always respond)

### Tool execution failures
1. Check environment variables are set
2. View Railway logs for errors
3. Verify external service API keys

### Deployment failures
1. Check GitHub Actions logs
2. Verify Railway secrets are set correctly
3. Ensure RAILWAY_TOKEN has service-level access

## Resources

- **Full Documentation:** `apps/bot/CLAUDE.md`
- [Discord.js Guide](https://discord.js.org/)
- [AI SDK v6 Docs](https://sdk.vercel.ai/docs)
- [Railway Docs](https://docs.railway.app/)
- [OpenAI API](https://platform.openai.com/docs)

## License

MIT

---

**Built with AI SDK v6, Discord Gateway API, and Railway**

For detailed implementation guide, see `apps/bot/CLAUDE.md`
