# Railway omega-web Service Configuration Issue

## Project Context

**Monorepo Structure:**
- **Build system**: Turborepo 2.x + pnpm workspaces
- **Package manager**: pnpm 9.0.0
- **Node version**: 20.x (required by dependencies)

**Two Railway Services:**
1. **omega-bot** - Discord Gateway bot (Node.js, working ✅)
2. **omega-web** - Next.js 15 web application (not working ❌)

**Directory Structure:**
```
omega/
├── railway.toml                    # Root config (used by omega-bot)
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── apps/
│   ├── bot/
│   │   ├── Dockerfile              # Bot Docker build
│   │   └── src/                    # Discord bot code
│   └── web/
│       ├── railway.toml            # Web-specific config (NOT BEING READ)
│       ├── Dockerfile              # Next.js Docker build
│       └── app/                    # Next.js 15 app directory
└── packages/
    ├── shared/                     # Workspace package
    ├── database/                   # Workspace package
    └── agent/                      # Workspace package
```

## Current Status

### omega-bot (Working ✅)

**Railway Dashboard Settings:**
- Root Directory: `` (blank - repo root)

**Config File Used:** `/railway.toml`
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "apps/bot/Dockerfile"

[deploy]
startCommand = "node dist/index.js"
```

**Result:** Builds successfully, runs Discord bot ✅

### omega-web (NOT Working ❌)

**Railway Dashboard Settings:**
- Root Directory: `apps/web`

**Latest Build Logs:**
```
root directory set as 'apps/web'
skipping 'railway.toml' at 'apps/web/railway.toml' as it is not rooted at a valid path (root_dir=apps/web, fileOpts={directChildOfRepoRoot:true})
found 'railway.toml' at 'railway.toml'
...
load build definition from apps/bot/Dockerfile
Build Failed: failed to solve: failed to read dockerfile: open apps/bot/Dockerfile: no such file or directory
```

**Problem:** Railway is:
1. Skipping `apps/web/railway.toml` (says "not rooted at a valid path")
2. Falling back to root `/railway.toml`
3. Trying to build `apps/bot/Dockerfile` instead of `apps/web/Dockerfile`
4. Failing because bot Dockerfile doesn't exist in `apps/web` context

## Our railway.toml Files

**Root `/railway.toml`:**
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

**`/apps/web/railway.toml`:**
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

## Our Dockerfile (apps/web/Dockerfile)

```dockerfile
FROM node:20-alpine AS base

RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy from repo root (Railway Docker context is ALWAYS repo root)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json tsconfig.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile
RUN pnpm build --filter=web

# Production image
FROM node:20-alpine

RUN npm install -g pnpm@9.0.0
WORKDIR /app

COPY --from=base /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./
COPY --from=base /app/packages/shared/package.json ./packages/shared/
COPY --from=base /app/packages/database/package.json ./packages/database/
COPY --from=base /app/apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile --prod

COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/database/dist ./packages/database/dist
COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base /app/apps/web/next.config.js ./apps/web/

WORKDIR /app/apps/web
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
```

## What We've Tried

1. ❌ Setting Root Directory to `apps/web` → Railway skips `apps/web/railway.toml`, uses root config
2. ❌ Using `[service.*]` syntax in single TOML → Not supported by Railway
3. ❌ Relative paths `../../` in Dockerfile → Wrong, build context is repo root
4. ❌ `dockerfilePath = "Dockerfile"` in apps/web/railway.toml → Wrong, needs full path from repo root

## What We Know About Railway

Based on testing:
1. Each service reads **exactly ONE railway.toml** based on Root Directory setting
2. `dockerfilePath` is **always relative to repo root**, not Root Directory
3. Docker build context is **always repo root** (for monorepo workspace access)
4. There is **NO `[service.*]` multi-service syntax** in Railway TOML
5. Railway won't read `apps/web/railway.toml` when Root Directory is `apps/web` (fails "directChildOfRepoRoot" check)

## Questions for ChatGPT

1. **Why does Railway skip `apps/web/railway.toml` when Root Directory is set to `apps/web`?**
   - The error says "not rooted at a valid path (directChildOfRepoRoot:true)"
   - What does "directChildOfRepoRoot" mean?
   - How should we structure our config to satisfy this requirement?

2. **How do we configure omega-web to use its own Dockerfile while omega-bot uses a different one?**
   - Both services need to build from **repo root** context (for Turborepo + pnpm workspaces)
   - Both services need to use **DOCKERFILE builder** (not Railpack/Nixpacks)
   - Each service needs its own Dockerfile and startCommand

3. **What is the correct Railway configuration for a Turborepo + pnpm monorepo with multiple services?**
   - Should we use Root Directory settings at all?
   - Should we have separate railway.toml files or just one?
   - How do other monorepos solve this problem on Railway?

4. **Is there a way to override the railway.toml file Railway reads?**
   - Via environment variables?
   - Via Railway Dashboard settings?
   - Via a different file naming convention?

5. **Should we be using Railway's "Watch Paths" feature instead?**
   - Could this help separate the services?
   - Would this affect which railway.toml gets read?

## Our Goal

We want:
- **omega-bot**: Uses `/railway.toml`, builds `apps/bot/Dockerfile`, runs `node dist/index.js`
- **omega-web**: Uses separate config, builds `apps/web/Dockerfile`, runs `pnpm start` (Next.js)
- Both services share the same persistent volume at `/data`
- Both services build from repo root context (for monorepo workspace access)

## Additional Context

- Railway.json is deprecated, so we can't use that
- We previously had both services using Railpack, which caused pnpm workspace errors
- omega-bot is now working perfectly with DOCKERFILE builder
- We just need omega-web to use its own Dockerfile instead of falling back to root railway.toml

---

**Please provide the correct Railway configuration approach for our Turborepo + Next.js monorepo with two separate services.**
