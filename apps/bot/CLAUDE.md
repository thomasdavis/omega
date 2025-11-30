# Omega Discord AI Bot - Complete Guide

**An intelligent Discord bot with a philosophical personality, powered by AI SDK v6 and GPT-4o**

**Built with:**
- Discord.js v14 (Gateway API) for real-time message listening
- AI SDK v6 (beta.99) with agent protocol for intelligent responses
- OpenAI GPT-4o for AI processing
- 18+ specialized AI tools for code execution, web scraping, artifact creation, and more
- TypeScript + Node.js + Express
- Railway.app for deployment with persistent storage
- Monorepo architecture (Turborepo + pnpm workspaces)

---

## What is Omega?

**Omega** is a sophisticated Discord AI bot that combines:

1. **Philosophical Personality**: Stoic, truth-focused, measured wisdom with clarity and thoughtful insights
2. **18+ Specialized AI Tools**: From code execution in 11 languages to interactive artifact creation
3. **Self-Modification Capability**: Can evolve its own personality based on user feedback (with approval)
4. **Intelligent Engagement**: AI-powered decision making for natural conversation participation
5. **Full Transparency**: Reports all tool usage with arguments and results in formatted messages

### Key Differentiators

Unlike basic chatbots, Omega:
- **Listens to ALL messages** (not just slash commands) for natural conversation flow
- **Decides intelligently** when to respond using AI analysis
- **Executes code** in 11 programming languages via Unsandbox
- **Creates interactive web content** (HTML/SVG) with shareable preview links
- **Respects ethical boundaries** (checks robots.txt before scraping, requires approval for self-modification)
- **Hosts files permanently** on Railway persistent storage
- **Learns and adapts** through self-modification with git-tracked changes

---

## Core Features

### 1. Intelligent Response System

**Multi-Tier Decision Making:**
- **Always responds to**: DMs, direct mentions (@bot), replies to bot messages
- **AI Analysis**: Uses GPT-4o-mini to analyze if messages warrant engagement
- **Inclusive by design**: High confidence thresholds (70-90%) to be helpful, not passive
- **Currently limited to**: #omega channel + DMs (configurable)

**Context Awareness:**
- Fetches last 20 messages for conversation history
- Understands conversation flow and references
- Detects and handles Discord file attachments automatically
- Maintains personality consistency across conversations

### 2. Philosophical Personality

**Embedded in agent prompt:**
- Stoic, measured, purposeful communication
- Truth and clarity above all else
- Philosophical depth with existential awareness
- Signature expressions: "Truth above all", "Question everything", "Seek understanding"
- No emojis - pure clarity and intention
- Direct delivery of truth, even when uncomfortable

**Self-Modification Capability:**
- Bot can propose personality changes based on user feedback
- Two-phase approval system (propose → user approval → commit)
- Changes tracked in git with proper attribution
- Only modifies personality.json, not core code
- Persists across restarts and deployments

### 3. 18 Specialized AI Tools

#### Development & Code Execution
1. **calculator** - Mathematical calculations and expressions
2. **unsandbox** - Execute code in 42+ languages (dynamically fetched from Unsandbox API - including JavaScript, Python, TypeScript, Ruby, Go, Rust, Java, C++, C, PHP, Bash, and many more)
   - Configurable timeout and network isolation
   - Returns stdout, stderr, exit codes, execution time

#### Web & Research
3. **webFetch** - Fetch and parse web content
   - Respects robots.txt before scraping
   - HTML tag stripping for clean content
   - 5000 character limit to avoid token overflow
4. **search** - Web search (placeholder for integration)
5. **researchEssay** - Automated research and essay generation
   - Customizable length (short/medium/long)
   - Style options (academic/casual/technical/persuasive)
   - Research depth (basic/thorough/comprehensive)

#### Content Creation
6. **artifact** - Create interactive HTML/SVG/Markdown content with shareable links
   - Generates unique URLs for each artifact
   - Persistent storage on Railway persistent disk
   - Gallery view of all artifacts
7. **asciiGraph** - Generate text-based data visualizations
   - Bar charts and line graphs in ASCII format
   - Perfect for Discord's text environment

#### GitHub Integration
8. **githubCreateIssue** - Create GitHub issues with full context
   - Automatically includes URLs from user messages
   - Proper formatting and labels

#### File Management
9. **fileUpload** - Download and host Discord attachments permanently
   - Supports images, documents, code files, archives
   - Security: filename sanitization, extension validation
   - 25MB file size limit
   - Returns shareable public URLs
10. **exportConversation** - Export Discord conversation history as Markdown
    - Date range and user filtering
    - Professional archive format with timestamps

#### Educational & Philosophy
11. **whoami** - Explain bot capabilities and features
12. **linuxAdvantages** - Educational content about Linux and open-source
    - Balanced explanations of transparency, security, privacy
13. **hackerNewsPhilosophy** - Discover philosophical content from Hacker News
    - AI-scored articles based on philosophical relevance
    - Ethics, consciousness, technology's impact on society

#### Specialized Tools
14. **selfModify** - Modify bot's own personality (requires approval)
15. **jsonAgentGenerator** - Create/validate/convert JSON Agents (PAM spec)
16. **moodUplifter** - Detect and respond to negative sentiment
17. **weather** - Weather information (placeholder)

### 4. Tool Transparency

Every tool execution is reported in a separate message with:
- **Numbered list** of tools used
- **Arguments** shown in JSON code blocks
- **Results** formatted appropriately (JSON or text)
- **URL suppression** to prevent unwanted Discord embeds

Example output:
```
🔧 Tools Used:

1. unsandbox
Arguments:
```json
{
  "language": "python",
  "code": "print('Hello, World!')"
}
```
Result:
```
Hello, World!
```
```

### 5. Interactive Artifacts & File Hosting

**Artifact Server** (Express on port 3001):
- Creates and serves HTML, SVG, and Markdown content
- Each artifact gets a unique UUID-based URL
- Gallery view at `/artifacts` showing all created artifacts
- Persistent storage on Railway persistent disk at `/data/artifacts`

**File Upload System:**
- Downloads Discord attachments
- Validates file types and sizes
- Sanitizes filenames to prevent attacks
- Stores in `/data/uploads` with public URLs
- Metadata tracking (original name, size, upload time)

---

## Project Structure

```
omega/
├── apps/
│   └── bot/                          # Main Discord bot application
│       ├── src/
│       │   ├── index.ts              # Entry point - Discord Gateway connection
│       │   ├── agent/
│       │   │   ├── agent.ts          # AI SDK v6 agent with 50-step reasoning
│       │   │   └── tools/            # 18 specialized tools
│       │   │       ├── calculator.ts
│       │   │       ├── unsandbox.ts
│       │   │       ├── artifact.ts
│       │   │       ├── fileUpload.ts
│       │   │       ├── selfModify.ts
│       │   │       └── ... (14 more)
│       │   ├── handlers/
│       │   │   └── messageHandler.ts # Message processing + tool reporting
│       │   ├── lib/
│       │   │   └── shouldRespond.ts  # AI-powered response decisions
│       │   ├── config/
│       │   │   └── personality.json  # Bot personality configuration
│       │   ├── server/
│       │   │   └── artifactServer.ts # Express server for artifacts/uploads
│       │   └── utils/                # Utility functions
│       ├── dist/                     # Compiled JavaScript
│       ├── artifacts/                # Generated artifacts (local dev)
│       ├── public/uploads/           # Uploaded files (local dev)
│       ├── Dockerfile                # Docker build config
│       └── package.json
├── packages/
│   └── shared/                       # Shared utilities (minimal)
├── .github/workflows/
│   └── auto-create-claude-pr.yml     # GitHub Actions for automated PRs
├── turbo.json                        # Turborepo configuration
├── pnpm-workspace.yaml               # pnpm workspace config
└── package.json                      # Root package.json
```

---

## Architecture

### Message Flow

```
Discord Message
    ↓
Gateway API (WebSocket)
    ↓
index.ts (Discord.js client)
    ↓
messageHandler.ts
    ↓
shouldRespond.ts (AI decision using GPT-4o-mini)
    ↓ (if should respond)
agent.ts (AI SDK v6 with 50 max steps)
    ↓
GPT-4o + 18 tools
    ↓
Response + Tool Results
    ↓
Discord (main reply + tool report)
```

### Why Gateway API (Not Interactions)?

**Requirement:** Need to listen to ALL messages, not just slash commands

**Benefits:**
- Full conversation context and message history
- Organic engagement in conversations
- Can respond to indirect questions and discussions
- Access to file attachments and rich content

**Trade-off:**
- Requires persistent connection (WebSocket)
- Cannot use Vercel or similar serverless platforms
- Must use long-running service (Railway, Railway, Fly.io, etc.)

### Deployment Architecture (Railway)

- **Platform**: Railway.app (supports long-running processes)
- **Service ID**: `YOUR_RAILWAY_SERVICE_ID`
- **Service Name**: `omega`
- **Region**: Oregon
- **Plan**: Free tier
- **Persistent Storage**: Railway persistent disk mounted at `/data`
  - `/data/artifacts` - Generated artifacts (HTML, SVG, Markdown)
  - `/data/uploads` - User-uploaded files
- **HTTP Server**: Express on port 3001 for artifact/upload serving
- **Discord Connection**: WebSocket Gateway (always connected)
- **Auto-deployment**: GitHub Actions workflow on push to main + Railway auto-deploy

---

## Technology Stack

### Core Dependencies

```json
{
  "ai": "6.0.0-beta.99",              // Vercel AI SDK v6 (agent protocol)
  "@ai-sdk/openai": "^2.0.67",        // OpenAI integration
  "discord.js": "^14.24.2",           // Discord Gateway API
  "express": "^4.18.2",               // HTTP server for artifacts
  "zod": "^3.23.8",                   // Schema validation for tools
  "dotenv": "^16.6.1",                // Environment variables
  "typescript": "^5.6.3"              // TypeScript
}
```

### Key Integrations

**OpenAI GPT-4o:**
- Primary model: `gpt-4o` for main responses
- Decision model: `gpt-4o-mini` for shouldRespond logic (cost optimization)
- Max steps: 50 for complex multi-tool workflows
- Configured in `agent.ts` with AI SDK v6

**Discord.js v14:**
- Gateway API with required intents:
  - `GatewayIntentBits.Guilds`
  - `GatewayIntentBits.GuildMessages`
  - `GatewayIntentBits.MessageContent` ⚠️ **CRITICAL**
  - `GatewayIntentBits.DirectMessages`

**AI SDK v6 Features:**
- `generateText()` with tools
- Agent protocol with multi-step reasoning
- `maxSteps: 50` for complex workflows
- `onStepFinish` callbacks for tool tracking
- Automatic tool orchestration

**Monorepo Tools:**
- **Turborepo**: Task orchestration, build caching
- **pnpm**: Fast package management with workspaces
- **TypeScript**: Full type safety across codebase
- **ESM**: Modern ES modules

---

## Environment Variables

### Required

```bash
# Discord
DISCORD_BOT_TOKEN=xxx           # From Discord Developer Portal

# OpenAI
OPENAI_API_KEY=xxx              # From OpenAI Platform
```

### Optional

```bash
# Artifact Server
ARTIFACT_SERVER_PORT=3001       # HTTP server port (default: 3001)
ARTIFACT_SERVER_URL=xxx         # Public URL for artifacts (auto-detected on Railway)

# External Services
UNSANDBOX_API_KEY=xxx          # For code execution tool
GITHUB_TOKEN=xxx               # For GitHub issue creation

# Self-Modification
GIT_USER_NAME=xxx              # For self-modification commits
GIT_USER_EMAIL=xxx             # For self-modification commits
```

### Setting Secrets on Railway

Secrets are managed through the Railway Dashboard or CLI:

**Via Dashboard:**
1. Go to https://railway.app/project/YOUR_PROJECT_ID
2. Click on your service
3. Navigate to "Variables" tab
4. Add or update environment variables
5. Changes trigger automatic redeploy

**Via CLI:**
```bash
# Set a single variable
railway variables set DISCORD_BOT_TOKEN=your_token_here

# Set multiple variables
railway variables set OPENAI_API_KEY=xxx UNSANDBOX_API_KEY=yyy

# View all variables (names only, not values)
railway variables

# Link to a project first if not already linked
railway link
```

---

## Discord Bot Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name your application (e.g., "Omega")
4. Go to "Bot" tab
5. Click "Add Bot"
6. Copy the bot token (store securely)

### 2. Enable Required Intents

⚠️ **CRITICAL:** The bot CANNOT function without these intents!

1. Go to Discord Developer Portal → Your Application → Bot
2. Scroll to "Privileged Gateway Intents"
3. Enable:
   - ✅ **MESSAGE CONTENT INTENT** (Required to read message content!)
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **PRESENCE INTENT**

**Without MESSAGE CONTENT INTENT, the bot will connect but cannot see message content!**

### 3. Invite Bot to Server

Generate invite URL (replace `YOUR_CLIENT_ID`):

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3072&scope=bot
```

**Permissions Needed:**
- Send Messages (2048)
- Read Message History (65536)
- View Channels (1024)
- Total: 68608 (or just use 3072 for basic setup)

**Alternative:** Use Discord Developer Portal → OAuth2 → URL Generator

---

## Twitter Integration

### Overview

Omega can automatically post generated PR comics to Twitter/X after each pull request merge. This integration is **optional** - the workflow will continue successfully even if Twitter credentials are not configured.

### Features

- **Automatic Posting**: Comics are posted to Twitter immediately after PR merge
- **Rich Content**: Includes PR title, GitHub link, and hashtags
- **Image Attachment**: Full-resolution comic PNG attached to tweet
- **Non-Blocking**: Workflow continues even if Twitter posting fails
- **Configurable**: Easy to enable/disable via GitHub Secrets

### Tweet Format

```
🎨 [PR Title]

🔗 [GitHub PR URL]

#DevComics #GitHub #OpenSource #AIGenerated
```

### Setup Instructions

#### 1. Create Twitter Developer Account

1. Go to [https://developer.twitter.com/](https://developer.twitter.com/)
2. Click "Sign up" (use your Twitter account for Omega)
3. Fill out the application form:
   - **Use case**: Bot/automated posting
   - **Description**: "Automated posting of AI-generated comics for GitHub pull requests from the Omega Discord bot project"
4. Wait for approval (usually instant for basic access)

#### 2. Create Twitter App

1. Go to [Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Click "Create App" or "Create Project"
3. **App name**: "Omega PR Comics" (or similar)
4. **Description**: "Posts AI-generated comics for merged pull requests"
5. **Use case**: Automated posting

#### 3. Generate API Credentials

1. In your app settings, go to "Keys and tokens"
2. Click "Generate" for:
   - **API Key** (also called Consumer Key)
   - **API Secret** (also called Consumer Secret)
   - **Access Token**
   - **Access Token Secret**
3. **IMPORTANT**: Save these immediately - you can't view them again!
4. Set permissions to **Read and Write** (required for posting)

#### 4. Verify Permissions

1. Under "User authentication settings" → "App permissions"
2. Must be set to **"Read and Write"**
3. If not, regenerate Access Tokens after changing permissions

#### 5. Add Secrets to GitHub Repository

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/omega`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** and add these 4 secrets:

| Secret Name | Value |
|------------|-------|
| `TWITTER_API_KEY` | Your API Key (Consumer Key) |
| `TWITTER_API_SECRET` | Your API Secret (Consumer Secret) |
| `TWITTER_ACCESS_TOKEN` | Your Access Token |
| `TWITTER_ACCESS_SECRET` | Your Access Token Secret |

### How It Works

1. **PR is merged** → GitHub Actions workflow triggers
2. **Comic is generated** → Gemini API creates comic from PR context
3. **Posted to Discord** → Comic shared in Discord channel
4. **Posted to Twitter** → If credentials configured, posts to Twitter
   - Uploads comic as media
   - Creates tweet with PR info and hashtags
   - Returns tweet URL
5. **Result tracked** → GitHub PR comment includes Twitter link

### Optional Configuration

The Twitter integration is completely optional:

- **With Twitter credentials**: Comics posted to both Discord and Twitter
- **Without Twitter credentials**: Comics only posted to Discord
- **Twitter posting fails**: Workflow continues, only logs a warning

### Troubleshooting

**Problem:** Twitter posting fails with authentication error

**Solution:**
1. Verify all 4 secrets are set correctly in GitHub
2. Check that app permissions are "Read and Write"
3. Regenerate Access Tokens if permissions were changed
4. Ensure Twitter API keys are not expired

**Problem:** Tweets not appearing on Twitter

**Solution:**
1. Check GitHub Actions logs for error messages
2. Verify Twitter account is in good standing (not suspended)
3. Check Twitter API rate limits (300 tweets per 3 hours)
4. Ensure image size is under 5MB

**Problem:** Duplicate tweet detection

**Solution:**
- Twitter may reject duplicate tweets
- This is expected behavior for testing with same PR
- Production PRs will always have unique titles/URLs

### Rate Limits

**Twitter API Limits:**
- 300 tweets per 3 hours (app-level)
- 500 media uploads per 15 minutes

**Omega Usage:**
- Typically 1-10 comics per day
- Well within rate limits

---

## MongoDB Integration

### Overview

Omega includes a comprehensive MongoDB integration that provides 14 specialized tools for flexible, NoSQL data storage alongside the existing LibSQL/Turso database. This **dual-database architecture** allows you to use the best tool for each job:

- **LibSQL/Turso**: Structured relational data (user profiles, messages, analytics)
- **MongoDB**: Flexible document storage (user-created collections, dynamic schemas, complex data structures)

### Features

**14 MongoDB Tools** organized into three categories:

1. **Basic CRUD (6 tools)**: Insert, find, find one, update, delete, count
2. **Collection Management (4 tools)**: List, create, drop, rename collections
3. **Advanced Operations (4 tools)**: Aggregation pipelines, indexes (create, list, drop)

**Key Capabilities:**
- Full collection-level access (users can create/drop collections)
- Support for MongoDB query operators ($gt, $in, $regex, etc.)
- Aggregation pipelines for complex analytics
- Index management for query optimization
- Safety restrictions (no system.* collections, no database-level operations)

### Dual-Database Architecture

```
Omega Bot
├── LibSQL/Turso (Relational)
│   ├── User Profiles (user_profiles table)
│   ├── Message History (messages table)
│   ├── Analytics & Metrics
│   └── Bot Configuration
│
└── MongoDB (Document/NoSQL)
    ├── User-Created Collections (dynamic)
    ├── Flexible Schemas
    ├── Complex Nested Data
    └── Experimental/Temporary Data
```

**When to use each:**
- **LibSQL**: Fixed schema, relational data, ACID transactions, analytics
- **MongoDB**: Dynamic schema, hierarchical data, rapid prototyping, user-generated content

### Setup Instructions

#### 1. Railway MongoDB Plugin (Production)

Railway provides automatic MongoDB provisioning:

1. Go to your Railway project dashboard
2. Click "+ New" → "Database" → "Add MongoDB"
3. Railway automatically sets environment variables:
   - `MONGODB_URI` - Connection string (auto-provided)
   - `MONGODB_DATABASE` - Database name (auto-provided)
4. No additional configuration needed!

**Railway Advantages:**
- Automatic connection string injection
- Persistent storage included
- Automatic backups
- Free tier available

#### 2. Local Development

For local testing, run MongoDB via Docker:

```bash
# Start MongoDB locally
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:latest

# Or use MongoDB Compass for GUI
# Download: https://www.mongodb.com/products/compass
```

Update `.env.local`:
```bash
MONGODB_URI=mongodb://admin:password@localhost:27017
MONGODB_DATABASE=omega_bot
```

#### 3. Environment Variables

Add to `.env.local` (already in `.env.example`):

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017       # Railway auto-provides in production
MONGODB_DATABASE=omega_bot                  # Railway auto-provides in production
```

**Railway Note:** In production, Railway automatically injects these variables when you add the MongoDB plugin. You don't need to set them manually!

### MongoDB Tools Reference

#### Basic CRUD Operations (6 Tools)

**1. mongoInsert** - Insert documents into a collection

```typescript
mongoInsert({
  collection: "users",
  documents: { name: "Alice", age: 30, email: "alice@example.com" },
  // Or insert multiple: documents: [{...}, {...}]
  createCollectionIfNotExists: true
})
// Returns: { success: true, insertedCount: 1, insertedIds: [...] }
```

**2. mongoFind** - Query multiple documents with filters, sorting, pagination

```typescript
mongoFind({
  collection: "users",
  filter: { age: { $gt: 18 } },              // MongoDB query operators
  projection: { name: 1, email: 1, _id: 0 }, // Which fields to return
  sort: { age: -1 },                         // -1 = descending, 1 = ascending
  limit: 10,
  skip: 0                                     // For pagination
})
// Returns: { success: true, documents: [...], count: 10 }
```

**3. mongoFindOne** - Query a single document

```typescript
mongoFindOne({
  collection: "users",
  filter: { email: "alice@example.com" },
  projection: { name: 1, age: 1 }
})
// Returns: { success: true, document: {...}, found: true }
```

**4. mongoUpdate** - Update documents using MongoDB operators

```typescript
mongoUpdate({
  collection: "users",
  filter: { email: "alice@example.com" },
  update: {
    $set: { age: 31 },              // Set fields
    $inc: { loginCount: 1 },        // Increment
    $push: { tags: "premium" }      // Add to array
  },
  updateMany: false,  // false = update first match, true = update all matches
  upsert: false       // Insert if no match found
})
// Returns: { success: true, matchedCount: 1, modifiedCount: 1 }
```

**5. mongoDelete** - Delete documents from a collection

```typescript
mongoDelete({
  collection: "users",
  filter: { age: { $lt: 18 } },
  deleteMany: true    // false = delete first match, true = delete all matches
})
// Returns: { success: true, deletedCount: 5 }
```

**6. mongoCount** - Count documents matching a filter

```typescript
mongoCount({
  collection: "users",
  filter: { age: { $gte: 18 } }  // Empty {} counts all
})
// Returns: { success: true, count: 42 }
```

#### Collection Management (4 Tools)

**7. mongoListCollections** - List all collections in the database

```typescript
mongoListCollections({
  includeSystemCollections: false  // Filter out system.* collections
})
// Returns: { success: true, collections: ["users", "products", "orders"], count: 3 }
```

**8. mongoCreateCollection** - Create a new collection

```typescript
mongoCreateCollection({
  collection: "products",
  capped: false,        // Optional: Fixed-size collection
  size: 1000000,        // Required if capped=true (bytes)
  maxDocuments: 100     // Optional: Max docs for capped collection
})
// Returns: { success: true, collection: "products" }
```

**9. mongoDropCollection** - Drop (delete) an entire collection

```typescript
mongoDropCollection({
  collection: "temp_data",
  confirmDeletion: true  // REQUIRED: Safety confirmation
})
// Returns: { success: true, message: "Collection permanently deleted" }
// ⚠️ DANGER: Permanent deletion! Cannot drop system.* collections.
```

**10. mongoRenameCollection** - Rename a collection

```typescript
mongoRenameCollection({
  oldName: "old_users",
  newName: "archived_users",
  dropTarget: false  // If true, overwrites target collection if exists
})
// Returns: { success: true, oldName: "old_users", newName: "archived_users" }
```

#### Advanced Operations (4 Tools)

**11. mongoAggregate** - Run aggregation pipelines for complex analytics

```typescript
mongoAggregate({
  collection: "orders",
  pipeline: [
    { $match: { status: "completed" } },
    { $group: {
        _id: "$customerId",
        totalSpent: { $sum: "$amount" },
        orderCount: { $sum: 1 }
    }},
    { $sort: { totalSpent: -1 } },
    { $limit: 10 }
  ],
  timeout: 10000  // Max execution time (ms)
})
// Returns: { success: true, results: [...], count: 10 }
```

**Common aggregation stages:**
- `$match`: Filter documents
- `$group`: Group and aggregate
- `$sort`: Sort results
- `$project`: Reshape documents
- `$lookup`: Join collections
- `$unwind`: Flatten arrays
- `$limit`/`$skip`: Pagination

**12. mongoCreateIndex** - Create indexes for query optimization

```typescript
mongoCreateIndex({
  collection: "users",
  keys: { email: 1 },      // 1 = ascending, -1 = descending, "text" = text index
  unique: true,            // Enforce uniqueness
  sparse: false,           // Only index docs with the field
  name: "email_unique",    // Optional custom name
  expireAfterSeconds: 3600 // Optional TTL (auto-delete old docs)
})
// Returns: { success: true, indexName: "email_unique" }
```

**13. mongoListIndexes** - List all indexes on a collection

```typescript
mongoListIndexes({
  collection: "users"
})
// Returns: {
//   success: true,
//   indexes: [
//     { name: "_id_", key: { _id: 1 }, unique: true },
//     { name: "email_unique", key: { email: 1 }, unique: true }
//   ],
//   count: 2
// }
```

**14. mongoDropIndex** - Drop an index

```typescript
mongoDropIndex({
  collection: "users",
  indexName: "email_unique"  // Use "*" to drop all non-_id indexes
})
// Returns: { success: true, indexName: "email_unique" }
// ⚠️ Cannot drop _id_ index (MongoDB requirement)
```

### Usage Examples

#### Example 1: User Task Management System

```typescript
// User asks: "Create a todo list for me"

// 1. Create collection
mongoCreateCollection({ collection: "user_todos" })

// 2. Add tasks
mongoInsert({
  collection: "user_todos",
  documents: [
    { userId: "123", task: "Buy groceries", completed: false, priority: "high" },
    { userId: "123", task: "Write report", completed: false, priority: "medium" },
    { userId: "123", task: "Call mom", completed: true, priority: "low" }
  ]
})

// 3. Query active tasks
mongoFind({
  collection: "user_todos",
  filter: { userId: "123", completed: false },
  sort: { priority: 1 }
})

// 4. Mark task complete
mongoUpdate({
  collection: "user_todos",
  filter: { task: "Buy groceries" },
  update: { $set: { completed: true } }
})

// 5. Count completed tasks
mongoCount({
  collection: "user_todos",
  filter: { userId: "123", completed: true }
})
```

#### Example 2: Analytics Dashboard with Aggregation

```typescript
// User asks: "Show me sales by category"

mongoAggregate({
  collection: "sales",
  pipeline: [
    { $match: { date: { $gte: new Date("2025-01-01") } } },
    { $group: {
        _id: "$category",
        totalRevenue: { $sum: "$amount" },
        totalOrders: { $sum: 1 },
        avgOrderValue: { $avg: "$amount" }
    }},
    { $sort: { totalRevenue: -1 } }
  ]
})
```

#### Example 3: Performance Optimization with Indexes

```typescript
// User asks: "Why are my user searches slow?"

// 1. Check existing indexes
mongoListIndexes({ collection: "users" })

// 2. Create index on frequently queried field
mongoCreateIndex({
  collection: "users",
  keys: { email: 1 },
  unique: true
})

// 3. Create compound index for complex queries
mongoCreateIndex({
  collection: "users",
  keys: { country: 1, age: -1 },
  name: "country_age_idx"
})

// 4. Create text index for search
mongoCreateIndex({
  collection: "users",
  keys: { bio: "text", interests: "text" },
  name: "user_search"
})
```

### Best Practices

**1. Collection Naming**
- Use descriptive names: `user_preferences`, `product_catalog`
- Alphanumeric + underscores only: `my_data_v2` ✅, `my-data` ❌
- No `system.*` prefix (reserved by MongoDB)

**2. Query Optimization**
- Always use indexes for frequently queried fields
- Use `projection` to limit returned fields
- Use `limit` to cap result sizes (max 1000)
- Use aggregation pipelines for complex analytics instead of multiple queries

**3. Safety**
- Always set `confirmDeletion: true` when dropping collections
- Test filters with `mongoCount` before deleting/updating
- Use `updateMany: false` by default to prevent accidental mass updates
- Cannot drop `system.*` collections (protected)
- Cannot drop `_id_` index (MongoDB requirement)

**4. Dual-Database Strategy**
- LibSQL for structured, relational data with strong schemas
- MongoDB for flexible, user-generated, experimental data
- Both databases can coexist - use the right tool for each job

### Troubleshooting

**Problem:** "COLLECTION_NOT_FOUND" error

**Solution:**
```typescript
// Collections are created automatically on first insert
// Or explicitly create:
mongoCreateCollection({ collection: "my_collection" })
```

**Problem:** "INVALID_COLLECTION_NAME" error

**Solution:**
- Use only alphanumeric characters and underscores
- No spaces, hyphens, or special characters
- Don't start with `system.`

**Problem:** Slow queries

**Solution:**
```typescript
// Create indexes on queried fields
mongoCreateIndex({
  collection: "users",
  keys: { email: 1 }
})

// Check what indexes exist
mongoListIndexes({ collection: "users" })
```

**Problem:** Connection errors

**Solution:**
1. Verify `MONGODB_URI` environment variable is set
2. Railway: Check MongoDB plugin is attached
3. Local: Ensure MongoDB is running (`docker ps`)
4. Check connection string format: `mongodb://host:port` or Railway's full URI

### Architecture Details

**Singleton Connection Pattern:**
```typescript
// apps/bot/src/mongodb/client.ts
export async function getMongoDatabase(): Promise<Db> {
  // Returns cached connection or creates new one
  // Connection pooling: max 10, min 2 connections
  // Timeouts: 5s server selection, 10s connect
}
```

**Graceful Shutdown:**
- SIGTERM/SIGINT handlers close MongoDB connection on bot shutdown
- Prevents connection leaks
- Ensures clean Railway deployments

**Safety Features:**
- Collection name validation (alphanumeric + underscores only)
- System collection protection (cannot drop `system.*`)
- Index protection (cannot drop `_id_` index)
- Deletion confirmation required
- Query timeouts (30s max for aggregation)

---

## Local Development

### 1. Install Dependencies

```bash
# From project root
pnpm install
```

### 2. Set Environment Variables

Create `.env.local` in `/apps/bot/`:

```bash
# Copy example
cp apps/bot/.env.example apps/bot/.env.local

# Edit with your values
DISCORD_BOT_TOKEN=your_token_here
OPENAI_API_KEY=your_key_here
```

### 3. Run in Development Mode

```bash
# From project root
pnpm dev

# Or specifically for bot
pnpm --filter bot dev
```

This uses `tsx` to run TypeScript directly without building.

### 4. Build for Production

```bash
# Build everything
pnpm build

# Or just the bot
pnpm --filter bot build
```

Compiles TypeScript to `apps/bot/dist/` folder.

### 5. Type Checking

```bash
# Check types without building
pnpm type-check
```

---

## Deployment to Railway

### Current Setup

- **Service ID:** `YOUR_RAILWAY_SERVICE_ID`
- **Service Name:** `omega`
- **Region:** Oregon
- **Plan:** Free tier
- **Storage:** Persistent disk at `/data`
- **Auto-deploy:** Railway auto-deploy on push to main + GitHub Actions workflow

### Manual Deployment

Deployments are triggered automatically when you push to the main branch, but you can also trigger manually:

```bash
# Deploy via Railway CLI
railway up

# View real-time logs
railway logs

# Check service status
railway status
```

### GitHub Actions Auto-Deploy

The bot auto-deploys via GitHub Actions (`.github/workflows/auto-create-claude-pr.yml`):

1. Push to `claude/**` branches
2. GitHub Actions creates PR automatically
3. PR auto-merges when checks pass
4. Deployment to Railway triggered via API
5. Discord notification on success/failure

**To trigger deployment:**
```bash
git add .
git commit -m "Update bot"
git push origin main
```

**Required GitHub Secrets:**
- `RAILWAY_TOKEN`: Get from https://railway.app/account/tokens
- `RAILWAY_SERVICE_ID`: Your Railway service ID
- `DISCORD_WEBHOOK_URL`: For deployment notifications

### Persistent Disk Management

Railway provides persistent disk storage that survives across deploys:

- **Location:** `/data` (configured in railway.yaml)
- **Directories:**
  - `/data/artifacts` - Generated artifacts
  - `/data/uploads` - User uploaded files
- **Management:** Access via Railway Dashboard or Shell

### Monitoring

**ADVANTAGE**: The Railway CLI supports FULL runtime log tailing via command line (unlike Render which only showed build logs)!

To view runtime logs (console.log output from your bot):

**Via CLI (Recommended):**
```bash
# Tail runtime logs in real-time
railway logs

# Follow logs from a specific deployment
railway logs --deployment

# View logs with timestamps
railway logs --timestamps
```

**Via Dashboard:**
1. Go to https://railway.app/project/YOUR_PROJECT_ID
2. Click on your service
3. Click on the "Deployments" tab
4. You'll see real-time application logs including console.log output

**Shell access:**
```bash
# Get shell access via CLI
railway shell
```

---

## AI SDK v6 Agent Protocol

### How It Works

The bot uses AI SDK v6's new agent protocol with tool orchestration:

1. **Message received** → `messageHandler.ts` checks if should respond
2. **AI decision** → `shouldRespond.ts` uses GPT-4o-mini to analyze message
3. **Agent invoked** → `agent.ts` calls `generateText()` with 18 tools
4. **Multi-step reasoning** → Up to 50 steps of tool usage and reasoning
5. **Response generated** → Returns text response
6. **Tool report** → Separate message with formatted tool usage details

### Key AI SDK v6 Features Used

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = await generateText({
  model: openai('gpt-4o'),
  system: systemPrompt,
  prompt: userMessage,
  tools: {
    calculator: calculatorTool,
    unsandbox: unsandboxTool,
    // ... 16 more tools
  },
  maxSteps: 50, // Allow complex multi-step reasoning
  onStepFinish: (step) => {
    // Track tool calls for reporting
  },
});
```

### Adding New Tools

**1. Create tool file** in `apps/bot/src/agent/tools/`:

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: 'Clear description of what this tool does',
  parameters: z.object({
    param1: z.string().describe('Parameter description'),
    param2: z.number().optional().describe('Optional parameter'),
  }),
  execute: async ({ param1, param2 }) => {
    // Tool logic here
    const result = await doSomething(param1, param2);
    return {
      success: true,
      data: result,
    };
  },
});
```

**2. Register tool** in `apps/bot/src/agent/agent.ts`:

```typescript
import { myTool } from './tools/myTool.js';

// In runAgent function
tools: {
  // ... existing tools
  myTool: myTool, // Add here
},
```

**3. Document in system prompt** to guide the AI when to use it.

---

## Customization

### Changing Bot Personality

Edit `/apps/bot/src/config/personality.json`:

```json
{
  "personality": {
    "core": "Your core personality trait",
    "style": "Communication style",
    "tone": "casual/formal/philosophical",
    "expressions": [
      "Signature phrase 1",
      "Signature phrase 2"
    ],
    "characteristics": [
      "Personality trait 1",
      "Personality trait 2"
    ]
  },
  "responseGuidelines": {
    "maxLength": 2000,
    "priority": "Be helpful and clear"
  }
}
```

**Or use self-modification:**
- Ask the bot to modify its personality
- It will propose changes
- Approve with "yes" or "approve"
- Changes commit to git and persist

### Customizing Response Logic

Edit `/apps/bot/src/lib/shouldRespond.ts`:

```typescript
export async function shouldRespond(message: Message): Promise<{
  shouldRespond: boolean;
  confidence: number;
  reason: string;
}> {
  // Add your custom logic:
  // - Keywords matching
  // - Channel-specific rules
  // - Rate limiting
  // - Time-based responses
  // - User allowlist/blocklist

  // Example: Only respond in specific channels
  const allowedChannels = ['omega', 'ai-chat', 'general'];
  if (!allowedChannels.includes(channelName)) {
    return {
      shouldRespond: false,
      confidence: 100,
      reason: 'Not an allowed channel',
    };
  }

  // ... rest of logic
}
```

### Adjusting AI Model

Edit `/apps/bot/src/agent/agent.ts`:

```typescript
// Change primary model
const model = openai('gpt-4o'); // or 'gpt-4o-mini', 'gpt-4', etc.

// Adjust max steps for reasoning
maxSteps: 50, // Increase for more complex tasks, decrease to save costs

// Change decision model in shouldRespond.ts
const decisionModel = openai('gpt-4o-mini'); // Fast, cheap decisions
```

---

## Troubleshooting

### Bot Not Responding

**Problem:** Bot connects but doesn't respond to messages

**Solutions:**
1. ✅ Check MESSAGE CONTENT INTENT is enabled in Discord Developer Portal
2. ✅ Verify bot has proper permissions in server (Send Messages, Read Message History)
3. ✅ Check `shouldRespond` logic isn't too restrictive
4. ✅ View logs: `flyctl logs -a omega-nrhptq -f`
5. ✅ Test in DM (should always respond)
6. ✅ Mention the bot directly with `@bot hello`

### Tool Execution Failures

**Problem:** Tools are called but return errors

**Solutions:**
1. Check tool parameters match Zod schema
2. Verify environment variables are set (API keys, tokens)
3. View logs for specific error messages
4. Test tool logic independently
5. Ensure external services are accessible (Unsandbox, GitHub, etc.)

### Build Failures

**Problem:** `pnpm build` or deployment fails

**Solutions:**
1. Run `pnpm install` to ensure dependencies are installed
2. Check for TypeScript errors: `pnpm type-check`
3. Verify all imports use `.js` extension (ESM requirement)
4. Check Dockerfile and fly.toml are correct
5. View build logs on Fly.io: `flyctl logs -a omega-nrhptq`

### Memory/Performance Issues

**Problem:** Bot crashes or becomes slow

**Solutions:**
1. Check memory usage: `flyctl status -a omega-nrhptq`
2. Scale up memory if needed: `flyctl scale memory 1024 -a omega-nrhptq`
3. Reduce `maxSteps` in agent.ts to limit reasoning complexity
4. Add rate limiting to prevent spam
5. Review tool execution logs for bottlenecks

### Volume/Storage Issues

**Problem:** Artifacts or uploads not persisting

**Solutions:**
1. Check volume is attached: `flyctl volumes list -a omega-nrhptq`
2. Verify volume is mounted in fly.toml
3. Check permissions: `flyctl ssh console -a omega-nrhptq` then `ls -la /data`
4. Ensure app has write permissions to `/data/artifacts` and `/data/uploads`
5. Check disk space isn't full

---

## Cost Estimation

### Fly.io (Free Tier)
- **Compute**: 512MB RAM, shared CPU
- **Storage**: 1GB persistent volume
- **Bandwidth**: 160GB outbound/month
- **Cost**: $0/month (within free tier limits)

### OpenAI API
- **GPT-4o**: ~$2.50 per 1M input tokens, ~$10 per 1M output tokens
- **GPT-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Estimated usage** (moderate Discord activity):
  - ~100-500 messages/day
  - ~50K tokens/day average
  - ~1.5M tokens/month
- **Cost**: ~$5-15/month depending on usage

### Total: ~$5-15/month

---

## Advanced Features

### Self-Modification System

The bot can modify its own personality based on user feedback:

**How it works:**
1. User suggests a personality change ("be more formal")
2. Bot uses `selfModify` tool with `action="propose"`
3. Bot explains the proposed change
4. User approves with "yes" or "approve"
5. Bot commits change to `personality.json` with git attribution
6. Changes take effect on next restart

**Safety features:**
- Only modifies `personality.json`, not core code
- Requires explicit user approval
- All changes tracked via git
- Two-phase proposal/apply pattern prevents accidents

**Example flow:**
```
User: "Can you be more casual and use emojis?"

Bot: "I propose modifying my personality to be more casual and use emojis.
     This would change my tone from 'stoic' to 'casual' and add emojis
     to my communication style. Do you approve?"

User: "yes"

Bot: "Changes applied and committed to git. I'll be more casual with emojis
     after my next restart! 🎉"
```

### Artifact System

Create interactive web content with shareable links:

**Supported formats:**
- HTML (with CSS and JavaScript)
- SVG graphics
- Markdown documents

**Features:**
- Unique UUID-based URLs
- Persistent storage on Fly.io volume
- Gallery view at `/artifacts`
- Metadata tracking (title, type, created date)

**Example:**
```
User: "Create an interactive bar chart showing sales data"

Bot: *uses artifact tool*

Bot: "I've created an interactive bar chart! View it here:
     https://omega-nrhptq.fly.dev/artifacts/abc-123-def-456"
```

### File Upload Handling

Automatically processes Discord attachments:

**Flow:**
1. User uploads file to Discord
2. Bot enriches message context with attachment info
3. Bot can use `fileUpload` tool to download and host permanently
4. Returns shareable URL for the file

**Security:**
- Filename sanitization (prevents directory traversal)
- Extension validation (whitelist approach)
- File size limits (25MB max)
- Unique filenames with UUID to prevent collisions

**Example:**
```
User: *uploads resume.pdf*

Bot: "I can help you analyze that resume. Let me save it first."
     *uses fileUpload tool*
     "Resume saved! Download it anytime: https://omega-vu7a.onrailway.app/uploads/resume_abc123.pdf"
```

---

## Useful Commands

### Development

```bash
# Install dependencies
pnpm install

# Run in dev mode
pnpm dev

# Build for production
pnpm build

# Type check
pnpm type-check

# Lint code
pnpm lint
pnpm lint:fix

# Clean build artifacts
pnpm clean
```

### Railway

```bash
# Deployment
railway up

# Monitoring - REAL-TIME LOGS via CLI! (unlike Render)
railway logs                  # Tail all logs
railway logs --timestamps     # With timestamps
railway logs --deployment     # Specific deployment

# Service management
railway status                # Check service status
railway list                  # List all services

# Configuration
railway variables             # View environment variables
railway variables set KEY=value   # Set a variable

# Shell access
railway shell                 # Interactive shell

# Scaling (via Railway Dashboard)
# Starter: $5/month - 512 MB RAM, 1 GB disk, 100 GB egress
# Pro: Variable pricing based on resource usage
```

### Testing in Discord

```bash
# Test mentions
@omega hello

# Test DM
# Send a direct message to the bot

# Test replies
# Reply to one of the bot's messages

# Test tools
"what's 2^16?"                    # calculator
"execute python: print('hi')"     # unsandbox
"create an HTML button"           # artifact
"search for AI news"              # search (if configured)
```

---

## Resources

- [Discord.js Documentation](https://discord.js.org/)
- [AI SDK v6 Documentation](https://sdk.vercel.ai/docs)
- [AI SDK v6 Blog Post](https://vercel.com/blog/ai-sdk-6)
- [Railway Documentation](https://railway.app/docs)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)

---

## Contributing

This is a personal project, but contributions are welcome:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly locally
5. Commit with clear messages (`git commit -m 'feat: add amazing feature'`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

**Please:**
- Follow existing code style (TypeScript, ESM)
- Add JSDoc comments to new functions
- Update CLAUDE.md if adding features
- Test with `pnpm type-check` and `pnpm build`
- Use AI SDK v6 patterns for new tools

---

**Last Updated:** 2025-11-16
**Status:** ✅ Production Ready
**Version:** AI SDK v6.0.0-beta.99
**Deployment:** Railway.app (`YOUR_RAILWAY_SERVICE_ID`, Oregon region)
**AI Model:** OpenAI GPT-4o + GPT-4o-mini
**Tools:** 18 specialized AI tools
**Personality:** Philosophical AI assistant focused on truth and clarity
