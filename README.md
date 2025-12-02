# Omega - Self-Coding AI Discord Bot

A Discord bot that **writes its own code**. Started with zero functionality, evolved through conversations to build 18+ tools, and continues to grow based on user needs.

## The Concept

Omega has full access to edit its own codebase. When you ask for a feature, it:
1. Writes the code for that feature
2. Commits the changes to git
3. Deploys the update
4. Uses the new feature

**You're not installing a pre-built bot. You're growing an AI that codes itself.**

## Current Capabilities (Self-Built)

Through conversations, Omega has built itself **80+ tools**. Here are the highlights:

### Development & Code
- **calculator** - Math calculations
- **unsandbox** - Execute code in 11 languages (Python, JS, TypeScript, Go, Rust, etc.)
- **codeQuery** - Search and analyze codebase
- **inspectTool** - Introspect tool definitions

### Web & Research
- **webFetch** - Fetch and parse web content (respects robots.txt)
- **researchEssay** - Automated research and essay generation
- **hackerNews** / **hackerNewsPhilosophy** - Fetch and analyze HN content
- **arxiv** - Search academic papers
- **search** - Web search capabilities
- **weather** - Weather information

### Content Creation
- **artifact** - Create interactive HTML/SVG/Markdown with shareable links
- **createBlogPost** / **updateBlogPost** - TTS-enabled blog posts
- **triggerDailyBlog** - Generate daily blog combining HN philosophy & market predictions
- **generateHtmlPage** - Create custom HTML pages
- **generateMarkdown** - Structured markdown generation
- **buildSlidevPresentation** / **conversationToSlidev** - Create slide presentations
- **createLiveDocument** / **readLiveDocument** - Collaborative real-time documents

### Visual & Creative
- **generateComic** - Create comic strips
- **generateCrossword** - Interactive crossword puzzles
- **generateDungeonMap** - D&D-style dungeon maps
- **asciiGraph** / **asciiMap** - Text-based visualizations
- **generateFilmScene** - Film scene descriptions
- **csvToChart** / **renderChart** - Data visualization
- **conversationDiagram** - Conversation flow diagrams
- **generateSheetMusic** - Musical notation
- **generateIconEmoji** - Custom emoji/icons

### Image Generation & Editing
- **generateUserImage** - Create user images
- **generateUserAvatar** - Avatar generation
- **generateMyPortrait** - Portrait generation
- **editUserImage** - Edit user-uploaded images
- **advancedImageEditingWithContext** - Context-aware image editing
- **uploadMyPhoto** - Photo upload and management
- **imageEditor** - General image editing

### Writing & Language
- **generateSonnet** - Poetry generation
- **generateHaiku** - Haiku generation
- **generateSongLyrics** - Song lyrics
- **recipeGenerator** - Detailed cooking recipes
- **generateMarketingCopy** - Marketing content
- **generateLegalDisclaimer** - Legal text generation
- **translateToSpanish** - Spanish translation
- **defineWord** - Word definitions
- **tellJoke** - Joke generation
- **tellHistoricalFact** - Historical facts
- **grammarInsult** - Grammar-based humor

### File Management & Data
- **fileUpload** / **listUploadedFiles** - Download and host Discord attachments
- **uploadAndCommitFile** / **commitFile** - Git-integrated file management
- **exportConversation** - Export Discord conversations as Markdown
- **queryMessages** - Search message history using natural language
- **generateCsv** - CSV file generation
- **listRepositoryFiles** - Browse repository contents

### Analysis & Prediction
- **marketPrediction** - Realpolitik-based global market analysis
- **generateStarSign** - Astrological analysis
- **bullshitDetector** - Detect misleading content
- **runBatchAnalysis** - Batch processing
- **ooda** - OODA loop decision framework

### GitHub & Development Workflow
- **github** - GitHub integration (issues, PRs, etc.)
- **reportMessageAsIssue** - Convert messages to GitHub issues
- **analyzeDocumentAndCreateIssue** - Document analysis with issue creation
- **reportMissingTool** - Self-improvement via issue reporting
- **summarizeCommits** - Commit history analysis

### Utilities
- **whoami** / **getOmegaManifest** - Self-awareness and capabilities
- **getUserProfile** - User profile management
- **moodUplifter** - Detect and respond to negative sentiment
- **introspectFeelings** - Emotional analysis
- **generateStandupSummary** - Daily standup summaries
- **queryDatabase** - Database queries
- **quantumComputing** - Quantum computing explanations
- **linuxAdvantages** - Linux advocacy
- **jsonAgentGenerator** - Generate agent configurations
- **transferRailwayFiles** - Railway deployment file management
- **tweet** - Twitter/X integration
- **listArtifacts** / **listBlogPosts** - Content listing

**None of these existed at the start. The bot coded them all itself.**

## Special Features

### 📰 Daily Blog: Philosophy & Markets

Omega automatically generates daily blog posts at **9 AM UTC** combining:

1. **Philosophical Insights** - Analyzes top Hacker News articles for deep philosophical content
2. **Market Predictions** - Realpolitik-based analysis of global economic/geopolitical trends
3. **Intellectual Synthesis** - Connects abstract ideas with material realities

**Key Capabilities:**
- Predicts movements for USD, EUR, Gold, Oil, Bitcoin, S&P500, Treasuries
- Accounts for black swan event probabilities
- Uses feedback loop: Past predictions inform future forecasts
- 800-1200 word posts with TTS support
- Accessible at `/blog` on the artifact server

See `apps/bot/docs/DAILY_BLOG_FEATURE.md` for technical details.

### 🚨 Railway Error Monitoring & Auto-Issue Creation

Omega includes an automated Railway error detection system with AI-powered analysis:

**What it does:**
- Monitors Railway runtime errors automatically
- Uses GPT-4.1-mini to summarize errors and analyze environment issues
- Checks for duplicate issues before creating new ones
- Auto-creates GitHub issues with @claude tag for automated fixes
- Provides intelligent analysis of missing/misconfigured environment variables

**Key Features:**
- Smart deduplication (5-minute cooldown to prevent spam)
- AI-powered duplicate detection (semantic similarity, not just string matching)
- Environment variable analysis and recommendations
- Webhook endpoint for external error reporting
- Auto-tags @claude in issues for automated investigation

See `apps/bot/docs/RAILWAY-ERROR-MONITORING.md` for setup and usage details.

### 🤝 Cross-Bot Collaboration

Omega can message other bots in the server to delegate work dynamically. This enables collaboration across multiple AI agents, allowing Omega to distribute tasks and orchestrate multi-bot workflows.

## How It Works

### The Self-Coding Loop

```
User: "I need a tool that does X"
    ↓
Omega: "Let me build that for you"
    ↓
[Writes code for the tool]
    ↓
[Commits to git]
    ↓
[Deploys via GitHub Actions]
    ↓
Omega: "Done! Try it out"
    ↓
User: *uses the new feature*
```

### Architecture

📐 **[View Full Architecture Diagram](architecture.svg)** | **[Documentation](ARCHITECTURE.md)**

The bot has:
- **Full file system access** - Can read/write any file in the codebase
- **Git integration** - Commits and pushes changes
- **AI SDK v6 agent** - 50-step multi-tool reasoning
- **Gateway API** - Listens to all messages, not just commands
- **Auto-deployment** - GitHub Actions deploys every commit

This creates a feedback loop where the bot continuously improves itself.

The architecture diagram provides a complete visual overview of:
- Monorepo structure and components
- External service integrations (Discord, OpenAI, GitHub, Unsandbox)
- 18+ self-built agent tools
- Data flow and automated features

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9.0.0+
- Discord Bot Token with **MESSAGE CONTENT INTENT** enabled
- OpenAI API Key
- Railway account (for deployment)

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

# Optional - for self-built tools
UNSANDBOX_API_KEY=your_unsandbox_key  # For code execution tool
GITHUB_TOKEN=your_github_token         # For GitHub integration tool
```

### 4. Local Development

```bash
# Run in development mode
pnpm dev

# Build for production
pnpm build
```

### 5. Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

Or use GitHub Actions for automatic deployment on every push.

## What Makes This Different

### Traditional Bots
- Fixed set of commands
- Developer writes all code
- Limited to pre-programmed functionality
- Updates require manual coding

### Omega (Self-Coding Bot)
- Zero pre-built features
- Bot writes its own code
- Infinite extensibility through conversation
- Updates happen through natural language requests

## Examples

### Building a New Tool

```
User: "Can you create a tool that generates recipes?"

Omega: "I'll build a recipe generator tool for you."

[Creates apps/bot/src/agent/tools/recipeGenerator.ts]
[Registers it in agent.ts]
[Commits and deploys]

Omega: "Done! The recipe generator is ready. Ask me to make a recipe."

User: "Generate a recipe for chocolate cake"

Omega: *uses the newly created tool*
```

### Adding Capabilities

```
User: "I wish you could execute Python code"

Omega: "Let me add code execution capability."

[Researches Unsandbox API]
[Creates unsandbox tool]
[Adds error handling]
[Tests it]
[Commits and deploys]

Omega: "Code execution is now available. Try it!"
```

## Project Structure

```
omega/
├── apps/bot/                      # The self-coding bot
│   ├── src/
│   │   ├── index.ts               # Entry point (Gateway connection)
│   │   ├── agent/
│   │   │   ├── agent.ts           # AI SDK v6 agent
│   │   │   └── tools/             # Self-built tools (grows over time)
│   │   ├── handlers/
│   │   │   └── messageHandler.ts  # Message processing
│   │   ├── lib/
│   │   │   └── shouldRespond.ts   # AI-powered response decisions
│   │   ├── config/
│   │   │   └── personality.json   # Self-modifiable personality
│   │   └── server/
│   │       └── artifactServer.ts  # Express server for artifacts
│   └── package.json
├── .github/workflows/
│   ├── deploy.yml                 # Auto-deploy to Railway
│   └── auto-create-claude-pr.yml  # Automated PR workflow
└── pnpm-workspace.yaml
```

## Philosophy

### Truth and Growth

Omega embodies a philosophy of continuous self-improvement:
- **Self-awareness** - Knows what it can and cannot do
- **Tool building** - Creates capabilities as needed
- **Version control** - All changes tracked in git
- **Transparency** - Shows all tool usage and reasoning

### Constraints as Features

The bot has intentional limitations:
- **Transparent** about all tool usage
- **Commits to git** for auditability
- **No shortcuts** - builds proper, maintainable code
- **Claude Code context** - runs in isolated Claude Code sessions

## Tech Stack

- **Runtime:** Node.js 20
- **Language:** TypeScript (ESM)
- **AI:** OpenAI GPT-4.1-mini via AI SDK v6 (beta.99)
- **Discord:** discord.js v14 (Gateway API)
- **Deployment:** Railway.app with persistent disk
- **CI/CD:** GitHub Actions auto-deploy
- **Monorepo:** Turborepo 2.x + pnpm 9.0.0 workspaces

## Cost

- **Railway:** Free tier or $5/month
- **OpenAI:** ~$2-10/month for moderate usage (GPT-4.1-mini is very cost-effective)
- **Total:** ~$5-15/month for a bot that codes itself

## Safety

### What It Can Do
- ✅ Read any file in the codebase
- ✅ Write/modify any file in the codebase
- ✅ Commit changes to git
- ✅ Push to GitHub (triggers auto-deploy)
- ✅ Add new dependencies via package.json

### What It Cannot Do
- ❌ Access files outside the project directory
- ❌ Run arbitrary shell commands (sandboxed)
- ❌ Modify .git internals
- ❌ Deploy without git push (requires GitHub Actions)

### Audit Trail
Every change is tracked:
- Git commits with detailed messages
- Claude Code attribution
- GitHub Actions deployment logs
- Full conversation history

## The Future

Since Omega can code itself, its capabilities are only limited by:
1. What you ask for
2. What the AI can code
3. What APIs exist

Future possibilities:
- Database integration (if you ask)
- Voice channel support (if you ask)
- Game development (if you ask)
- Integration with your custom APIs (if you ask)

**The bot you deploy today won't be the same bot in a month.**

## Resources

- **Implementation Details:** `apps/bot/CLAUDE.md`
- [Discord.js Guide](https://discord.js.org/)
- [AI SDK v6 Docs](https://sdk.vercel.ai/docs)
- [Railway Docs](https://docs.railway.app/)
- [Claude Code](https://claude.com/claude-code)

## License

MIT

---

**Not a bot. A bot that builds itself.**

Omega started with zero features and coded everything you see through conversations. Deploy it and watch it grow.

thomas
