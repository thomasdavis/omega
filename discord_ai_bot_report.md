# Discord Bot That Actually Runs on Vercel

*A serverless AI bot using OpenAI, Vercel AI SDK v6, and Discord's Interactions API*

---

## The Vercel Challenge (And Solution)

**Problem:** Discord bots traditionally need persistent WebSocket connections. Vercel is serverless. These don't mix.

**Solution:** Use Discord's **Interactions API** instead of the Gateway API.

```
Traditional Bot:           Serverless Bot:
WebSocket 24/7      VS     HTTP webhooks
Gateway API                Interactions API
Self-hosted                Vercel serverless
```

**What this means:**
- Your bot uses **slash commands** (`/ask`, `/help`) instead of listening to all messages
- Discord sends HTTP POST requests to your Vercel function
- You respond instantly or defer for longer processing
- Zero infrastructure, infinite scale

---

## The Stack

```
discord-ai-bot/
├── apps/
│   └── bot/
│       ├── api/
│       │   ├── interactions.ts       # Main Discord webhook
│       │   └── register-commands.ts  # Setup endpoint
│       └── src/
│           ├── commands/             # Slash command handlers
│           ├── lib/
│           │   ├── ai.ts            # OpenAI + AI SDK wrapper
│           │   └── discord.ts       # Response utilities
│           └── types/
├── packages/
│   ├── ai-agent/                     # Future: self-coding logic
│   └── shared/                       # Types, utils
└── turbo.json
```

---

## Phase 1: The MVP (Ships in 1 hour)

A bot that responds to slash commands using OpenAI. No self-coding yet—just smart replies.

### Step 1: Setup Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create New Application
3. Go to Bot tab → Create bot → Copy token
4. Go to OAuth2 → URL Generator:
   - Scopes: `applications.commands`, `bot`
   - Permissions: `Send Messages`, `Use Slash Commands`
5. Install bot to your server

**Save these:**
```
DISCORD_PUBLIC_KEY=xxx  # From General Information tab
DISCORD_BOT_TOKEN=xxx   # From Bot tab
DISCORD_APP_ID=xxx      # From General Information tab
```

---

### Step 2: Project Setup

```bash
npx create-turbo@latest discord-ai-bot
cd discord-ai-bot

# Add dependencies
pnpm add --filter bot ai openai discord-interactions
pnpm add --filter bot tweetnacl  # For Discord signature verification
```

**Key packages:**
- `ai` - Vercel AI SDK v6 (OpenAI integration, streaming)
- `openai` - Official OpenAI SDK
- `discord-interactions` - Discord webhook utilities

---

### Step 3: The Interaction Webhook (The Critical Part)

This is where Discord sends all slash commands. Must be fast (<3s response).

```ts
// apps/bot/api/interactions.ts
import { verifyKey } from 'discord-interactions';
import { openai } from '../src/lib/ai';
import { streamText } from 'ai';

export const config = {
  api: {
    bodyParser: false, // Important: need raw body for signature verification
  },
};

async function getRawBody(req: Request): Promise<string> {
  const reader = req.body?.getReader();
  const decoder = new TextDecoder();
  let body = '';
  
  if (!reader) return '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    body += decoder.decode(value);
  }
  
  return body;
}

export default async function handler(req: Request) {
  // Verify request is from Discord
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const rawBody = await getRawBody(req);

  const isValid = verifyKey(
    rawBody,
    signature!,
    timestamp!,
    process.env.DISCORD_PUBLIC_KEY!
  );

  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  // Discord requires immediate PONG to verify endpoint
  if (interaction.type === 1) {
    return Response.json({ type: 1 });
  }

  // Handle slash commands
  if (interaction.type === 2) {
    const { name, options } = interaction.data;

    if (name === 'ask') {
      const prompt = options.find((o: any) => o.name === 'prompt')?.value;

      // Defer response - we have 15 minutes to respond
      await fetch(
        `https://discord.com/api/v10/webhooks/${process.env.DISCORD_APP_ID}/${interaction.token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 5, // Deferred response
          }),
        }
      );

      // Generate AI response (can take >3s)
      const { text } = await streamText({
        model: openai('gpt-4-turbo'),
        prompt: prompt,
        maxTokens: 500,
      });

      const response = await text;

      // Send follow-up message
      await fetch(
        `https://discord.com/api/v10/webhooks/${process.env.DISCORD_APP_ID}/${interaction.token}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: response,
          }),
        }
      );

      return Response.json({ type: 5 });
    }
  }

  return new Response('Unknown interaction', { status: 400 });
}
```

**Key concepts:**

1. **Signature Verification:** Discord signs every request. You must verify it.
2. **Response Types:**
   - Type 1: PONG (for verification)
   - Type 4: Immediate response (<3s)
   - Type 5: Deferred response (for AI calls that take time)
3. **Follow-up Pattern:** Defer → process → edit response

---

### Step 4: Register Slash Commands

You need to tell Discord what commands exist. Do this once per deployment.

```ts
// apps/bot/api/register-commands.ts
export default async function handler(req: Request) {
  const commands = [
    {
      name: 'ask',
      description: 'Ask the AI anything',
      options: [
        {
          name: 'prompt',
          description: 'Your question',
          type: 3, // STRING type
          required: true,
        },
      ],
    },
    {
      name: 'vibe',
      description: 'Change the AI personality',
      options: [
        {
          name: 'mode',
          description: 'Personality mode',
          type: 3,
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

  const response = await fetch(
    `https://discord.com/api/v10/applications/${process.env.DISCORD_APP_ID}/commands`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
      body: JSON.stringify(commands),
    }
  );

  const data = await response.json();
  return Response.json(data);
}
```

**Run once after deploy:**
```bash
curl https://your-app.vercel.app/api/register-commands
```

---

### Step 5: AI Wrapper (Clean Abstraction)

```ts
// apps/bot/src/lib/ai.ts
import { createOpenAI } from '@ai-sdk/openai';

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Reusable AI configurations
export const aiConfigs = {
  fast: {
    model: openai('gpt-4o-mini'),
    maxTokens: 300,
  },
  smart: {
    model: openai('gpt-4o'),
    maxTokens: 1000,
  },
  creative: {
    model: openai('gpt-4o'),
    temperature: 1.2,
    maxTokens: 800,
  },
};
```

---

### Step 6: Deploy to Vercel

```bash
# Install Vercel CLI
pnpm add -g vercel

# Set environment variables
vercel env add DISCORD_PUBLIC_KEY
vercel env add DISCORD_BOT_TOKEN
vercel env add DISCORD_APP_ID
vercel env add OPENAI_API_KEY

# Deploy
vercel --prod
```

**Get your webhook URL:** `https://your-app.vercel.app/api/interactions`

---

### Step 7: Configure Discord Webhook

1. Go to Discord Developer Portal → Your App
2. General Information → Interactions Endpoint URL
3. Enter: `https://your-app.vercel.app/api/interactions`
4. Discord will send a test request (you must return PONG)
5. Click "Save Changes"

**If verification fails:**
- Check signature verification logic
- Ensure `DISCORD_PUBLIC_KEY` is correct
- Check Vercel function logs

---

## Why This Works on Vercel

**Traditional Discord bot:**
```js
// ❌ Doesn't work on Vercel
client.on('messageCreate', async (message) => {
  // Requires persistent connection
});
```

**Serverless Discord bot:**
```js
// ✅ Perfect for Vercel
export default async function handler(req: Request) {
  // HTTP request → HTTP response
  // Stateless, scales infinitely
}
```

**Advantages:**
- **Zero Infra:** No servers to maintain
- **Auto-scaling:** Handle 10 or 10,000 requests
- **Edge Functions:** Deploy globally, <100ms latency
- **Cost:** Free tier covers most bots ($0 until significant traffic)

---

## Phase 2: Self-Coding Features (Future)

Once the basic bot works, add autonomous coding:

```ts
// apps/bot/src/commands/code.ts
import { streamText } from 'ai';
import { openai } from '../lib/ai';

export async function handleCodeCommand(interaction: any) {
  const task = interaction.data.options[0].value;

  // Use AI SDK with GitHub tools
  const { text } = await streamText({
    model: openai('gpt-4o'),
    prompt: `
      User wants: ${task}
      Current codebase: ${await getRepoContext()}
      
      Generate code changes and create a PR.
    `,
    tools: {
      createBranch: { /* ... */ },
      commitCode: { /* ... */ },
      openPR: { /* ... */ },
    },
  });

  // Bot codes itself
}
```

**Architecture:**
```
packages/
  ai-agent/
    src/
      tools/
        github.ts    # Create branches, commits, PRs
        code-gen.ts  # Generate TypeScript code
        test-gen.ts  # Write tests
      orchestrator.ts # Coordinate tool usage
```

---

## Advanced Patterns

### 1. Streaming Responses

```ts
import { streamText } from 'ai';

const result = await streamText({
  model: openai('gpt-4o'),
  prompt: userPrompt,
});

// Stream to Discord (edit message every 500ms)
let buffer = '';
for await (const chunk of result.textStream) {
  buffer += chunk;
  if (buffer.length > 100) {
    await editDiscordMessage(buffer);
    buffer = '';
  }
}
```

### 2. Conversation Memory

```ts
// Store in Vercel KV or Redis
import { kv } from '@vercel/kv';

const history = await kv.get(`conversation:${userId}`) || [];
history.push({ role: 'user', content: prompt });

const { text } = await streamText({
  model: openai('gpt-4o'),
  messages: history,
});

history.push({ role: 'assistant', content: text });
await kv.set(`conversation:${userId}`, history);
```

### 3. Rate Limiting

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
});

const { success } = await ratelimit.limit(userId);
if (!success) {
  return Response.json({ 
    content: 'Slow down! Try again in a minute.' 
  });
}
```

---

## Testing Locally

```bash
# Start dev server
pnpm dev --filter bot

# Use ngrok to expose localhost
ngrok http 3000

# Update Discord webhook URL to ngrok URL
# e.g., https://abc123.ngrok.io/api/interactions
```

**Pro tip:** Use Discord's "Test Endpoint" button to debug signature verification.

---

## Deployment Checklist

- [ ] Environment variables set on Vercel
- [ ] Commands registered via `/api/register-commands`
- [ ] Webhook URL configured in Discord portal
- [ ] Signature verification working (check logs)
- [ ] Bot invited to server with correct permissions
- [ ] Test slash commands in Discord

---

## Common Issues

**"Invalid signature"**
→ Check `DISCORD_PUBLIC_KEY`, ensure raw body parsing

**"This interaction failed"**
→ Response took >3s, use deferred response pattern

**Commands not appearing**
→ Re-run `/api/register-commands`, wait 1 hour for cache

**Bot offline**
→ Bots using Interactions API don't show online status (this is normal)

---

## Cost Estimation

**Vercel:**
- Free tier: 100GB bandwidth, 100 serverless hours
- Pro: $20/mo for serious usage

**OpenAI:**
- GPT-4o mini: $0.15/1M input tokens (~$0.0002/request)
- 10,000 bot interactions ≈ $2

**Total:** Should run on free tiers for most use cases.

---

## Why This Architecture Wins

**Clean separation:**
```
Discord (UI) → Vercel (logic) → OpenAI (brain)
```

**Easy to extend:**
- Add web dashboard (`apps/dashboard`)
- Add Telegram bot (same AI logic)
- Add cron jobs for scheduled tasks

**AI-native:**
- AI SDK handles streaming, retries, tools
- OpenAI + Vercel = perfect match
- Ready for multi-agent patterns

**Actually serverless:**
- No Docker, no VPS, no SSH
- Git push === deployed
- Infinite scale, zero maintenance

---

## Next Steps

1. **Ship MVP:** Get `/ask` command working
2. **Add personality:** Store system prompts per server
3. **Enable tools:** Let AI search web, read docs
4. **Self-coding:** Connect GitHub, let bot evolve

**The meta goal:** Bot that improves itself based on Discord feedback.

---

**Now go ship it.** 🚀