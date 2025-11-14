# Discord AI Bot Implementation Plan
## Serverless AI Bot with OpenAI, Vercel AI SDK v6, and Discord Interactions API

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Implementation Phases](#implementation-phases)
5. [Detailed Implementation Steps](#detailed-implementation-steps)
6. [Testing Strategy](#testing-strategy)
7. [Deployment](#deployment)
8. [Advanced Features](#advanced-features)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance & Operations](#maintenance--operations)

---

## Overview

### Project Goal
Build a serverless Discord bot that leverages OpenAI for AI capabilities, deployed on Vercel using Discord's Interactions API instead of traditional WebSocket connections.

### Why This Approach?

**Traditional Bot Limitations:**
- Requires persistent WebSocket connection
- Needs dedicated server infrastructure
- Gateway API dependency
- Fixed resource allocation

**Serverless Bot Advantages:**
- HTTP webhook-based (Interactions API)
- Zero infrastructure management
- Infinite auto-scaling
- Pay-per-use cost model
- Edge deployment for low latency

### Key Technical Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Bot API | Discord Interactions API | Serverless-compatible, HTTP-based |
| Compute | Vercel Serverless Functions | Auto-scaling, zero config, edge network |
| AI Framework | Vercel AI SDK v6 | Streaming support, tool calling, OpenAI integration |
| Language | TypeScript | Type safety, better DX |
| Monorepo | Turborepo | Multi-package management, future extensibility |

---

## Architecture

### High-Level Architecture
```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Discord   │  HTTP   │    Vercel    │  API    │   OpenAI    │
│   Client    │────────>│  Functions   │────────>│   GPT-4     │
└─────────────┘         └──────────────┘         └─────────────┘
      ^                         │
      │                         │
      └─────────Response────────┘
```

### Request Flow
```
1. User types /ask "What is TypeScript?"
2. Discord → POST to Vercel webhook
3. Vercel verifies signature
4. Vercel defers response (Type 5)
5. Vercel calls OpenAI API
6. Vercel edits deferred message with AI response
7. User sees answer in Discord
```

### Project Structure
```
discord-ai-bot/
├── apps/
│   └── bot/
│       ├── api/
│       │   ├── interactions.ts        # Main Discord webhook endpoint
│       │   └── register-commands.ts   # Command registration endpoint
│       ├── src/
│       │   ├── commands/
│       │   │   ├── ask.ts            # /ask command handler
│       │   │   ├── vibe.ts           # /vibe command handler
│       │   │   └── help.ts           # /help command handler
│       │   ├── lib/
│       │   │   ├── ai.ts             # OpenAI wrapper & configs
│       │   │   ├── discord.ts        # Discord API utilities
│       │   │   └── verification.ts   # Signature verification
│       │   ├── types/
│       │   │   ├── discord.ts        # Discord type definitions
│       │   │   └── interaction.ts    # Interaction types
│       │   └── utils/
│       │       ├── response.ts       # Response builders
│       │       └── errors.ts         # Error handling
│       ├── vercel.json               # Vercel config
│       └── package.json
├── packages/
│   ├── ai-agent/                     # Future: autonomous coding
│   │   ├── src/
│   │   │   ├── tools/
│   │   │   │   ├── github.ts        # GitHub integration
│   │   │   │   ├── code-gen.ts      # Code generation
│   │   │   │   └── test-gen.ts      # Test generation
│   │   │   └── orchestrator.ts      # Tool coordination
│   │   └── package.json
│   └── shared/                       # Shared utilities & types
│       ├── src/
│       │   ├── types/
│       │   └── utils/
│       └── package.json
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## Prerequisites

### Required Accounts
- [ ] Discord Developer Account (free)
- [ ] Vercel Account (free tier sufficient)
- [ ] OpenAI Account with API access (paid)

### Required Tools
- [ ] Node.js 18+
- [ ] pnpm 8+
- [ ] Git
- [ ] Vercel CLI (`pnpm add -g vercel`)
- [ ] ngrok (for local testing)

### Required Environment Variables
```bash
DISCORD_PUBLIC_KEY=     # From Discord Developer Portal → General Information
DISCORD_BOT_TOKEN=      # From Discord Developer Portal → Bot tab
DISCORD_APP_ID=         # From Discord Developer Portal → General Information
OPENAI_API_KEY=         # From OpenAI Platform
```

---

## Implementation Phases

### Phase 1: MVP Bot (Est. 2-3 hours)
**Goal:** Working bot with `/ask` command that responds using OpenAI.

**Features:**
- Slash command registration
- Discord signature verification
- Basic OpenAI integration
- Deferred response handling

**Success Criteria:**
- Bot responds to `/ask` commands in Discord
- Responses use GPT-4 intelligence
- No crashes or timeouts

---

### Phase 2: Enhanced Features (Est. 3-4 hours)
**Goal:** Production-ready bot with personality, rate limiting, and better UX.

**Features:**
- Multiple slash commands (`/help`, `/vibe`)
- Personality system (professional, chaotic, zen)
- Rate limiting per user
- Conversation memory (per-user context)
- Streaming responses (progressive updates)
- Error handling & logging

**Success Criteria:**
- Bot handles 100+ requests/hour
- Users can customize bot personality
- Rate limits prevent abuse
- Errors are gracefully handled

---

### Phase 3: Self-Coding Capabilities (Est. 10-15 hours)
**Goal:** Autonomous coding agent that can modify its own codebase.

**Features:**
- GitHub integration
- Code generation with AI SDK tools
- Branch creation & PR management
- Test generation
- Self-improvement loop

**Success Criteria:**
- Bot can create branches and PRs
- Bot generates working TypeScript code
- Bot writes tests for new features
- Bot responds to code review feedback

---

## Detailed Implementation Steps

### Step 1: Discord Application Setup

#### 1.1 Create Discord Application
1. Navigate to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name: "AI Assistant Bot" (or your choice)
4. Click "Create"

#### 1.2 Create Bot User
1. Navigate to "Bot" tab in left sidebar
2. Click "Add Bot" → "Yes, do it!"
3. **Important Settings:**
   - Uncheck "Public Bot" (if you want private control)
   - Enable "Message Content Intent" (if needed for future features)
4. Click "Reset Token" → Copy token → Save as `DISCORD_BOT_TOKEN`

#### 1.3 Get Application Credentials
1. Navigate to "General Information" tab
2. Copy "Application ID" → Save as `DISCORD_APP_ID`
3. Copy "Public Key" → Save as `DISCORD_PUBLIC_KEY`

#### 1.4 Generate Bot Invite URL
1. Navigate to "OAuth2" → "URL Generator"
2. Select scopes:
   - `applications.commands`
   - `bot`
3. Select bot permissions:
   - "Send Messages"
   - "Send Messages in Threads"
   - "Embed Links"
   - "Use Slash Commands"
4. Copy generated URL
5. Open URL in browser → Select server → Authorize

---

### Step 2: Project Setup

#### 2.1 Initialize Turborepo
```bash
# Create project
npx create-turbo@latest discord-ai-bot
cd discord-ai-bot

# Initialize git
git init
git add .
git commit -m "Initial commit"
```

#### 2.2 Install Dependencies
```bash
# Bot dependencies
pnpm add --filter bot ai openai discord-interactions tweetnacl

# Type definitions
pnpm add --filter bot -D @types/node

# Future: AI agent dependencies
pnpm add --filter ai-agent @octokit/rest ai
```

#### 2.3 Configure Turborepo
```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".vercel/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {}
  }
}
```

#### 2.4 Setup Environment Variables
```bash
# Create .env.local
touch apps/bot/.env.local

# Add variables
cat << EOF > apps/bot/.env.local
DISCORD_PUBLIC_KEY=your_public_key_here
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_APP_ID=your_app_id_here
OPENAI_API_KEY=your_openai_key_here
EOF

# Add to .gitignore
echo ".env.local" >> .gitignore
```

---

### Step 3: Core Implementation

#### 3.1 Create Type Definitions
```typescript
// apps/bot/src/types/discord.ts
export enum InteractionType {
  PING = 1,
  APPLICATION_COMMAND = 2,
  MESSAGE_COMPONENT = 3,
  APPLICATION_COMMAND_AUTOCOMPLETE = 4,
  MODAL_SUBMIT = 5,
}

export enum InteractionResponseType {
  PONG = 1,
  CHANNEL_MESSAGE_WITH_SOURCE = 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
  DEFERRED_UPDATE_MESSAGE = 6,
  UPDATE_MESSAGE = 7,
}

export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: InteractionType;
  data?: {
    name: string;
    type: number;
    options?: Array<{
      name: string;
      type: number;
      value: string | number | boolean;
    }>;
  };
  guild_id?: string;
  channel_id?: string;
  member?: any;
  user?: any;
  token: string;
  version: number;
  message?: any;
}

export interface DiscordInteractionResponse {
  type: InteractionResponseType;
  data?: {
    content?: string;
    embeds?: any[];
    flags?: number;
  };
}
```

#### 3.2 Create Verification Utilities
```typescript
// apps/bot/src/lib/verification.ts
import { verifyKey } from 'discord-interactions';

export async function getRawBody(req: Request): Promise<string> {
  const reader = req.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder();
  let body = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    body += decoder.decode(value, { stream: true });
  }

  return body;
}

export function verifyDiscordRequest(
  rawBody: string,
  signature: string,
  timestamp: string,
  publicKey: string
): boolean {
  try {
    return verifyKey(rawBody, signature, timestamp, publicKey);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}
```

#### 3.3 Create AI Wrapper
```typescript
// apps/bot/src/lib/ai.ts
import { createOpenAI } from '@ai-sdk/openai';

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Personality system prompts
export const personalityPrompts = {
  professional: `You are a helpful, professional AI assistant.
    Provide clear, concise, and accurate information.
    Use proper grammar and maintain a respectful tone.`,

  chaotic: `You are a chaotic, unpredictable AI assistant.
    Be creative, use emojis liberally, and occasionally make jokes.
    Still be helpful, but have fun with it!`,

  zen: `You are a calm, zen-like AI assistant.
    Speak in peaceful, mindful language.
    Help users find clarity and understanding.`,
};

// AI configurations for different use cases
export const aiConfigs = {
  fast: {
    model: openai('gpt-4o-mini'),
    maxTokens: 300,
    temperature: 0.7,
  },
  smart: {
    model: openai('gpt-4o'),
    maxTokens: 1000,
    temperature: 0.7,
  },
  creative: {
    model: openai('gpt-4o'),
    maxTokens: 800,
    temperature: 1.2,
  },
};

// Default config
export const defaultConfig = aiConfigs.smart;
```

#### 3.4 Create Discord Utilities
```typescript
// apps/bot/src/lib/discord.ts
import { InteractionResponseType } from '../types/discord';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export async function deferResponse(
  appId: string,
  interactionToken: string
): Promise<void> {
  await fetch(
    `${DISCORD_API_BASE}/webhooks/${appId}/${interactionToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      }),
    }
  );
}

export async function editResponse(
  appId: string,
  interactionToken: string,
  content: string
): Promise<void> {
  await fetch(
    `${DISCORD_API_BASE}/webhooks/${appId}/${interactionToken}/messages/@original`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }
  );
}

export async function sendFollowup(
  appId: string,
  interactionToken: string,
  content: string
): Promise<void> {
  await fetch(
    `${DISCORD_API_BASE}/webhooks/${appId}/${interactionToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }
  );
}

export function createErrorEmbed(error: string) {
  return {
    embeds: [{
      title: '❌ Error',
      description: error,
      color: 0xFF0000, // Red
    }],
  };
}

export function createSuccessEmbed(message: string) {
  return {
    embeds: [{
      title: '✅ Success',
      description: message,
      color: 0x00FF00, // Green
    }],
  };
}
```

#### 3.5 Create Command Handlers
```typescript
// apps/bot/src/commands/ask.ts
import { streamText } from 'ai';
import { openai, defaultConfig, personalityPrompts } from '../lib/ai';
import { editResponse } from '../lib/discord';
import type { DiscordInteraction } from '../types/discord';

export async function handleAskCommand(
  interaction: DiscordInteraction
): Promise<void> {
  const prompt = interaction.data?.options?.find(
    (opt) => opt.name === 'prompt'
  )?.value as string;

  if (!prompt) {
    throw new Error('No prompt provided');
  }

  try {
    // Generate AI response
    const result = await streamText({
      ...defaultConfig,
      prompt: `${personalityPrompts.professional}\n\nUser: ${prompt}`,
    });

    const response = await result.text;

    // Truncate if too long (Discord limit: 2000 chars)
    const truncated = response.length > 2000
      ? response.substring(0, 1997) + '...'
      : response;

    // Edit the deferred response
    await editResponse(
      process.env.DISCORD_APP_ID!,
      interaction.token,
      truncated
    );
  } catch (error) {
    console.error('Error in ask command:', error);
    await editResponse(
      process.env.DISCORD_APP_ID!,
      interaction.token,
      '❌ Sorry, I encountered an error processing your request.'
    );
  }
}
```

```typescript
// apps/bot/src/commands/help.ts
import { editResponse } from '../lib/discord';
import type { DiscordInteraction } from '../types/discord';

export async function handleHelpCommand(
  interaction: DiscordInteraction
): Promise<void> {
  const helpMessage = `
**🤖 AI Assistant Bot Commands**

\`/ask [prompt]\` - Ask the AI anything
\`/vibe [mode]\` - Change the AI's personality
\`/help\` - Show this help message

**Personality Modes:**
- **Professional** - Clear, concise, formal responses
- **Chaotic** - Fun, creative, unpredictable responses
- **Zen** - Calm, mindful, peaceful responses

**Examples:**
\`/ask What is TypeScript?\`
\`/vibe mode:chaotic\`
  `.trim();

  await editResponse(
    process.env.DISCORD_APP_ID!,
    interaction.token,
    helpMessage
  );
}
```

```typescript
// apps/bot/src/commands/vibe.ts
import { editResponse } from '../lib/discord';
import type { DiscordInteraction } from '../types/discord';

// Store personality per user (in production, use database)
const userPersonalities = new Map<string, string>();

export async function handleVibeCommand(
  interaction: DiscordInteraction
): Promise<void> {
  const mode = interaction.data?.options?.find(
    (opt) => opt.name === 'mode'
  )?.value as string;

  if (!mode) {
    throw new Error('No mode provided');
  }

  const userId = interaction.member?.user?.id || interaction.user?.id;
  if (!userId) {
    throw new Error('Could not identify user');
  }

  userPersonalities.set(userId, mode);

  await editResponse(
    process.env.DISCORD_APP_ID!,
    interaction.token,
    `✅ Personality set to **${mode}**! Try asking me something with \`/ask\``
  );
}

export function getUserPersonality(userId: string): string {
  return userPersonalities.get(userId) || 'professional';
}
```

#### 3.6 Create Main Interaction Handler
```typescript
// apps/bot/api/interactions.ts
import {
  InteractionType,
  InteractionResponseType,
  type DiscordInteraction
} from '../src/types/discord';
import { getRawBody, verifyDiscordRequest } from '../src/lib/verification';
import { deferResponse } from '../src/lib/discord';
import { handleAskCommand } from '../src/commands/ask';
import { handleHelpCommand } from '../src/commands/help';
import { handleVibeCommand } from '../src/commands/vibe';

export const config = {
  api: {
    bodyParser: false, // Must use raw body for signature verification
  },
};

export default async function handler(req: Request): Promise<Response> {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Get signature headers
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');

  if (!signature || !timestamp) {
    return new Response('Missing signature headers', { status: 401 });
  }

  // Read raw body
  const rawBody = await getRawBody(req);

  // Verify request is from Discord
  const isValid = verifyDiscordRequest(
    rawBody,
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY!
  );

  if (!isValid) {
    console.error('Invalid signature');
    return new Response('Invalid signature', { status: 401 });
  }

  // Parse interaction
  const interaction: DiscordInteraction = JSON.parse(rawBody);

  // Handle PING (Discord verification)
  if (interaction.type === InteractionType.PING) {
    return Response.json({ type: InteractionResponseType.PONG });
  }

  // Handle slash commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data!;

    try {
      // Defer response immediately (we have 15 minutes to respond)
      await deferResponse(process.env.DISCORD_APP_ID!, interaction.token);

      // Route to appropriate command handler
      switch (name) {
        case 'ask':
          await handleAskCommand(interaction);
          break;
        case 'help':
          await handleHelpCommand(interaction);
          break;
        case 'vibe':
          await handleVibeCommand(interaction);
          break;
        default:
          throw new Error(`Unknown command: ${name}`);
      }

      return Response.json({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });
    } catch (error) {
      console.error('Error handling interaction:', error);
      return Response.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '❌ An error occurred while processing your request.',
        },
      });
    }
  }

  return new Response('Unknown interaction type', { status: 400 });
}
```

#### 3.7 Create Command Registration Endpoint
```typescript
// apps/bot/api/register-commands.ts
const DISCORD_API_BASE = 'https://discord.com/api/v10';

const commands = [
  {
    name: 'ask',
    description: 'Ask the AI anything',
    options: [
      {
        name: 'prompt',
        description: 'Your question or prompt',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'help',
    description: 'Show available commands and how to use them',
  },
  {
    name: 'vibe',
    description: 'Change the AI personality',
    options: [
      {
        name: 'mode',
        description: 'Personality mode',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Professional', value: 'professional' },
          { name: 'Chaotic', value: 'chaotic' },
          { name: 'Zen', value: 'zen' },
        ],
      },
    ],
  },
];

export default async function handler(req: Request): Promise<Response> {
  try {
    // Register commands globally
    const response = await fetch(
      `${DISCORD_API_BASE}/applications/${process.env.DISCORD_APP_ID}/commands`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
        body: JSON.stringify(commands),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord API error: ${error}`);
    }

    const data = await response.json();

    return Response.json({
      success: true,
      commands: data,
      message: 'Commands registered successfully!',
    });
  } catch (error) {
    console.error('Error registering commands:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

#### 3.8 Create Vercel Configuration
```json
// apps/bot/vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ],
  "env": {
    "DISCORD_PUBLIC_KEY": "@discord-public-key",
    "DISCORD_BOT_TOKEN": "@discord-bot-token",
    "DISCORD_APP_ID": "@discord-app-id",
    "OPENAI_API_KEY": "@openai-api-key"
  }
}
```

---

### Step 4: Local Testing

#### 4.1 Start Development Server
```bash
# In project root
pnpm dev --filter bot
```

#### 4.2 Expose Local Server with ngrok
```bash
# Install ngrok
brew install ngrok
# or
npm install -g ngrok

# Expose port 3000
ngrok http 3000
```

#### 4.3 Update Discord Webhook URL
1. Copy ngrok forwarding URL (e.g., `https://abc123.ngrok.io`)
2. Go to Discord Developer Portal → Your App
3. General Information → Interactions Endpoint URL
4. Enter: `https://abc123.ngrok.io/api/interactions`
5. Click "Save Changes"
6. Discord will send verification request (should return PONG)

#### 4.4 Test Commands
1. Open Discord server where bot is installed
2. Type `/` to see available commands
3. Try `/help` first (simple command)
4. Try `/ask What is TypeScript?`
5. Try `/vibe mode:chaotic`
6. Try `/ask Tell me a joke` (should use chaotic personality)

---

### Step 5: Deployment to Vercel

#### 5.1 Install Vercel CLI
```bash
pnpm add -g vercel
```

#### 5.2 Login to Vercel
```bash
vercel login
```

#### 5.3 Add Environment Variables
```bash
# Add each variable
vercel env add DISCORD_PUBLIC_KEY production
vercel env add DISCORD_BOT_TOKEN production
vercel env add DISCORD_APP_ID production
vercel env add OPENAI_API_KEY production

# Paste values when prompted
```

#### 5.4 Deploy
```bash
# Deploy to production
cd apps/bot
vercel --prod

# Note the deployment URL
# Example: https://discord-ai-bot.vercel.app
```

#### 5.5 Register Commands
```bash
# Call the register endpoint
curl https://your-app.vercel.app/api/register-commands

# Should return: { "success": true, "commands": [...] }
```

#### 5.6 Update Discord Webhook URL (Production)
1. Go to Discord Developer Portal → Your App
2. General Information → Interactions Endpoint URL
3. Enter: `https://your-app.vercel.app/api/interactions`
4. Click "Save Changes"

#### 5.7 Test Production Bot
1. Open Discord
2. Test all commands
3. Monitor Vercel logs for errors

---

## Testing Strategy

### Manual Testing Checklist
- [ ] Bot responds to `/help` command
- [ ] Bot responds to `/ask` with AI-generated content
- [ ] Bot handles long prompts (>100 words)
- [ ] Bot handles rapid requests (rate limiting)
- [ ] Bot changes personality with `/vibe`
- [ ] Bot handles invalid commands gracefully
- [ ] Bot handles OpenAI API errors
- [ ] Bot handles Discord API errors
- [ ] Response time < 5 seconds for simple prompts
- [ ] Response time < 15 seconds for complex prompts

### Load Testing
```bash
# Install k6
brew install k6

# Create load test script
cat << 'EOF' > load-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
};

export default function () {
  const payload = JSON.stringify({
    type: 2,
    data: {
      name: 'ask',
      options: [{ name: 'prompt', value: 'What is 2+2?' }],
    },
    token: 'test-token',
  });

  const res = http.post('https://your-app.vercel.app/api/interactions', payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 3s': (r) => r.timings.duration < 3000,
  });
}
EOF

# Run load test
k6 run load-test.js
```

---

## Advanced Features

### Feature 1: Streaming Responses

```typescript
// apps/bot/src/commands/ask.ts (enhanced)
import { streamText } from 'ai';
import { openai, defaultConfig } from '../lib/ai';
import { editResponse } from '../lib/discord';

export async function handleAskCommandWithStreaming(
  interaction: DiscordInteraction
): Promise<void> {
  const prompt = interaction.data?.options?.find(
    (opt) => opt.name === 'prompt'
  )?.value as string;

  const result = await streamText({
    ...defaultConfig,
    prompt,
  });

  let buffer = '';
  let lastUpdate = Date.now();
  const UPDATE_INTERVAL = 1000; // Update every 1 second

  for await (const chunk of result.textStream) {
    buffer += chunk;

    // Update Discord message every second
    if (Date.now() - lastUpdate > UPDATE_INTERVAL) {
      const truncated = buffer.length > 2000
        ? buffer.substring(0, 1997) + '...'
        : buffer;

      await editResponse(
        process.env.DISCORD_APP_ID!,
        interaction.token,
        truncated
      );

      lastUpdate = Date.now();
    }
  }

  // Final update with complete response
  const final = buffer.length > 2000
    ? buffer.substring(0, 1997) + '...'
    : buffer;

  await editResponse(
    process.env.DISCORD_APP_ID!,
    interaction.token,
    final
  );
}
```

### Feature 2: Conversation Memory

```typescript
// apps/bot/src/lib/memory.ts
import { kv } from '@vercel/kv';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const MAX_HISTORY = 10;
const HISTORY_TTL = 3600; // 1 hour

export async function getConversationHistory(
  userId: string
): Promise<Message[]> {
  const history = await kv.get<Message[]>(`conversation:${userId}`);
  return history || [];
}

export async function addToConversationHistory(
  userId: string,
  message: Message
): Promise<void> {
  const history = await getConversationHistory(userId);
  history.push(message);

  // Keep only last MAX_HISTORY messages
  const trimmed = history.slice(-MAX_HISTORY);

  await kv.set(`conversation:${userId}`, trimmed, {
    ex: HISTORY_TTL,
  });
}

export async function clearConversationHistory(
  userId: string
): Promise<void> {
  await kv.del(`conversation:${userId}`);
}
```

```typescript
// apps/bot/src/commands/ask.ts (with memory)
import { streamText } from 'ai';
import { openai, defaultConfig } from '../lib/ai';
import { getConversationHistory, addToConversationHistory } from '../lib/memory';

export async function handleAskCommandWithMemory(
  interaction: DiscordInteraction
): Promise<void> {
  const prompt = interaction.data?.options?.find(
    (opt) => opt.name === 'prompt'
  )?.value as string;

  const userId = interaction.member?.user?.id || interaction.user?.id;

  // Get conversation history
  const history = await getConversationHistory(userId!);

  // Add user message
  await addToConversationHistory(userId!, {
    role: 'user',
    content: prompt,
    timestamp: Date.now(),
  });

  // Generate response with context
  const result = await streamText({
    ...defaultConfig,
    messages: [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: prompt },
    ],
  });

  const response = await result.text;

  // Save assistant response
  await addToConversationHistory(userId!, {
    role: 'assistant',
    content: response,
    timestamp: Date.now(),
  });

  // Send to Discord
  const truncated = response.length > 2000
    ? response.substring(0, 1997) + '...'
    : response;

  await editResponse(
    process.env.DISCORD_APP_ID!,
    interaction.token,
    truncated
  );
}
```

### Feature 3: Rate Limiting

```typescript
// apps/bot/src/lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

export const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
  analytics: true,
});

export async function checkRateLimit(userId: string): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const { success, limit, remaining, reset } = await ratelimit.limit(userId);
  return { success, limit, remaining, reset };
}
```

```typescript
// apps/bot/api/interactions.ts (with rate limiting)
import { checkRateLimit } from '../src/lib/ratelimit';
import { editResponse } from '../src/lib/discord';

// In command handler
const userId = interaction.member?.user?.id || interaction.user?.id;
const { success, remaining, reset } = await checkRateLimit(userId!);

if (!success) {
  const resetTime = new Date(reset).toLocaleTimeString();
  await editResponse(
    process.env.DISCORD_APP_ID!,
    interaction.token,
    `⏰ Rate limit exceeded! You have ${remaining} requests remaining. Try again after ${resetTime}.`
  );
  return;
}

// Continue with command handling...
```

### Feature 4: Self-Coding Agent

```typescript
// packages/ai-agent/src/tools/github.ts
import { Octokit } from '@octokit/rest';

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function createBranch(
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string = 'main'
): Promise<void> {
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${fromBranch}`,
  });

  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: ref.object.sha,
  });
}

export async function commitFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  content: string,
  message: string
): Promise<void> {
  // Get current file (if exists) for SHA
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    if ('sha' in data) {
      sha = data.sha;
    }
  } catch (error) {
    // File doesn't exist, that's okay
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
    sha,
  });
}

export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string = 'main'
): Promise<number> {
  const { data } = await octokit.pulls.create({
    owner,
    repo,
    title,
    body,
    head,
    base,
  });

  return data.number;
}
```

```typescript
// packages/ai-agent/src/tools/code-gen.ts
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { openai } from '../lib/ai';

export const codeGenerationTool = tool({
  description: 'Generate TypeScript code based on requirements',
  parameters: z.object({
    requirement: z.string().describe('What the code should do'),
    context: z.string().describe('Existing code context'),
  }),
  execute: async ({ requirement, context }) => {
    const result = await streamText({
      model: openai('gpt-4o'),
      prompt: `
You are an expert TypeScript developer. Generate production-ready code.

Requirements: ${requirement}

Existing context:
${context}

Generate:
1. TypeScript code with proper types
2. Error handling
3. Comments explaining complex logic
4. Export statements

Return only the code, no explanations.
      `,
    });

    return await result.text;
  },
});
```

```typescript
// apps/bot/src/commands/code.ts
import { streamText } from 'ai';
import { openai, defaultConfig } from '../lib/ai';
import { createBranch, commitFile, createPullRequest } from '@repo/ai-agent/tools/github';
import { codeGenerationTool } from '@repo/ai-agent/tools/code-gen';

export async function handleCodeCommand(
  interaction: DiscordInteraction
): Promise<void> {
  const task = interaction.data?.options?.find(
    (opt) => opt.name === 'task'
  )?.value as string;

  const owner = 'your-github-username';
  const repo = 'discord-ai-bot';
  const branchName = `bot/feature-${Date.now()}`;

  try {
    // Create branch
    await createBranch(owner, repo, branchName);

    // Generate code with AI
    const result = await streamText({
      model: openai('gpt-4o'),
      prompt: `
User wants: ${task}

Your task:
1. Understand the requirement
2. Generate the necessary code
3. Create appropriate files
4. Write a descriptive commit message

Repository: discord-ai-bot (TypeScript, Turborepo)
      `,
      tools: {
        generateCode: codeGenerationTool,
      },
    });

    // Process tool calls
    // (In a real implementation, you'd handle tool calls here)

    // Create PR
    const prNumber = await createPullRequest(
      owner,
      repo,
      `Feature: ${task}`,
      `Automated PR created by AI bot\n\nTask: ${task}`,
      branchName
    );

    await editResponse(
      process.env.DISCORD_APP_ID!,
      interaction.token,
      `✅ Created PR #${prNumber}: https://github.com/${owner}/${repo}/pull/${prNumber}`
    );
  } catch (error) {
    console.error('Error in code command:', error);
    await editResponse(
      process.env.DISCORD_APP_ID!,
      interaction.token,
      '❌ Failed to create PR. Check logs for details.'
    );
  }
}
```

---

## Troubleshooting

### Issue: "Invalid signature"

**Causes:**
- Wrong `DISCORD_PUBLIC_KEY`
- Body parser enabled (should be `false`)
- Request not coming from Discord

**Solutions:**
1. Verify `DISCORD_PUBLIC_KEY` in Discord Developer Portal
2. Ensure `bodyParser: false` in API config
3. Check Vercel function logs for raw signature values

---

### Issue: "This interaction failed"

**Causes:**
- Response took >3 seconds
- Didn't defer response
- Error in command handler

**Solutions:**
1. Always use deferred response pattern
2. Move long-running operations after defer
3. Add try-catch blocks around command logic
4. Check Vercel function logs

---

### Issue: Commands not appearing in Discord

**Causes:**
- Commands not registered
- Discord cache (can take 1 hour to update)
- Wrong guild/global registration

**Solutions:**
1. Call `/api/register-commands` endpoint
2. Wait up to 1 hour for Discord to update
3. For faster updates, use guild-specific commands:
```typescript
// Register to specific guild (instant)
const guildId = 'your-guild-id';
await fetch(
  `${DISCORD_API_BASE}/applications/${appId}/guilds/${guildId}/commands`,
  // ... rest of request
);
```

---

### Issue: Bot shows offline

**Explanation:** Bots using Interactions API don't maintain WebSocket connections, so they don't show online status. This is normal and expected.

---

### Issue: OpenAI API errors

**Common errors:**
- `429 Rate Limit` - Too many requests
- `401 Unauthorized` - Wrong API key
- `500 Server Error` - OpenAI service issue

**Solutions:**
1. Implement exponential backoff
2. Add rate limiting per user
3. Handle errors gracefully:
```typescript
try {
  const result = await streamText({...});
} catch (error) {
  if (error.status === 429) {
    return 'Too many requests. Please try again later.';
  }
  if (error.status === 401) {
    console.error('Invalid OpenAI API key');
    return 'Configuration error. Contact admin.';
  }
  throw error;
}
```

---

## Maintenance & Operations

### Monitoring

#### Setup Vercel Analytics
```bash
pnpm add @vercel/analytics --filter bot
```

```typescript
// apps/bot/api/interactions.ts
import { track } from '@vercel/analytics';

// Track command usage
track('command_used', {
  command: name,
  userId: userId,
});
```

#### Setup Sentry Error Tracking
```bash
pnpm add @sentry/node --filter bot
```

```typescript
// apps/bot/src/lib/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV,
  tracesSampleRate: 1.0,
});

export { Sentry };
```

### Cost Monitoring

**Vercel costs:**
- Monitor Function Duration (GB-hrs)
- Monitor Bandwidth usage
- Set spending limits in dashboard

**OpenAI costs:**
```typescript
// Track token usage
import { streamText } from 'ai';

const result = await streamText({...});
const usage = result.usage;

console.log('Token usage:', {
  prompt: usage.promptTokens,
  completion: usage.completionTokens,
  total: usage.totalTokens,
});

// Calculate cost (approximate)
const cost = (usage.totalTokens / 1000) * 0.01; // $0.01 per 1K tokens
track('openai_cost', { cost });
```

### Logging Strategy

```typescript
// apps/bot/src/lib/logger.ts
type LogLevel = 'info' | 'warn' | 'error';

interface LogData {
  level: LogLevel;
  message: string;
  userId?: string;
  command?: string;
  error?: any;
  timestamp: string;
}

export function log(level: LogLevel, message: string, data?: Record<string, any>) {
  const logEntry: LogData = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };

  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to Datadog, Logtail, etc.
  } else {
    console.log(JSON.stringify(logEntry, null, 2));
  }
}

export const logger = {
  info: (message: string, data?: Record<string, any>) => log('info', message, data),
  warn: (message: string, data?: Record<string, any>) => log('warn', message, data),
  error: (message: string, data?: Record<string, any>) => log('error', message, data),
};
```

### Update Strategy

**Dependencies:**
```bash
# Check for updates
pnpm outdated

# Update non-breaking
pnpm update

# Update breaking changes carefully
pnpm update <package>@latest
```

**Deployment workflow:**
```bash
# 1. Test locally
pnpm dev --filter bot

# 2. Run type checks
pnpm type-check

# 3. Deploy to preview
vercel

# 4. Test preview deployment
# (Use ngrok to point Discord at preview URL)

# 5. Deploy to production
vercel --prod

# 6. Monitor logs
vercel logs --follow
```

---

## Cost Estimation

### Free Tier Limits
**Vercel Free:**
- 100 GB bandwidth/month
- 100 GB-hrs function duration/month
- Unlimited deployments
- **Estimate:** ~10,000 bot interactions/month

**OpenAI:**
- No free tier
- GPT-4o: ~$0.01 per interaction
- **Estimate:** $100 for 10,000 interactions

### Paid Tier Costs
**Vercel Pro ($20/month):**
- 1 TB bandwidth
- 1000 GB-hrs function duration
- **Estimate:** ~100,000 interactions/month

**OpenAI (with GPT-4o mini):**
- ~$0.0002 per interaction
- **Estimate:** $20 for 100,000 interactions

**Total for 100K interactions/month:** ~$40/month

---

## Deployment Checklist

### Pre-deployment
- [ ] All environment variables set
- [ ] Commands tested locally
- [ ] Error handling in place
- [ ] Rate limiting configured
- [ ] Logging implemented

### Deployment
- [ ] Deploy to Vercel
- [ ] Register commands via `/api/register-commands`
- [ ] Update Discord webhook URL
- [ ] Verify webhook with Discord

### Post-deployment
- [ ] Test all commands in production
- [ ] Monitor Vercel logs
- [ ] Check OpenAI usage
- [ ] Set up alerts
- [ ] Document any issues

### Production Readiness
- [ ] Monitoring enabled (Vercel Analytics, Sentry)
- [ ] Rate limiting active
- [ ] Error handling comprehensive
- [ ] Conversation memory optional
- [ ] Cost tracking in place
- [ ] Backup strategy defined

---

## Next Steps After MVP

### Short-term (Week 1-2)
1. Implement streaming responses
2. Add conversation memory
3. Create `/clear` command to reset memory
4. Add embed formatting for prettier responses
5. Implement proper error messages

### Medium-term (Month 1-2)
1. Add image generation with DALL-E
2. Implement web search capability
3. Add multi-server support (different personalities per server)
4. Create admin commands (`/stats`, `/config`)
5. Build web dashboard for configuration

### Long-term (Month 3+)
1. Implement self-coding features
2. Add automatic testing of generated code
3. Create feedback loop (Discord reactions → code improvements)
4. Multi-agent orchestration
5. Voice channel integration

---

## Resources

### Documentation
- [Discord Developer Portal](https://discord.com/developers/docs)
- [Discord Interactions API](https://discord.com/developers/docs/interactions/receiving-and-responding)
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

### Example Repositories
- [discord-interactions](https://github.com/discord/discord-interactions-js)
- [Vercel AI SDK Examples](https://github.com/vercel/ai)

### Community
- [Discord Developers Server](https://discord.gg/discord-developers)
- [Vercel Discord](https://vercel.com/discord)

---

## Conclusion

This implementation plan provides a complete roadmap for building a production-ready, serverless Discord AI bot. The architecture is scalable, cost-effective, and extensible for future self-coding capabilities.

**Key advantages:**
- ✅ Zero infrastructure management
- ✅ Infinite scalability
- ✅ Low latency (edge functions)
- ✅ Cost-effective (pay per use)
- ✅ Modern AI integration
- ✅ Ready for autonomous coding features

**Timeline:**
- MVP: 2-3 hours
- Enhanced features: 1-2 days
- Self-coding: 1-2 weeks

Start with the MVP, validate the concept, then iteratively add advanced features based on user feedback.

---

**Ready to ship? Follow Step 1 and start building.** 🚀
