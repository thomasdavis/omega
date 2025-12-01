# Railway Deployment - Next Steps

## ✅ What Was Fixed

### 1. Created Proper railway.toml Configuration
**File:** `/railway.toml`

Replaced the old single-service NIXPACKS configuration with a proper multi-service setup that:
- Defines both services (`omega-bot` and `omega`)
- Sets `builder = "dockerfile"` to force Docker builds (no auto-detection)
- Configures service-specific root directories:
  - `omega-bot`: `./apps/bot`
  - `omega`: `./apps/web`
- Defines shared persistent volume `omega_data` mounted at `/data` for both services
- Sets port 3000 for the web service

### 2. Key Changes
```toml
[service.omega-bot]
root = "./apps/bot"
builder = "dockerfile"
dockerfile = "./apps/bot/Dockerfile"
mounts = [{ source = "omega_data", dest = "/data" }]

[service.omega]
root = "./apps/web"
builder = "dockerfile"
dockerfile = "./apps/web/Dockerfile"
port = 3000
mounts = [{ source = "omega_data", dest = "/data" }]

[volume.omega_data]
```

### 3. Removed Conflicting railway.json Files
**Files Deleted:** `/railway.json` and `/apps/web/railway.json`

These legacy JSON files were conflicting with railway.toml, causing Railway to use Railpack auto-detection instead of the Dockerfile builder specified in railway.toml.

Railway prioritizes railway.json over railway.toml when both exist, which is why the Dockerfile configuration was being ignored.

### 4. Committed and Pushed
- Commit: `427abbf` - Created railway.toml with multi-service configuration
- Commit: `50bbe5e` - Removed conflicting railway.json files
- Status: Pushed to GitHub

---

## ⚠️ What Still Needs to Be Done

### 1. Railway Dashboard Configuration (MANUAL STEPS REQUIRED)

Railway TOML defines the configuration, but you need to verify/configure in the Railway dashboard:

#### Step 1: Check Services Exist
Go to your Railway project and verify that TWO services are now detected:
- `omega-bot`
- `omega`

If Railway hasn't picked up the new railway.toml yet, you may need to:
- Trigger a redeploy from the dashboard
- Or wait for the next git push to trigger auto-deployment

#### Step 2: Verify Service Settings

**For omega-bot service:**
- Builder: Should show "Dockerfile"
- Root Directory: Should be `./apps/bot`
- Dockerfile Path: Should be `./apps/bot/Dockerfile`
- Build Process: Should use Docker (no Nixpacks/Railpack)
- Volume: Should have `omega_data` mounted at `/data`

**For omega service:**
- Builder: Should show "Dockerfile"
- Root Directory: Should be `./apps/web`
- Dockerfile Path: Should be `./apps/web/Dockerfile`
- Build Process: Should use Docker (no Nixpacks/Railpack)
- Port: Should expose port 3000
- Volume: Should have `omega_data` mounted at `/data` (same volume as omega-bot)

#### Step 3: Create/Verify Persistent Volume

In Railway dashboard:
1. Go to the project settings or volume management
2. Verify that a volume named `omega_data` exists
3. If it doesn't exist, create it
4. Verify it's attached to BOTH services at mount path `/data`

This is critical because the bot writes files and the web app serves them:
```
/data/
├── artifacts/     ← Bot writes, Web serves
├── uploads/       ← Bot writes, Web serves
├── blog/          ← Bot writes, Web serves
└── omega.db       ← Shared SQLite database
```

#### Step 4: Environment Variables

Verify all required environment variables are set for BOTH services:

**omega-bot service:**
- `DISCORD_TOKEN`
- `DISCORD_PUBLIC_KEY`
- `DISCORD_APPLICATION_ID`
- `OPENAI_API_KEY`
- `MONGO_URL` (Railway MongoDB)
- `POSTGRES_URL` (Railway PostgreSQL)
- Any other bot-specific variables

**omega service:**
- Any web-app specific variables
- May need some of the same variables if web app accesses the database

---

## 🔍 How to Verify It's Working

### Check 1: Build Logs Should Show Docker

When the next deployment runs, build logs should show:
```
Building Dockerfile...
Step 1/X : FROM node:20-alpine AS base
Step 2/X : RUN npm install -g pnpm@9.0.0
...
```

**NOT:**
```
Nixpacks build
or
Railpack detecting...
```

### Check 2: No npm Workspace Errors

Build logs should NOT show:
```
npm error Unsupported URL Type "workspace:": workspace:*
```

If you see this, it means Railway is still using npm auto-detection instead of Dockerfile.

### Check 3: Turborepo Builds Dependencies First

Build logs should show packages being built in order:
```
pnpm build --filter=bot
• Packages in scope: bot, @repo/agent, @repo/database, @repo/shared
• Executing build in topological order
• @repo/shared:build: compiled successfully
• @repo/database:build: compiled successfully
• @repo/agent:build: compiled successfully
• bot:build: compiled successfully
```

### Check 4: Bot Runtime Should Not Crash on Database

Once the volume is properly mounted at `/data`, the bot should:
- Successfully create SQLite database at `/data/omega.db`
- Successfully create directories at `/data/artifacts`, `/data/uploads`, `/data/blog`
- NOT crash with "Unable to open connection to local database"

### Check 5: Both Services Running Correct Code

- **omega-bot logs** should show: "Bot is online as omega#XXXX" (Discord bot messages)
- **omega logs** should show: "Ready on http://localhost:3000" (Next.js web server)

---

## 🚨 Potential Issues and Fixes

### Issue 1: Railway Doesn't Detect Two Services

**Symptom:** Railway dashboard still shows only one service

**Cause:** Railway hasn't parsed the new railway.toml yet

**Fix:**
1. Make a trivial code change and push to git (triggers Railway auto-deploy)
2. Or manually trigger redeploy from Railway dashboard
3. Or use Railway CLI: `railway up --service omega-bot && railway up --service omega`

### Issue 2: Volume Not Shared Between Services

**Symptom:** Each service has its own separate volume

**Cause:** Railway created separate volumes instead of sharing one

**Fix:**
In Railway dashboard:
1. Delete the auto-created separate volumes
2. Create a single volume named `omega_data`
3. Attach it to BOTH services at mount path `/data`

### Issue 3: Still Seeing Nixpacks/Railpack in Build Logs

**Symptom:** Build logs show "Nixpacks" or "Railpack detecting..." instead of Dockerfile

**Cause:** Railway ignoring the railway.toml configuration

**Fix:**
1. Verify railway.toml is at repo root (it is: `/railway.toml`)
2. Verify the TOML syntax is correct (it is - we just created it)
3. Try deleting the railway.json files (they may be conflicting):
   ```bash
   rm railway.json apps/web/railway.json
   git add railway.json apps/web/railway.json
   git commit -m "chore: Remove railway.json files (using railway.toml now)"
   git push
   ```

### Issue 4: Database Path Still Wrong

**Symptom:** Bot tries to access `/app/apps/bot/apps/bot/data/omega.db` (duplicated path)

**Cause:** Application code computing database path incorrectly

**Fix:**
1. Check where the database path is set in the application code
2. It should be simply `/data/omega.db` when running on Railway with volume mounted
3. May need to update environment variable or configuration

---

## 📋 Checklist for Railway Dashboard

- [ ] Verify `omega-bot` service exists
- [ ] Verify `omega` service exists
- [ ] Verify `omega-bot` uses Dockerfile builder
- [ ] Verify `omega` uses Dockerfile builder
- [ ] Verify persistent volume `omega_data` exists
- [ ] Verify volume is mounted to `omega-bot` at `/data`
- [ ] Verify volume is mounted to `omega` at `/data`
- [ ] Verify `omega` service exposes port 3000
- [ ] Verify environment variables are set for both services
- [ ] Trigger redeploy to pick up new railway.toml
- [ ] Check build logs for Docker build (not Nixpacks)
- [ ] Check omega-bot runtime logs for successful bot startup
- [ ] Check omega runtime logs for successful Next.js startup
- [ ] Verify no database connection errors

---

## 🎯 Expected Final State

**Two Railway services in one project:**

```
omega-bot (Discord Bot)
├── Builder: Dockerfile
├── Root: ./apps/bot
├── Dockerfile: ./apps/bot/Dockerfile
├── Port: None (worker)
└── Volume: omega_data → /data

omega (Next.js Web)
├── Builder: Dockerfile
├── Root: ./apps/web
├── Dockerfile: ./apps/web/Dockerfile
├── Port: 3000 (public)
└── Volume: omega_data → /data (shared)
```

**Shared volume structure:**
```
/data/
├── artifacts/     (bot writes, web serves)
├── uploads/       (bot writes, web serves)
├── blog/          (bot writes, web serves)
└── omega.db       (shared SQLite database)
```

**Build process:**
1. Railway reads railway.toml
2. Detects two services
3. Builds each using their Dockerfile
4. Dockerfiles install pnpm 9.0.0
5. Dockerfiles copy monorepo workspace
6. Dockerfiles run `pnpm build --filter=<service>`
7. Turborepo builds dependencies first (@repo/*)
8. Service builds successfully
9. Production image runs the service

---

## 💡 Why This Should Work Now

**Before:**
- Railway.toml had old NIXPACKS single-service config
- Railway ignored railway.json (not supported for monorepos)
- Auto-detection used npm (workspace protocol errors)
- No way to configure shared volumes
- No way to set service-specific root directories

**After:**
- Railway.toml properly defines both services
- Explicit `builder = "dockerfile"` disables auto-detection
- Service-specific root directories set correctly
- Shared volume `omega_data` defined for both services
- Port 3000 exposed for web service
- Dockerfiles have full control over build process

**Result:**
- Docker builds with pnpm 9.0.0 (no npm errors)
- Turborepo runs correctly (dependencies built first)
- Shared volume enables bot→web file sharing
- Both services run their correct code
- No more "wrong service running wrong app" issues

---

## 📚 References

- **Problem Analysis:** `/RAILWAY-PROBLEM-SCOPE.md`
- **Railway TOML Config:** `/railway.toml`
- **Bot Dockerfile:** `/apps/bot/Dockerfile`
- **Web Dockerfile:** `/apps/web/Dockerfile`
- **Commit:** `427abbf` - "fix: Replace railway.toml with proper multi-service configuration"

---

**Last Updated:** 2025-12-01
**Status:** Configuration fixed, awaiting Railway dashboard verification
