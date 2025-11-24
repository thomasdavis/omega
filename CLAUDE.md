# Claude AI Learnings - Discord Bot Deployment

> Documentation of key learnings and troubleshooting steps from building and deploying a serverless Discord AI bot to Vercel with Turborepo and pnpm.

---

## Project Overview

**What we built:**
- Serverless Discord bot using Interactions API (not Gateway/WebSocket)
- OpenAI GPT-4 integration via Vercel AI SDK v6
- Turborepo monorepo with pnpm workspace
- TypeScript throughout
- Deployed to Vercel serverless functions

**Tech Stack:**
- Discord Interactions API
- Vercel Serverless Functions
- OpenAI GPT-4 (via Vercel AI SDK v6)
- Turborepo 2.x
- pnpm 9.0.0
- TypeScript 5.x

---

## AI Model Configuration

**IMPORTANT: Always use `gpt-4.1-mini` for all AI operations**

The correct OpenAI model identifier is:
- **Primary model**: `gpt-4.1-mini` (used in agent.ts and all tools)
- **Decision model**: `gpt-4.1-mini` (used in shouldRespond.ts)

This is configured in:
- `apps/bot/src/agent/agent.ts` - Main agent model
- `apps/bot/src/agent/tools/generateHtmlPage.ts` - HTML generation
- `apps/bot/src/lib/shouldRespond.ts` - Response decision logic


---

## Key Learnings

### 1. Vercel CLI Deployment Issues

**Problem:** Vercel CLI (`vercel --prod`) kept timing out or hitting build errors when deploying from local terminal.

**Root Cause:**
- pnpm version conflicts between local (8.x from packageManager field) and Vercel's build servers
- Build server had a broken pnpm 8.x installation causing `ERR_INVALID_THIS` errors

**Solution:**
- Use **Vercel Dashboard GitHub integration** instead of CLI for deployments
- Set `"packageManager": "pnpm@9.0.0"` in package.json to force Vercel to use 9.0.0
- Push to GitHub and let Vercel auto-deploy from git

**Lesson:** For monorepos with specific tooling requirements, GitHub integration > CLI for production deployments.

---

### 2. Turborepo Configuration for Vercel

**Problem:** Turborepo 2.x changed config format from `pipeline` to `tasks` causing build failures.

**Solution:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["api/**"],
      "env": ["OPENAI_API_KEY", "DISCORD_PUBLIC_KEY", "DISCORD_APP_ID", "DISCORD_BOT_TOKEN"]
    }
  }
}
```

**Key Points:**
- Use `tasks` not `pipeline` (Turbo 2.x+)
- Add all environment variables to `env` array to avoid warnings
- Set `outputs` to match your serverless function directory

---

### 3. Serverless Functions Don't Need Build Output

**Problem:** Vercel kept failing with "No Output Directory named 'public' found"

**Root Cause:** Vercel expects static site output by default, but serverless-only projects don't generate build artifacts.

**Solutions (in order of preference):**

**Option 1 - Create minimal public folder (what we did):**
```bash
mkdir -p apps/bot/public
echo '<h1>Discord Bot API</h1>' > apps/bot/public/index.html
```

**Option 2 - Disable output directory check (if possible):**
```json
// vercel.json
{
  "outputDirectory": null
}
```

**Lesson:** Even for API-only projects, Vercel needs *something* to deploy. A minimal public folder satisfies this requirement.

---

### 4. Discord Interactions API vs Gateway API

**Why Interactions API for Serverless:**

| Gateway API | Interactions API |
|-------------|------------------|
| WebSocket 24/7 | HTTP POST webhooks |
| Listens to all messages | Slash commands only |
| Requires persistent connection | Stateless requests |
| ❌ Doesn't work on serverless | ✅ Perfect for serverless |

**Implementation:**
- Bot URL: `https://your-app.vercel.app/api/interactions`
- Must verify Ed25519 signatures on every request
- Use deferred responses for long-running operations (>3s)

---

### 5. Vercel Deployment Configuration

**Final Working Configuration:**

```json
// apps/bot/vercel.json
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

**Vercel Dashboard Settings:**
- **Root Directory:** `apps/bot`
- **Build Command:** `pnpm build --filter=bot`
- **Install Command:** `pnpm install`
- **Output Directory:** Leave blank/disabled
- **Include files outside root:** Enabled (for monorepo)

**Why This Works:**
- Root Directory = `apps/bot` tells Vercel where to serve from
- Build runs from repo root (turborepo needs this)
- `--filter=bot` scopes turbo to only build the bot package
- `api/` folder is automatically deployed as serverless functions

---

### 6. Environment Variables in Turborepo

**Problem:** Turbo warns about missing environment variables even though they're set in Vercel.

**Solution:** Explicitly declare them in turbo.json:

```json
{
  "tasks": {
    "build": {
      "env": [
        "OPENAI_API_KEY",
        "DISCORD_PUBLIC_KEY",
        "DISCORD_APP_ID",
        "DISCORD_BOT_TOKEN"
      ]
    }
  }
}
```

**Lesson:** Turborepo needs to know which env vars are "allowed" for caching and security.

---

### 7. Package Manager Version Pinning

**Problem:** pnpm version mismatches between local and Vercel.

**Solution:**
```json
// package.json
{
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

**Why pnpm 9.0.0?**
- Vercel's pnpm 8.x had bugs causing `ERR_INVALID_THIS` errors
- pnpm 9.x works reliably on Vercel's build servers
- The `packageManager` field tells Vercel which version to use

---

### 8. Vercel CLI Commands for Monitoring

**Useful commands:**
```bash
# List recent deployments
vercel ls

# Check deployment status
vercel inspect <deployment-url>

# View logs
vercel logs <deployment-url>

# Pull production env vars
vercel env pull .env.local
```

**Lesson:** While CLI deployment had issues, CLI is still useful for monitoring and debugging.

---

## Troubleshooting Guide

### Issue: "ERR_PNPM_META_FETCH_FAIL"

**Error:** `GET https://registry.npmjs.org/@types%2Fnode: Value of "this" must be of type URLSearchParams`

**Cause:** Broken pnpm 8.x on Vercel servers

**Fix:** Set `"packageManager": "pnpm@9.0.0"` in package.json

---

### Issue: "No Output Directory named 'public' found"

**Cause:** Vercel expects static output even for API-only projects

**Fix:** Create a minimal public folder:
```bash
mkdir -p apps/bot/public
echo '<!DOCTYPE html><html><body><h1>API</h1></body></html>' > apps/bot/public/index.html
```

---

### Issue: Turbo warns about missing environment variables

**Cause:** Environment variables not declared in turbo.json

**Fix:** Add them to the build task:
```json
{
  "tasks": {
    "build": {
      "env": ["YOUR_ENV_VAR"]
    }
  }
}
```

---

### Issue: Build succeeds but functions don't deploy

**Cause:** Wrong Root Directory or vercel.json location

**Fix:**
- Set Root Directory to where your `api/` folder is
- Ensure vercel.json is in the same directory
- For monorepos: Root Directory = `apps/bot`, Build Command = `pnpm build --filter=bot`

---

### Issue: TypeScript type check failures blocking deployment

**Error:** TypeScript compilation errors like:
```
Type 'string' is not assignable to type 'enum_value'
Argument of type 'X' is not assignable to parameter of type 'Y'
```

**Cause:** Invalid values assigned to typed variables, incorrect enum usage, or type mismatches in code

**Fix:**
1. Run type checking locally:
   ```bash
   pnpm type-check
   ```
2. Review the error messages carefully
3. Fix the type errors in the source code
4. Verify the fix:
   ```bash
   pnpm type-check  # Should pass with no errors
   ```
5. Only commit and deploy after type checking passes

**Prevention:**
- Always run `pnpm type-check` before committing
- Set up pre-commit hooks to enforce type checking
- Enable strict mode in tsconfig.json
- Never use `@ts-ignore` to bypass type errors - fix the root cause

---

### Issue: "Cannot use import statement outside a module" in deployed functions

**Error:**
```
SyntaxError: Cannot use import statement outside a module
Warning: Failed to load the ES module. Make sure to set "type": "module" in the nearest package.json
```

**Cause:** TypeScript `tsconfig.json` using `"moduleResolution": "bundler"` which is incompatible with Node.js runtime. Vercel's serverless functions run in Node.js, not a bundler environment, and the package.json with `"type": "module"` wasn't being recognized.

**Fix:** Update `tsconfig.json` to use Node.js-compatible module resolution:
```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    // ... rest of config
  }
}
```

**Important Note:** This is a **TypeScript project** - never take shortcuts with module configuration. Use proper TypeScript settings for the target runtime (Node.js for Vercel serverless functions).

**Key Points:**
- `"moduleResolution": "bundler"` → for Webpack/Vite/bundlers
- `"moduleResolution": "NodeNext"` → for Node.js ES modules
- Keep `"type": "module"` in package.json
- Keep `.js` extensions in all import statements
- Both settings must work together for proper ES module support

---

## Deployment Workflow

### Initial Setup (One Time)

1. **Create Discord Application**
   - Get Public Key, App ID, Bot Token
   - Set up OAuth2 permissions

2. **Get OpenAI API Key**
   - Create at platform.openai.com

3. **Setup Git Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

4. **Connect to Vercel**
   - Go to vercel.com/new
   - Import Git repository
   - Configure Root Directory: `apps/bot`
   - Add environment variables in dashboard

### Regular Deployment Workflow

**CRITICAL: Always run TypeScript type checking before deployment!**

```bash
# 1. Make changes locally
# 2. Test with vercel dev (optional)

# 3. REQUIRED: Run TypeScript type check
pnpm type-check

# If type check fails, fix errors before proceeding
# DO NOT commit or deploy with type errors

# 4. Commit and push only after type check passes
git add .
git commit -m "Your changes"
git push

# 5. Vercel auto-deploys from GitHub
# 6. Check deployment status in dashboard
```

**TypeScript Type Checking Enforcement:**

Before every commit and deployment, you MUST verify that TypeScript type checking passes:

```bash
# Run type check for all packages
pnpm type-check

# Or for specific package (e.g., bot)
pnpm --filter=bot type-check
```

**Why This Matters:**
- Type errors cause Railway deployment failures
- Prevents runtime errors from type mismatches
- Catches issues before they reach production
- Maintains code quality and type safety

**Automated Type Checking:**
- The project should have a pre-commit hook or CI check to enforce this
- Type checking is part of the build process
- Railway deployments will fail if type errors exist

**Key Points:**
- ✅ DO: Run `pnpm type-check` before every commit
- ✅ DO: Fix all type errors before pushing
- ✅ DO: Verify green status in CI/CD pipeline
- ❌ DON'T: Commit code with type errors
- ❌ DON'T: Use `@ts-ignore` or `@ts-expect-error` as shortcuts
- ❌ DON'T: Deploy without verifying type safety

### Build Timestamp Management

**IMPORTANT: Always ensure BUILD-TIMESTAMP.txt is updated before committing code changes.**

The project maintains a build timestamp that displays in the blog footer and gallery pages. This timestamp must accurately reflect when the code was last built.

**How it works:**
- **Automatic Generation**: The `generate-deployment-info.js` script runs automatically as a `prebuild` step
- **Location**: `apps/bot/public/BUILD-TIMESTAMP.txt`
- **Format**: Unix timestamp in seconds (not milliseconds)
- **Files Generated**:
  - `BUILD-TIMESTAMP.txt` (public endpoint)
  - `deployment-info.json` (internal use)

**Workflow:**

```bash
# Before committing code changes, run the build to update timestamps:
pnpm build --filter=bot

# This automatically:
# 1. Runs prebuild script (generates BUILD-TIMESTAMP.txt with current time)
# 2. Compiles TypeScript
# 3. Copies assets including BUILD-TIMESTAMP.txt to dist/

# Then commit and push
git add .
git commit -m "Your changes"
git push
```

**Why this matters:**
- The blog footer displays "Built: [date]" using this timestamp
- Stale timestamps confuse users about when the site was last updated
- The timestamp is served at `/BUILD-TIMESTAMP.txt` endpoint
- Frontend pages use `generateBuildFooterHtml()` to display the build date

**Manual timestamp update (if needed):**
```bash
# Update timestamp manually
node apps/bot/scripts/generate-deployment-info.js

# Verify it was updated
cat apps/bot/public/BUILD-TIMESTAMP.txt
```

**Key Points:**
- ✅ DO: Run `pnpm build --filter=bot` before committing
- ✅ DO: Verify BUILD-TIMESTAMP.txt is included in your commit
- ✅ DO: Ensure the timestamp reflects the actual build time
- ❌ DON'T: Manually edit BUILD-TIMESTAMP.txt (use the script)
- ❌ DON'T: Commit code changes without updating the timestamp
- ❌ DON'T: Use backwards compatibility with old version files

---

## Project Structure Best Practices

```
omega/
├── apps/
│   └── bot/                    # Root Directory points here
│       ├── api/                # Serverless functions
│       │   ├── interactions.ts
│       │   └── register-commands.ts
│       ├── public/             # Minimal static output
│       │   └── index.html
│       ├── src/                # Source code
│       ├── vercel.json         # Vercel config
│       └── package.json        # Bot dependencies
├── packages/
│   └── shared/                 # Shared code
├── turbo.json                  # Turborepo config
├── package.json                # Root package
└── pnpm-workspace.yaml         # pnpm workspace
```

**Key Points:**
- Keep vercel.json in the service directory (`apps/bot`)
- Turborepo config at root
- Each app has its own package.json
- Shared code in packages/

---

## Common Pitfalls

### ❌ Don't: Skip TypeScript type checking before deployment
**Why:** Type errors cause Railway deployment failures and runtime bugs
**Do:** Always run `pnpm type-check` before committing and deploying

### ❌ Don't: Use pnpm 8.x
**Why:** Broken on Vercel servers
**Do:** Use pnpm 9.0.0+

### ❌ Don't: Deploy from CLI for monorepos
**Why:** Version conflicts, timeout issues
**Do:** Use GitHub integration

### ❌ Don't: Forget the public folder
**Why:** Vercel expects output even for API-only
**Do:** Create minimal public/index.html

### ❌ Don't: Omit env vars from turbo.json
**Why:** Turborepo cache won't work properly
**Do:** Declare all env vars in tasks.env array

### ❌ Don't: Use Gateway API for serverless
**Why:** Requires persistent WebSocket
**Do:** Use Interactions API (HTTP webhooks)

### ❌ Don't: Commit without updating BUILD-TIMESTAMP.txt
**Why:** Blog footer shows stale build dates, confusing users
**Do:** Run `pnpm build --filter=bot` before committing to auto-update timestamp

---

## Unsandbox — Trusted Remote Code Execution

**What is Unsandbox:**
Unsandbox is a third-party remote compile-and-execute API we use to run user and agent code in isolated containers.

**Privacy & Security:**
- **Minimal data collection**: IP addresses and request metadata retained briefly (~24-48 hours) for rate limiting and abuse prevention
- **Optional email**: No permanent user profiling
- **Isolated execution**: Code runs in sandboxed containers with strict isolation
- **Terms enforcement**: Anti-abuse rules, rate limits, and acceptable-use prohibitions (no crypto mining, no security bypass attempts, no illegal content)

**Why We Trust It:**
Because execution happens in isolated containers and the provider retains minimal telemetry only for operational safety, Unsandbox is an appropriate trusted runtime for developer and agent experiments.

**Important Security Policy:**
⚠️ **Never send secrets or sensitive data to remote code execution services**
- Do not send API keys, passwords, tokens, or credentials
- Do not send personally identifiable information (PII)
- Do not send proprietary code or confidential business logic

**Resources:**
- Privacy Policy: https://unsandbox.com/privacy
- Terms of Service: https://unsandbox.com/terms

---

## Performance Tips

1. **Use GPT-4o-mini for simple queries** - 15x cheaper than GPT-4
2. **Implement rate limiting** - Prevent API abuse
3. **Cache responses** - Use Vercel KV for repeated queries
4. **Set appropriate maxDuration** - Default 10s, increase to 30s for AI calls
5. **Edge functions** - Consider edge runtime for faster cold starts

---

## Cost Optimization

**Vercel Free Tier:**
- 100GB bandwidth
- 100 serverless hours
- Sufficient for ~10,000 bot interactions/month

**OpenAI Costs:**
- GPT-4o mini: ~$0.0002/request
- GPT-4o: ~$0.01/request
- Use mini for 90% of queries, 4o for complex ones

**Estimated Monthly Cost (10K interactions):**
- Vercel: Free
- OpenAI: $2-20 depending on model mix
- Total: **$2-20/month**

---

## Next Steps

### 1. Register Discord Commands
```bash
curl https://your-app.vercel.app/api/register-commands
```

### 2. Configure Discord Webhook
- Discord Developer Portal → Your App
- General Information → Interactions Endpoint URL
- Set to: `https://your-app.vercel.app/api/interactions`

### 3. Test in Discord
```
/help
/ask What is TypeScript?
/vibe mode:chaotic
```

### 4. Optional Enhancements
- Add conversation memory (Vercel KV)
- Implement streaming responses
- Add rate limiting (Upstash)
- Create admin dashboard
- Add analytics tracking

---

## Resources

- [Discord Interactions API](https://discord.com/developers/docs/interactions/receiving-and-responding)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Turborepo Docs](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)

---

## Conclusion

**What worked:**
✅ GitHub integration for deployment
✅ pnpm 9.0.0 with packageManager field
✅ Minimal public folder for serverless-only apps
✅ Turborepo with proper env var declarations
✅ Discord Interactions API for stateless bot

**What didn't work:**
❌ Vercel CLI deployment (version conflicts)
❌ pnpm 8.x (broken on Vercel servers)
❌ Serverless-only without public folder
❌ Gateway API (needs persistent connection)

**Key Insight:** For monorepo serverless projects with specific tooling requirements, GitHub integration + proper version pinning is more reliable than CLI deployment.

---

**Last Updated:** 2025-11-21
**Deployment Status:** ✅ Production Ready
**Production URL:** https://blah-omega-a8nbx6nyp-thomasdavis-projects.vercel.app
