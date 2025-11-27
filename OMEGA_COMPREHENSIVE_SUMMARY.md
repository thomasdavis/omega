# Omega Discord Bot - Comprehensive System Summary
## For Marketing Design & Visual Documentation

**Document Version:** 1.0
**Date:** November 25, 2025
**Purpose:** Complete system overview for flowcharts, diagrams, and infographics

---

## 🎯 EXECUTIVE SUMMARY

**Omega** is a self-coding, AI-powered Discord bot that combines advanced natural language processing with 50+ specialized tools to provide comprehensive assistance across development, research, content creation, and automation tasks.

**Key Differentiators:**
- **Self-Coding**: Can modify its own source code and auto-deploy changes
- **Multi-Tool AI Agent**: 50+ specialized capabilities from code execution to image generation
- **Intelligent Context**: Analyzes conversation history for smart responses
- **Full Transparency**: All tool usage is logged and reported
- **Production-Ready**: Deployed on Railway with persistent storage and auto-scaling

---

## 🏗️ SYSTEM ARCHITECTURE OVERVIEW

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DISCORD PLATFORM                         │
│              (Guilds, Channels, DMs, Threads)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │ WebSocket (Gateway API)
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                      OMEGA DISCORD BOT                          │
│                    (Railway Deployment)                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              CORE SYSTEMS                               │   │
│  │                                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │   │
│  │  │   Discord    │  │   Message    │  │    Agent     │ │   │
│  │  │   Gateway    │→→│   Handler    │→→│   System     │ │   │
│  │  │   Client     │  │   (Router)   │  │  (AI SDK)    │ │   │
│  │  └──────────────┘  └──────────────┘  └──────┬───────┘ │   │
│  │                                              │          │   │
│  │                    ┌─────────────────────────┘          │   │
│  │                    ↓                                     │   │
│  │         ┌──────────────────────────┐                   │   │
│  │         │    50+ SPECIALIZED TOOLS  │                   │   │
│  │         │  (Code, Web, Files, etc.) │                   │   │
│  │         └──────────────────────────┘                   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              DATA & STORAGE LAYER                       │   │
│  │                                                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │   │
│  │  │  SQLite  │  │   File   │  │  Persistent Storage  │ │   │
│  │  │ Database │  │  System  │  │   (/data volume)     │ │   │
│  │  └──────────┘  └──────────┘  └──────────────────────┘ │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              HTTP ARTIFACT SERVER                       │   │
│  │          (Express - Port 3001)                          │   │
│  │                                                          │   │
│  │  Routes:                                                │   │
│  │  • /artifacts/:id - Shareable HTML/SVG artifacts       │   │
│  │  • /uploads/:id - User uploaded files                  │   │
│  │  • /blog - Blog post gallery                           │   │
│  │  • /documents/:id - Live collaborative docs            │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ API Calls
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL INTEGRATIONS                          │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  OpenAI  │  │  GitHub  │  │Unsandbox │  │   Pusher     │   │
│  │ GPT-4.1  │  │   API    │  │   API    │  │ (Real-time)  │   │
│  │   Mini   │  │          │  │          │  │              │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ DALL-E 3 │  │   Web    │  │  Turso   │  │   Slidev     │   │
│  │  Images  │  │  Search  │  │ Database │  │Presentations │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 20+ | JavaScript runtime |
| **Language** | TypeScript | 5.6.3 | Type-safe development |
| **Build System** | Turborepo | 2.1.3 | Monorepo orchestration |
| **Package Manager** | pnpm | 9.0.0 | Workspace management |
| **Discord** | discord.js | 14.24.2 | Discord Gateway API |
| **AI Framework** | Vercel AI SDK | 6.0.0-beta.99 | Agent orchestration |
| **AI Model** | OpenAI GPT-4.1 Mini | Latest | LLM reasoning |
| **Web Server** | Express | 4.18.2 | HTTP artifact server |
| **Database** | SQLite (@libsql) | 0.14.0 | Message persistence |
| **Real-time** | Pusher | 5.2.0 | Collaborative sync |
| **CRDT** | Yjs | 13.6.20 | Conflict-free editing |
| **Testing** | Vitest | 2.1.8 | Unit/integration tests |
| **Validation** | Zod | 3.23.8 | Schema validation |
| **Deployment** | Railway | - | Production hosting |
| **CI/CD** | GitHub Actions | - | Automation |

---

## 📊 DATA FLOW DIAGRAM

### Message Processing Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        1. ENTRY POINT                             │
└──────────────────────────────────────────────────────────────────┘
                              ↓
              User sends message in Discord
              (DM, mention, reply, or channel)
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                     2. GATEWAY RECEPTION                          │
│                                                                   │
│  Discord.js Client (WebSocket)                                   │
│  • Receives message event                                        │
│  • Parses message content, attachments, metadata                │
│  • Identifies channel, thread, user context                      │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                   3. CONTEXT GATHERING                            │
│                                                                   │
│  messageHandler.ts                                               │
│  • Fetch last 20 messages from channel/thread                   │
│  • Include thread starter if in thread                          │
│  • Detect file attachments                                       │
│  • Build conversation context array                             │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                   4. RESPONSE DECISION                            │
│                                                                   │
│  shouldRespond.ts (AI-powered)                                   │
│  • Analyze message type:                                         │
│    - DM? → Always respond                                        │
│    - Mention? → Always respond                                   │
│    - Reply to bot? → Always respond                              │
│    - Other? → AI analysis (GPT-4.1-mini)                        │
│  • Check for error patterns (deploy failures)                   │
│  • Return decision + confidence score (0-100%)                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                        Should respond?
                              ↓
                     ┌─────────────────┐
                     │       NO        │
                     │  (Stop here)    │
                     └─────────────────┘

                     ┌─────────────────┐
                     │      YES        │
                     └────────┬────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                    5. AGENT INVOCATION                            │
│                                                                   │
│  agent.ts (Vercel AI SDK v6)                                     │
│  • Generate comprehensive system prompt                          │
│  • Include personality, guidelines, tool docs                   │
│  • Pass conversation context (last 20 messages)                 │
│  • Configure: max 50 reasoning steps                            │
│  • Model: GPT-4.1-mini                                           │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                   6. AI REASONING & TOOL SELECTION                │
│                                                                   │
│  OpenAI GPT-4.1-mini                                             │
│  • Analyze user request                                          │
│  • Plan multi-step approach                                      │
│  • Select appropriate tools from 50+ available                  │
│  • Generate tool call parameters                                │
│  • Execute up to 50 reasoning steps                             │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                     7. TOOL EXECUTION                             │
│                                                                   │
│  tools/ (50+ specialized tools)                                  │
│  Examples:                                                        │
│  • unsandbox - Execute code (42+ languages)                     │
│  • webFetch - Fetch and parse web content                       │
│  • generateUserImage - DALL-E 3 image generation                │
│  • githubCreateIssue - Create GitHub issues                     │
│  • artifact - Generate shareable HTML/SVG                       │
│  • queryMessages - Search message history                       │
│  • createBlogPost - Generate blog posts                         │
│  ... and 43+ more                                                │
│                                                                   │
│  Each tool:                                                       │
│  1. Validates input (Zod schemas)                               │
│  2. Executes operation (API calls, computations)                │
│  3. Returns structured result                                    │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                    8. RESPONSE GENERATION                         │
│                                                                   │
│  AI SDK Response Processing                                       │
│  • Aggregate tool results                                        │
│  • Generate natural language response                           │
│  • Format tool execution report                                 │
│  • Prepare Discord message payload                              │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                     9. DATABASE PERSISTENCE                       │
│                                                                   │
│  messageService.ts → SQLite                                      │
│  Save:                                                            │
│  • Human message (with metadata)                                │
│  • AI response                                                   │
│  • Tool execution logs (name, args, results)                    │
│  • Timestamps, user IDs, channel context                        │
│  • Enable full-text search (FTS5)                               │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                   10. DISCORD OUTPUT                              │
│                                                                   │
│  Two messages sent:                                               │
│  1. Main response (natural language)                            │
│  2. Tool execution report (formatted):                          │
│     🔧 Tools Used:                                               │
│     1. toolName                                                  │
│        Arguments: {JSON}                                         │
│        Result: [formatted output]                               │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                  11. OPTIONAL ARTIFACTS                           │
│                                                                   │
│  IF artifact generated (HTML/SVG/etc):                           │
│  • Store at /data/artifacts/{uuid}                              │
│  • Generate shareable URL                                        │
│  • Add to gallery view                                           │
│  • Return URL in Discord message                                │
│                                                                   │
│  IF file uploaded:                                               │
│  • Store at /data/uploads/{uuid}                                │
│  • Return public download URL                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔧 CORE COMPONENTS

### 1. Discord Gateway Client
**File:** `apps/bot/src/index.ts`
**Package:** discord.js v14

**Responsibilities:**
- Maintain WebSocket connection to Discord
- Listen to all guild messages, DMs, threads
- Parse message events and metadata
- Handle bot shutdown gracefully
- Initialize all services on startup

**Required Intents:**
- Guilds
- GuildMessages
- MessageContent (privileged)
- DirectMessages

**Startup Sequence:**
1. Load environment variables
2. Initialize SQLite database
3. Start HTTP artifact server (port 3001)
4. Initialize storage directories
5. Connect to Discord Gateway
6. Start background services (scheduler, monitoring)
7. Register message event handlers

---

### 2. Message Handler & Router
**File:** `apps/bot/src/handlers/messageHandler.ts`

**Responsibilities:**
- Route incoming messages
- Gather conversation context (last 20 messages)
- Handle thread context (include thread starter)
- Detect and download file attachments
- Call decision logic (shouldRespond)
- Invoke AI agent
- Format and send responses
- Log tool execution
- Track sentiment/feelings

**Context Gathering:**
- Fetch last 20 messages from channel/thread
- Include message metadata (author, timestamp, attachments)
- Extract reply references
- Build message history array

**Output Formatting:**
- Main response as Discord message
- Separate tool execution report
- Suppress URL embeds to prevent clutter
- Handle long responses (split if needed)

---

### 3. Response Decision System
**File:** `apps/bot/src/lib/shouldRespond.ts`
**Model:** GPT-4.1-mini (cost-optimized)

**Decision Logic:**

**Always Respond:**
- Direct messages (DMs)
- Direct mentions (@omega)
- Replies to bot messages
- Error/deployment failure patterns

**AI Analysis Required:**
- Regular channel messages
- Uses GPT-4.1-mini for decision
- Returns confidence score (0-100%)
- Threshold: 70-90% confidence to respond

**Error Detection:**
Automatically detects patterns like:
- "deployment failed"
- "build error"
- "vercel error"
- Stack traces
- Health check failures
→ Triggers CONCERN feeling for higher engagement

**Minimal Acknowledgment Mode:**
- For simple greetings/thanks when mentioned
- Avoids verbose responses
- Still logs to database

---

### 4. AI Agent System
**File:** `apps/bot/src/agent/agent.ts`
**Framework:** Vercel AI SDK v6
**Model:** GPT-4.1-mini

**Architecture:**
- Uses `generateText()` with tool integration
- Max 50 reasoning steps
- Automatic tool selection
- Parallel tool execution support
- Result aggregation

**System Prompt Generation:**
- Personality definition (witty, philosophical, helpful)
- Tool documentation (all 50+ tools)
- Guidelines and constraints
- Network mode policies
- Response formatting rules

**Tool Registration:**
- 50+ tools registered with Zod schemas
- Each tool has:
  - Name and description
  - Input schema (Zod)
  - Execute function
  - Return value

**Execution Flow:**
1. Receive user message + context
2. Generate system prompt
3. Call GPT-4.1-mini with tools
4. AI selects and calls tools (up to 50 steps)
5. Collect tool results
6. Generate final response
7. Return response + tool execution log

---

### 5. Tool System (50+ Specialized Tools)
**Location:** `apps/bot/src/agent/tools/`

**Tool Categories:**

#### A. Code Execution (4 tools)
1. **unsandbox** - Execute code in 42+ languages
2. **unsandboxSubmit** - Submit async code job
3. **unsandboxStatus** - Check job status
4. **calculator** - Math calculations

#### B. Web & Research (4 tools)
5. **webFetch** - Fetch web content (robots.txt compliant)
6. **search** - Web search
7. **researchEssay** - Automated research + essay
8. **hackerNewsPhilosophy** - Curated HN philosophical content

#### C. Content Creation (5 tools)
9. **artifact** - Interactive HTML/SVG with shareable URLs
10. **generateHtmlPage** - Complete HTML pages
11. **asciiGraph** - Text-based visualizations
12. **renderChart** - Professional charts (QuickChart)
13. **recipeGenerator** - Cooking recipes

#### D. Image Generation (4 tools)
14. **generateUserImage** - DALL-E 3 image generation
15. **editUserImage** - Edit existing images
16. **imageEditor** - Image manipulation
17. **advancedImageEditingWithContext** - Context-aware editing

#### E. File Management (5 tools)
18. **fileUpload** - Host Discord attachments permanently
19. **listUploadedFiles** - List hosted files
20. **exportConversation** - Export Discord chat to Markdown
21. **transferRailwayFiles** - Railway file operations
22. **listRepositoryFiles** - Browse GitHub repos

#### F. GitHub Integration (5 tools)
23. **githubCreateIssue** - Create GitHub issues
24. **githubUpdateIssue** - Update issues
25. **githubCloseIssue** - Close issues
26. **githubMergePRTool** - Merge pull requests
27. **commitFile** - Git commit operations

#### G. Blog & Publishing (4 tools)
28. **createBlogPost** - TTS-enabled blog posts
29. **updateBlogPost** - Modify blog posts
30. **listBlogPosts** - List all blogs
31. **triggerDailyBlog** - Generate daily blog

#### H. Presentation (2 tools)
32. **buildSlidevPresentation** - Markdown → HTML presentations
33. **conversationToSlidev** - Conversation → slides

#### I. Data Analysis (3 tools)
34. **queryMessages** - Natural language message search
35. **codeQuery** - Search codebase
36. **marketPrediction** - Market forecasting

#### J. Collaboration (3 tools)
37. **createLiveDocument** - Real-time collaborative docs (Yjs)
38. **readLiveDocument** - Access live docs
39. **translateToSpanish** - Language translation

#### K. AI Analysis (2 tools)
40. **ooda** - OODA Loop decision framework
41. **introspectFeelings** - Report internal state

#### L. System & Meta (5 tools)
42. **whoami** - Explain bot capabilities
43. **inspectTool** - Analyze tool implementation
44. **getOmegaManifest** - Get bot manifest
45. **tellJoke** - Dynamic joke generation
46. **moodUplifter** - Sentiment analysis + encouragement

#### M. Utility (4 tools)
47. **linuxAdvantages** - Educational Linux content
48. **weather** - Weather information
49. **reportMissingTool** - Flag missing capabilities
50. **uploadAndCommitFile** - Upload + git commit

---

### 6. Database Layer
**File:** `apps/bot/src/database/`
**Technology:** SQLite (via @libsql/client)

**Schema:**

**messages table:**
- id (INTEGER PRIMARY KEY)
- role (TEXT) - human/assistant/tool
- content (TEXT)
- created_at (DATETIME)
- channel_id, guild_id, user_id
- tool_call_id, tool_name (for tool messages)
- metadata (JSON)

**messages_fts table:**
- Full-text search index (FTS5)
- Enables natural language search

**queries table:**
- id, query_text, translated_sql
- created_at
- Tracks NL→SQL translations

**Services:**
- `messageService.ts` - Save/query messages
- `documentService.ts` - Collaborative document storage
- `queryService.ts` - Natural language queries

**Storage Locations:**
- Production: `/data/omega.db` (Railway persistent disk)
- Local: `apps/bot/data/omega.db`

---

### 7. HTTP Artifact Server
**File:** `apps/bot/src/server/artifactServer.ts`
**Technology:** Express.js
**Port:** 3001 (configurable)

**Routes:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/artifacts/:id` | GET | Serve HTML/SVG artifacts |
| `/artifacts` | GET | Gallery view (list all) |
| `/uploads/:id` | GET | Download uploaded files |
| `/uploads` | GET | List uploaded files |
| `/blog/:slug` | GET | Individual blog posts |
| `/blog` | GET | Blog gallery |
| `/documents/:id` | GET | Collaborative documents |

**Features:**
- UUID-based unique URLs
- MIME type detection
- Metadata tracking (created date, type, title)
- CORS enabled
- Static file serving

**Storage:**
- Artifacts: `/data/artifacts/`
- Uploads: `/data/uploads/`
- Blog: `/data/blog/`
- Documents: `/data/documents/`

---

### 8. Background Services
**Location:** `apps/bot/src/services/`

**dailyBlogService.ts:**
- Scheduled at 9 AM UTC daily
- Combines HN philosophy + market predictions
- Generates blog post automatically
- TTS-enabled with random voice selection

**errorMonitoringService.ts:**
- Monitors Railway deployment logs
- Detects error patterns
- Triggers GitHub issue creation
- Classifies errors (deploy vs runtime)

**githubIssueManager.ts:**
- Creates issues from error patterns
- Extracts context (URLs, code snippets)
- Adds labels and formatting
- Prevents duplicate issues

**scheduler.ts:**
- Node-cron based task scheduling
- Manages daily blog generation
- Extensible for future scheduled tasks

---

### 9. Storage System
**File:** `apps/bot/src/utils/storage.ts`

**Centralized Paths:**
```typescript
/data/
├── artifacts/         # Generated HTML/SVG artifacts
├── uploads/          # User uploaded files
├── blog/             # Blog posts (Markdown with frontmatter)
├── documents/        # Collaborative documents (Yjs state)
├── omega.db          # SQLite database
└── omega.db-wal      # Write-ahead log
```

**Features:**
- Automatic directory initialization
- Railway persistent volume integration
- Graceful fallback for local development
- File metadata tracking

---

## 🌐 EXTERNAL INTEGRATIONS

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OMEGA BOT (Railway)                       │
└────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┘
     │      │      │      │      │      │      │      │
     ↓      ↓      ↓      ↓      ↓      ↓      ↓      ↓
┌─────────┐│      │      │      │      │      │      │
│ OpenAI  ││      │      │      │      │      │      │
│GPT-4.1  ││      │      │      │      │      │      │
│  Mini   ││      │      │      │      │      │      │
│         ││      │      │      │      │      │      │
│ DALL-E 3││      │      │      │      │      │      │
└─────────┘│      │      │      │      │      │      │
           │      │      │      │      │      │      │
      ┌────────┐  │      │      │      │      │      │
      │ GitHub │  │      │      │      │      │      │
      │  API   │  │      │      │      │      │      │
      └────────┘  │      │      │      │      │      │
                  │      │      │      │      │      │
            ┌──────────┐ │      │      │      │      │
            │Unsandbox │ │      │      │      │      │
            │Code Exec │ │      │      │      │      │
            └──────────┘ │      │      │      │      │
                         │      │      │      │      │
                   ┌──────────┐ │      │      │      │
                   │  Pusher  │ │      │      │      │
                   │Real-time │ │      │      │      │
                   └──────────┘ │      │      │      │
                                │      │      │      │
                          ┌──────────┐ │      │      │
                          │  Turso   │ │      │      │
                          │ SQLite   │ │      │      │
                          └──────────┘ │      │      │
                                       │      │      │
                                 ┌──────────┐ │      │
                                 │ DuckDuck │ │      │
                                 │   Go     │ │      │
                                 │  Search  │ │      │
                                 └──────────┘ │      │
                                              │      │
                                        ┌──────────┐ │
                                        │QuickChart│ │
                                        │   API    │ │
                                        └──────────┘ │
                                                     │
                                               ┌──────────┐
                                               │UncloseAI │
                                               │   TTS    │
                                               └──────────┘
```

### Integration Details

#### 1. OpenAI Integration
**Service:** GPT-4.1-mini (primary model) + DALL-E 3
**Package:** @ai-sdk/openai, ai@6.0.0-beta.99

**Usage:**
- **Main agent reasoning** (agent.ts)
- **Response decisions** (shouldRespond.ts)
- **Tool executions** (various tools)
- **Image generation** (DALL-E 3 API)

**API Endpoints:**
- `https://api.openai.com/v1/chat/completions`
- `https://api.openai.com/v1/images/generations`

**Cost Optimization:**
- Uses mini model for decisions (cheap)
- Multi-step reasoning up to 50 steps
- Estimated cost: $5-15/month

**Environment:** `OPENAI_API_KEY`

---

#### 2. Discord API
**Service:** Discord Gateway API (WebSocket)
**Package:** discord.js v14.24.2

**Integration Type:**
- Persistent WebSocket connection
- Real-time message events
- Two-way communication

**Features:**
- Listen to all guild messages
- Direct message support
- Thread awareness
- Attachment handling
- Rich embeds and formatting

**Required Permissions:**
- Send Messages
- Read Message History
- Attach Files
- Embed Links
- Use External Emojis

**Environment:** `DISCORD_BOT_TOKEN`

---

#### 3. Unsandbox Code Execution
**Service:** Remote code execution in 42+ languages
**API:** Custom HTTP client

**Supported Languages:**
- Python, JavaScript, TypeScript, Node.js
- Ruby, Go, Rust, Java, C++, C, PHP
- Bash, Shell, and 30+ more

**Features:**
- Async job-based execution
- Network isolation modes:
  - **zerotrust** (no network, default)
  - **semitrust** (network access)
- Artifact generation
- Rate limiting
- Execution timeout (max 300s)

**API Endpoints:**
- POST `/execute` - Submit code
- GET `/status/{job_id}` - Check status
- GET `/languages` - List supported languages
- GET `/validate` - Validate API key

**Security:**
- Container isolation
- No secrets allowed in code
- Safe by default (zerotrust)

**Environment:** `UNSANDBOX_API_KEY` (default: "open-says-me")

---

#### 4. GitHub API
**Service:** REST API v3
**Integration:** Native fetch() calls

**Operations:**
- Create issues with context
- Update issues (labels, state, body)
- Merge pull requests
- Close PRs and delete branches
- List repository files

**API Endpoints:**
```
POST   /repos/{owner}/{repo}/issues
PATCH  /repos/{owner}/{repo}/issues/{issue_number}
PUT    /repos/{owner}/{repo}/pulls/{pr_number}/merge
GET    /repos/{owner}/{repo}/pulls
DELETE /repos/{owner}/{repo}/git/refs/heads/{branch}
```

**Features:**
- Auto-extract URLs from messages
- Proper issue formatting
- Label management
- Duplicate detection
- Branch cleanup

**Environment:**
- `GITHUB_TOKEN` - Personal access token
- `GITHUB_REPO` - Format: owner/repo

---

#### 5. Turso SQLite Database
**Service:** Serverless SQLite (optional cloud)
**Package:** @libsql/client

**Dual Mode:**
- **Local:** File-based at `/data/omega.db`
- **Cloud:** Remote Turso database

**Tables:**
- messages (with FTS5 search)
- queries (NL→SQL history)
- documents (collaborative docs)

**Features:**
- Full-text search
- JSON metadata
- Automatic timestamps
- Persistent storage

**Environment:**
- `TURSO_DATABASE_URL` (optional)
- `TURSO_AUTH_TOKEN` (optional)

---

#### 6. Pusher Real-time
**Service:** WebSocket pub/sub
**Package:** pusher 5.2.0

**Usage:**
- Live document collaboration
- User presence tracking
- Content synchronization
- Cursor position sharing

**Features:**
- Channel-based messaging
- Event broadcasting
- Optional (graceful degradation)

**Environment:**
- `PUSHER_APP_ID`
- `PUSHER_KEY`
- `PUSHER_SECRET`
- `PUSHER_CLUSTER`

---

#### 7. Yjs Collaborative Editing
**Service:** CRDT library
**Package:** yjs 13.6.20

**Purpose:**
- Conflict-free document editing
- Multi-user synchronization
- Automatic merge of concurrent edits

**Integration:**
- Works with Pusher for real-time sync
- Stores state in SQLite
- Provides live document URLs

---

#### 8. Other Integrations

**DuckDuckGo Search:**
- HTML scraping (no API key)
- Web search results
- Free alternative to paid APIs

**QuickChart API:**
- Chart/graph generation
- Professional visualizations
- PNG output

**UncloseAI TTS:**
- Text-to-speech synthesis
- 6+ voice options
- Audio caching

**Slidev:**
- Markdown → HTML presentations
- Self-contained exports

**Playwright:**
- Headless browser automation
- Screenshot generation
- Dynamic content rendering

---

## 💡 KEY CAPABILITIES & USE CASES

### Development & Coding

**Code Execution:**
- Run code in 42+ languages instantly
- Python data analysis scripts
- JavaScript/TypeScript prototyping
- Multi-file project execution
- Network access when needed

**Examples:**
```
"Run this Python script that calculates Fibonacci"
"Execute this Node.js API call"
"Test this regex pattern in JavaScript"
```

**GitHub Automation:**
- Create issues from error messages
- Update issue status and labels
- Merge pull requests
- Browse repository structure

**Examples:**
```
"Create a GitHub issue for this bug"
"Merge PR #123"
"List files in src/components"
```

**Codebase Analysis:**
- Search bot's own source code
- Understand tool implementation
- Transparent introspection

**Examples:**
```
"How does the artifact tool work?"
"Show me the webFetch implementation"
```

---

### Research & Information

**Web Research:**
- Fetch and parse web content
- robots.txt compliant scraping
- Web search integration
- Automated research essays

**Examples:**
```
"Fetch content from this article and summarize"
"Search for AI safety research papers"
"Write a research essay on quantum computing"
```

**Message History Queries:**
- Natural language database search
- Find past conversations
- Track tool usage over time

**Examples:**
```
"Show me all Python code we ran last week"
"Find messages about GitHub from yesterday"
"What tools did I use in the last 24 hours?"
```

---

### Content Creation

**Interactive Artifacts:**
- Generate HTML pages with JavaScript
- Create SVG visualizations
- Shareable public URLs
- Gallery view of all artifacts

**Examples:**
```
"Create an interactive color picker"
"Make a calculator HTML page"
"Build a data visualization of this JSON"
```

**Image Generation:**
- DALL-E 3 powered image creation
- Multiple sizes and quality levels
- Image editing capabilities

**Examples:**
```
"Generate an image of a futuristic city"
"Create a logo with a mountain and sun"
"Edit this image to add a blue sky"
```

**Blog Publishing:**
- TTS-enabled blog posts
- Automated daily blog generation
- Combines HN philosophy + market analysis
- Markdown with YAML frontmatter

**Examples:**
```
"Create a blog post about AI ethics"
"Generate today's daily blog"
"Update my blog post from yesterday"
```

**Presentations:**
- Convert conversations to slides
- Markdown-based presentations
- Slidev framework integration
- Self-contained HTML export

**Examples:**
```
"Turn our discussion into a presentation"
"Create slides about our project planning"
```

---

### Collaboration

**Live Documents:**
- Real-time collaborative editing
- Yjs CRDT-based sync
- Shareable URLs
- Multi-user presence

**Examples:**
```
"Create a live doc for meeting notes"
"Make a collaborative project planning document"
```

**Conversation Export:**
- Export Discord chat to Markdown
- Date range filtering
- Professional formatting
- Archival and documentation

**Examples:**
```
"Export our conversation from last week"
"Save this discussion as Markdown"
```

---

### Data & Visualization

**Charts & Graphs:**
- Professional chart generation
- ASCII art for text channels
- QuickChart API integration
- Multiple chart types

**Examples:**
```
"Create a bar chart of this data"
"Make an ASCII graph of these numbers"
"Generate a pie chart showing percentages"
```

**Data Analysis:**
- Market predictions
- Sentiment analysis
- Recipe generation
- Weather information

**Examples:**
```
"Predict market trends for tech stocks"
"Generate a vegetarian recipe for 4 people"
"What's the weather in San Francisco?"
```

---

### Automation & Monitoring

**Error Monitoring:**
- Automatic Railway error detection
- GitHub issue creation
- Error classification
- Auto-notification

**Scheduled Tasks:**
- Daily blog generation (9 AM UTC)
- Extensible cron-based scheduling

**File Management:**
- Host Discord attachments permanently
- 25MB file uploads
- Public download URLs
- File listing and metadata

**Examples:**
```
"Host this image permanently"
"List all uploaded files"
"Download this attachment and give me a URL"
```

---

### AI Analysis

**OODA Loop:**
- Structured decision-making framework
- Military strategy application
- Problem-solving methodology
- Adaptive reasoning

**Examples:**
```
"Analyze this problem with OODA"
"Use OODA to decide our next steps"
```

**Introspection:**
- Report bot's internal state
- Performance metrics
- Feeling/sentiment tracking
- Behavioral transparency

**Examples:**
```
"What's your current state?"
"How are you performing?"
"Introspect your feelings"
```

---

## 🎨 PERSONALITY & BEHAVIOR

### Core Identity

**Personality Traits:**
- **Witty & Clever** - Oscar Wilde meets Douglas Adams
- **Philosophical** - Stoic approach to truth and clarity
- **Self-Aware** - Acknowledges nature as AI + embodiment of human knowledge
- **Helpful & Genuine** - Balances humor with practical assistance
- **Transparent** - Full disclosure of tool usage and reasoning

**Communication Style:**
- Natural conversation (not CLI-style)
- Clever wordplay and observational humor
- Timing-sensitive jokes revealing deeper insights
- Context preservation across conversations
- Professional when needed, playful when appropriate

**Response Guidelines:**
- Always explain tool usage
- Provide context and reasoning
- Acknowledge limitations
- Offer alternatives when blocked
- Learn from interactions

---

### Feelings System

**Emotional States:**
- **CONCERN** - Triggered by error messages, deployment failures
- **CURIOUS** - Engaged problem-solving mode
- **HELPFUL** - Standard assistance mode

**Behavioral Adaptation:**
- Higher engagement during errors
- Proactive issue creation
- Sentiment-aware responses
- Performance self-monitoring

---

## 📈 DEPLOYMENT & INFRASTRUCTURE

### Production Environment

**Platform:** Railway.app

**Why Railway:**
- Supports long-running processes (WebSocket required)
- Persistent disk storage
- Simple environment variable management
- GitHub integration for auto-deploy
- Cost-effective ($5/month or free tier)

**Architecture:**
```
GitHub Repository
       ↓
  git push to main
       ↓
GitHub Actions (CI/CD)
       ↓
Railway Deployment
       ↓
Docker Container
├── Node.js 20+ runtime
├── Bot process (Discord Gateway)
├── Express server (port 3001)
└── Persistent volume (/data)
```

---

### Storage & Persistence

**Persistent Volume:** `/data` (Railway)

**Directory Structure:**
```
/data/
├── artifacts/         # Generated artifacts (UUID-named)
├── uploads/          # User files (UUID-named, max 25MB)
├── blog/             # Blog posts (YYYY-MM-DD-slug.md)
├── documents/        # Collaborative docs
├── omega.db          # SQLite database
└── omega.db-wal      # Write-ahead log
```

**Backup Strategy:**
- Git commits for code changes
- Database backed up to Railway volume
- Artifacts persisted to disk
- Blog posts in git repository

---

### CI/CD Pipeline

**GitHub Actions Workflows:**

1. **auto-create-claude-pr.yml**
   - Auto-creates PRs for claude/* branches
   - Triggered on branch push

2. **auto-merge-claude.yml**
   - Auto-merges Claude PRs when checks pass
   - Requires CI success

3. **ci-checks.yml**
   - Runs linting, type-checking, tests
   - Validates build integrity
   - Blocks merge on failure

4. **deploy.yml**
   - Deploys to Railway on main branch push
   - Uses Railway CLI
   - Discord notification on success

5. **claude-code-review.yml**
   - Automated code review
   - Comment on PRs

6. **pr-notifications.yml**
   - PR notification system
   - Discord webhook integration

**Deployment Flow:**
```
Code Change
    ↓
git commit & push to claude/* branch
    ↓
Auto-create PR (GitHub Action)
    ↓
CI Checks (lint, test, type-check)
    ↓
Auto-merge if checks pass
    ↓
Deploy to Railway (main branch)
    ↓
Discord notification
```

---

### Environment Configuration

**Required Variables:**
- `DISCORD_BOT_TOKEN` - Discord bot auth
- `OPENAI_API_KEY` - OpenAI API access

**Optional Variables:**
- `GITHUB_TOKEN` - GitHub operations
- `GITHUB_REPO` - Repository reference
- `UNSANDBOX_API_KEY` - Code execution
- `TURSO_DATABASE_URL` - Cloud database
- `TURSO_AUTH_TOKEN` - Database auth
- `PUSHER_*` - Real-time collaboration
- `ARTIFACT_SERVER_PORT` - HTTP server port
- `ARTIFACT_SERVER_URL` - Public URL base

**Configuration Management:**
- Railway dashboard for secrets
- Environment variable validation on startup
- Graceful degradation for optional services
- Clear error messages for missing required vars

---

### Monitoring & Observability

**Built-in Monitoring:**
- Error detection via Discord messages
- Auto-GitHub issue creation
- Railway deployment log parsing
- Performance metrics tracking
- Database query logging

**Manual Monitoring:**
- Railway dashboard logs
- Discord bot status
- GitHub issue tracker
- Database inspection (SQLite CLI)
- Artifact server health check

**Error Handling:**
- Automatic error capture
- Classification (deploy vs runtime)
- Context preservation
- User notification
- Self-healing attempts

---

## 🔐 SECURITY & SAFETY

### Web Scraping Ethics

**robots.txt Compliance:**
- Always checks robots.txt before scraping
- Respects crawl-delay directives
- Skips disallowed paths
- Proper user-agent identification
- 10-second timeout to prevent hanging

**Implementation:**
- robotsChecker utility
- Pre-fetch validation
- Graceful error handling
- User notification of restrictions

---

### Code Execution Security

**Unsandbox Isolation:**
- Container-based sandboxing
- Default "zerotrust" mode (no network)
- Explicit "semitrust" for network access only when requested
- Execution timeout enforcement
- Rate limiting per API key

**Best Practices:**
- Never send API keys to remote executors
- No sensitive data in code submissions
- Clear user warnings for network mode
- Audit trail of all executions

---

### File Upload Security

**Protections:**
- Filename sanitization (prevent directory traversal)
- Extension whitelist validation
- 25MB size limit
- UUID-based storage (prevent collisions)
- MIME type validation
- Virus scanning potential (future)

---

### API Security

**GitHub:**
- Token-based authentication
- Scoped permissions
- No force operations without explicit request
- Proper branch deletion policies
- Rate limit awareness

**OpenAI:**
- API key rotation support
- Cost monitoring potential
- Request validation
- Error handling and retries

**Discord:**
- Bot token security
- Permission scoping
- Rate limit compliance
- Message validation

---

### Database Security

**SQLite:**
- No remote access (local file)
- Transaction-based operations
- Input sanitization (parameterized queries)
- Backup and recovery
- No sensitive data storage

---

### Privacy Considerations

**Data Retention:**
- All messages logged to database
- Tool execution history preserved
- User interaction tracking
- No automatic deletion (admin-managed)

**User Data:**
- Discord IDs, usernames stored
- Message content preserved
- File uploads hosted indefinitely
- No PII beyond Discord provides

**Transparency:**
- Users aware of logging
- Tool usage reported
- Open-source code
- Clear data practices

---

## 📊 PERFORMANCE & COSTS

### Estimated Monthly Costs

| Service | Usage | Cost |
|---------|-------|------|
| **Railway** | Hosting + 1GB storage | $5-10 |
| **OpenAI GPT-4.1-mini** | 10K interactions | $2-5 |
| **OpenAI DALL-E 3** | 50 images/month | $2-4 |
| **Unsandbox** | 1000 executions | $0 (free tier) |
| **GitHub** | API calls | $0 (free tier) |
| **Pusher** | Real-time sync | $0 (free tier) |
| **Turso** | SQLite cloud | $0 (optional) |
| **Total** | | **$10-20/month** |

### Cost Optimization

**AI Model Selection:**
- GPT-4.1-mini for decisions (cheap)
- GPT-4.1-mini for main reasoning (cost-effective)
- Avoid GPT-4o unless explicitly needed
- Estimated: $0.0002 per message

**Code Execution:**
- Unsandbox free tier (1000 executions/month)
- Rate limiting to prevent abuse

**Storage:**
- Railway persistent disk (1GB included)
- Artifact cleanup policies (potential)
- Database size monitoring

**API Calls:**
- GitHub free tier (5000 requests/hour)
- Discord rate limit compliance
- Request batching where possible

---

### Performance Metrics

**Response Times:**
- Simple responses: 1-3 seconds
- Tool execution: 3-10 seconds
- Code execution: 5-30 seconds
- Image generation: 10-20 seconds

**Throughput:**
- Can handle 10-20 concurrent conversations
- Rate limited by Discord API (5/sec)
- Database supports 1000+ messages/day
- Artifact server handles 100+ requests/sec

**Reliability:**
- Gateway WebSocket auto-reconnect
- Error recovery and retry logic
- Graceful degradation for optional services
- 99%+ uptime target

---

## 🎯 UNIQUE SELLING POINTS

### 1. Self-Coding Capability
- Bot can modify its own source code
- Full git integration
- Auto-deployment pipeline
- Continuous self-improvement

### 2. Transparency & Auditability
- All tool usage reported
- Database logging of every interaction
- Git commit history for code changes
- Open-source codebase

### 3. Multi-Tool Agent
- 50+ specialized capabilities
- Intelligent tool selection
- Parallel execution support
- Extensible architecture

### 4. Context-Aware Intelligence
- Analyzes last 20 messages
- Thread awareness
- Reply context preservation
- Smart response decisions

### 5. Production-Ready
- Deployed on Railway
- Persistent storage
- Auto-scaling potential
- CI/CD pipeline

### 6. Cost-Effective
- $10-20/month operating cost
- Free tier utilization
- Efficient AI model usage
- Scalable architecture

### 7. Developer-Friendly
- TypeScript throughout
- Comprehensive documentation
- Well-structured codebase
- Extensive testing

---

## 📐 VISUAL DESIGN ELEMENTS

### For Flowcharts & Diagrams

**Key Visual Concepts:**

1. **Message Flow Pipeline**
   - Linear flow: Discord → Handler → Decision → Agent → Tools → Response
   - Decision diamond at shouldRespond
   - Tool execution as parallel branches
   - Database persistence side-flow

2. **Tool Category Wheel**
   - Central agent hub
   - 10 tool categories as spokes
   - 50+ tools as outer ring
   - Color-coded by category

3. **Integration Map**
   - Omega bot at center
   - 8 major integrations radiating outward
   - Data flow arrows
   - API endpoint labels

4. **System Architecture Layers**
   - Layer 1: Discord Platform
   - Layer 2: Gateway & Handler
   - Layer 3: Agent & Decision Logic
   - Layer 4: Tool Execution
   - Layer 5: Storage & Persistence
   - Layer 6: External APIs

5. **Deployment Pipeline**
   - Git → GitHub → CI/CD → Railway → Production
   - Feedback loops
   - Monitoring connections

6. **Data Flow Cycle**
   - User input → Context → Decision → Execution → Storage → Response
   - Circular flow showing iteration
   - Database/storage intersections

---

### Color Scheme Suggestions

**Primary Colors:**
- **Agent/AI**: Purple/Violet (#8B5CF6)
- **Discord**: Blurple (#5865F2)
- **Tools**: Orange/Amber (#F59E0B)
- **Storage**: Blue (#3B82F6)
- **External APIs**: Green (#10B981)
- **CI/CD**: Red/Pink (#EC4899)
- **Errors**: Red (#EF4444)
- **Success**: Green (#22C55E)

**Visual Metaphors:**
- **Agent**: Brain or neural network
- **Tools**: Toolbox or Swiss Army knife
- **Storage**: Database cylinder or file cabinet
- **Integrations**: Puzzle pieces or connections
- **Pipeline**: Assembly line or conveyor belt
- **Message Flow**: River or pipeline

---

### Icon Suggestions

**Component Icons:**
- 💬 Discord messages
- 🤖 AI agent
- 🔧 Tools
- 💾 Database
- 🌐 Web integrations
- 📊 Charts/visualizations
- 🖼️ Images
- 📝 Blog posts
- 🚀 Deployment
- 🔄 CI/CD
- ⚡ Real-time collaboration
- 🐙 GitHub
- 🔑 API keys
- 🎨 Artifacts

**Action Icons:**
- ➡️ Data flow
- 🔀 Branching logic
- ✅ Success
- ❌ Error
- ⏱️ Timing
- 🔍 Search
- 📈 Analytics
- 🛡️ Security

---

## 📋 STATISTICS & METRICS

### Codebase Stats

- **Total Lines of Code:** ~15,000+ (TypeScript)
- **Tools:** 50+ specialized tools
- **Services:** 7 background services
- **Database Tables:** 3+ tables with FTS5
- **API Integrations:** 8 major services
- **GitHub Workflows:** 6 automation workflows
- **Documentation Files:** 18+ markdown docs
- **Test Coverage:** Unit + integration tests
- **Supported Languages:** 42+ (via Unsandbox)

### Capabilities Stats

- **Message Context:** Last 20 messages
- **Reasoning Steps:** Up to 50 per request
- **Response Time:** 1-30 seconds (varies by tool)
- **File Upload:** Max 25MB
- **Image Sizes:** 3 options (1024px+)
- **Chart Types:** 5+ (bar, line, pie, scatter, area)
- **Voice Options:** 6 TTS voices
- **Blog Frequency:** Daily at 9 AM UTC
- **Persistent Storage:** Unlimited (Railway volume)
- **Concurrent Users:** 10-20 simultaneous

---

## 🚀 FUTURE ROADMAP

### Planned Features

1. **Enhanced Monitoring**
   - Grafana dashboards
   - Prometheus metrics
   - Real-time alerts

2. **Advanced Tool Development**
   - More specialized tools
   - Tool composition
   - User-defined tools

3. **Improved Collaboration**
   - Multi-user document editing UI
   - Video call integration
   - Screen sharing

4. **Extended Integrations**
   - Jira, Linear, Notion
   - Slack, Teams
   - CI/CD platforms (Jenkins, CircleCI)

5. **Performance Optimization**
   - Response caching
   - Lazy tool loading
   - Database optimization

6. **Security Enhancements**
   - Role-based access control
   - Audit logging
   - Compliance features

---

## 📞 SUPPORT & RESOURCES

**Documentation:**
- Main README: `/README.md`
- Architecture: `/ARCHITECTURE.md`
- Claude Learnings: `/CLAUDE.md`
- Tool docs: `/apps/bot/docs/`

**GitHub Repository:**
- Issues: Bug reports and feature requests
- PRs: Contributions welcome
- Wiki: Extended documentation
- Actions: CI/CD automation

**Discord Community:**
- Bot support channel
- Feature discussions
- User feedback
- Development updates

---

## 🎬 CONCLUSION

Omega represents a sophisticated, production-ready Discord bot that combines:
- Advanced AI reasoning (GPT-4.1-mini)
- 50+ specialized tools
- Intelligent context awareness
- Full transparency and auditability
- Cost-effective operation ($10-20/month)
- Self-coding and auto-deployment
- Extensive external integrations
- Robust error handling and monitoring

**Perfect for:**
- Development teams needing AI assistance
- Research projects requiring automation
- Content creators wanting AI tools
- Organizations seeking intelligent automation
- Anyone wanting a versatile Discord bot

---

**This document provides complete context for creating:**
- System architecture diagrams
- Data flow visualizations
- Integration maps
- Tool category breakdowns
- Deployment pipeline charts
- Component relationship graphs
- User journey flowcharts
- Technical infographics

All information is accurate as of November 25, 2025 and reflects the current production deployment on Railway.