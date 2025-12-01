# Railway Deployment Status

## Current Setup

### Service 1: omega-bot ✅
**Status**: Deploying (building with fixed Dockerfile)

```yaml
Service Name: omega-bot
Repository: thomasdavis/omega (main branch)
Root Directory: apps/bot (but uses /Dockerfile from repo root)
Build Method: Dockerfile at /Dockerfile
Port: None (background worker)
```

**What it runs**:
- Discord Gateway listener
- AI Agent with 114+ tools
- No HTTP server (artifact server removed)

**Build process**:
1. Copies turbo.json, packages/, apps/bot/
2. Installs all dependencies
3. Runs `pnpm build --filter=bot` (turbo builds packages first)
4. Produces dist/ folder
5. Starts with `node dist/index.js`

**Recent fixes**:
- ✅ Added packages/ directory to COPY
- ✅ Added turbo.json to COPY
- ✅ Simplified build to use turbo --filter

---

### Service 2: omega-web ⏳
**Status**: Not yet created (needs manual setup)

```yaml
Service Name: omega-web (to be created)
Repository: thomasdavis/omega (main branch)
Root Directory: apps/web
Build Method: Dockerfile at apps/web/Dockerfile
Port: 3000
```

**What it runs**:
- Next.js 15 production server
- 22 API routes (artifacts, uploads, documents, blog)
- Serves static files from /data volume

**Build process**:
1. Copies turbo.json, packages/, apps/web/
2. Installs all dependencies
3. Runs `pnpm build --filter=web` (turbo builds packages first)
4. Produces .next/ folder
5. Starts with `pnpm start` on port 3000

---

## How to Create omega-web Service

### Step 1: Go to Railway Dashboard
https://railway.app/project/YOUR_PROJECT_ID

### Step 2: Create New Service
1. Click "+ New" → "Empty Service"
2. Name it: `omega-web`

### Step 3: Connect to GitHub
1. Click "Connect" → "GitHub Repo"
2. Select: `thomasdavis/omega`
3. Branch: `main`

### Step 4: Configure Service Settings
1. **Root Directory**: `apps/web`
2. **Watch Paths**: Leave empty (watches everything by default)
3. **Build Command**: Leave empty (uses Dockerfile)
4. **Start Command**: Leave empty (uses Dockerfile CMD)

### Step 5: Environment Variables
Add these to omega-web:

```bash
# Required
PORT=3000
NODE_ENV=production

# Optional (if web app needs DB access)
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
MONGO_URL=mongodb://...
POSTGRES_URL=postgresql://...
```

### Step 6: Deploy
1. Click "Deploy"
2. Railway will detect `apps/web/Dockerfile`
3. Build should complete in ~2-3 minutes
4. Service will expose port 3000 automatically

---

## Shared Volume Configuration

Both services need access to `/data`:

### Step 1: Create Volume (if not exists)
1. Click "+ New" → "Volume"
2. Name: `omega-data`
3. Size: 1GB (expandable)
4. Mount Path: `/data`

### Step 2: Attach to Both Services
1. Go to omega-bot → Settings → Volumes
2. Attach `omega-data` at `/data`
3. Go to omega-web → Settings → Volumes
4. Attach `omega-data` at `/data`

### Volume Structure
```
/data/
├── artifacts/     # HTML/SVG/Markdown files
├── uploads/       # User uploaded files
├── blog/          # Blog markdown files
└── documents/     # Collaborative documents
```

---

## Environment Variables Reference

### omega-bot (Discord Bot)

Required:
```bash
DISCORD_BOT_TOKEN=...
DISCORD_PUBLIC_KEY=...
DISCORD_APP_ID=...
OPENAI_API_KEY=...
NODE_ENV=production

# NEW: Point to web app
WEB_APP_URL=https://omega-web-production.up.railway.app
```

Database:
```bash
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
MONGO_URL=mongodb://...
POSTGRES_URL=postgresql://...
```

Optional services:
```bash
UNSANDBOX_API_KEY=...
GITHUB_TOKEN=...
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...
PUSHER_APP_ID=...
PUSHER_APP_KEY=...
PUSHER_APP_SECRET=...
PUSHER_CLUSTER=...
GIT_USER_NAME=...
GIT_USER_EMAIL=...
```

### omega-web (Next.js)

Required:
```bash
PORT=3000
NODE_ENV=production
```

Optional (if web needs DB access):
```bash
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
MONGO_URL=mongodb://...
POSTGRES_URL=postgresql://...
```

---

## Verification Steps

### After omega-bot Deploys

```bash
# Check Railway logs
railway logs

# Should see:
# ✅ Discord bot connected
# ✅ Bot is online as YourBot#1234
# ✅ Connected to X servers
```

**Test in Discord**:
```
@Omega hello
```

Bot should respond (no artifact server, pure Discord bot).

### After omega-web Deploys

```bash
# Get the web app URL from Railway dashboard
WEB_URL=https://omega-web-production.up.railway.app

# Test health endpoint
curl $WEB_URL/api/health

# Should return:
# {"status":"ok","timestamp":"...","service":"omega-web"}

# Test artifacts endpoint
curl $WEB_URL/api/artifacts

# Should return:
# {"success":true,"artifacts":[...]}
```

### Test Integration

1. **Create artifact via Discord bot**:
   ```
   @Omega create an HTML page with a red button
   ```

2. **Verify accessible via web**:
   ```bash
   curl https://omega-web.../api/artifacts
   # Should list the new artifact
   ```

3. **Upload file via Discord**:
   - Upload an image to Discord
   - Bot should process it
   - Verify: `curl https://omega-web.../api/uploads`

---

## Current Build Status

### Latest Commits
- `e8f6d7a` - feat: Add Dockerfile for Next.js web app
- `2bd648d` - fix: Copy turbo.json and use turbo to build
- `d1ca537` - fix: Update Dockerfile to include packages directory
- `7deba6b` - feat: Massive monorepo refactor

### omega-bot Build
```
Status: Building...
Stage: Running pnpm build --filter=bot
Expected: Turbo builds shared -> database -> agent -> bot
```

### omega-web Build
```
Status: Not started (service not created yet)
Ready: Yes (Dockerfile ready in apps/web/)
```

---

## Troubleshooting

### omega-bot won't start

**Check logs for**:
- Missing environment variables (DISCORD_BOT_TOKEN, OPENAI_API_KEY)
- Database connection errors
- Import errors (@repo/*)

**Fix**:
1. Verify all env vars are set in Railway
2. Check Discord Developer Portal - MESSAGE CONTENT INTENT enabled
3. Redeploy if needed

### omega-web won't start

**Check logs for**:
- Port binding errors
- Missing packages
- Build failures

**Fix**:
1. Verify PORT=3000 is set
2. Check Dockerfile built all packages
3. Verify Root Directory is `apps/web`

### Services can't access /data

**Fix**:
1. Go to Railway Dashboard
2. Create volume if it doesn't exist
3. Attach to BOTH services
4. Redeploy both services

---

## Cost Breakdown

**Railway Starter Plan**:
- omega-bot: 512 MB RAM = ~$5/month
- omega-web: 512 MB RAM = ~$5/month
- omega-data volume: 1GB = Free
- **Total: ~$10/month**

**Databases** (Railway plugins):
- MongoDB: Free tier
- PostgreSQL: Free tier
- LibSQL/Turso: Free tier (external)

**External Services**:
- OpenAI API: Pay as you go (~$5-15/month)
- Unsandbox: Free tier
- GitHub API: Free
- Twitter API: Free

**Grand Total: ~$20-30/month**

---

## Next Steps

1. ✅ omega-bot deploying with fixed Dockerfile
2. ⏳ Create omega-web service (manual step)
3. ⏳ Configure shared volume
4. ⏳ Test both services
5. ⏳ Update WEB_APP_URL in bot env vars

---

**Last Updated**: 2025-12-01 09:47 UTC
**Bot Status**: Deploying
**Web Status**: Ready to deploy (awaiting service creation)
