# Discord AI Bot Architecture Plan

## Current Goal
Build a Discord bot that:
1. Listens to ALL messages in channels
2. Uses AI to decide whether to respond
3. Uses AI SDK v6 with agent protocol and tools
4. Reports tool usage back to Discord
5. Runs on Vercel serverless functions (if possible)

## Discord API Limitations - CRITICAL

### What Discord Supports

**❌ Discord does NOT support:**
- Webhooks for receiving MESSAGE_CREATE events
- HTTP callbacks when messages are sent
- Any way to trigger serverless functions from messages

**✅ Discord ONLY supports message listening via:**
- **Gateway API (WebSocket)** - Persistent connection required
  - Receives real-time MESSAGE_CREATE events
  - Requires long-running process (not serverless compatible)

**✅ Discord DOES support for sending:**
- REST API - Send messages via HTTP
- Webhooks - Post messages to channels via webhook URL

## Architecture Options

### Option 1: Hybrid Architecture (RECOMMENDED)
**Use Gateway + Serverless Functions**

```
Discord Gateway (WebSocket)
    ↓ MESSAGE_CREATE event
Gateway Listener (Railway/Render/Fly.io)
    ↓ Decides if should respond
    ↓ HTTP POST
Vercel Serverless Function (/api/process-message)
    ↓ AI SDK v6 Agent with tools
    ↓ Returns response + tool usage
Gateway Listener
    ↓ POST via REST API
Discord Channel (response)
```

**Pros:**
- ✅ Uses Vercel for AI processing (expensive part)
- ✅ Gateway listener can be tiny/cheap (just forwards events)
- ✅ Stateless AI processing
- ✅ Serverless benefits for AI SDK

**Cons:**
- ❌ Still need one long-running service (Gateway listener)
- ❌ Two services to deploy

**Implementation:**
1. Small Gateway bot on Railway/Render (free tier)
   - Listens to MESSAGE_CREATE
   - Forwards relevant messages to Vercel
   - Sends responses back to Discord
2. Vercel function for AI processing
   - AI SDK v6 agent with tools
   - Returns response + tool usage log

---

### Option 2: Standalone Gateway Bot (SIMPLER)
**Single long-running Node.js process**

```
Discord Gateway (WebSocket)
    ↓ MESSAGE_CREATE event
Node.js Bot Process
    ↓ AI SDK v6 Agent with tools
    ↓ POST via REST API
Discord Channel (response)
```

**Pros:**
- ✅ Simple architecture (one service)
- ✅ Lower latency (no HTTP hop)
- ✅ Easier to debug
- ✅ Full control over state

**Cons:**
- ❌ Cannot run on Vercel
- ❌ Need always-on server
- ❌ No serverless cost benefits

**Deployment Options:**
- Railway (free 500 hours/month)
- Render (free tier available)
- Fly.io (free tier available)
- Local development

---

### Option 3: ❌ Pure Vercel (NOT POSSIBLE)
**Why this doesn't work:**

Discord has no mechanism to invoke HTTP endpoints when messages are sent. The Gateway API (WebSocket) is the ONLY way to receive message events.

Vercel serverless functions cannot maintain WebSocket connections.

---

## Recommended Architecture: Option 2 (Standalone)

### Why Option 2 is Better for Your Use Case

1. **Simpler** - One codebase, one deployment
2. **AI SDK v6 Agent Protocol** - Works perfectly in long-running process
3. **Stateful Tools** - Can maintain context across tool calls
4. **Lower Latency** - Direct connection to Discord
5. **Free Hosting** - Railway/Render free tiers are sufficient

### Project Structure

```
apps/bot/
├── src/
│   ├── index.ts                 # Entry point, Gateway connection
│   ├── agent/
│   │   ├── agent.ts             # AI SDK v6 agent setup
│   │   ├── tools/               # Agent tools
│   │   │   ├── search.ts
│   │   │   ├── weather.ts
│   │   │   └── calculator.ts
│   │   └── prompts.ts           # System prompts
│   ├── discord/
│   │   ├── client.ts            # Discord.js client setup
│   │   ├── handlers/
│   │   │   └── messageCreate.ts # Message event handler
│   │   └── utils.ts             # Discord utilities
│   └── lib/
│       ├── shouldRespond.ts     # Logic to decide if bot should reply
│       └── logger.ts            # Logging utilities
├── package.json
├── tsconfig.json
└── .env.example
```

## Implementation Steps

### Phase 1: Basic Gateway Bot
1. Set up discord.js client with Gateway intents
2. Connect to Discord Gateway
3. Listen to MESSAGE_CREATE events
4. Implement basic "should respond" logic
5. Send simple text responses

### Phase 2: AI SDK v6 Integration
1. Set up OpenAI provider with AI SDK v6
2. Implement agent with system prompt
3. Add basic conversation handling
4. Test agent responses in Discord

### Phase 3: Agent Tools & Protocol
1. Define agent tools (search, weather, etc.)
2. Implement tool execution
3. Add tool usage reporting to Discord
4. Format tool results nicely

### Phase 4: Polish & Deploy
1. Add error handling
2. Add logging
3. Add rate limiting
4. Deploy to Railway/Render
5. Test in production

## Environment Variables

```bash
# Discord
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here

# OpenAI
OPENAI_API_KEY=your_openai_key_here

# Optional
LOG_LEVEL=info
NODE_ENV=production
```

## Discord Bot Setup

1. Go to https://discord.com/developers/applications
2. Create new application
3. Go to "Bot" tab
4. Enable these Gateway Intents:
   - ✅ MESSAGE CONTENT INTENT (required to read messages)
   - ✅ GUILD MESSAGES
   - ✅ DIRECT MESSAGES
5. Copy bot token for DISCORD_BOT_TOKEN

## Next Steps

1. ✅ Update package.json with discord.js
2. ✅ Create basic Gateway bot structure
3. ✅ Implement message listener
4. ✅ Add AI SDK v6 agent
5. ✅ Add tools and reporting
6. ✅ Deploy to Railway/Render

## Cost Estimate

**Railway Free Tier:**
- 500 hours/month free
- $5/month after (if needed)
- More than enough for a small bot

**OpenAI:**
- GPT-4o: ~$2.50 per 1M input tokens
- Depends on usage

**Total:** $0-5/month for hosting + OpenAI costs

---

**Decision: Proceed with Option 2 (Standalone Gateway Bot)?**
