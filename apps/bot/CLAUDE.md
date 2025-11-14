# Discord AI Bot - Complete Guide

**Built with:**
- Discord.js (Gateway API) for message listening
- AI SDK v6 with agent protocol for intelligent responses
- OpenAI GPT-4o for AI processing
- TypeScript + Node.js
- Fly.io for deployment

---

## What This Bot Does

1. **Listens to all messages** in Discord servers and DMs
2. **Decides intelligently** whether to respond based on:
   - Direct mentions (`@bot`)
   - Replies to bot messages
   - DMs (always responds)
   - Random 10% chance for organic engagement
3. **Uses AI SDK v6 agent protocol** with tools
4. **Reports tool usage** in a separate message to show what tools were called

---

## Project Structure

```
apps/bot/
├── src/
│   ├── index.ts                 # Entry point - Discord Gateway connection
│   ├── agent/
│   │   ├── agent.ts             # AI SDK v6 agent setup with tool support
│   │   └── tools/               # Agent tools
│   │       ├── calculator.ts    # Math calculations
│   │       ├── search.ts        # Web search (placeholder)
│   │       └── weather.ts       # Weather info (placeholder)
│   ├── handlers/
│   │   └── messageHandler.ts   # Message processing logic
│   └── lib/
│       └── shouldRespond.ts     # Logic for when bot should reply
├── Dockerfile                   # Docker configuration for Fly.io
├── fly.toml                     # Fly.io deployment config
├── package.json
├── tsconfig.json
└── .env.local                   # Local environment variables (gitignored)
```

---

## Environment Variables

Required:
- `DISCORD_BOT_TOKEN` - Get from Discord Developer Portal
- `OPENAI_API_KEY` - Get from OpenAI Platform

Already configured in Fly.io:
```bash
flyctl secrets list -a omega-nrhptq
```

---

## Discord Bot Setup

### 1. Enable Required Intents

⚠️ **CRITICAL:** Go to Discord Developer Portal and enable:

1. Visit: https://discord.com/developers/applications
2. Select your application
3. Go to "Bot" tab
4. Scroll to "Privileged Gateway Intents"
5. Enable:
   - ✅ **MESSAGE CONTENT INTENT** (Required to read messages!)
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **PRESENCE INTENT**

Without MESSAGE CONTENT INTENT, the bot can't see message content!

### 2. Invite Bot to Server

Use this URL format (replace YOUR_CLIENT_ID):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2048&scope=bot
```

Permissions needed:
- Send Messages
- Read Message History
- View Channels

---

## Local Development

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Set Environment Variables
Copy `.env.example` to `.env.local` and fill in:
```bash
cp .env.example .env.local
```

### 3. Run in Development Mode
```bash
pnpm dev
```

This uses `tsx` to run TypeScript directly without building.

### 4. Build for Production
```bash
pnpm build
```

Compiles TypeScript to `dist/` folder.

---

## Deployment to Fly.io

### Current Setup
- **App Name:** `omega-nrhptq`
- **Region:** Sydney (syd)
- **Memory:** 512MB
- **Status:** Linked to GitHub repo

### Deploy from GitHub

The app is configured for auto-deployment from GitHub:

```bash
# Commit and push
git add .
git commit -m "Update bot"
git push origin main

# Fly.io will automatically deploy
```

### Manual Deployment

If needed, deploy manually:

```bash
# From apps/bot directory
flyctl deploy -a omega-nrhptq
```

### Check Deployment Status

```bash
# View logs
flyctl logs -a omega-nrhptq

# Check status
flyctl status -a omega-nrhptq

# SSH into container (debugging)
flyctl ssh console -a omega-nrhptq
```

---

## AI SDK v6 Agent Protocol

### How It Works

The bot uses AI SDK v6's agent protocol with tool support:

1. **Message received** → Message handler checks if should respond
2. **Agent invoked** → AI SDK v6 `generateText()` with tools
3. **AI decides** → Calls tools if needed (calculator, search, weather)
4. **Multi-step reasoning** → Up to 5 steps of tool usage
5. **Response generated** → Returns text response
6. **Tool report** → Separate message showing what tools were used

### Adding New Tools

Create a new tool in `src/agent/tools/`:

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: 'What this tool does',
  parameters: z.object({
    param1: z.string().describe('Parameter description'),
  }),
  execute: async ({ param1 }) => {
    // Tool logic here
    return { result: 'something' };
  },
});
```

Then add to `src/agent/agent.ts`:

```typescript
import { myTool } from './tools/myTool.js';

// In runAgent function:
tools: {
  search: searchTool,
  calculator: calculatorTool,
  weather: weatherTool,
  myTool: myTool, // Add here
},
```

---

## Customizing Response Logic

### When Bot Responds

Edit `src/lib/shouldRespond.ts` to change when bot replies:

```typescript
export async function shouldRespond(message: Message): Promise<boolean> {
  // Always respond to DMs
  if (message.channel.isDMBased()) {
    return true;
  }

  // Respond when mentioned
  const botMentioned = message.mentions.users.has(message.client.user!.id);
  if (botMentioned) {
    return true;
  }

  // Add your custom logic here:
  // - Check for keywords
  // - Use AI to determine if message is interesting
  // - Rate limiting per channel
  // - etc.

  return false;
}
```

### Bot Personality

Edit the system prompt in `src/agent/agent.ts`:

```typescript
const systemPrompt = `You are an intelligent and helpful Discord bot assistant.

Your personality:
- Friendly and conversational
- Knowledgeable but not pretentious
// ... customize as needed
`;
```

---

## Monitoring & Debugging

### View Live Logs
```bash
flyctl logs -a omega-nrhptq -f
```

### Common Issues

**Bot not responding:**
1. Check MESSAGE CONTENT INTENT is enabled in Discord
2. Check bot has proper permissions in server
3. Check `shouldRespond` logic in code
4. View logs for errors

**Tool calls not working:**
1. Check tool is registered in agent.ts
2. Check tool parameters match zod schema
3. View logs for tool execution errors

**Deployment fails:**
1. Check build succeeds locally: `pnpm build`
2. Check Dockerfile is correct
3. Check secrets are set: `flyctl secrets list -a omega-nrhptq`
4. View build logs: `flyctl logs -a omega-nrhptq`

---

## Architecture Notes

### Why Gateway API?

Discord doesn't support webhooks for receiving messages. The ONLY way to listen to messages is the Gateway API (WebSocket), which requires a persistent connection.

This means:
- ❌ Cannot use Vercel serverless functions
- ✅ Must use long-running service (Fly.io, Railway, Render, etc.)

### Why Fly.io?

- Free tier available (512MB RAM, 3GB disk)
- Auto-scaling
- Global edge network
- Easy Docker deployment
- GitHub integration

---

## Cost Breakdown

**Fly.io:**
- Free tier: 512MB RAM, 3GB disk
- Shared CPU
- $0/month within free tier

**OpenAI:**
- GPT-4o: ~$2.50 per 1M input tokens
- Depends on usage
- Estimate: $5-20/month for moderate use

**Total:** ~$5-20/month

---

## Next Steps / TODOs

### Immediate:
- [ ] Test bot in Discord after deployment
- [ ] Verify tools work correctly
- [ ] Adjust `shouldRespond` logic if needed

### Future Enhancements:
- [ ] Integrate real search API (Google Custom Search, Brave, etc.)
- [ ] Integrate real weather API (OpenWeatherMap)
- [ ] Add conversation memory/context
- [ ] Add rate limiting per user/channel
- [ ] Add admin commands
- [ ] Add database for persistent storage (Fly Postgres)
- [ ] Add metrics/analytics
- [ ] Add more sophisticated "should respond" AI logic
- [ ] Add streaming responses for long messages
- [ ] Add image generation tools
- [ ] Add voice channel support

---

## Useful Commands

```bash
# Development
pnpm dev              # Run in dev mode with tsx
pnpm build            # Build TypeScript
pnpm type-check       # Check types without building

# Fly.io
flyctl status -a omega-nrhptq      # Check app status
flyctl logs -a omega-nrhptq        # View logs
flyctl ssh console -a omega-nrhptq # SSH into container
flyctl deploy -a omega-nrhptq      # Manual deploy
flyctl secrets list -a omega-nrhptq # View secrets

# Discord
# Test commands in Discord:
# - @bot hello
# - DM the bot
# - Reply to bot's message
# - Ask it to calculate something: "what's 2^16?"
```

---

## Resources

- [Discord.js Documentation](https://discord.js.org/)
- [AI SDK v6 Documentation](https://ai-sdk.dev/)
- [AI SDK v6 Agent Protocol](https://ai-sdk.dev/docs/announcing-ai-sdk-6-beta)
- [Fly.io Documentation](https://fly.io/docs/)
- [Discord Developer Portal](https://discord.com/developers/applications)

---

**Last Updated:** 2025-11-15
**Status:** ✅ Ready to Deploy
**Deployment:** Fly.io (`omega-nrhptq`)
