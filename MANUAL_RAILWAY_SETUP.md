# Manual Railway Setup Instructions

## Current Situation

The Railway CLI is timing out on all deployment commands. The services need to be configured manually via the Railway web dashboard.

**Latest commit with fixes**: `9cd21f2` (includes Dockerfile.bot rename and configuration files)

---

## Service 1: omega-bot (Discord Bot)

### Settings to Configure

Go to Railway Dashboard → Project → omega-bot service → Settings

#### Builder Configuration
1. **Builder**: Dockerfile
2. **Dockerfile Path**: `Dockerfile.bot`
3. **Root Directory**: (leave empty - use repo root)

#### Volume Configuration
1. Go to **Volumes** tab
2. Click **+ New Volume**
3. **Name**: `omega-data`
4. **Mount Path**: `/data`
5. Click **Add**

#### Environment Variables
Verify these exist (should already be set):
- `DISCORD_BOT_TOKEN` - Discord bot token
- `OPENAI_API_KEY` - OpenAI API key
- `NODE_ENV=production`
- `WEB_APP_URL` - Should point to omega service URL (e.g., `https://omega-production.up.railway.app`)

#### Deploy
1. Go to **Deployments** tab
2. Click **Deploy** button to trigger new build with Dockerfile.bot

### Expected Behavior After Fix

**Build logs should show**:
```
Building from Dockerfile.bot
Step 1/X : FROM node:20-alpine AS base
...
```

**Runtime logs should show**:
```
✅ Using Railway persistent volume at /data
✅ Connected to local SQLite database
✅ Bot is online as omega#7811
📊 Connected to X servers
```

**Should NOT show**:
```
❌ Failed to initialize database: Error: ConnectionFailed
⚠️  Using local storage (ephemeral)
```

---

## Service 2: omega (Next.js Web App)

### Settings to Configure

Go to Railway Dashboard → Project → omega service → Settings

#### Builder Configuration
**IMPORTANT**: Must use Nixpacks, NOT Dockerfile

1. **Builder**: Nixpacks (select from dropdown)
2. **Root Directory**: `apps/web`
3. **Build Command**: (should auto-detect from railway.json)
4. **Start Command**: (should auto-detect from railway.json)

If not auto-detected, manually set:
- **Build Command**: `cd ../.. && pnpm install && pnpm build --filter=web`
- **Start Command**: `pnpm start`

#### Volume Configuration
1. Go to **Volumes** tab
2. Attach the **SAME** volume as omega-bot:
   - **Volume**: `omega-data` (select existing)
   - **Mount Path**: `/data`
3. Click **Add**

#### Environment Variables
**Remove bot-specific variables** (if present):
- Remove `DISCORD_BOT_TOKEN`
- Remove `OPENAI_API_KEY`

**Set these**:
- `PORT=3000`
- `NODE_ENV=production`

**Optional** (if web app needs DB access):
- `DATABASE_URL` - PostgreSQL (should already exist)
- `MONGO_URL` - MongoDB (should already exist)

#### Networking
1. Go to **Settings** → **Networking**
2. Click **Generate Domain** to create public URL
3. Copy the domain URL (e.g., `omega-production.up.railway.app`)
4. Go to **omega-bot** service → Variables
5. Set `WEB_APP_URL=https://omega-production.up.railway.app`

#### Deploy
1. Go to **Deployments** tab
2. Click **Redeploy** to trigger new build with Nixpacks

### Expected Behavior After Fix

**Build logs should show**:
```
╔═══════════════════════════════════════════╗
║ Nixpacks v1.x.x                          ║
╚═══════════════════════════════════════════╝

─────────────────────────────────────────────
 Detect
─────────────────────────────────────────────
→ Provider: Node

─────────────────────────────────────────────
 Setup
─────────────────────────────────────────────
→ Node: 20

─────────────────────────────────────────────
 Install
─────────────────────────────────────────────
→ Running 'cd ../.. && pnpm install'

─────────────────────────────────────────────
 Build
─────────────────────────────────────────────
→ Running 'cd ../.. && pnpm build --filter=web'
```

**Runtime logs should show**:
```
▲ Next.js 15.x.x
- Local: http://0.0.0.0:3000

✓ Starting...
✓ Ready in Xms
```

**Should NOT show**:
```
✅ Bot is online as omega#7811
🎨 Artifact preview server running
🔧 Preloading core tools...
```

---

## Verification After Both Services Are Fixed

### 1. Check omega-bot
```bash
# Should respond in Discord
@omega hello
```

### 2. Check omega web app
```bash
# Get the public URL from Railway dashboard
curl https://omega-production.up.railway.app/api/health

# Should return Next.js health check
```

### 3. Test integration
```bash
# In Discord
@omega create an HTML button that says "Test"

# Bot should:
# - Save to /data/artifacts/
# - Return URL: https://omega-production.up.railway.app/artifacts/[id]
```

### 4. Verify shared volume
Both services should be accessing the same `/data` volume:
- Bot writes to `/data/artifacts/`
- Web serves from `/data/artifacts/`

---

## Common Issues

### Issue: omega still running bot code

**Symptom**: Logs show "Bot is online", artifact server, etc.

**Cause**: Still using Dockerfile instead of Nixpacks

**Fix**:
1. Go to omega service → Settings → Builder
2. Change from "Dockerfile" to "Nixpacks"
3. Redeploy

### Issue: omega-bot crashing with database error

**Symptom**: `Failed to initialize database: Error: ConnectionFailed`

**Cause**: No volume mounted

**Fix**:
1. Go to omega-bot service → Volumes
2. Attach `omega-data` volume at `/data`
3. Redeploy

### Issue: Both services can't share files

**Symptom**: Bot creates artifact, web can't serve it

**Cause**: Different volumes or no volume

**Fix**:
1. Ensure BOTH services have the SAME volume
2. Volume name: `omega-data`
3. Mount path: `/data` (must be identical on both)

---

## Why CLI Isn't Working

All `railway up` and `railway logs` commands are timing out with:
```
error sending request for url (...)
Caused by: operation timed out
```

This could be:
- Railway API experiencing issues
- Network connectivity problem
- Rate limiting

**Solution**: Use the web dashboard for all configuration and deployment.

---

## Configuration Files (Already in Repository)

These files are already committed and ready:

- `/Dockerfile.bot` - Bot Docker build
- `/railway.json` - omega-bot configuration (use Dockerfile.bot)
- `/apps/web/railway.json` - omega configuration (use nixpacks)
- `/apps/web/nixpacks.toml` - Nixpacks build configuration

**Commit**: `9cd21f2` contains all the fixes

---

## Next Steps (To Do in Railway Dashboard)

1. ☐ Configure omega-bot to use Dockerfile.bot
2. ☐ Attach volume to omega-bot at /data
3. ☐ Configure omega to use Nixpacks builder
4. ☐ Attach volume to omega at /data (same volume)
5. ☐ Remove bot env vars from omega service
6. ☐ Generate public domain for omega service
7. ☐ Set WEB_APP_URL in omega-bot to point to omega domain
8. ☐ Redeploy both services
9. ☐ Verify logs show correct behavior
10. ☐ Test in Discord and via web

---

**Last Updated**: 2025-12-01
**Latest Commit**: `9cd21f2`
**All Configuration Files**: Ready in repository
