# Build Fixes Applied

## Issue: Railway Docker Build Failures

### Problems Encountered

1. **Missing packages directory** → Fixed in commit `d1ca537`
2. **Missing turbo.json** → Fixed in commit `2bd648d`
3. **import.meta not supported** → Fixed in commit `a1dd78f`
4. **Missing tsconfig.json** → Fixed in commit `4d75a8c`

---

## Fix 1: Added packages/ directory to Dockerfile

**Error:**
```
Cannot find module '@repo/database'
Cannot find module '@repo/shared'
Cannot find module '@repo/agent'
```

**Solution:**
```dockerfile
COPY packages ./packages  # Added this line
COPY apps/bot ./apps/bot
```

**Commit:** `d1ca537`

---

## Fix 2: Added turbo.json to build context

**Error:**
```
Could not find turbo.json or turbo.jsonc
```

**Solution:**
```dockerfile
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
```

**Commit:** `2bd648d`

---

## Fix 3: Fixed import.meta.url support

**Error:**
```
error TS1343: The 'import.meta' meta-property is only allowed
when the '--module' option is 'es2020', 'es2022', 'esnext', 'system',
'node16', 'node18', 'node20', or 'nodenext'.
```

**File:** `packages/shared/src/utils/storage.ts:11`
```typescript
const __filename = fileURLToPath(import.meta.url);
```

**Solution:**
Explicitly set module in `packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022"
  }
}
```

**Commit:** `a1dd78f`

---

## Fix 4: Added root tsconfig.json to Docker context

**Error:**
```
error TS5083: Cannot read file '/app/tsconfig.json'
```

**Reason:**
Shared package extends root tsconfig with `"extends": "../../tsconfig.json"`

**Solution:**
```dockerfile
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json tsconfig.json ./
```

Applied to both:
- `Dockerfile` (bot) - commit `4d75a8c`
- `apps/web/Dockerfile` (web) - commit `8e6bdcc`

---

## Current Dockerfiles

### Bot Dockerfile (`/Dockerfile`)

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.0.0
WORKDIR /app

# Copy ALL necessary config files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json tsconfig.json ./

# Copy packages and bot
COPY packages ./packages
COPY apps/bot ./apps/bot

# Install and build
RUN pnpm install --frozen-lockfile
RUN pnpm build --filter=bot

# Production stage...
```

**What it builds:**
1. @repo/shared
2. @repo/database
3. @repo/agent
4. bot

**Turbo handles dependency order automatically.**

### Web Dockerfile (`/apps/web/Dockerfile`)

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.0.0
WORKDIR /app

# Copy ALL necessary config files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json tsconfig.json ./

# Copy packages and web app
COPY packages ./packages
COPY apps/web ./apps/web

# Install and build
RUN pnpm install --frozen-lockfile
RUN pnpm build --filter=web

# Production stage...
```

**What it builds:**
1. @repo/shared
2. @repo/database
3. web

**Turbo handles dependency order automatically.**

---

## Current Build Status

### omega-bot (Discord Bot)
```
Service: omega-bot
Branch: main
Commit: 8e6bdcc (latest)
Status: Building...
Expected: Should succeed with all fixes applied
```

### omega-web (Next.js)
```
Service: Not yet created
Ready: Yes, Dockerfile complete
Waiting: Manual service creation in Railway dashboard
```

---

## Verification Steps

### When bot build succeeds:

```bash
# Check Railway logs
railway logs

# Should see:
✅ Tasks: X successful, X total
✅ Bot is online as YourBot#1234
✅ Connected to X servers
```

### Test in Discord:
```
@Omega hello
```

Bot should respond (no artifact server running - that's intentional).

---

## Creating omega-web Service

Since Railway CLI doesn't support non-interactive service creation, you need to use the dashboard:

1. Go to Railway dashboard
2. Click "+ New" → "Empty Service"
3. Name: `omega-web`
4. Connect to GitHub: `thomasdavis/omega` (main branch)
5. Root Directory: `apps/web`
6. Environment Variables:
   ```
   PORT=3000
   NODE_ENV=production
   ```
7. Deploy

Railway will automatically detect `apps/web/Dockerfile` and build.

---

## Files Modified

### Latest 5 commits:
1. `8e6bdcc` - fix: Copy tsconfig.json to web Dockerfile
2. `4d75a8c` - fix: Copy tsconfig.json to Docker build context (bot)
3. `a1dd78f` - fix: Explicitly set module NodeNext in shared package
4. `278257a` - docs: Add deployment status and verification guide
5. `e8f6d7a` - feat: Add Dockerfile for Next.js web app

### All fixes applied:
- ✅ Dockerfile copies packages/
- ✅ Dockerfile copies turbo.json
- ✅ Dockerfile copies tsconfig.json
- ✅ shared package tsconfig has explicit module settings
- ✅ Turbo builds packages in dependency order
- ✅ Both bot and web Dockerfiles ready

---

## What's Next

1. **Wait for omega-bot build** - should complete successfully now
2. **Verify bot works** - test in Discord
3. **Create omega-web service** - manual step in Railway dashboard
4. **Configure shared volume** - attach `/data` to both services
5. **Set WEB_APP_URL** - point bot to web service

---

**Build Status**: All fixes committed and pushed ✅
**Next Build**: Should succeed (all issues resolved)
**Ready for**: Service creation and testing
