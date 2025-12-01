# Railway Service Separation Problem

## Current Issue

**Both Railway services (omega-bot and omega-web) are running the same code (Discord bot) instead of running different applications.**

### Symptoms

- omega-bot service: Running Discord bot ✅ (correct)
- omega-web service: Also running Discord bot ❌ (wrong - should be Next.js web app)
- Both services are listening for Discord messages
- omega-web logs show Discord bot startup messages instead of Next.js server

### Current Setup

**Two Railway Services in One Monorepo:**

1. **omega-bot** - Should run Discord Gateway bot
   - Root directory: Empty/blank (builds from repo root)
   - Config file: `/railway.toml` (at repo root)
   - Dockerfile: `apps/bot/Dockerfile`
   - Start command: `node dist/index.js`
   - Status: ✅ Building and running correctly

2. **omega-web** - Should run Next.js web app
   - Root directory: Currently unknown/not set
   - Config file: `apps/web/railway.toml` exists but may not be used
   - Dockerfile: `apps/web/Dockerfile`
   - Start command: Should be `pnpm start` for Next.js
   - Status: ❌ Running bot code instead of web app

### Root Cause

Railway is using the **same configuration (root railway.toml)** for **both services**, which points to the bot's Dockerfile:

**Current `/railway.toml`:**
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "apps/bot/Dockerfile"  # ← Both services use this!

[deploy]
startCommand = "node dist/index.js"     # ← Both services run this!
```

**Both services are reading this file**, so both build and run the Discord bot.

### What We Need

Each service should use its own separate configuration:

**omega-bot service should use:**
- Config: `/railway.toml` (at repo root)
- Dockerfile: `apps/bot/Dockerfile`
- Start: `node dist/index.js`
- Build context: Repo root (to access `packages/` and `apps/bot/`)

**omega-web service should use:**
- Config: `/apps/web/railway.toml` (service-specific)
- Dockerfile: `apps/web/Dockerfile`
- Start: `pnpm start` (Next.js)
- Build context: Repo root (to access `packages/` and `apps/web/`)

### File Structure

```
omega/
├── railway.toml                    # Config for omega-bot
│   └── Points to apps/bot/Dockerfile
├── apps/
│   ├── bot/
│   │   ├── railway.toml           # NOT currently used by omega-bot
│   │   ├── Dockerfile             # Bot Dockerfile
│   │   └── dist/index.js          # Bot entry point
│   └── web/
│       ├── railway.toml           # Should be used by omega-web
│       ├── Dockerfile             # Web Dockerfile
│       └── next.config.js         # Next.js app
└── packages/
    ├── shared/
    ├── database/
    └── agent/
```

### Dockerfile Build Context Requirement

**CRITICAL:** Both Dockerfiles need to build from **repo root** to access the monorepo workspace packages (`packages/`).

**Bot Dockerfile (apps/bot/Dockerfile):**
```dockerfile
# Needs access to repo root to copy:
COPY packages ./packages           # ← Workspace packages
COPY apps/bot ./apps/bot           # ← Bot code
```

**Web Dockerfile (apps/web/Dockerfile):**
```dockerfile
# Needs access to repo root to copy:
COPY packages ./packages           # ← Workspace packages
COPY apps/web ./apps/web           # ← Web app code
```

Both use pnpm workspaces and Turborepo, so they need the full monorepo context.

### Questions for ChatGPT

1. **How do we configure two Railway services in one monorepo to use different railway.toml files?**
   - omega-bot should use `/railway.toml`
   - omega-web should use `/apps/web/railway.toml`

2. **Do we need to set the "Root Directory" in Railway dashboard for each service?**
   - If yes, what should the root directories be?
   - omega-bot: Leave blank (repo root)?
   - omega-web: Set to `apps/web`?

3. **If we set root directory to `apps/web` for omega-web, how does Railway resolve the Dockerfile path?**
   - The Dockerfile is at `apps/web/Dockerfile`
   - But it needs to build from repo root (not `apps/web/`) to access `packages/`
   - What should `dockerfilePath` be in `apps/web/railway.toml`?

4. **Can Railway build from repo root but use a service-specific railway.toml?**
   - Build context: Repo root (for monorepo access)
   - Config file: Service-specific (`apps/web/railway.toml`)
   - Is this possible?

5. **Alternative: Should we use a single railway.toml with multiple service definitions?**
   - Can we define both services in one file?
   - Railway docs mention service-specific configs - what's the syntax?

### What's Already Working

✅ Docker builds successfully for bot (pnpm + Turborepo + workspace packages)
✅ omega-bot service builds and runs the Discord bot correctly
✅ Monorepo structure with shared packages works
✅ Build from repo root with access to `packages/` works

### What's Not Working

❌ omega-web service uses wrong config and runs bot instead of web app
❌ Service separation - both services use same railway.toml
❌ No clear way to tell Railway which config file each service should use

### Ideal Solution

Each service should:
1. Use its own railway.toml configuration file
2. Build from repo root (for monorepo workspace access)
3. Run its own specific application (bot vs web)
4. Share the same persistent volume at `/data`

### Additional Context

- Railway V2 TOML format is being used
- Both services are in the same Railway project
- Both services need access to the same persistent volume (`/data`)
- Turborepo handles build dependencies between packages
- pnpm workspaces manage package dependencies

### Current Config Files

**`/railway.toml` (root, used by omega-bot):**
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

**`/apps/web/railway.toml` (should be used by omega-web, but isn't):**
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "../../apps/web/Dockerfile"

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

**`/apps/bot/railway.toml` (exists but not used):**
```toml
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "node dist/index.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[mounts]]
mountPath = "/data"
```

### Expected Behavior

- omega-bot: Connects to Discord, listens for messages, responds with AI
- omega-web: Starts Next.js server on port 3000, serves web interface

### Actual Behavior

- omega-bot: ✅ Connects to Discord correctly
- omega-web: ❌ Also connects to Discord (running bot code)

---

## Summary

**We need Railway to use different railway.toml files for each service in a monorepo, while both services build from the repo root to access shared workspace packages.**

How do we configure this?
