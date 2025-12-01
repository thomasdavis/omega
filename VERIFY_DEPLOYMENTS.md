# Verify Both Services Are Deployed

## Current Setup (Based on User Configuration)

### Service 1: omega-bot
```
Name: omega-bot
Root Directory: apps/bot (or repo root)
Uses: /Dockerfile
Purpose: Discord bot
Port: None (background worker)
```

### Service 2: omega (Web App)
```
Name: omega
Root Directory: apps/web (USER SET THIS)
Uses: apps/web/Dockerfile
Purpose: Next.js web app
Port: 3000
```

---

## Verification Steps

### Check Railway Dashboard

Go to: https://railway.app/project/YOUR_PROJECT_ID

You should see **TWO services**:

1. ✅ **omega-bot** - Should show "Deployed" with no port
2. ✅ **omega** - Should show "Deployed" with port 3000

---

## Test omega-bot (Discord Bot)

### Via Discord
```
@Omega hello
```

Should respond with AI-generated message.

### Via Railway Dashboard
Click on `omega-bot` → Deployments → View logs

Should see:
```
✅ Bot is online as YourBot#1234
✅ Connected to X servers
```

---

## Test omega (Web App)

### Via Railway Dashboard
Click on `omega` → Settings → Domains

Copy the Railway-provided URL (e.g., `omega-production.up.railway.app`)

### Via Curl

```bash
# Set the URL (get from Railway dashboard)
WEB_URL="https://omega-production.up.railway.app"

# Test health endpoint
curl $WEB_URL/api/health

# Expected response:
# {"status":"ok","timestamp":"...","service":"omega-web"}

# Test artifacts endpoint
curl $WEB_URL/api/artifacts

# Expected response:
# {"success":true,"artifacts":[...]}

# Test uploads endpoint
curl $WEB_URL/api/uploads

# Expected response:
# {"success":true,"uploads":[...],"count":0}

# Test documents endpoint
curl $WEB_URL/api/documents

# Expected response:
# {"documents":[...],"pagination":{...}}
```

### Via Browser

Open: `https://omega-production.up.railway.app`

Should see:
- Home page with links to Artifacts, Documents, Blog
- Clean Next.js interface

---

## Integration Test

### 1. Create artifact via Discord bot

In Discord:
```
@Omega create an HTML page with a blue button that says "Click Me"
```

Bot should:
- Generate the HTML
- Save to `/data/artifacts/`
- Return a URL pointing to the web service

### 2. Verify artifact accessible via web

```bash
curl $WEB_URL/api/artifacts
```

Should list the newly created artifact.

### 3. View artifact in browser

Open the URL the bot provided, should render the HTML page.

---

## Check Both Services Share /data Volume

### Via Railway Dashboard

1. **Check omega-bot volumes:**
   - Go to omega-bot → Settings → Volumes
   - Should see volume mounted at `/data`

2. **Check omega volumes:**
   - Go to omega → Settings → Volumes
   - Should see **SAME volume** mounted at `/data`

If not shared:
1. Create a volume named `omega-data`
2. Attach to both services at mount path `/data`
3. Redeploy both services

---

## Environment Variables Check

### omega-bot should have:

```bash
# Required
DISCORD_BOT_TOKEN=...
OPENAI_API_KEY=...
NODE_ENV=production

# Database
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
MONGO_URL=...
POSTGRES_URL=...

# IMPORTANT: Point to web service
WEB_APP_URL=https://omega-production.up.railway.app
```

### omega should have:

```bash
# Required
PORT=3000
NODE_ENV=production

# Optional (if web needs DB access)
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
MONGO_URL=...
POSTGRES_URL=...
```

---

## Expected Behavior

### Bot Creates Files → Web Serves Them

```
Discord Bot (@Omega create...)
    ↓
Saves to /data/artifacts/abc-123.html
    ↓
Returns URL: https://omega.../api/artifacts/abc-123.html
    ↓
Web App serves file from /data/artifacts/
    ↓
User opens URL → sees artifact
```

### Shared Volume Flow

```
/data/ (Railway Volume)
├── artifacts/
│   ├── abc-123.html ← Bot writes
│   └── def-456.svg  ← Bot writes
├── uploads/
│   └── image.png    ← Bot writes
└── blog/
    └── post.md      ← Bot writes

Both services read/write from same /data volume
```

---

## Troubleshooting

### omega-bot deployed but web app isn't

**Check:**
- Is `omega` service showing in Railway dashboard?
- Is Root Directory set to `apps/web`?
- Does the build log show it found `apps/web/Dockerfile`?

**Fix:**
- Redeploy omega service
- Check build logs for errors

### Web app deployed but artifacts not accessible

**Check:**
- Do both services have the same volume attached?
- Mount path is `/data` for both?

**Fix:**
- Attach volume to both services
- Redeploy both

### Bot can't reach web app

**Check:**
- Is `WEB_APP_URL` set in omega-bot env vars?
- Does it point to the correct omega service URL?

**Fix:**
- Set `WEB_APP_URL=https://your-omega-url.railway.app`
- Redeploy bot

---

## Quick Status Check Commands

```bash
# Check if services are running (from Railway dashboard)
# Look for green "Deployed" status on both:
# - omega-bot
# - omega

# Test web app quickly
curl https://YOUR-OMEGA-URL/api/health

# If you get a response, web app is working!
```

---

## Success Criteria

- ✅ omega-bot shows "Deployed" in Railway
- ✅ omega shows "Deployed" in Railway
- ✅ Bot responds in Discord
- ✅ Web app responds to curl health check
- ✅ Both services have same volume at /data
- ✅ Creating artifact in Discord makes it accessible via web URL

---

**Current Status:**
- All Docker fixes committed ✅
- Both services should be building ✅
- Waiting for deployments to complete ⏳

Check Railway dashboard to see deployment progress!
