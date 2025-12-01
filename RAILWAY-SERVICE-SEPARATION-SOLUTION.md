# Railway Service Separation - CORRECT Solution

## The Problem

Both omega-bot and omega-web were running the same Discord bot code because Railway was reading the same root railway.toml file.

## What We Learned

**ChatGPT's suggestion was INCORRECT** - Railway's railway.toml does NOT support `[service.*]` blocks for multi-service configuration.

Railway's actual behavior:
1. Railway reads ONE railway.toml per service
2. The railway.toml location is determined by the "Root Directory" setting in the Dashboard
3. Multi-service monorepos require **Dashboard configuration**, not TOML syntax

## The CORRECT Solution

### For omega-bot (Root Directory: blank/empty)

**Location**: `/railway.toml` (repo root)

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

### For omega-web (Root Directory: "apps/web")

**Location**: `/apps/web/railway.toml`

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"  # Relative to apps/web

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

## Railway Dashboard Configuration Required

### omega-bot Service Settings

1. Go to Railway Dashboard → omega-bot service
2. **Settings** → **Service** → **Root Directory**: Leave BLANK (repo root)
3. Railway will read `/railway.toml`
4. Build from repo root, use `apps/bot/Dockerfile`

### omega-web Service Settings

1. Go to Railway Dashboard → omega-web service
2. **Settings** → **Service** → **Root Directory**: Set to `apps/web`
3. Railway will read `/apps/web/railway.toml`
4. **CRITICAL**: The Dockerfile path in railway.toml must be relative to the root directory
   - Since root dir = `apps/web`, the Dockerfile is at `apps/web/Dockerfile`
   - In railway.toml, specify `dockerfilePath = "Dockerfile"` (NOT `apps/web/Dockerfile`)

### Dockerfile Build Context Issue

**PROBLEM**: Both Dockerfiles need to build from repo root to access workspace packages, but Railway's root directory setting changes the build context.

**WORKAROUND OPTIONS**:

1. **Option A - Modify Dockerfiles**: Update COPY paths to work from `apps/web` context
2. **Option B - Keep Root Dir Blank**: Set both services' root dir to blank and use full paths in dockerfilePath
3. **Option C - Use railway.json**: Use railway.json override (deprecated but might work)

## Manual Steps Required

Since Railway Dashboard must be configured manually:

1. **omega-bot**:
   - Root Directory: `` (blank)
   - Will use `/railway.toml`
   - ✅ Already working

2. **omega-web**:
   - Root Directory: Try `apps/web` first
   - If Dockerfile COPY fails, revert to blank and use full path
   - Will use `/apps/web/railway.toml`

## Testing

After configuration:

```bash
# Check omega-bot builds with Dockerfile
railway logs --service omega-bot | grep -i "dockerfile"

# Check omega-web builds with Dockerfile
railway logs --service omega-web | grep -i "dockerfile"

# Verify omega-web runs Next.js, not Discord bot
railway logs --service omega-web | grep -i "next\|discord"
```

Expected results:
- omega-bot: `Connecting to Discord...` ✅
- omega-web: `ready - started server on 0.0.0.0:3000` ✅

## Why ChatGPT Was Wrong

ChatGPT suggested using `[service.NAME]` syntax in a single railway.toml, which is NOT supported by Railway. This syntax does not exist in Railway's TOML specification.

Railway's actual multi-service approach:
- Each service has its own Root Directory setting in the Dashboard
- Each service reads a railway.toml relative to its root directory
- No single file can define multiple services

## Conclusion

Railway monorepo service separation requires:
1. ✅ One railway.toml per service
2. ✅ Root Directory configured in Dashboard for each service
3. ✅ Dockerfile paths relative to the root directory
4. ❌ NOT `[service.*]` blocks (doesn't exist)
