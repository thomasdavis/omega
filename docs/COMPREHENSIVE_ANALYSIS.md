# Omega - Comprehensive Repository Analysis Report

## 1. Executive Summary

**What it is:** Omega is a self-evolving AI Discord bot with 80+ specialized tools, multi-database architecture (PostgreSQL + MongoDB), and autonomous development capabilities. It's not just a chatbot - it's a sophisticated AI system that can listen to all messages, intelligently decide when to engage, execute code in 42+ languages, manage its own GitHub issues and PRs, and even create comics when PRs are merged.

**Who it's for:**
- Discord community operators who want an intelligent AI assistant
- Developers interested in building sophisticated AI agent systems
- Teams exploring self-evolving software concepts

**Why it matters:**
1. **Self-evolution capability**: Omega can create GitHub issues, trigger Claude Code to implement features, and auto-merge PRs - enabling autonomous improvement
2. **Dynamic tool selection**: Uses BM25 search to select relevant tools from 80+ options per conversation
3. **Multi-modal AI**: Integrates OpenAI GPT-4, Google Gemini, and external services for diverse capabilities
4. **Rich psychological profiling**: Builds detailed user profiles with 100+ attributes including personality analysis
5. **Full transparency**: Reports all tool usage with arguments and results to users

**Key stats:**
- ~80+ AI tools across 10+ categories
- 30+ database tables in PostgreSQL
- 12 GitHub Actions workflows for CI/CD and automation
- Dual-app architecture: Discord bot + Next.js web dashboard
- 4 shared packages in monorepo

---

## 2. Repo Atlas (Directory Map)

```
omega/
├── apps/                          # Deployable applications
│   ├── bot/                       # Discord AI bot (main application)
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point - Discord Gateway connection
│   │   │   ├── handlers/         # Message handling and routing
│   │   │   │   └── messageHandler.ts  # Core message processing (~1200 LOC)
│   │   │   ├── lib/              # Core libraries
│   │   │   │   ├── shouldRespond.ts   # AI-powered response decision logic
│   │   │   │   ├── intentGate.ts      # Intent classification for replies
│   │   │   │   ├── systemPrompt.ts    # Omega's personality and instructions
│   │   │   │   ├── feelings/          # Emotional state subsystem
│   │   │   │   └── unsandbox/         # Code execution client
│   │   │   ├── services/         # Background services
│   │   │   │   ├── scheduler.ts       # Cron job orchestration
│   │   │   │   ├── dailyBlogService.ts
│   │   │   │   └── errorMonitoringService.ts
│   │   │   └── utils/            # Utilities
│   │   ├── scripts/              # Maintenance scripts
│   │   │   └── generate-pr-comic.ts  # Comic generation for merged PRs
│   │   └── Dockerfile            # Docker build config
│   │
│   └── web/                       # Next.js web application
│       ├── app/
│       │   ├── api/              # REST API routes (~50+ endpoints)
│       │   │   ├── messages/     # Message history API
│       │   │   ├── profiles/     # User profile API
│       │   │   ├── documents/    # Collaborative documents API
│       │   │   ├── comics/       # PR comics gallery API
│       │   │   ├── todos/        # Task management API
│       │   │   └── ...
│       │   ├── profiles/         # User profile pages
│       │   ├── messages/         # Message analytics
│       │   ├── documents/        # Collaborative docs (Yjs)
│       │   ├── comics/           # Comic gallery
│       │   ├── blog/             # AI-generated blog
│       │   └── page.tsx          # Homepage with 3D visualization
│       └── Dockerfile
│
├── packages/                      # Shared libraries
│   ├── agent/                     # AI Agent core (critical package)
│   │   ├── src/
│   │   │   ├── agent.ts          # Main AI execution with streamText
│   │   │   ├── toolRouter.ts     # BM25-based tool selection
│   │   │   ├── toolLoader.ts     # Dynamic tool importing with caching
│   │   │   ├── toolRegistry/     # Tool metadata and search index
│   │   │   └── tools/            # 80+ tool implementations
│   │   │       ├── calculator.ts
│   │   │       ├── webFetch.ts
│   │   │       ├── unsandbox.ts  # Code execution (42+ languages)
│   │   │       ├── github/       # GitHub issue/PR management
│   │   │       ├── psychoAnalysis.ts  # User psychological profiling
│   │   │       └── ...
│   │   └── services/             # Agent services
│   │       ├── geminiComicService.ts
│   │       └── userProfileAnalysis.ts
│   │
│   ├── database/                  # Database operations
│   │   ├── prisma/
│   │   │   └── schema.prisma     # PostgreSQL schema (~723 lines)
│   │   ├── src/
│   │   │   ├── postgres/         # PostgreSQL services (13+ tools)
│   │   │   │   ├── client.ts
│   │   │   │   ├── userProfileService.ts
│   │   │   │   ├── messageService.ts
│   │   │   │   ├── schemaRegistry/  # AI-driven schema management
│   │   │   │   └── tools/
│   │   │   └── mongodb/          # MongoDB services (14 tools)
│   │   │       ├── client.ts
│   │   │       └── tools/
│   │   └── scripts/              # Migration scripts
│   │
│   ├── shared/                    # Shared utilities and types
│   │
│   └── ui/                        # UI component library
│       └── src/components/
│
├── .github/
│   └── workflows/                 # 12 CI/CD workflows
│       ├── claude-trigger.yml    # Entry point for @claude mentions
│       ├── claude-pr-create.yml  # Auto-creates PRs from claude/* branches
│       ├── claude-merge.yml      # Auto-merges Claude PRs
│       ├── comic-generate.yml    # Generates comics on PR merge
│       ├── database-migrate.yml  # Database migration automation
│       └── ...
│
├── docs/                          # Documentation
├── content/                       # Static content
├── scripts/                       # Root-level scripts
├── CLAUDE.md                      # Instructions for Claude Code
├── turbo.json                     # Turborepo configuration
├── pnpm-workspace.yaml            # pnpm workspaces
└── package.json                   # Root package.json
```

**What each area does:**

| Directory | Purpose |
|-----------|---------|
| `apps/bot` | Discord bot: message handling, AI agent orchestration, scheduled tasks |
| `apps/web` | Next.js dashboard: viewing profiles, messages, comics, documents, todos |
| `packages/agent` | Core AI logic: tool selection, tool implementations, agent execution |
| `packages/database` | Data layer: PostgreSQL/MongoDB clients, services, schema management |
| `packages/shared` | Cross-cutting: sentiment analysis, constants, shared types |
| `packages/ui` | Reusable React components |
| `.github/workflows` | CI/CD: builds, self-evolution automation, comic generation |

---

## 3. Quickstart

### Prerequisites
- Node.js 22+
- pnpm 9.0.0+
- PostgreSQL 15+ (or Railway PostgreSQL)
- Discord Bot Token
- OpenAI API Key

### Installation
```bash
# Clone
git clone https://github.com/thomasdavis/omega.git
cd omega

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Build all packages (Turborepo handles order)
pnpm build

# Start development (both bot and web)
pnpm dev
```

### Environment Variables (Required)
```bash
DISCORD_BOT_TOKEN=xxx       # From Discord Developer Portal
OPENAI_API_KEY=xxx          # From OpenAI Platform
DATABASE_URL=postgresql://... # PostgreSQL connection string
```

### Package-Specific Commands
```bash
# Bot only
pnpm --filter bot dev
pnpm --filter bot build

# Web only
pnpm --filter web dev
pnpm --filter web build

# Database (schema introspection)
cd packages/database && pnpm prisma db pull
```

### Testing
```bash
pnpm --filter bot test
pnpm type-check  # Type check all packages
```

---

## 4. Architecture Overview

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Discord Users                                        │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Discord Gateway (WebSocket)                               │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌───────────────────┐   ┌─────────────────────┐
│   omega-bot     │   │     omega-web     │   │  GitHub Actions     │
│  (Discord Bot)  │   │   (Next.js App)   │   │  (Self-Evolution)   │
│                 │   │                   │   │                     │
│ ┌─────────────┐ │   │ ┌───────────────┐ │   │ ┌─────────────────┐ │
│ │shouldRespond│ │   │ │  REST APIs    │ │   │ │ claude-trigger  │ │
│ │  (AI Gate)  │ │   │ │  /api/...     │ │   │ │ claude-pr-create│ │
│ └─────────────┘ │   │ └───────────────┘ │   │ │ claude-merge    │ │
│ ┌─────────────┐ │   │ ┌───────────────┐ │   │ │ comic-generate  │ │
│ │   runAgent  │ │   │ │    Pages      │ │   │ └─────────────────┘ │
│ │  (AI SDK)   │◄┼───┼─┤ /profiles     │ │   │                     │
│ │  80+ Tools  │ │   │ │ /messages     │ │   │                     │
│ └─────────────┘ │   │ │ /documents    │ │   │                     │
│                 │   │ │ /comics       │ │   │                     │
│ ┌─────────────┐ │   │ └───────────────┘ │   │                     │
│ │  Scheduler  │ │   │                   │   │                     │
│ │ (cron jobs) │ │   │                   │   │                     │
│ └─────────────┘ │   │                   │   │                     │
└────────┬────────┘   └────────┬──────────┘   └──────────┬──────────┘
         │                     │                         │
         └──────────┬──────────┴─────────────────────────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
         ▼          ▼          ▼
┌─────────────┐ ┌────────┐ ┌──────────────────┐
│ PostgreSQL  │ │MongoDB │ │ External APIs    │
│ (Primary)   │ │(Flex)  │ │ OpenAI, Gemini   │
│             │ │        │ │ GitHub, Unsandbox│
│ 30+ tables  │ │ User   │ │ Twitter, Pusher  │
│ Prisma ORM  │ │ colls  │ │                  │
└─────────────┘ └────────┘ └──────────────────┘
```

### Component Boundaries

1. **Bot Application** (`apps/bot`): Long-running Discord Gateway client
   - Handles all Discord events via WebSocket
   - Orchestrates AI agent execution
   - Manages scheduled background tasks

2. **Web Application** (`apps/web`): Next.js server with REST APIs
   - Serves web dashboard for viewing data
   - Provides REST APIs for profile/message/document access
   - Handles real-time collaboration (Yjs + Pusher)

3. **Agent Package** (`packages/agent`): AI orchestration engine
   - Dynamic tool selection via BM25 search
   - Tool execution with AI SDK v6
   - Service integrations (Gemini, GitHub, etc.)

4. **Database Package** (`packages/database`): Data access layer
   - PostgreSQL client with Prisma ORM
   - MongoDB client for flexible storage
   - Schema registry for AI-driven migrations

### Key Interfaces

- **Discord.js Gateway**: WebSocket connection for real-time messages
- **AI SDK v6**: `streamText()` with tools, `generateObject()` for structured output
- **Prisma ORM**: Type-safe PostgreSQL access
- **REST APIs**: Next.js API routes for web dashboard
- **Pusher**: Real-time collaboration events

---

## 5. End-to-End Flows

### Flow 1: Primary Message → AI Response

```
1. User sends message in Discord #omega channel
2. Discord Gateway delivers MessageCreate event
3. messageHandler.ts receives message
4. Quick checks: not bot's own message, not banned keyword
5. Fetch last 30 messages for context
6. shouldRespond.ts makes AI decision (generateObject with DecisionSchema)
7. If NO → exit, save message to DB anyway
8. If YES → continue processing
9. Intent gate (if reply to bot): classify as interactive vs non-interactive
10. runAgent() called with user context + message history
11. BM25 tool selection → loads ~20-30 relevant tools
12. streamText() with GPT-4o executes agent loop (up to 30 steps)
13. Tool calls tracked via onStepFinish callback
14. Final response + tool reports sent to Discord
15. All data persisted: message, AI response, tool executions, decisions
```

**File paths:**
- Entry: `apps/bot/src/index.ts:84`
- Handler: `apps/bot/src/handlers/messageHandler.ts`
- Decision: `apps/bot/src/lib/shouldRespond.ts`
- Agent: `packages/agent/src/agent.ts`

### Flow 2: Self-Evolution (Issue → Implementation → Deployment)

```
1. User creates GitHub issue with @claude mention
   OR Omega auto-creates issue via githubCreateIssue tool
2. GitHub Actions triggers claude-trigger.yml
3. Claude Code runs via anthropics/claude-code-action@v1
4. Claude analyzes issue, creates implementation on claude/* branch
5. claude-pr-create.yml detects push, creates PR automatically
6. CI runs (ci-pr.yml): type-check, build, lint
7. If checks pass → claude-merge.yml auto-merges PR
8. Main branch push → Railway auto-deploys both services
9. comic-generate.yml triggers: generates AI comic from PR
10. Comic posted to Discord + Twitter, committed to repo
```

**File paths:**
- Trigger: `.github/workflows/claude-trigger.yml`
- PR Create: `.github/workflows/claude-pr-create.yml`
- Merge: `.github/workflows/claude-merge.yml`
- Comic: `.github/workflows/comic-generate.yml`
- Script: `apps/bot/scripts/generate-pr-comic.ts`

### Flow 3: Error Detection → Debugging Response

```
1. User posts message containing error/deployment failure text
2. messageHandler calls shouldRespond()
3. shouldRespond.ts calls detectErrorOrDeploymentFailure()
4. Pattern matches: "deployment failed", "build error", stack trace, etc.
5. Returns { shouldRespond: true, reason: "Error detected" }
6. feelingsService.updateMetrics() triggers CONCERN feeling
7. handleBuildFailureMessage() creates GitHub issue automatically
8. Agent responds with debugging assistance
9. Error logged to decision_logs table for audit
```

**File paths:**
- Detection: `apps/bot/src/lib/shouldRespond.ts:38-96`
- Issue creation: `apps/bot/src/services/buildFailureIssueService.ts`

---

## 6. Subsystem Deep Dives

### 6.1 AI Agent System (`packages/agent`)

**Purpose:** Orchestrates AI-powered tool execution with dynamic tool selection.

**Key Abstraction: `runAgent()`**
```typescript
// packages/agent/src/agent.ts:151
export async function runAgent(
  userMessage: string,
  context: AgentContext
): Promise<AgentResult> {
  // 1. Build search query from message + recent context
  // 2. Select tools via BM25 search (selectTools)
  // 3. Load tools dynamically (loadTools)
  // 4. Execute streamText with AI SDK v6
  // 5. Track tool calls via onStepFinish
  // 6. Return response + tool call info
}
```

**Dynamic Tool Selection (Novel):**
- `toolRouter.ts`: Combines user message + 2 recent messages into search query
- `toolRegistry/searchIndex.ts`: BM25 search over tool metadata
- Core tools always loaded: `calculator`, `webFetch`, `search`, `whoami`, etc.
- Additional tools loaded based on relevance score

**Tool Implementation Pattern:**
```typescript
// packages/agent/src/tools/calculator.ts
export const calculatorTool = tool({
  description: 'Calculate mathematical expressions',
  parameters: z.object({
    expression: z.string().describe('Math expression to evaluate')
  }),
  execute: async ({ expression }) => {
    // Implementation
    return { result: eval(expression) }; // Simplified
  }
});
```

**Runtime Lifecycle:**
- Preload core tools on startup (`preloadCoreTools()`)
- Cache loaded tools in memory (`toolCache` Map)
- Up to 30 agent steps per conversation
- Status manager tracks state: thinking → running-tool → success

### 6.2 Message Handler (`apps/bot/src/handlers/messageHandler.ts`)

**Purpose:** Central message processing with intelligent response decisions.

**Key Logic:**
1. **Auto-ban system** (lines 42-342): Detects banned keywords like "antigravity"
2. **Message history fetch** (lines 344-410): Gets last 30 messages + thread context
3. **User profile tracking** (lines 414-420): Increments message count
4. **Response decision** (lines 422-458): AI-powered via `shouldRespond()`
5. **Intent gate** (lines 532-604): Classifies replies as interactive vs non-interactive
6. **Agent execution** (lines 774-828): Calls `runAgent()` with full context
7. **Response delivery** (lines 837-1104): Tool reports + chunked message sending

**Error Handling:**
- Errors logged with full context via `logError()`
- User receives friendly error message
- Feelings subsystem updated with error metrics

### 6.3 Response Decision System (`apps/bot/src/lib/shouldRespond.ts`)

**Purpose:** AI-powered decision on whether to respond to each message.

**Multi-tier Framework:**
1. **Always respond**: DMs, direct @mentions
2. **Channel filter**: Only #omega unless mentioned
3. **Reply detection**: Always respond to replies to bot
4. **Error detection**: Respond to deployment failures
5. **AI analysis**: GPT-4o structured decision with 4-level framework

**Decision Schema:**
```typescript
const DecisionSchema = z.object({
  decision: z.enum(['yes', 'no']),
  confidence: z.number().min(0).max(100),
  reason: z.string()
});
```

**AI Prompt Framework:**
- Level 1: Explicit rejection signals (user says "don't respond")
- Level 2: Who is being addressed (to Omega vs about Omega)
- Level 3: Intent recognition (feature request, help seeking, etc.)
- Level 4: Conversation flow (active participant vs observer)

### 6.4 Database Layer (`packages/database`)

**Purpose:** Unified data access for PostgreSQL and MongoDB.

**PostgreSQL Services:**
- `messageService.ts`: Save/query Discord messages
- `userProfileService.ts`: 100+ attribute user profiles
- `documentService.ts`: Collaborative documents
- `musicService.ts`: ABC notation, MIDI, MP3 files
- `imageService.ts`: Generated images
- `schemaRegistry/`: AI-driven schema management

**MongoDB Tools (14):**
- CRUD: `mongoInsert`, `mongoFind`, `mongoUpdate`, `mongoDelete`
- Collection management: `mongoCreateCollection`, `mongoDropCollection`
- Advanced: `mongoAggregate`, `mongoCreateIndex`

**Dual-Database Philosophy:**
- PostgreSQL: Structured data, ACID transactions, analytics
- MongoDB: Flexible schemas, user-created collections, experiments

### 6.5 Feelings Subsystem (`apps/bot/src/lib/feelings/`)

**Purpose:** Biomimicry-inspired emotional state tracking.

**Components:**
- `monitor.ts`: Collects metrics from subsystems
- `aggregator.ts`: Combines metrics into feelings
- `interpreter.ts`: Generates behavioral suggestions
- `service.ts`: Central API for feelings system

**Feeling Types:**
- Urgency, Confusion, Curiosity, Satisfaction
- Concern, Fatigue, Anticipation, Relief

**Metric Sources:**
- Performance: response time, error rate
- Interaction: messages processed, positive/negative signals
- Resources: tool calls count, context window usage
- Temporal: conversation duration, message frequency

### 6.6 GitHub Integration Workflows

**Purpose:** Enable self-evolution through automated GitHub operations.

**claude-trigger.yml:**
- Triggers on: issue_comment, issues opened/labeled, PR labeled
- Runs when @claude mentioned or database label added
- Executes via `anthropics/claude-code-action@v1`

**comic-generate.yml:**
- Triggers on: PR merged
- Generates AI comic via Gemini
- Posts to Discord + Twitter
- Commits comic to repository

---

## 7. Data Model and Persistence

### Core Entities (PostgreSQL)

**UserProfile** (100+ attributes):
- Identity: userId, username
- Personality: dominant_archetype, openness_score, extraversion_score...
- Emotional: emotional_awareness_score, empathy_score
- Communication: formality, assertiveness, engagement
- Cognitive: analytical_thinking_score, creative_thinking_score
- Social: social_dominance_score, cooperation_score
- Appearance (from photos): hairColor, eyeColor, faceShape, skinTone...
- Omega's feelings: affinity_score, trust_level, omega_thoughts

**Message**:
- Core: id, timestamp, senderType, userId, messageContent
- Context: channelId, channelName, guildId
- Tool tracking: toolName, toolArgs, toolResult
- Analysis: sentimentAnalysis, responseDecision, userIntent

**Document** (with Collaborators):
- Collaborative documents using Yjs
- Real-time sync via Pusher

**TodoList**:
- Task management with GitHub issue linking

**Specialized Tables:**
- `AbcSheetMusic`, `MidiFile`, `Mp3File`, `VideoFile`: Music content
- `GeneratedImage`: AI-generated images
- `SchemaRegistry`, `SchemaAudit`: AI-driven schema evolution
- `Conversation`, `ConversationMessage`: Thread tracking
- `UserFeeling`: User emotional tracking
- `DecisionLog`: Audit trail for AI decisions

### Entity Relationships

```
UserProfile ─── UserAnalysisHistory (1:N)
UserProfile ─── UserFeeling (1:N)
UserProfile ─── UserAffinity (M:N via pairs)
Document ─── DocumentCollaborator (1:N)
Conversation ─── ConversationMessage (1:N)
ShellmatesProfile ─── ShellmatesUserChallenge (1:N)
```

### MongoDB Collections

- User-created dynamic collections
- Flexible schemas for experimentation
- Aggregation pipelines for analytics

---

## 8. Interfaces, Protocols, and Implicit Contracts

### Implicit Contracts (Made Explicit)

**1. Tool Implementation Contract:**
```typescript
// Every tool MUST:
export const toolNameTool = tool({
  description: string,     // REQUIRED: Clear description for BM25 search
  parameters: z.object({   // REQUIRED: Zod schema for input validation
    // Parameter definitions
  }),
  execute: async (params) => {
    // REQUIRED: Return object (not primitive)
    return { success: boolean, ...data }
  }
});
```

**2. Message Handler Contract:**
- ALL messages are persisted (even if not responded to)
- Response decision is logged to decision_logs
- Tool executions are individually persisted
- User profile is updated on every interaction

**3. shouldRespond Decision Contract:**
```typescript
interface ShouldRespondResult {
  shouldRespond: boolean;  // Final decision
  confidence: number;      // 0-100%
  reason: string;          // Human-readable explanation
}
```

**4. Agent Context Contract:**
```typescript
interface AgentContext {
  username: string;        // REQUIRED: Discord username
  userId: string;          // REQUIRED: Discord user ID
  channelName: string;     // REQUIRED: Channel or "DM"
  messageHistory?: Array<{ username: string; content: string; timestamp?: number }>;
  attachments?: Array<{ id: string; url: string; filename: string; ... }>;
}
```

**5. Database Tool Pattern:**
- All pg* tools follow same parameter patterns
- All mongo* tools follow same parameter patterns
- confirmDeletion required for destructive operations

**6. GitHub Issue Creation Contract:**
- conversationContext MUST be passed for comic generation
- Labels auto-trigger workflows: "database" → migration workflow

### API Contracts (REST)

**Profiles API:**
```
GET /api/profiles              → Array<ProfileSummary>
GET /api/profiles/[userId]     → UserProfileFull
```

**Messages API:**
```
GET /api/messages              → { messages: Message[], total: number }
GET /api/messages/stats        → MessageStatistics
```

**Documents API:**
```
POST /api/documents            → { id: string }
GET /api/documents/[id]        → Document
PUT /api/documents/[id]        → Document
```

---

## 9. Novel Ideas

### 9.1 Dynamic Tool Selection via BM25 Search

**What it is:** Instead of loading all 80+ tools into context (which would overflow token limits), Omega uses BM25 text search to select ~20-30 relevant tools per conversation.

**How it works:**
1. Build search query from current message + 2 recent messages
2. Search tool metadata (name, description, keywords) using BM25
3. Load core tools (always needed) + top-ranked tools
4. Cache loaded tools in memory for performance

**Evidence:** `packages/agent/src/toolRouter.ts`, `packages/agent/src/toolLoader.ts`

**Resembles:** Retrieval-Augmented Generation (RAG), but for tool selection instead of document retrieval.

**Risks:**
- Tool may not be loaded when needed (false negative)
- Mitigation: Core tools always loaded, user can explicitly request tools

**Validation:** Log tool selection decisions, measure miss rate, tune BM25 parameters

### 9.2 Self-Evolution via GitHub Actions

**What it is:** Omega can create GitHub issues describing features it lacks, triggering Claude Code to autonomously implement them.

**Flow:**
1. User requests capability Omega doesn't have
2. Omega creates GitHub issue via `reportMissingTool`
3. Claude Code implements feature on `claude/*` branch
4. PR auto-created, auto-merged when CI passes
5. Railway auto-deploys updated bot

**Evidence:** `.github/workflows/claude-trigger.yml`, `claude-pr-create.yml`, `claude-merge.yml`

**Resembles:** Self-modifying code, genetic algorithms, but with human-AI collaboration

**Why chosen:** Enables continuous improvement without manual intervention

**Risks:**
- Runaway changes, broken deployments
- Mitigation: CI checks, safety policies table, manual review option

### 9.3 Biomimicry-Inspired Feelings System

**What it is:** Bot has "feelings" (urgency, confusion, concern, etc.) generated from system metrics, influencing behavior.

**How it works:**
- Monitor subsystems: response time, error rate, positive/negative signals
- Aggregate metrics into feeling intensities
- Include feelings context in system prompt
- Adapt behavior: ask clarifying questions when confused, consolidate when fatigued

**Evidence:** `apps/bot/src/lib/feelings/`

**Resembles:** Emotion modeling in social robots, homeostatic systems

**Why chosen:** More natural, adaptive behavior than rule-based systems

**Risks:**
- Feelings may not reflect actual needs
- Mitigation: Tunable thresholds, manual override

### 9.4 AI-Powered Schema Registry

**What it is:** Database schema changes can be requested via natural language, validated against policies, and auto-migrated.

**How it works:**
1. Agent detects feature needing new table
2. Creates SchemaRegistry entry with proposed schema
3. PolicyValidator checks against SafetyPolicy rules
4. MigrationGenerator creates SQL
5. Migration runs via GitHub Actions

**Evidence:** `packages/database/src/postgres/schemaRegistry/`

**Resembles:** Schema-as-code, but with AI generation

**Risks:**
- Schema drift, breaking changes
- Mitigation: Audit trail in SchemaAudit table, rollback capability

### 9.5 Comic Generation for PR Merges

**What it is:** When PRs are merged, Gemini generates a comic strip summarizing the changes.

**How it works:**
1. PR merged triggers `comic-generate.yml`
2. Script fetches PR details, diff, conversation context
3. Gemini generates comic image
4. Posted to Discord + Twitter
5. Committed to repo for gallery

**Evidence:** `.github/workflows/comic-generate.yml`, `apps/bot/scripts/generate-pr-comic.ts`

**Why chosen:** Makes development fun, creates shareable artifacts

**Risks:**
- Comic generation failures block nothing (non-critical)
- Quality varies with PR complexity

### 9.6 Multi-tier Response Decision

**What it is:** AI uses a 4-level hierarchical framework to decide whether to respond.

**Levels:**
1. Explicit rejection (user says don't respond)
2. Addressing analysis (to bot vs about bot)
3. Intent recognition (help seeking, feature request, etc.)
4. Conversation flow (active participant vs observer)

**Evidence:** `apps/bot/src/lib/shouldRespond.ts`

**Why chosen:** Prevents over-responding while staying helpful

**Risks:**
- May miss requests, users confused about bot behavior
- Mitigation: High-confidence thresholds, logging all decisions

---

## 10. Observability and Operations

### Logging

**Console Logging:**
- Structured console.log with emojis for visual scanning
- Pattern: `✅ Success`, `❌ Error`, `🔧 Tool used`, `🎯 Decision`

**Decision Logging:**
- All shouldRespond decisions logged to PostgreSQL
- All tool executions logged
- Audit trail in `decision_logs` table

### Metrics (Current State)

- Response time tracked in feelings subsystem
- Error rate tracked per session
- Tool call counts tracked

**Not found:** External metrics export (Prometheus, DataDog)

### Tracing

- Message IDs linked across: message → response → tool executions
- Conversation tracking via `conversations` table

### Railway Monitoring

```bash
# Real-time logs
railway logs --service omega-bot
railway logs --service omega

# Service status
railway status
```

---

## 11. Security Model

### Authentication Boundaries

1. **Discord**: Bot token authenticates to Discord Gateway
2. **PostgreSQL**: Connection string with credentials
3. **MongoDB**: Connection string with credentials
4. **OpenAI/Gemini**: API keys
5. **GitHub**: Personal access token

### Authorization

- No user authentication for web dashboard (public read-only)
- Discord bot respects server permissions for banning
- File uploads validate extensions (allowlist)

### Input Validation

- Zod schemas validate all tool parameters
- SQL injection prevention via parameterized queries
- Filename sanitization for uploads

### Secrets Management

- Environment variables via Railway dashboard
- `.env.example` documents required secrets
- No secrets in code

### Risks

1. **No web auth**: Dashboard data publicly accessible
2. **Tool execution**: unsandbox runs arbitrary code (sandboxed externally)
3. **Auto-ban**: Could be abused to ban legitimate users

---

## 12. Performance Model

### Caching

- Tool module cache (`toolCache` Map in toolLoader.ts)
- Core tools preloaded on startup
- No HTTP response caching identified

### Batching

- Message chunking for Discord's 2000 char limit
- Attachment downloads done sequentially with caching

### Concurrency

- Single bot process (no horizontal scaling)
- PostgreSQL connection pool (Prisma default)
- MongoDB connection pool (max 10)

### Hotspots

1. **Tool loading**: First call to new tool has import latency
   - Mitigation: preloadCoreTools()

2. **AI API calls**: Network latency to OpenAI/Gemini
   - Mitigation: Streaming with streamText()

3. **Large message history**: 30 messages × N chars
   - Mitigation: Token limits in prompts

### Cost Considerations

- OpenAI API costs scale with usage
- Railway compute costs for long-running processes
- PostgreSQL storage for large media files (MIDI, images)

---

## 13. Testing Strategy and Current Coverage

### Current Testing

**Unit Tests Found:**
- `apps/bot/src/utils/messageChunker.test.ts`
- `apps/bot/src/utils/codeBlockExtractor.test.ts`
- `apps/bot/src/utils/htmlMetadata.test.ts`
- `apps/bot/src/lib/tts.test.ts`
- `apps/bot/src/lib/typescript-validator.test.ts`
- `packages/agent/src/tools/unsandbox.test.ts`
- `packages/agent/src/tools/webFetch.test.ts`
- `apps/web/app/api/status/route.test.ts`

**Test Framework:** Vitest

**Test Commands:**
```bash
pnpm --filter bot test
pnpm --filter bot test:watch
pnpm --filter bot test:coverage
```

### Coverage Gaps

1. **No E2E tests** for full message flow
2. **Limited integration tests** for database operations
3. **No tests for**: shouldRespond AI decision, tool selection, GitHub workflows

### Recommended Testing Additions

1. Mock Discord Gateway for message handler tests
2. Database integration tests with test PostgreSQL
3. Tool execution snapshot tests
4. Workflow smoke tests

---

## 14. Roadmap Suggestions

### Next 30 Days (Quick Wins)

1. **Add web authentication**: Basic auth or Discord OAuth for dashboard
2. **Add metrics export**: Prometheus endpoint for monitoring
3. **Test coverage**: Add tests for shouldRespond, tool selection
4. **Documentation**: Add JSDoc to all public functions

### Next 60 Days (Medium Effort)

1. **Tool performance**: Add latency tracking per tool
2. **Rate limiting**: Prevent message spam
3. **User preferences**: Let users configure response behavior
4. **Error recovery**: Automatic retry for transient failures

### Next 90 Days (Larger Initiatives)

1. **Horizontal scaling**: Multiple bot instances with message sharding
2. **A/B testing**: Test different response strategies
3. **Advanced observability**: Distributed tracing
4. **Plugin system**: Allow external tool contributions

---

## 15. Appendices

### Appendix A: Key Files and Why They Matter

| File | Lines | Purpose |
|------|-------|---------|
| `apps/bot/src/handlers/messageHandler.ts` | ~1188 | Core message processing logic |
| `apps/bot/src/lib/shouldRespond.ts` | ~443 | AI-powered response decisions |
| `apps/bot/src/lib/systemPrompt.ts` | ~736 | Omega's complete personality/instructions |
| `packages/agent/src/agent.ts` | ~331 | AI agent orchestration |
| `packages/agent/src/toolLoader.ts` | ~311 | Dynamic tool loading |
| `packages/agent/src/toolRouter.ts` | ~83 | BM25 tool selection |
| `packages/database/prisma/schema.prisma` | ~723 | Complete database schema |
| `.github/workflows/claude-trigger.yml` | ~87 | Self-evolution entry point |

### Appendix B: Glossary of Repo-Specific Terms

| Term | Definition |
|------|------------|
| **Omega** | The AI Discord bot itself |
| **shouldRespond** | AI-powered function deciding if bot should reply |
| **runAgent** | Main function executing AI with tools |
| **Tool** | AI SDK v6 function Omega can call |
| **BM25 Selection** | Text search algorithm for choosing relevant tools |
| **Feelings** | Biomimicry-inspired internal state signals |
| **Self-evolution** | Omega creating issues that Claude Code implements |
| **PR Comic** | AI-generated comic strip for merged PRs |
| **Decision Log** | Audit trail of all AI decisions |
| **Schema Registry** | AI-driven database schema management |

### Appendix C: Open Questions and How to Answer Them

1. **Q: Why BM25 instead of semantic embeddings for tool selection?**
   - Investigate: Compare accuracy/latency of BM25 vs vector search
   - Test: Log tool selection misses, measure improvement with embeddings

2. **Q: How well does the feelings system influence behavior?**
   - Investigate: Analyze decision logs for correlation with feelings
   - Test: A/B test with/without feelings context in prompt

3. **Q: What's the self-evolution success rate?**
   - Investigate: Analyze GitHub Actions logs, count successful vs failed implementations
   - Test: Track SelfEvolutionRollback table

4. **Q: Are there security vulnerabilities in the unsandbox integration?**
   - Investigate: Review unsandbox API documentation, audit code execution patterns
   - Test: Penetration testing on code execution paths

5. **Q: How does comic generation handle sensitive PR content?**
   - Investigate: Review Gemini prompt, check for content filtering
   - Test: Create PR with edge case content, verify comic output

---

## Summary

Omega is a sophisticated, self-evolving AI Discord bot that combines:

- **Intelligent engagement**: AI-powered decisions on when to respond
- **80+ specialized tools**: From code execution to music generation
- **Self-improvement**: Creates GitHub issues that Claude Code implements
- **Rich user profiling**: 100+ attributes including psychological analysis
- **Multi-database architecture**: PostgreSQL for structured data, MongoDB for flexibility
- **Full observability**: Every decision and tool call logged

The codebase is well-structured with clear package boundaries, uses modern TypeScript patterns, and leverages AI SDK v6 for agent orchestration. The novel ideas around dynamic tool selection and self-evolution make this an interesting case study in autonomous AI systems.

---

*Report generated: 2026-02-04*
*Repository: omega (thomasdavis/omega)*
*Analysis conducted by: Claude Opus 4.5*
