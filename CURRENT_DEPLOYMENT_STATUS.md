# Current Deployment Status

## Problem Summary

Both Railway services (`omega-bot` and `omega`) are currently broken:

### omega-bot Service
- **Status**: ❌ Crashing constantly
- **Error**: Cannot connect to database at `/app/apps/bot/apps/bot/data/omega.db` (error code 14)
- **Root cause**: No Railway volume attached, trying to use local SQLite in read-only filesystem
- **Fix needed**: Attach Railway volume at `/data` mount point

### omega Service
- **Status**: ❌ Running WRONG code
- **Problem**: Running the Discord bot code instead of Next.js web app
- **Evidence**: Logs show "Bot is online as omega#7811", "Artifact preview server running", etc.
- **Root cause**: Railway is using the Dockerfile at repo root instead of nixpacks for Next.js

---

## Architecture (How it SHOULD work)

```
omega-bot service:
- Uses: /Dockerfile.bot (renamed from /Dockerfile)
- Builds: Discord bot + workspace packages
- Runs: node dist/index.js (Discord Gateway bot)
- Needs: /data volume for persistent storage
- Port: None (background worker)

omega service:
- Root directory: apps/web
- Uses: apps/web/nixpacks.toml
- Builds: Next.js app + workspace packages
- Runs: pnpm start (Next.js on port 3000)
- Needs: /data volume for serving artifacts
- Port: 3000
```

---

## Recent Changes Made

### 1. Renamed Dockerfile (commit 04e7263)
- Renamed `/Dockerfile` → `/Dockerfile.bot`
- Added `/railway.json` to configure omega-bot to use `Dockerfile.bot`
- This should prevent omega service from using the bot Dockerfile

### 2. Added nixpacks.toml (commit 0844446)
- Created `apps/web/nixpacks.toml` with explicit Next.js build config
- This should force omega service to use nixpacks instead of Docker

### 3. Updated apps/web/railway.json (commit e704f43)
- Configured to use nixpacks builder
- Build command: `cd ../.. && pnpm install && pnpm build --filter=web`
- Start command: `pnpm start`

---

## Why Changes Aren't Taking Effect

**Railway CLI is timing out** - commands like `railway up` and `railway logs` are either timing out or hanging.

**Possible reasons**:
1. Railway hasn't automatically redeployed after the commits
2. Railway dashboard settings override the configuration files
3. Railway is still using cached builds from before the Dockerfile rename

---

## Required Manual Configuration in Railway Dashboard

Since the CLI is having issues, these settings need to be verified/configured manually in the Railway dashboard:

### omega-bot Service Settings
1. **Builder**: Dockerfile
2. **Dockerfile Path**: `Dockerfile.bot`
3. **Root Directory**: (empty - use repo root)
4. **Volume**: Attach `omega-data` volume at `/data` mount point
5. **Environment Variables**:
   ```
   DISCORD_BOT_TOKEN=...
   OPENAI_API_KEY=...
   NODE_ENV=production
   WEB_APP_URL=https://[omega-service-url].railway.app
   ```

### omega Service Settings
1. **Builder**: Nixpacks
2. **Root Directory**: `apps/web`
3. **Volume**: Attach `omega-data` volume at `/data` mount point (same volume as bot)
4. **Environment Variables**:
   ```
   PORT=3000
   NODE_ENV=production
   ```
5. **Public Domain**: Generate Railway domain

---

## Verification Steps

Once both services are properly configured and deployed:

### 1. Check omega-bot logs
Should see:
```
✅ Using Railway persistent volume at /data
✅ Connected to local SQLite database
✅ Bot is online as omega#7811
📊 Connected to X servers
```

Should NOT see:
```
❌ Failed to initialize database: Error: ConnectionFailed
🎨 Artifact preview server running
```

### 2. Check omega logs
Should see:
```
▲ Next.js 15.x.x
✓ Starting...
✓ Ready in X ms
- Local: http://0.0.0.0:3000
```

Should NOT see:
```
✅ Bot is online as omega#7811
🎨 Artifact preview server running
```

### 3. Test omega web app
```bash
curl https://[omega-domain]/api/health
# Should return Next.js health check response
```

### 4. Test integration
1. Create artifact via Discord bot: `@omega create a blue button`
2. Bot should save to `/data/artifacts/`
3. Web app should serve it at `https://[domain]/api/artifacts/[id]`

---

## Current State of Configuration Files

### /railway.json (root)
```json
{
  "build": {
    "builder": "dockerfile",
    "dockerfilePath": "Dockerfile.bot"
  },
  "deploy": {
    "restartPolicyType": "on-failure",
    "restartPolicyMaxRetries": 10
  }
}
```

### /Dockerfile.bot (root)
Multi-stage Docker build for bot service.

### /apps/web/railway.json
```json
{
  "build": {
    "builder": "nixpacks",
    "buildCommand": "cd ../.. && pnpm install && pnpm build --filter=web"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "restartPolicyType": "on-failure",
    "restartPolicyMaxRetries": 10
  }
}
```

### /apps/web/nixpacks.toml
```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["cd ../.. && pnpm install"]

[phases.build]
cmds = ["cd ../.. && pnpm build --filter=web"]

[start]
cmd = "pnpm start"
```

---

## Next Steps

1. **Verify Railway has picked up the latest commits** (04e7263 and 0844446)
2. **Check Railway dashboard** to see if services are using correct builders
3. **If omega is still using Docker**: Manually change builder to Nixpacks in dashboard
4. **If omega-bot is failing**: Attach volume at `/data` in dashboard settings
5. **Trigger redeployment** of both services after configuration changes
6. **Verify logs** show correct behavior for each service

---

## Files Changed (Recent Commits)

- `04e7263` - Rename Dockerfile to Dockerfile.bot, add railway.json
- `0844446` - Add nixpacks.toml for web service
- `e704f43` - Remove apps/web/Dockerfile, use railway.json with nixpacks
- `8e6bdcc` - Copy tsconfig.json to web Dockerfile (now obsolete)
- `4d75a8c` - Copy tsconfig.json to bot Dockerfile

---

**Last Updated**: 2025-12-01
**Status**: Configuration files ready, waiting for Railway to deploy correctly
