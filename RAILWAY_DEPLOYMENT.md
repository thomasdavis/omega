# Railway Deployment Guide - Two Service Architecture

This guide explains how to deploy the Omega project as two separate Railway services: a Next.js web app and a Discord bot background worker.

## Architecture Overview

```
Railway Project: successful-motivation
├── Service 1: omega-web (Next.js App)
│   ├── Port: 3000
│   ├── Purpose: Serve artifacts, documents, uploads, blog, API routes
│   └── Root Directory: apps/web
│
└── Service 2: omega-bot (Discord Bot)
    ├── Port: None (background worker)
    ├── Purpose: Listen to Discord, run AI agent
    └── Root Directory: apps/bot

Shared Resources:
├── Railway Volume: /data (shared between both services)
│   ├── /data/artifacts
│   ├── /data/uploads
│   ├── /data/blog
│   └── /data/documents
└── Databases:
    ├── LibSQL/Turso (via TURSO_DATABASE_URL)
    ├── MongoDB (via MONGO_URL or MONGODB_URI)
    └── PostgreSQL (via POSTGRES_URL or DATABASE_URL)
```

## Step 1: Repurpose Existing Service for Next.js Web App

The existing `omega` service will become `omega-web`.

### Via Railway Dashboard:

1. Go to https://railway.app/project/YOUR_PROJECT_ID
2. Click on the `omega` service
3. Click "Settings" tab
4. **Rename Service**: Change name from `omega` to `omega-web`
5. **Root Directory**: Set to `apps/web`
6. **Start Command**: Set to `cd apps/web && pnpm start`
7. **Build Command**: Set to `cd ../.. && pnpm install && pnpm build --filter=web`
8. **Port**: Ensure `PORT=3000` is set in environment variables (Railway auto-detects)
9. Save changes

### Environment Variables for omega-web:

Required:
```bash
PORT=3000                                    # Auto-detected by Railway
NODE_ENV=production
```

Optional (if web app needs database access):
```bash
TURSO_DATABASE_URL=libsql://...              # LibSQL database
TURSO_AUTH_TOKEN=...                         # LibSQL auth
MONGO_URL=mongodb://...                      # MongoDB (Railway plugin auto-sets)
POSTGRES_URL=postgresql://...                # PostgreSQL (Railway plugin auto-sets)
```

## Step 2: Create New Service for Discord Bot

### Via Railway Dashboard:

1. Go to https://railway.app/project/YOUR_PROJECT_ID
2. Click "+ New" → "Empty Service"
3. **Service Name**: `omega-bot`
4. **Settings**:
   - **Root Directory**: `apps/bot`
   - **Start Command**: `cd apps/bot && node dist/index.js`
   - **Build Command**: `cd ../.. && pnpm install && pnpm build --filter=bot`
   - **Watch Paths**: `apps/bot/**, packages/**`
5. **Connect to GitHub**: Same repo as omega-web
6. **Branch**: `main` (same as web service)

### Environment Variables for omega-bot:

Required:
```bash
# Discord
DISCORD_BOT_TOKEN=...                        # From Discord Developer Portal
DISCORD_PUBLIC_KEY=...                       # From Discord Developer Portal
DISCORD_APP_ID=...                           # From Discord Developer Portal

# OpenAI
OPENAI_API_KEY=...                           # From OpenAI Platform

# Database
TURSO_DATABASE_URL=libsql://...              # LibSQL/Turso
TURSO_AUTH_TOKEN=...                         # LibSQL auth
MONGO_URL=mongodb://...                      # MongoDB (from Railway plugin)
POSTGRES_URL=postgresql://...                # PostgreSQL (from Railway plugin)

# Environment
NODE_ENV=production
```

Optional:
```bash
# External Services
UNSANDBOX_API_KEY=...                        # For code execution
GITHUB_TOKEN=...                             # For GitHub issues
TWITTER_API_KEY=...                          # For Twitter posting
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...

# Real-time Collaboration (future)
PUSHER_APP_ID=...
PUSHER_APP_KEY=...
PUSHER_APP_SECRET=...
PUSHER_CLUSTER=...

# Self-modification
GIT_USER_NAME=...
GIT_USER_EMAIL=...
```

## Step 3: Configure Shared Volume

Both services need access to the same `/data` volume for artifacts, uploads, etc.

### Via Railway Dashboard:

1. Go to your project
2. Click "+ New" → "Volume"
3. **Volume Name**: `omega-data`
4. **Mount Path**: `/data`
5. **Size**: 1GB (expandable)
6. Attach to **both** `omega-web` and `omega-bot` services

### Volume Structure:

```
/data/
├── artifacts/      # HTML/SVG/Markdown artifacts
├── uploads/        # User uploaded files
├── blog/           # Blog posts
└── documents/      # Collaborative documents
```

## Step 4: Verify Configuration Files

Railway should automatically detect `railway.json` in each service's root directory:

### apps/web/railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks",
    "buildCommand": "cd ../.. && pnpm install && pnpm build --filter=web"
  },
  "deploy": {
    "startCommand": "cd apps/web && pnpm start",
    "restartPolicyType": "on-failure",
    "restartPolicyMaxRetries": 10
  }
}
```

### apps/bot/railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks",
    "buildCommand": "cd ../.. && pnpm install && pnpm build --filter=bot"
  },
  "deploy": {
    "startCommand": "cd apps/bot && node dist/index.js",
    "restartPolicyType": "on-failure",
    "restartPolicyMaxRetries": 10
  }
}
```

## Step 5: Configure Databases

### Option 1: Use Existing Databases (Recommended)

If you already have Railway database plugins attached:

1. Go to your project
2. Click on each database (MongoDB, PostgreSQL)
3. Ensure they're connected to **both** services
4. Railway will automatically inject environment variables

### Option 2: Add New Databases

If starting fresh:

1. Click "+ New" → "Database" → "Add MongoDB"
2. Railway auto-creates `MONGO_URL` variable
3. Repeat for PostgreSQL if needed (creates `DATABASE_URL`)
4. Attach databases to both services

### Turso/LibSQL Setup:

Turso is an external service, not a Railway plugin:

1. Sign up at https://turso.tech
2. Create a database
3. Get `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
4. Add to environment variables in **both** services

## Step 6: Deploy Both Services

### Deploy omega-web (Next.js):

1. Push code to GitHub main branch
2. Railway auto-deploys on push
3. Or manually trigger: Click "Deploy" in Railway dashboard
4. Check logs for successful build
5. Visit your Railway-provided domain (e.g., `omega-web-production.up.railway.app`)

### Deploy omega-bot (Discord Bot):

1. Same repo, same branch
2. Railway auto-deploys on push
3. Or manually trigger deploy
4. Check logs for "✅ Discord bot connected" message
5. Test bot in Discord with `/help` or mention

## Step 7: Update Discord Bot Configuration

Since the artifact server is now part of the web app:

1. **Bot no longer needs to start Express server** - This will be removed in next phase
2. **All file serving** happens via omega-web on port 3000
3. **Bot only** handles Discord Gateway and AI agent

## Step 8: Verify Deployment

### Test omega-web:

```bash
# Health check
curl https://your-omega-web.up.railway.app/api/health

# List artifacts
curl https://your-omega-web.up.railway.app/api/artifacts

# List uploads
curl https://your-omega-web.up.railway.app/api/uploads

# List documents
curl https://your-omega-web.up.railway.app/api/documents
```

### Test omega-bot:

1. Open Discord
2. Go to a channel where the bot has access
3. Send a message: `@Omega hello`
4. Bot should respond with AI-generated message
5. Check Railway logs for agent activity

### Test Shared Volume:

1. Create an artifact via Discord bot
2. Verify it's accessible via web app: `https://your-web.railway.app/api/artifacts`
3. Upload a file via Discord
4. Verify it's accessible: `https://your-web.railway.app/api/uploads/FILENAME`

## Troubleshooting

### omega-web won't start:

- Check build logs for TypeScript errors: `pnpm type-check`
- Verify Next.js config is correct
- Ensure PORT=3000 is set
- Check volume is mounted at `/data`

### omega-bot won't connect to Discord:

- Verify `DISCORD_BOT_TOKEN` is correct
- Check Discord Developer Portal: Bot → Privileged Gateway Intents
  - ✅ MESSAGE CONTENT INTENT must be enabled!
- Ensure bot has proper permissions in Discord server
- Check logs for connection errors

### Shared volume not working:

- Verify both services have volume mounted at `/data`
- Check permissions: Both services should have read/write access
- Test: Create a file from bot, read from web app

### Database connection errors:

- Verify environment variables are set in both services
- Check Railway database plugins are attached to both services
- For Turso: Verify URL and token are correct
- Test with `railway run` locally first

## Cost Estimation

Railway Pricing (as of 2024):

- **Starter Plan**: $5/month
  - 512 MB RAM per service × 2 = $10/month
  - 1 GB volume: Included
  - 100 GB egress: Included

- **Additional Resources**:
  - MongoDB: Free with Railway plugin
  - PostgreSQL: Free with Railway plugin
  - Turso: Free tier (500 MB, 1 billion row reads/month)

**Estimated Total**: $10-15/month for both services

## Monitoring

### Via Railway Dashboard:

- **Deployments**: View build and deploy logs
- **Metrics**: CPU, memory, network usage per service
- **Logs**: Real-time logs with filtering
- **Observability**: Track deployments, errors, and performance

### Via CLI:

```bash
# View logs for web app
railway logs --service omega-web

# View logs for bot
railway logs --service omega-bot

# Check service status
railway status
```

## Rollback Procedure

If deployment fails:

1. Go to Railway Dashboard
2. Click on the failing service
3. Go to "Deployments" tab
4. Find the last working deployment
5. Click "⋮" → "Redeploy"

Or via CLI:
```bash
railway rollback --service omega-web
railway rollback --service omega-bot
```

## Next Steps

After deployment:

1. **Test all endpoints** from both services
2. **Update DNS** if using custom domain
3. **Monitor logs** for the first 24 hours
4. **Set up alerts** for service failures
5. **Remove old artifact server code** from bot (Phase 5 next step)
6. **Document API endpoints** for future reference

## Support

- Railway Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- GitHub Issues: https://github.com/railwayapp/railway/issues
