# Omega Deployment Guide

> Comprehensive documentation of Omega's deployment process, infrastructure, and configuration.

---

## Overview

**Omega** is a Discord AI bot that has transitioned from Vercel serverless deployment to Railway containerized deployment. The bot uses Discord's Gateway API (persistent WebSocket connection) rather than the Interactions API (webhook-based), which necessitated the move to a platform supporting long-running processes.

**Current Deployment Platform:** Railway
**Previous Platform:** Vercel (deplatformed - Gateway API incompatible with serverless)
**Project ID:** `211e3c65-73ad-4e79-8b74-ff3762fcda73`
**Dashboard:** https://railway.app/project/211e3c65-73ad-4e79-8b74-ff3762fcda73

---

## Architecture

### Technology Stack

- **Runtime:** Node.js 20 (Alpine Linux)
- **Package Manager:** pnpm 9.0.0
- **Monorepo Tool:** Turborepo 2.x
- **Language:** TypeScript 5.6.3
- **Discord Integration:** Discord.js 14.x (Gateway API)
- **AI Provider:** OpenAI GPT-4.1-mini (via Vercel AI SDK v6)
- **Database:** Turso (libSQL) with optional local SQLite fallback
- **Web Server:** Express.js (for artifact preview and health checks)

### Why Railway?

| Requirement | Vercel | Railway |
|-------------|--------|---------|
| Persistent WebSocket | ❌ No (serverless) | ✅ Yes |
| Long-running processes | ❌ Max 10-30s | ✅ Unlimited |
| Gateway API support | ❌ Not compatible | ✅ Full support |
| Stateful connections | ❌ No | ✅ Yes |
| Docker deployment | ❌ Limited | ✅ Native |

**Key Insight:** Discord Gateway API requires a persistent WebSocket connection to receive all messages in real-time, which is fundamentally incompatible with serverless architecture.

---

## Deployment Configuration

### 1. Railway Configuration (`railway.toml`)

```toml
[build]
builder = "NIXPACKS"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[mounts]]
# Mount persistent storage for artifacts and uploads
mountPath = "/data"
```

**Key Points:**
- **Builder:** NIXPACKS (Railway's automatic build system)
- **Health Check:** HTTP GET to `/health` endpoint (5-minute timeout)
- **Restart Policy:** Auto-restart on failure (max 10 retries)
- **Persistent Storage:** `/data` mount for artifacts, uploads, and SQLite database

### 2. Nixpacks Configuration (`nixpacks.toml`)

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "pnpm"]

[phases.install]
cmds = [
  "pnpm install --frozen-lockfile"
]

[phases.build]
cmds = [
  "pnpm --filter bot build"
]

[start]
cmd = "node apps/bot/dist/index.js"

[variables]
NODE_ENV = "production"
ARTIFACT_SERVER_PORT = "3001"
```

**Build Process:**
1. **Setup:** Install Node.js 18.x and pnpm
2. **Install:** Install dependencies with frozen lockfile
3. **Build:** Build only the bot package using Turborepo filter
4. **Start:** Run compiled JavaScript from `dist/index.js`

### 3. Dockerfile (Alternative Deployment Method)

The repository includes a production-ready Dockerfile for manual deployment or other container platforms:

```dockerfile
# Multi-stage build for optimized image size
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.0.0
WORKDIR /app

# Copy workspace files and install dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/bot ./apps/bot
RUN pnpm install --frozen-lockfile

# Build TypeScript
WORKDIR /app/apps/bot
RUN pnpm run build

# Production image (minimal)
FROM node:20-alpine
RUN npm install -g pnpm@9.0.0
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/bot/package.json ./apps/bot/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod --filter=bot

# Copy built files from builder stage
COPY --from=base /app/apps/bot/dist ./apps/bot/dist

# Start the bot
WORKDIR /app/apps/bot
CMD ["node", "dist/index.js"]
```

**Image Optimization:**
- Multi-stage build reduces final image size
- Production dependencies only (no dev dependencies)
- Alpine Linux base (~50MB vs ~1GB for full Node image)

---

## Environment Variables

### Required Variables

```bash
# Discord Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

### Optional Variables

```bash
# Artifact Server Configuration
ARTIFACT_SERVER_PORT=3001
ARTIFACT_SERVER_URL=https://your-railway-domain.railway.app

# Turso Database (Optional - uses local SQLite if not set)
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token

# Unsandbox Code Execution (Optional)
UNSANDBOX_API_KEY=your_unsandbox_api_key
UNSANDBOX_ENABLE_SEMITRUST=true

# Logging
NODE_ENV=production
LOG_LEVEL=info
```

### Setting Environment Variables in Railway

1. Go to Railway dashboard: https://railway.app/project/211e3c65-73ad-4e79-8b74-ff3762fcda73
2. Select your service
3. Navigate to "Variables" tab
4. Add each variable with its value
5. Railway auto-deploys on variable changes

**Security Note:** Never commit `.env` files with real credentials. Use Railway's encrypted environment variable storage.

---

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

```yaml
name: CI Checks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Node.js 20
      - Setup pnpm with caching
      - Install dependencies
      - Type check (tsc --noEmit)
      - Build (pnpm build)
      - Notify Discord on success/failure
```

**Deployment Flow:**

```
┌─────────────┐
│   Git Push  │
│   to main   │
└──────┬──────┘
       │
       v
┌─────────────────┐
│ GitHub Actions  │
│ - Type check    │
│ - Build         │
└──────┬──────────┘
       │
       ├─── ✅ Success ───┐
       │                  │
       │                  v
       │         ┌────────────────┐
       │         │ Discord Notify │
       │         │ Build Passed   │
       │         └────────────────┘
       │                  │
       │                  v
       │         ┌────────────────────┐
       │         │ Railway Auto-Deploy│
       │         │ (webhook trigger)  │
       │         └────────────────────┘
       │
       └─── ❌ Failure ──┐
                         │
                         v
                ┌─────────────────┐
                │ Discord Notify  │
                │ Build Failed    │
                │ No deployment   │
                └─────────────────┘
```

**Key Features:**
- **Pre-deployment validation:** Type checking and build verification before Railway deployment
- **Discord notifications:** Real-time build status updates to Discord webhook
- **Automatic deployment:** Railway listens to main branch changes and auto-deploys
- **Deployment blocking:** Failed CI checks prevent Railway deployment

### Discord Notifications

The CI pipeline sends notifications to a Discord webhook with:
- ✅ **Build Success:** Commit message, author, SHA, link to Railway dashboard
- ❌ **Build Failure:** Error details, author, SHA, link to failed GitHub Actions run

---

## Deployment Process

### Initial Setup (One-Time)

#### 1. Create Railway Project

```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Login to Railway
railway login

# Link to existing project
railway link 211e3c65-73ad-4e79-8b74-ff3762fcda73
```

Or use the Railway dashboard:
1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select `thomasdavis/omega` repository
5. Railway auto-detects Nixpacks configuration

#### 2. Configure Environment Variables

In Railway dashboard:
1. Add `DISCORD_BOT_TOKEN`
2. Add `OPENAI_API_KEY`
3. Add any optional variables (see Environment Variables section)

#### 3. Configure GitHub Integration

Railway automatically:
- Detects main branch pushes
- Triggers builds on changes
- Deploys successful builds
- Provides deployment URLs

#### 4. Set Up Persistent Storage

Railway automatically mounts `/data` volume based on `railway.toml` configuration. This stores:
- Generated artifacts (HTML, images, code)
- User uploads
- Local SQLite database (if not using Turso)

### Regular Deployment Workflow

```bash
# 1. Make changes locally
git checkout -b feature/my-changes

# 2. Test locally
pnpm install
pnpm dev

# 3. Commit changes
git add .
git commit -m "feat: description of changes"

# 4. Push to GitHub
git push origin feature/my-changes

# 5. Create PR (GitHub Actions runs CI checks)
gh pr create --title "My changes" --body "Description"

# 6. Merge to main (triggers Railway deployment)
gh pr merge --squash

# 7. Railway automatically:
#    - Pulls latest code
#    - Runs Nixpacks build
#    - Deploys new version
#    - Runs health check
#    - Switches traffic to new deployment
```

**Zero-Downtime Deployment:** Railway uses blue-green deployment strategy, ensuring no downtime during updates.

### Manual Deployment (CLI)

```bash
# Deploy current directory
railway up

# Deploy with specific environment
railway up --environment production

# Check deployment status
railway status

# View logs
railway logs

# Open in browser
railway open
```

---

## Monitoring and Debugging

### Health Check Endpoint

The bot exposes a health check endpoint for Railway monitoring:

**Endpoint:** `GET /health`
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-21T13:00:00.000Z",
  "uptime": 86400,
  "discord": "connected",
  "database": "ready"
}
```

Railway pings this endpoint every 5 minutes (configurable in `railway.toml`).

### Viewing Logs

**Railway Dashboard:**
1. Go to project dashboard
2. Click "Deployments" tab
3. Select active deployment
4. View real-time logs

**Railway CLI:**
```bash
# Stream live logs
railway logs

# Filter logs
railway logs --filter "error"

# Export logs
railway logs > deployment.log
```

### Common Issues

#### Bot Not Responding

**Check:**
1. Discord bot token is valid
2. Bot is online in Discord server
3. Health endpoint returns 200 OK
4. Railway deployment status is "Active"

**Debug:**
```bash
railway logs --filter "discord"
```

#### OpenAI API Errors

**Check:**
1. `OPENAI_API_KEY` is set correctly
2. OpenAI account has sufficient credits
3. API quota not exceeded

**Debug:**
```bash
railway logs --filter "openai"
```

#### Database Connection Issues

**Check:**
1. Turso credentials are correct (if using Turso)
2. `/data` mount is writable (for local SQLite)
3. Database initialization completed

**Debug:**
```bash
railway logs --filter "database"
```

---

## Rollback Strategy

### Automatic Rollback

Railway automatically rolls back if:
- Health check fails after deployment
- Application crashes immediately after start
- Deployment exceeds timeout (10 minutes)

### Manual Rollback

**Via Dashboard:**
1. Go to "Deployments" tab
2. Find previous working deployment
3. Click "Redeploy"

**Via CLI:**
```bash
# List recent deployments
railway status

# Rollback to specific deployment
railway rollback <deployment-id>
```

---

## Scaling Considerations

### Current Setup

- **Instances:** 1 (Gateway API requires single instance)
- **Memory:** 512MB (default Railway allocation)
- **CPU:** Shared (Railway free tier)

### Why Single Instance?

Discord Gateway API maintains a **stateful WebSocket connection**. Multiple instances would:
- Create duplicate message processing
- Cause race conditions
- Violate Discord rate limits

**Solution:** Vertical scaling (increase memory/CPU) rather than horizontal scaling (more instances).

### Upgrading Resources

**Railway Dashboard:**
1. Go to "Settings" tab
2. Click "Resources"
3. Adjust memory/CPU sliders
4. Railway auto-restarts with new resources

**Cost:** Railway charges based on resource usage:
- **Hobby Plan:** $5/month for 512MB RAM
- **Pro Plan:** Usage-based pricing (~$0.000231/GB-hour)

---

## Cost Optimization

### Current Monthly Costs (Estimated)

| Service | Usage | Cost |
|---------|-------|------|
| Railway (512MB, 24/7) | ~360 GB-hours | $5-10/month |
| OpenAI GPT-4.1-mini | ~50K requests | $10-20/month |
| Turso Database | 10K rows, 1GB | Free tier |
| Total | | **$15-30/month** |

### Optimization Tips

1. **Use GPT-4.1-mini for all requests** (already configured)
2. **Cache frequent responses** (consider adding Redis)
3. **Implement rate limiting** (prevent abuse)
4. **Use Turso free tier** (sufficient for most use cases)
5. **Monitor Railway metrics** (adjust resources based on actual usage)

---

## Backup and Disaster Recovery

### Database Backups

**Turso (Recommended):**
- Automatic daily backups
- Point-in-time recovery
- Multi-region replication

**Local SQLite:**
- Manual backups required
- Use Railway persistent storage snapshots

**Backup Script:**
```bash
# Copy SQLite database from Railway
railway run cp /data/omega.db /tmp/backup.db
railway run cat /tmp/backup.db > backup-$(date +%Y%m%d).db
```

### Artifact Storage

**Persistent Volume:**
- Railway mounts `/data` volume
- Survives deployments and restarts
- Manual backups recommended

**Backup Strategy:**
```bash
# Create artifact backup
railway run tar -czf /tmp/artifacts.tar.gz /data/artifacts
railway run cat /tmp/artifacts.tar.gz > artifacts-backup.tar.gz
```

### Disaster Recovery Plan

1. **Code:** Version controlled in GitHub (always recoverable)
2. **Environment Variables:** Documented in Railway (export recommended)
3. **Database:** Turso auto-backup or manual SQLite export
4. **Artifacts:** Periodic backups to external storage (S3, Google Cloud)

**Recovery Time Objective (RTO):** ~15 minutes
**Recovery Point Objective (RPO):** Last deployment + database backup

---

## Alternative Deployment Options

### 1. Docker Compose (Self-Hosted)

```yaml
version: '3.8'
services:
  omega-bot:
    build: .
    environment:
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./data:/data
    ports:
      - "3001:3001"
    restart: unless-stopped
```

**Pros:** Full control, no platform costs
**Cons:** Manual updates, self-managed infrastructure

### 2. Render.com

Similar to Railway, supports Docker deployment:
```bash
# Install Render CLI
npm install -g render

# Deploy
render deploy
```

### 3. Fly.io

Optimized for edge deployment:
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch
fly deploy
```

### 4. DigitalOcean App Platform

Managed container platform:
- Import from GitHub
- Auto-detects Dockerfile
- Built-in monitoring

---

## Migration Guide (Vercel → Railway)

### Key Changes Made

1. **API Architecture:**
   - ❌ Removed: Serverless functions (`api/interactions.ts`)
   - ✅ Added: Gateway API client (`src/index.ts`)

2. **Configuration:**
   - ❌ Removed: `vercel.json` (kept for reference, disabled with `deploymentEnabled: false`)
   - ✅ Added: `railway.toml`, `nixpacks.toml`, `Dockerfile`

3. **Discord Integration:**
   - ❌ Removed: Interactions API webhook
   - ✅ Added: Gateway API WebSocket connection

4. **Dependencies:**
   - ❌ Removed: `@vercel/node`
   - ✅ Added: `discord.js` with Gateway intents

### Why Migration Was Necessary

**Vercel Limitations:**
- Maximum function duration: 10-30 seconds
- No persistent connections
- Stateless architecture only

**Omega Requirements:**
- 24/7 WebSocket connection to Discord
- Real-time message processing
- Stateful conversation context

**Result:** Gateway API fundamentally incompatible with serverless architecture.

---

## Future Improvements

### Planned Enhancements

1. **Redis Caching:**
   - Cache OpenAI responses
   - Session management
   - Rate limiting state

2. **Observability:**
   - Add Sentry for error tracking
   - Implement metrics with Prometheus
   - Dashboard with Grafana

3. **High Availability:**
   - Database connection pooling
   - Graceful shutdown handling
   - Circuit breakers for external APIs

4. **Performance:**
   - Response streaming (AI SDK v6 supports this)
   - Message queuing for high-load scenarios
   - CDN for artifact delivery

---

## Resources

### Official Documentation

- [Railway Docs](https://docs.railway.app)
- [Nixpacks Reference](https://nixpacks.com/docs)
- [Discord.js Guide](https://discordjs.guide)
- [Turso Documentation](https://docs.turso.tech)

### Project Documentation

- [README.md](../README.md) - Project overview
- [CLAUDE.md](../CLAUDE.md) - Vercel deployment lessons (historical)
- [ARCHITECTURE_PLAN.md](../ARCHITECTURE_PLAN.md) - System architecture
- [SETUP.md](../SETUP.md) - Local development setup

### Support

- **Railway Support:** support@railway.app
- **Discord API:** https://discord.com/developers/docs
- **Project Issues:** https://github.com/thomasdavis/omega/issues

---

## Summary

**Current State:**
✅ Deployed on Railway
✅ Using Discord Gateway API
✅ CI/CD with GitHub Actions
✅ Health monitoring enabled
✅ Persistent storage configured
✅ Auto-deployment on main branch push

**Deployment Platform:** Railway (Container-based)
**Previous Platform:** Vercel (Deplatformed - incompatible with Gateway API)
**Estimated Monthly Cost:** $15-30
**Uptime Target:** 99.9% (Railway SLA)
**Deployment Time:** ~3-5 minutes

---

**Last Updated:** 2025-11-21
**Deployment Status:** ✅ Production Ready
**Railway Project:** https://railway.app/project/211e3c65-73ad-4e79-8b74-ff3762fcda73
**Documentation Maintained By:** Claude (Anthropic AI)
