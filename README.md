# Discord AI Bot

A serverless Discord bot powered by OpenAI GPT-4, built with Vercel AI SDK v6 and Discord's Interactions API.

## Features

- 🤖 **AI-Powered Responses** - Uses OpenAI GPT-4 for intelligent conversations
- 🎭 **Personality Modes** - Switch between Professional, Chaotic, and Zen personalities
- ⚡ **Serverless** - Runs on Vercel edge functions with zero infrastructure
- 🔒 **Secure** - Discord signature verification on all requests
- 📦 **Monorepo** - Built with Turborepo for scalability

## Commands

- `/ask [prompt]` - Ask the AI anything
- `/vibe [mode]` - Change AI personality (professional/chaotic/zen)
- `/help` - Show available commands

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 8+
- [Discord Developer Account](https://discord.com/developers/applications)
- [OpenAI API Key](https://platform.openai.com/api-keys)
- [Vercel Account](https://vercel.com/) (free tier works)

### 1. Discord Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" tab:
   - Click "Add Bot"
   - Copy the **Bot Token** (save for later)
4. Go to "General Information" tab:
   - Copy **Application ID** (save for later)
   - Copy **Public Key** (save for later)
5. Go to "OAuth2" → "URL Generator":
   - Select scopes: `applications.commands`, `bot`
   - Select permissions: `Send Messages`, `Use Slash Commands`
   - Copy the generated URL and open it to invite the bot to your server

### 2. Clone & Install

```bash
# Clone the repository
git clone <your-repo-url>
cd omega

# Install dependencies
pnpm install
```

### 3. Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env.local

# Edit .env.local with your credentials
# Also copy to apps/bot/.env.local for local development
cp .env.local apps/bot/.env.local
```

Add your credentials:

```env
DISCORD_PUBLIC_KEY=your_discord_public_key
DISCORD_APP_ID=your_discord_application_id
DISCORD_BOT_TOKEN=your_discord_bot_token
OPENAI_API_KEY=your_openai_api_key
```

### 4. Local Development (Optional)

To test locally before deploying:

```bash
# Install Vercel CLI
pnpm add -g vercel

# Start local dev server
cd apps/bot
vercel dev
```

In a separate terminal, expose your local server:

```bash
# Install ngrok
brew install ngrok
# or: npm install -g ngrok

# Expose port 3000
ngrok http 3000
```

Update Discord webhook URL:
1. Go to Discord Developer Portal → Your App → General Information
2. Set "Interactions Endpoint URL" to: `https://your-ngrok-url.ngrok.io/api/interactions`
3. Discord will verify the endpoint

### 5. Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy from apps/bot directory
cd apps/bot
vercel --prod

# Note your deployment URL (e.g., https://your-app.vercel.app)
```

### 6. Set Environment Variables on Vercel

```bash
# Add each environment variable
vercel env add DISCORD_PUBLIC_KEY production
vercel env add DISCORD_APP_ID production
vercel env add DISCORD_BOT_TOKEN production
vercel env add OPENAI_API_KEY production
```

Alternatively, add them via the Vercel dashboard:
1. Go to your project → Settings → Environment Variables
2. Add all four variables

### 7. Register Commands

```bash
# Call the registration endpoint
curl https://your-app.vercel.app/api/register-commands

# You should see:
# {"success":true,"message":"Commands registered successfully!",...}
```

**Note:** Global commands can take up to 1 hour to appear due to Discord's caching.

### 8. Configure Discord Webhook (Production)

1. Go to Discord Developer Portal → Your App → General Information
2. Set "Interactions Endpoint URL" to: `https://your-app.vercel.app/api/interactions`
3. Click "Save Changes"
4. Discord will send a verification request (should succeed)

### 9. Test Your Bot

Open Discord and try:

```
/help
/ask What is TypeScript?
/vibe mode:chaotic
/ask Tell me a joke
```

## Project Structure

```
omega/
├── apps/
│   └── bot/                      # Main bot application
│       ├── api/                  # Vercel serverless functions
│       │   ├── interactions.ts   # Main webhook handler
│       │   └── register-commands.ts
│       ├── src/
│       │   ├── commands/         # Command handlers
│       │   │   ├── ask.ts
│       │   │   ├── help.ts
│       │   │   └── vibe.ts
│       │   ├── lib/              # Core libraries
│       │   │   ├── ai.ts         # OpenAI integration
│       │   │   ├── discord.ts    # Discord API
│       │   │   └── verification.ts
│       │   ├── types/            # TypeScript types
│       │   └── utils/            # Utilities
│       ├── vercel.json           # Vercel config
│       └── package.json
├── packages/
│   └── shared/                   # Shared utilities (future use)
├── turbo.json                    # Turborepo config
├── pnpm-workspace.yaml          # pnpm workspace config
└── package.json                  # Root package.json
```

## Development

### Available Scripts

```bash
# Run development server
pnpm dev

# Type check
pnpm type-check

# Build all packages
pnpm build

# Clean all node_modules
pnpm clean
```

### Adding New Commands

1. Create a new file in `apps/bot/src/commands/your-command.ts`
2. Implement the command handler:

```typescript
import { editResponse } from '../lib/discord';
import type { DiscordInteraction } from '../types/discord';

export async function handleYourCommand(
  interaction: DiscordInteraction
): Promise<void> {
  const appId = process.env.DISCORD_APP_ID!;
  const token = interaction.token;

  // Your command logic here
  await editResponse(appId, token, 'Your response');
}
```

3. Register the command in `apps/bot/api/register-commands.ts`:

```typescript
const commands = [
  // ... existing commands
  {
    name: 'yourcommand',
    description: 'Your command description',
    options: [
      // Add options if needed
    ],
  },
];
```

4. Add the route in `apps/bot/api/interactions.ts`:

```typescript
switch (commandName) {
  // ... existing cases
  case 'yourcommand':
    handleYourCommand(interaction).catch((error) => {
      console.error('[YOURCOMMAND] Error:', error);
    });
    break;
}
```

5. Redeploy and re-register commands

## Architecture

### How It Works

1. **User types `/ask` in Discord**
2. **Discord sends HTTP POST** to your Vercel endpoint
3. **Vercel verifies signature** (ensures request is from Discord)
4. **Vercel defers response** (buys 15 minutes for processing)
5. **Vercel calls OpenAI API** (generates AI response)
6. **Vercel edits deferred message** (sends response back to Discord)
7. **User sees response** in Discord

### Why Serverless?

**Traditional Discord Bot:**
- Requires persistent WebSocket connection
- Needs dedicated server (24/7)
- Manual scaling
- Infrastructure maintenance

**Serverless Discord Bot:**
- HTTP-based (Interactions API)
- No infrastructure
- Auto-scaling (handles 10 or 10,000 requests)
- Pay-per-use pricing

## Cost Estimation

### Free Tier
- **Vercel:** 100GB bandwidth, 100 serverless hours/month
- **OpenAI:** No free tier (~$0.01 per interaction with GPT-4o)
- **Estimate:** ~$10-20/month for moderate usage

### Production
- **Vercel Pro:** $20/month (1TB bandwidth)
- **OpenAI:** Variable based on usage
- **Estimate:** ~$40-60/month for 100K interactions

## Troubleshooting

### "Invalid signature"
- Check `DISCORD_PUBLIC_KEY` is correct
- Ensure raw body parsing is disabled in Vercel config

### "This interaction failed"
- Response took >3 seconds without deferring
- Check Vercel function logs

### Commands not appearing
- Wait up to 1 hour for Discord cache to update
- Try re-running `/api/register-commands`
- Check command registration response for errors

### Bot shows offline
- Normal! Interaction API bots don't maintain WebSocket connections
- They don't show online status

## Advanced Features

See `discord_ai_bot_implementation_plan.md` for advanced features:

- **Streaming responses** - Real-time progressive updates
- **Conversation memory** - Context-aware conversations
- **Rate limiting** - Prevent abuse
- **Self-coding** - Autonomous code generation

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** Vercel Serverless Functions
- **Language:** TypeScript
- **AI:** OpenAI GPT-4 via Vercel AI SDK v6
- **Bot API:** Discord Interactions API
- **Monorepo:** Turborepo
- **Package Manager:** pnpm

## Resources

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord Interactions API Docs](https://discord.com/developers/docs/interactions/receiving-and-responding)
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

---

**Built with ❤️ using Vercel, OpenAI, and Discord**
