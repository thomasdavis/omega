# Railway Deployment Fix - Issue #558

## Problem: Railway Deployment Blocked

User @lisamegawatts reported that Railway deployment was blocked with multiple failed builds.

## Root Cause

Railway deployment was blocked due to **conflicting build configuration files**:

1. **`/railway.toml`** (Correct configuration):
   - Builder: `DOCKERFILE`
   - Dockerfile path: `apps/bot/Dockerfile`
   - This is the intended configuration based on commit 60c0c3a

2. **`apps/bot/railway.json`** (Conflicting configuration - NOW REMOVED):
   - Builder: `nixpacks`
   - Build command: `cd ../.. && pnpm install && pnpm build --filter=bot`
   - This file was causing Railway to be confused about which build system to use

### Why This Blocked Deployment

Railway reads configuration files in priority order:
1. `railway.json` (if exists) ← **Higher priority**
2. `railway.toml` (if exists)

Since `apps/bot/railway.json` existed, Railway attempted to use Nixpacks builder instead of the Dockerfile, creating a conflict with the established Dockerfile-based build system.

## Solution Applied

**Removed the conflicting `apps/bot/railway.json` file.**

Now Railway will correctly use `/railway.toml` which specifies:
- DOCKERFILE builder
- Path: `apps/bot/Dockerfile`
- Start command: `node dist/index.js`
- Volume mount at `/data`

## Railway Configuration After Fix

### omega-bot Service

**Configuration file**: `/railway.toml`

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "apps/bot/Dockerfile"

[deploy]
startCommand = "node dist/index.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[mounts]]
mountPath = "/data"
```

**Railway Dashboard Settings**:
- Root Directory: (blank/empty) - uses repo root
- Builder: Automatically detected from railway.toml
- Build context: Repository root (required for monorepo workspace packages)

### omega-web Service

**Configuration file**: `/apps/web/railway.toml`

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "apps/web/Dockerfile"

[deploy]
startCommand = "pnpm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[mounts]]
mountPath = "/data"

[deploy.healthcheck]
path = "/"
timeout = 300
```

**Railway Dashboard Settings**:
- Root Directory: `apps/web`
- Builder: Automatically detected from railway.toml
- Build context: Repository root (required for monorepo workspace packages)

## Verification Steps

After this fix is deployed, verify:

1. **Check Railway Dashboard**:
   - omega-bot service should show "Dockerfile" as builder
   - omega-web service should show "Dockerfile" as builder

2. **Check Build Logs**:
   ```bash
   # omega-bot should show:
   Building from apps/bot/Dockerfile
   Step 1/X : FROM node:20-alpine AS base
   ```

3. **Check Runtime Logs**:
   ```bash
   # omega-bot should show:
   ✅ Using Railway persistent volume at /data
   ✅ Connected to local SQLite database
   ✅ Bot is online as omega#7811
   ```

4. **Test in Discord**:
   ```
   @omega hello
   # Should receive response from bot
   ```

## Related Documentation

- **MANUAL_RAILWAY_SETUP.md**: Manual Railway dashboard configuration instructions
- **RAILWAY-SERVICE-SEPARATION-SOLUTION.md**: How Railway resolves config files for multi-service monorepos
- **apps/bot/docs/RAILWAY.md**: Railway-specific bot deployment guide
- **Commit 60c0c3a**: Fixed Railway TOML paths and added comprehensive documentation

## Key Learnings

1. **Railway Configuration Priority**:
   - `railway.json` takes precedence over `railway.toml`
   - Only one configuration file should exist per service

2. **Monorepo Setup**:
   - Root Directory setting in Railway Dashboard determines which config file is read
   - Dockerfile paths are ALWAYS relative to repository root
   - Both services can share the same `/data` volume for file sharing

3. **Build System Consistency**:
   - omega-bot: Uses Dockerfile (needs workspace packages)
   - omega-web: Uses Dockerfile (needs workspace packages)
   - Nixpacks was incompatible with the current monorepo structure

## Expected Outcome

After deploying this fix:
- ✅ Railway deployment should no longer be blocked
- ✅ omega-bot builds successfully using Dockerfile
- ✅ omega-web builds successfully using Dockerfile
- ✅ Both services share `/data` volume for artifacts
- ✅ No build system conflicts

---

**Issue**: #558
**Fixed by**: @claude (Claude Code)
**Date**: 2025-12-01
**Commit**: (to be added after commit)
