# Omega

**A self-evolving AI Discord bot with 80+ specialized tools, multi-database architecture, and autonomous development capabilities.**

Built with AI SDK v6, Discord.js, Next.js, and deployed on Railway.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Deployment](#deployment)
- [AI Tools Reference](#ai-tools-reference)
- [API Reference](#api-reference)
- [GitHub Actions & CI/CD](#github-actions--cicd)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Omega is a sophisticated Discord AI bot that combines:

- **Philosophical Personality**: Stoic, truth-focused, measured wisdom with clarity and thoughtful insights
- **80+ Specialized AI Tools**: From code execution in 42+ languages to interactive artifact creation, database operations, GitHub integration, and more
- **Self-Evolution Capability**: Can analyze its own behavior and propose improvements via GitHub issues
- **Intelligent Engagement**: AI-powered decision making for natural conversation participation
- **Full Transparency**: Reports all tool usage with arguments and results in formatted messages
- **Web Dashboard**: Next.js-powered interface for viewing profiles, messages, comics, documents, and analytics

### What Makes Omega Different

Unlike basic chatbots, Omega:

- **Listens to ALL messages** (not just slash commands) for natural conversation flow
- **Decides intelligently** when to respond using AI analysis
- **Executes code** in 42+ programming languages via Unsandbox
- **Creates interactive web content** (HTML/SVG) with shareable preview links
- **Manages dual databases** (PostgreSQL + MongoDB) with 27 database tools
- **Generates daily AI blog posts** automatically
- **Creates PR comics** when pull requests are merged
- **Can trigger its own improvements** through GitHub issue creation

---

## Key Features

### 1. Intelligent Response System

**Multi-Tier Decision Making:**
- Always responds to: DMs, direct mentions (@bot), replies to bot messages
- AI Analysis: Uses GPT-4.1-mini to analyze if messages warrant engagement
- Inclusive by design: High confidence thresholds to be helpful, not passive

**Context Awareness:**
- Fetches message history for conversation context
- Understands conversation flow and references
- Detects and handles Discord file attachments automatically
- Maintains personality consistency across conversations

### 2. 80+ Specialized AI Tools

**Categories:**

| Category | Tools | Examples |
|----------|-------|----------|
| **Code Execution** | 3 | unsandbox (42+ languages), typescript-validator, calculator |
| **Web & Research** | 5 | webFetch, search, researchEssay, hackerNews, arxiv |
| **Content Creation** | 12 | artifact, asciiGraph, generateHaiku, generateSonnet, createBlogPost |
| **GitHub Integration** | 10 | createIssue, listIssues, closeIssue, mergePR, listPullRequests |
| **Database (PostgreSQL)** | 13 | pgQuery, pgInsert, pgSelect, pgUpdate, pgDelete, pgCreateTable |
| **Database (MongoDB)** | 14 | mongoInsert, mongoFind, mongoAggregate, mongoCreateIndex |
| **Music Generation** | 4 | generateSheetMusic, abcToMidi, abcToMp3 |
| **User Analysis** | 6 | getUserProfile, psychoAnalysis, psychoHistory, introspectFeelings |
| **File Management** | 5 | fileUpload, uploadMyPhoto, listUploadedFiles, exportConversation |
| **Documents** | 4 | createLiveDocument, readLiveDocument, searchDocuments |
| **Miscellaneous** | 15+ | weather, tellJoke, fishJoke, defineWord, translateToSpanish |

### 3. Web Dashboard (Next.js)

- **Homepage**: Architecture visualization
- **User Profiles**: `/profiles` - View psychological and behavioral analysis
- **Message History**: `/messages` - Analytics and conversation history
- **Comics Gallery**: `/comics` - AI-generated PR comics
- **Blog**: `/blog` - Daily AI-generated philosophical posts
- **Documents**: `/documents` - Real-time collaborative documents (Yjs + Pusher)
- **Todos**: `/todos` - Task management interface
- **Playground**: `/playground` - Interactive UI component demos

### 4. Self-Evolution System

Omega can:
- Analyze its own patterns and suggest improvements
- Create GitHub issues for new features
- Trigger automated PR creation via Claude Code
- Monitor deployment errors and create fix issues
- Generate comics for merged PRs

### 5. Dual-Database Architecture

**PostgreSQL (Primary)**
- User profiles with 100+ psychological attributes
- Message history with sentiment analysis
- Documents with real-time collaboration
- Music files (ABC, MIDI, MP3)
- Generated images
- Schema registry for migrations

**MongoDB (Flexible)**
- User-created collections
- Dynamic schemas
- Aggregation pipelines
- Experimental data storage

---

## Architecture

```
                                    ┌─────────────────────────────────────┐
                                    │           Discord Users              │
                                    └──────────────┬──────────────────────┘
                                                   │
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              Discord Gateway (WebSocket)                          │
└──────────────────────────────────────────────────────────────────────────────────┘
                                                   │
                          ┌────────────────────────┴────────────────────────┐
                          │                                                 │
                          ▼                                                 ▼
        ┌─────────────────────────────────┐               ┌─────────────────────────────────┐
        │         omega-bot               │               │          omega-web              │
        │      (Discord Bot)              │               │       (Next.js App)             │
        │                                 │               │                                 │
        │  ┌───────────────────────────┐  │               │  ┌───────────────────────────┐  │
        │  │    Message Handler        │  │               │  │      API Routes           │  │
        │  │  ┌─────────────────────┐  │  │               │  │  /api/messages            │  │
        │  │  │  shouldRespond AI   │  │  │               │  │  /api/profiles            │  │
        │  │  └─────────────────────┘  │  │               │  │  /api/documents           │  │
        │  │  ┌─────────────────────┐  │  │               │  │  /api/comics              │  │
        │  │  │    Agent (AI SDK)   │  │  │               │  │  /api/todos               │  │
        │  │  │    80+ Tools        │  │  │               │  └───────────────────────────┘  │
        │  │  └─────────────────────┘  │  │               │                                 │
        │  └───────────────────────────┘  │               │  ┌───────────────────────────┐  │
        │                                 │               │  │       Pages               │  │
        │  ┌───────────────────────────┐  │               │  │  /profiles                │  │
        │  │       Services            │  │               │  │  /messages                │  │
        │  │  - Scheduler (cron)       │  │               │  │  /documents               │  │
        │  │  - Error Monitoring       │  │               │  │  /comics                  │  │
        │  │  - Daily Blog             │  │               │  │  /blog                    │  │
        │  │  - Comic Generation       │  │               │  └───────────────────────────┘  │
        │  └───────────────────────────┘  │               │                                 │
        └─────────────────┬───────────────┘               └─────────────────┬───────────────┘
                          │                                                 │
                          └────────────────────────┬────────────────────────┘
                                                   │
                          ┌────────────────────────┴────────────────────────┐
                          │                                                 │
                          ▼                                                 ▼
        ┌─────────────────────────────────┐               ┌─────────────────────────────────┐
        │         PostgreSQL              │               │          MongoDB                │
        │   (Primary - Relational)        │               │    (Flexible - Documents)       │
        │                                 │               │                                 │
        │  - User Profiles (100+ fields)  │               │  - User Collections             │
        │  - Message History              │               │  - Dynamic Schemas              │
        │  - Documents                    │               │  - Aggregations                 │
        │  - Music (ABC, MIDI, MP3)       │               │                                 │
        │  - Generated Images             │               │                                 │
        │  - Schema Registry              │               │                                 │
        └─────────────────────────────────┘               └─────────────────────────────────┘
                                                   │
                          ┌────────────────────────┴────────────────────────┐
                          │                                                 │
                          ▼                                                 ▼
        ┌─────────────────────────────────┐               ┌─────────────────────────────────┐
        │         External APIs           │               │        Shared Volume            │
        │                                 │               │          /data                  │
        │  - OpenAI (GPT-4.1-mini)        │               │                                 │
        │  - Google Gemini                │               │  - /data/uploads                │
        │  - Unsandbox (code exec)        │               │  - /data/comics                 │
        │  - GitHub API                   │               │  - /data/blog                   │
        │  - Twitter API                  │               │  - /data/images                 │
        │  - Pusher (real-time)           │               │                                 │
        └─────────────────────────────────┘               └─────────────────────────────────┘
```

### Message Flow

```
User Message → Discord Gateway → Bot
    ↓
shouldRespond() - AI decides if bot should engage
    ↓
runAgent() - AI SDK v6 with 80+ tools
    ↓
Tool Execution (if needed)
    ↓
Database Save (message + tool results)
    ↓
Response + Tool Report → Discord
```

---

## Project Structure

```
omega/
├── apps/
│   ├── bot/                           # Discord AI Bot
│   │   ├── src/
│   │   │   ├── index.ts              # Entry point
│   │   │   ├── handlers/
│   │   │   │   └── messageHandler.ts # Message processing
│   │   │   ├── lib/
│   │   │   │   ├── shouldRespond.ts  # AI response decision
│   │   │   │   ├── systemPrompt.ts   # Agent system prompt
│   │   │   │   ├── feelings/         # Emotional analysis
│   │   │   │   └── unsandbox/        # Code execution
│   │   │   ├── services/
│   │   │   │   ├── scheduler.ts      # Cron jobs
│   │   │   │   ├── dailyBlogService.ts
│   │   │   │   └── errorMonitoringService.ts
│   │   │   └── utils/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                           # Next.js Web App
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── api/                   # REST API routes
│       │   │   ├── messages/
│       │   │   ├── profiles/
│       │   │   ├── documents/
│       │   │   ├── comics/
│       │   │   └── [many more...]
│       │   ├── profiles/              # User profile pages
│       │   ├── messages/              # Message analytics
│       │   ├── documents/             # Collaborative docs
│       │   ├── comics/                # Comic gallery
│       │   └── blog/                  # AI blog
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── agent/                         # AI Agent Package
│   │   ├── src/
│   │   │   ├── agent.ts              # Main AI execution
│   │   │   ├── toolLoader.ts         # Dynamic tool loading
│   │   │   ├── toolRouter.ts         # Tool selection
│   │   │   ├── tools/                # 80+ tool definitions
│   │   │   │   ├── calculator.ts
│   │   │   │   ├── unsandbox.ts
│   │   │   │   ├── webFetch.ts
│   │   │   │   ├── github/           # GitHub tools
│   │   │   │   └── [many more...]
│   │   │   └── services/
│   │   └── package.json
│   │
│   ├── database/                      # Database Package
│   │   ├── src/
│   │   │   ├── index.ts              # Public API
│   │   │   ├── postgres/             # PostgreSQL (13 tools)
│   │   │   │   ├── client.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── messageService.ts
│   │   │   │   ├── userProfileService.ts
│   │   │   │   └── tools/
│   │   │   └── mongodb/              # MongoDB (14 tools)
│   │   │       ├── client.ts
│   │   │       └── tools/
│   │   └── package.json
│   │
│   ├── shared/                        # Shared Utilities
│   │   └── src/
│   │
│   └── ui/                            # UI Component Library
│       └── src/
│           ├── components/
│           └── styles/
│
├── .github/
│   └── workflows/                     # CI/CD Workflows
│       ├── ci-main.yml
│       ├── ci-pr.yml
│       ├── claude-pr-create.yml
│       ├── claude-merge.yml
│       ├── comic-generate.yml
│       └── [more workflows...]
│
├── docs/                              # Documentation
├── scripts/                           # Utility scripts
├── turbo.json                         # Turborepo config
├── pnpm-workspace.yaml               # Workspace definition
└── package.json                       # Root package.json
```

---

## Technology Stack

### Core

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 22+ | Runtime |
| **TypeScript** | 5.6.3 | Type safety |
| **pnpm** | 9.0.0 | Package management |
| **Turborepo** | 2.1.3 | Monorepo build orchestration |

### Discord Bot

| Technology | Version | Purpose |
|------------|---------|---------|
| **Discord.js** | 14.24.2 | Discord Gateway API |
| **AI SDK** | 6.0.0-beta.99 | Vercel AI SDK (agent protocol) |
| **OpenAI** | 4.104.0 | GPT-4.1-mini LLM |
| **Google Generative AI** | 0.21.0 | Gemini for images/comics |

### Web Application

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.1.0 | React framework |
| **React** | 19.0.0 | UI library |
| **Tailwind CSS** | 3.4.0 | Styling |
| **Three.js** | 0.181.2 | 3D graphics |
| **Yjs** | 13.6.20 | Real-time collaboration |
| **Pusher** | 5.2.0 | WebSocket events |

### Databases

| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 15+ | Primary relational database |
| **Prisma** | 5.22.0 | ORM |
| **MongoDB** | 7.0.0 | Document database |

### External Services

| Service | Purpose |
|---------|---------|
| **Unsandbox** | Code execution (42+ languages) |
| **GitHub API** | Issue/PR management |
| **Twitter API** | Comic posting |
| **Railway** | Deployment platform |

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9.0.0+
- PostgreSQL 15+
- MongoDB (optional)
- Discord Bot Token
- OpenAI API Key

### Installation

```bash
# Clone the repository
git clone https://github.com/thomasdavis/omega.git
cd omega

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Build all packages
pnpm build

# Start development
pnpm dev
```

---

## Environment Variables

### Required

```bash
# Discord
DISCORD_BOT_TOKEN=           # From Discord Developer Portal
DISCORD_PUBLIC_KEY=          # From Discord Developer Portal
DISCORD_APP_ID=              # From Discord Developer Portal

# OpenAI
OPENAI_API_KEY=              # From OpenAI Platform

# Database
DATABASE_URL=                # PostgreSQL connection string
```

### Optional

```bash
# MongoDB
MONGODB_URI=                 # MongoDB connection string
MONGODB_DATABASE=omega_bot   # Database name

# External Services
UNSANDBOX_API_KEY=           # For code execution
GITHUB_TOKEN=                # For GitHub integration
GITHUB_REPO=thomasdavis/omega

# Google AI
GEMINI_API_KEY=              # For image/comic generation

# Twitter
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=

# Pusher (real-time)
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=

# URLs
ARTIFACT_SERVER_URL=         # Public URL for artifacts
NEXT_PUBLIC_API_URL=         # Web app URL
```

---

## Development

### Commands

```bash
# Development (all packages)
pnpm dev

# Build (all packages)
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint
pnpm lint:fix

# Clean
pnpm clean
```

### Package-Specific Commands

```bash
# Bot only
pnpm --filter bot dev
pnpm --filter bot build

# Web only
pnpm --filter web dev
pnpm --filter web build

# Database package
pnpm --filter @repo/database build

# Agent package
pnpm --filter @repo/agent build
```

### Testing

```bash
# Run tests
pnpm --filter bot test

# Watch mode
pnpm --filter bot test:watch

# Coverage
pnpm --filter bot test:coverage
```

---

## Deployment

### Railway (Production)

The project deploys two services on Railway:

1. **omega-bot**: Discord bot (background worker)
2. **omega-web**: Next.js app (port 3000)

Both services share a persistent volume at `/data`.

**Automatic Deployment:**
- Push to `main` branch triggers deployment
- GitHub Actions handle CI/CD
- Discord notifications on success/failure

**Manual Deployment:**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Docker

```bash
# Build bot
docker build -f apps/bot/Dockerfile -t omega-bot .

# Build web
docker build -f apps/web/Dockerfile -t omega-web .
```

---

## AI Tools Reference

### Development Tools

| Tool | Description |
|------|-------------|
| `calculator` | Mathematical calculations |
| `unsandbox` | Execute code in 42+ languages |
| `typescriptValidator` | Validate TypeScript code |

### Web Tools

| Tool | Description |
|------|-------------|
| `webFetch` | Fetch and parse web content |
| `search` | Web search |
| `researchEssay` | Automated research and essay generation |
| `hackerNews` | Fetch Hacker News stories |
| `arxiv` | Search arXiv papers |

### Content Creation

| Tool | Description |
|------|-------------|
| `generateHaiku` | Generate haiku poetry |
| `generateSonnet` | Generate sonnets |
| `generateSheetMusic` | Create ABC notation music |
| `createBlogPost` | Write blog posts |
| `asciiGraph` | Text-based visualizations |
| `asciiMap` | ASCII art maps |

### GitHub Integration

| Tool | Description |
|------|-------------|
| `listIssues` | List repository issues |
| `createIssue` | Create new issues |
| `closeIssue` | Close issues |
| `listPullRequests` | List PRs |
| `mergePR` | Merge pull requests |

### Database Tools

**PostgreSQL (13 tools):**
- `pgQuery` - Raw SQL execution
- `pgInsert` - Insert rows
- `pgSelect` - Query with filters
- `pgUpdate` - Update rows
- `pgDelete` - Delete rows
- `pgCount` - Count rows
- `pgListTables` - List all tables
- `pgCreateTable` - Create tables
- `pgDropTable` - Drop tables
- `pgDescribeTable` - Table schema info
- `pgCreateIndex` - Create indexes
- `pgListIndexes` - List indexes
- `pgDropIndex` - Drop indexes

**MongoDB (14 tools):**
- `mongoInsert` - Insert documents
- `mongoFind` - Query documents
- `mongoFindOne` - Query single document
- `mongoUpdate` - Update documents
- `mongoDelete` - Delete documents
- `mongoCount` - Count documents
- `mongoListCollections` - List collections
- `mongoCreateCollection` - Create collections
- `mongoDropCollection` - Drop collections
- `mongoRenameCollection` - Rename collections
- `mongoAggregate` - Aggregation pipelines
- `mongoCreateIndex` - Create indexes
- `mongoListIndexes` - List indexes
- `mongoDropIndex` - Drop indexes

---

## API Reference

### Messages API

```
GET  /api/messages              # List messages
GET  /api/messages/stats        # Message statistics
```

### Profiles API

```
GET  /api/profiles              # List all profiles
GET  /api/profiles/[userId]     # Get profile by ID
GET  /api/profiles/by-username/[username]  # Get by username
```

### Documents API

```
GET    /api/documents           # List documents
POST   /api/documents           # Create document
GET    /api/documents/[id]      # Get document
PUT    /api/documents/[id]      # Update document
DELETE /api/documents/[id]      # Delete document
POST   /api/documents/[id]/join # Join collaboration
POST   /api/documents/[id]/leave # Leave collaboration
```

### Comics API

```
GET  /api/comics                # List comics
GET  /api/comics/[filename]     # Get comic image
```

### Music API

```
GET  /api/abc                   # List ABC sheet music
GET  /api/abc/[id]              # Get ABC file
GET  /api/midi                  # List MIDI files
GET  /api/midi/[id]             # Get MIDI file
GET  /api/mp3                   # List MP3 files
GET  /api/mp3/[id]              # Get MP3 file
```

### Generated Images API

```
GET  /api/generated-images      # List generated images
GET  /api/generated-images/[id] # Get image
```

### Health & Status

```
GET  /api/health                # Health check
GET  /api/status                # System status
```

---

## GitHub Actions & CI/CD

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci-main.yml` | Push to main | Run tests, type check |
| `ci-pr.yml` | Pull requests | PR validation |
| `claude-trigger.yml` | Issue/comment with @claude | Trigger Claude Code |
| `claude-pr-create.yml` | Push to claude/* branches | Create PRs automatically |
| `claude-merge.yml` | PR checks pass | Auto-merge Claude PRs |
| `comic-generate.yml` | PR merged | Generate PR comic |
| `database-migrate.yml` | Schema changes | Run migrations |
| `notify-discord-pr.yml` | PR events | Discord notifications |
| `close-labeled-issues.yml` | Issue labeled | Auto-close issues |

### Self-Evolution Flow

```
1. User/Bot creates issue → "@claude implement X"
2. claude-trigger.yml runs Claude Code
3. Claude commits to claude/issue-N branch
4. claude-pr-create.yml creates PR
5. CI checks run (ci-pr.yml)
6. claude-merge.yml auto-merges on success
7. comic-generate.yml creates PR comic
8. Railway auto-deploys
9. notify-discord-pr.yml sends notification
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Quick Start

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm type-check && pnpm build`)
5. Commit with clear messages
6. Push to your fork
7. Open a Pull Request

### Code Style

- TypeScript with strict mode
- ESM modules (`.js` extensions in imports)
- AI SDK v6 patterns for tools
- Zod schemas for validation

---

## License

This project is private.

---

## Resources

- [Discord.js Documentation](https://discord.js.org/)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Turborepo Documentation](https://turbo.build/repo/docs)

---

**Built with Omega** - The self-evolving AI Discord bot.
