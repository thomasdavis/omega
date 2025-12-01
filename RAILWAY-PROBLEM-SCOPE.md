# Railway Deployment Problem Scope

## ✅ SOLUTION FOUND

**ROOT CAUSE:** Railway.toml existed with old single-service NIXPACKS configuration. Railway no longer fully supports railway.json for monorepo multi-service deployments.

**FIX:** Replace railway.toml with proper multi-service configuration that:
- Defines both services (omega-bot and omega)
- Sets `builder = "dockerfile"` to disable Nixpacks/Railpack auto-detection
- Configures service-specific root directories
- Defines shared persistent volume
- Sets port for web service

See `/railway.toml` for the complete working configuration.

**Key Insight:** Railway requires `railway.toml` (not railway.json) for monorepo deployments. The TOML format is the only way to:
- Define multiple services in one project
- Set root directory per service
- Configure shared volumes
- Explicitly select Dockerfile builder

---

## What We're Trying to Achieve

### Goal
Deploy a **monorepo Turborepo project** to Railway with **two separate services** that share a persistent volume:

1. **omega-bot** - Discord bot service (background worker, no port)
2. **omega** - Next.js web app service (public on port 3000)

### Architecture Requirements

```
Monorepo Structure:
omega/
├── apps/
│   ├── bot/           # Discord bot service
│   │   ├── Dockerfile
│   │   └── railway.json
│   └── web/           # Next.js web service
│       ├── Dockerfile
│       └── railway.json
├── packages/
│   ├── shared/        # @repo/shared workspace package
│   ├── database/      # @repo/database workspace package
│   └── agent/         # @repo/agent workspace package
├── railway.json       # Root config for omega-bot
├── pnpm-workspace.yaml
├── turbo.json
└── package.json (packageManager: "pnpm@9.0.0")
```

### Shared Resources
Both services must:
- Access the **same persistent volume** mounted at `/data`
- Build using **pnpm 9.0.0** (not npm)
- Build workspace dependencies first using **Turborepo**
- Use **Dockerfile builder** (explicit control)

```
Shared Volume (/data):
├── artifacts/     ← Bot writes, Web serves
├── uploads/       ← Bot writes, Web serves
├── blog/          ← Bot writes, Web serves
└── omega.db       ← Shared SQLite database
```

---

## Current Problems

### Problem 1: Railway Using railway.toml Instead of railway.json

**What's happening:**
Railway says the service is "configured in the railway.toml" but we don't have a railway.toml file - we have railway.json files.

**Expected behavior:**
Railway should use the `railway.json` configuration files:
- `/railway.json` for omega-bot service
- `/apps/web/railway.json` for omega service

**Current railway.json configurations:**

**Root `/railway.json` (omega-bot service):**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "dockerfile",
    "dockerfilePath": "apps/bot/Dockerfile"
  }
}
```

**`/apps/web/railway.json` (omega service):**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "dockerfile",
    "dockerfilePath": "Dockerfile"
  }
}
```

**Questions:**
- Why is Railway looking for railway.toml when we only have railway.json?
- Is railway.toml required in addition to railway.json?
- What's the relationship between railway.toml and railway.json?
- Which file takes precedence?

---

### Problem 2: Railpack/Nixpacks Auto-Detection Overriding Configuration

**What's happening:**
Despite explicitly configuring `"builder": "dockerfile"` in railway.json, Railway may still be using Railpack/Nixpacks auto-detection which:
- Detects npm instead of pnpm (despite pnpm-lock.yaml and packageManager field)
- Causes build errors: `npm error Unsupported URL Type "workspace:": workspace:*`

**Root cause:**
Monorepo uses pnpm workspace protocol (`workspace:*`) which npm doesn't understand.

**Expected behavior:**
Railway should:
1. Read railway.json configuration
2. Use Dockerfile builder as specified
3. Ignore auto-detection completely

**Questions:**
- How do we ensure Railway respects the `"builder": "dockerfile"` setting?
- Is there a way to disable Railpack/Nixpacks auto-detection entirely?
- Do we need additional configuration beyond railway.json?

---

### Problem 3: Service Root Directory Configuration

**Current setup:**
- **omega-bot service**: Root directory is repo root `/`
- **omega service**: Root directory should be `/apps/web`

**Why this matters:**
The web service Dockerfile uses relative paths:
```dockerfile
COPY ../../pnpm-workspace.yaml ../../package.json ...
```

These relative paths assume the Dockerfile is being built with context from `/apps/web`.

**Questions:**
- How do we set the root directory for each service in Railway?
- Is this configured in railway.json, railway.toml, or the Railway dashboard?
- Does the root directory affect how `dockerfilePath` is resolved?

---

### Problem 4: Dockerfile Path Resolution

**Current configuration:**

**omega-bot** (root railway.json):
```json
"dockerfilePath": "apps/bot/Dockerfile"
```
- Build context: repo root `/`
- Dockerfile location: `/apps/bot/Dockerfile`
- ✅ This should work - Dockerfile path is relative to repo root

**omega** (apps/web/railway.json):
```json
"dockerfilePath": "Dockerfile"
```
- Root directory: `/apps/web` (desired)
- Dockerfile location: `/apps/web/Dockerfile`
- ❓ Unclear if Railway resolves this correctly

**Questions:**
- Is `dockerfilePath` relative to root directory or repo root?
- For omega service, should we use:
  - `"dockerfilePath": "Dockerfile"` (relative to apps/web)?
  - `"dockerfilePath": "apps/web/Dockerfile"` (relative to repo root)?
- How does Railway determine the Docker build context?

---

### Problem 5: Turborepo Dependency Build Order

**Requirement:**
Workspace packages must be built BEFORE the apps:
1. Build `@repo/shared` (no dependencies)
2. Build `@repo/database` (depends on @repo/shared)
3. Build `@repo/agent` (depends on @repo/shared, @repo/database)
4. Build `apps/bot` or `apps/web` (depend on all packages)

**How this is configured:**

**turbo.json:**
```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    }
  }
}
```

The `^build` means "build dependencies first".

**How Dockerfiles handle this:**
```dockerfile
RUN pnpm build --filter=bot
```

This command:
1. Invokes Turborepo (via pnpm build)
2. Turborepo sees `"dependsOn": ["^build"]`
3. Automatically builds @repo/* packages first
4. Then builds the bot

**Why this matters:**
If Railway bypasses Turborepo and runs `pnpm --filter bot build` directly, it skips the dependency build step and causes:
```
error TS2307: Cannot find module '@repo/database'
```

**Questions:**
- How do we ensure Railway invokes Turborepo for the build?
- Is there a way to validate the build order in Railway logs?

---

### Problem 6: Shared Volume Configuration

**Requirement:**
Both services need the same persistent volume mounted at `/data`.

**How to configure this:**
Currently unclear - this may need to be done in:
- Railway dashboard
- railway.json
- railway.toml
- Dockerfile VOLUME directive

**Questions:**
- How do we configure a shared volume between two services in Railway?
- Do we create one volume and attach it to both services?
- Is this configured per-service or globally?
- What's the syntax in railway.json/railway.toml for volumes?

---

## What We Need to Know

### Configuration Questions

1. **railway.json vs railway.toml:**
   - What's the difference?
   - Which is required?
   - Which takes precedence?
   - Do we need both?

2. **Dockerfile builder enforcement:**
   - How to ensure Railway uses Dockerfile and ignores auto-detection?
   - Is `"builder": "dockerfile"` in railway.json sufficient?
   - Do we need additional flags or settings?

3. **Root directory per service:**
   - How to set root directory for each Railway service?
   - Where is this configured (dashboard, JSON, TOML)?
   - How does it affect path resolution?

4. **Shared volumes:**
   - How to configure a persistent volume shared between two services?
   - What's the syntax in railway.json or railway.toml?
   - Can volumes be attached to multiple services?

5. **Service-specific configuration:**
   - Does each service read its own railway.json?
   - How does Railway know which railway.json to use for each service?
   - Do we need separate railway.toml files per service?

### Build Process Questions

6. **Build context and paths:**
   - What's the Docker build context for each service?
   - How is `dockerfilePath` resolved (relative to what)?
   - How do relative COPY paths in Dockerfile work with Railway?

7. **Monorepo builds:**
   - Best practices for multi-service monorepo on Railway?
   - How to ensure Turborepo runs correctly?
   - How to share workspace packages between services?

8. **Package manager enforcement:**
   - How to guarantee Railway uses pnpm 9.0.0 (not npm)?
   - Is Dockerfile the only reliable way?
   - Can we configure this in railway.json/railway.toml?

---

## Desired End State

### Service 1: omega-bot

```
Service Name: omega-bot
Root Directory: / (repo root)
Builder: dockerfile
Dockerfile Path: apps/bot/Dockerfile
Build Command: (handled by Dockerfile)
Start Command: (handled by Dockerfile)
Volume: /data (shared with omega service)
Port: None (background worker)
```

### Service 2: omega

```
Service Name: omega
Root Directory: /apps/web
Builder: dockerfile
Dockerfile Path: Dockerfile (or apps/web/Dockerfile?)
Build Command: (handled by Dockerfile)
Start Command: (handled by Dockerfile)
Volume: /data (shared with omega-bot service)
Port: 3000 (public)
```

### Build Process (for both services)

1. Railway detects Dockerfile builder from railway.json
2. Railway runs `docker build` with correct context
3. Dockerfile installs pnpm 9.0.0
4. Dockerfile copies workspace files
5. Dockerfile runs `pnpm install --frozen-lockfile`
6. Dockerfile runs `pnpm build --filter=<service>` (invokes Turborepo)
7. Turborepo builds workspace packages first (^build dependency)
8. Turborepo builds the service
9. Production stage starts the service

---

## Files to Share with ChatGPT

When asking ChatGPT, share these files:
1. `/railway.json` (root config for omega-bot)
2. `/apps/web/railway.json` (config for omega)
3. `/apps/bot/Dockerfile`
4. `/apps/web/Dockerfile`
5. `/package.json` (shows packageManager: "pnpm@9.0.0")
6. `/turbo.json` (shows build dependency graph)
7. `/pnpm-workspace.yaml` (defines workspace)

---

## Specific Questions for ChatGPT

1. **Do we need railway.toml in addition to railway.json?** If so, what goes in each file?

2. **How do we set the root directory for each service?** (omega-bot at `/`, omega at `/apps/web`)

3. **What's the correct `dockerfilePath` syntax** for a service with root directory `/apps/web` and Dockerfile at `/apps/web/Dockerfile`?

4. **How do we configure a shared persistent volume** mounted at `/data` for both services?

5. **How do we ensure Railway uses the Dockerfile builder** and ignores Railpack/Nixpacks auto-detection?

6. **For a monorepo with two services, should we have:**
   - One railway.toml at root?
   - Two railway.toml files (one per service)?
   - No railway.toml (just railway.json)?

7. **What's the complete minimal configuration** for both services to achieve our desired end state?

---

## Current Error Messages

When Railway uses npm instead of pnpm:
```
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "workspace:": workspace:*
```

When Turborepo is bypassed:
```
error TS2307: Cannot find module '@repo/database' or its corresponding type declarations.
```

When railway.json has invalid fields:
```
Failed to parse your service config. Error: deploy.restartPolicyType: Invalid input
```

---

## Summary

We need Railway to:
1. ✅ Read railway.json configuration (not auto-detect)
2. ✅ Use Dockerfile builder for both services
3. ✅ Set correct root directory per service
4. ✅ Build with pnpm 9.0.0 (not npm)
5. ✅ Run Turborepo to build workspace dependencies first
6. ✅ Share a persistent volume at /data between services

**Primary blocker:** Railway mentions "configured in railway.toml" but we don't have that file, and we're unclear on:
- What configuration belongs in railway.toml vs railway.json
- How to enforce Dockerfile builder
- How to set per-service root directories
- How to configure shared volumes
