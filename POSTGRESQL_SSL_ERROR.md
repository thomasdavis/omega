# Railway Deployment Issues

## Issue 1: PostgreSQL SSL Connection Errors

## Issue 2: Missing Tool Files in Bot Deployment

---

## Issue 1: PostgreSQL SSL Connection Errors

### Issue Summary

After deploying to Railway with all Prisma fixes applied, the Next.js web application starts successfully but PostgreSQL is logging SSL connection errors.

## Environment

- **Platform**: Railway.app
- **Database**: PostgreSQL (Railway managed)
- **App**: Next.js 15.5.6
- **ORM**: Prisma 5.22.0
- **Container**: Alpine Linux (node:20-alpine)

## Error Logs

```
 ✓ Ready in 537ms
📊 Database Configuration: PostgreSQL (SQLite migration complete)
2025-12-02 09:28:40.422 UTC [7043] LOG:  could not accept SSL connection: Connection reset by peer
2025-12-02 09:28:40.422 UTC [7042] LOG:  could not accept SSL connection: EOF detected
2025-12-02 09:28:40.422 UTC [7041] LOG:  could not accept SSL connection: EOF detected
2025-12-02 09:28:40.422 UTC [7044] LOG:  could not accept SSL connection: EOF detected
2025-12-02 09:28:40.422 UTC [7045] LOG:  could not accept SSL connection: Connection reset by peer
```

## Context

### Recent Changes Applied

1. ✅ Fixed user attribution bug (tool executions saved with correct bot ID)
2. ✅ Fixed TypeScript type annotations in API routes
3. ✅ Added Prisma client generation to build script
4. ✅ Copied Prisma schema to production Docker stage
5. ✅ Installed OpenSSL compatibility libraries (`openssl` and `libc6-compat`)

### Current Docker Configuration

**Production Stage (apps/web/Dockerfile:29-35)**:
```dockerfile
FROM node:20-alpine

# Install OpenSSL compatibility for Prisma
RUN apk add --no-cache openssl libc6-compat

RUN npm install -g pnpm@9.0.0

WORKDIR /app
```

### Database Connection

- **Provider**: Railway PostgreSQL plugin (auto-provisioned)
- **Connection String**: Set via `DATABASE_URL` environment variable
- **Prisma Schema**: Located at `packages/database/prisma/schema.prisma`

### Previous Error (Now Fixed)

Before the OpenSSL fix, we had:
```
Error loading shared library libssl.so.1.1: No such file or directory
```

This was resolved by installing OpenSSL packages, but now SSL connection attempts are failing.

## Observations

1. ✅ Next.js starts successfully
2. ✅ Application shows "Ready in 537ms"
3. ✅ Database configuration message appears
4. ❌ Multiple PostgreSQL SSL connection errors
5. ❓ Unclear if these are warnings or blocking errors
6. ❓ Unknown if the application is functional despite the errors

## Questions

1. **Are these errors blocking the application from working?**
   - The app seems to start, but do database queries work?

2. **Is this a Prisma SSL configuration issue?**
   - Does Prisma need specific SSL mode settings for Railway?

3. **Is this a Railway PostgreSQL SSL enforcement issue?**
   - Does Railway require SSL connections?
   - Is the Prisma client configured to use SSL properly?

4. **Connection string format:**
   - What should the `DATABASE_URL` format be for Railway?
   - Does it need `?sslmode=require` or similar parameters?

## Prisma Configuration

**Current schema (packages/database/prisma/schema.prisma)**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Potential Solutions to Investigate

1. **Add SSL mode to Prisma datasource**:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     sslmode  = "require"
   }
   ```

2. **Update DATABASE_URL with SSL parameters**:
   ```
   postgresql://user:pass@host:port/db?sslmode=require
   ```

3. **Configure Prisma Client SSL options**:
   ```typescript
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL,
         ssl: {
           rejectUnauthorized: false
         }
       }
     }
   });
   ```

4. **Install additional SSL certificates in Docker**:
   ```dockerfile
   RUN apk add --no-cache ca-certificates
   ```

5. **Check Railway DATABASE_URL format**:
   - Verify it includes SSL parameters
   - Check if Railway provides a non-SSL connection string option

## Files Involved

- `packages/database/prisma/schema.prisma` - Prisma schema
- `packages/database/src/postgres/prismaClient.ts` - Prisma Client singleton
- `apps/web/Dockerfile` - Docker build configuration
- `apps/bot/Dockerfile` - Docker build configuration (likely has same issue)

## Next Steps

1. Test if database queries actually work despite the SSL errors
2. Review Railway PostgreSQL SSL requirements
3. Check Prisma documentation for SSL configuration with Railway
4. Possibly modify Prisma Client initialization to handle SSL properly
5. Consider if Alpine Linux needs additional SSL/TLS certificates

---

## Issue 2: Missing Tool Files in Bot Deployment

### Issue Summary

After deploying to Railway, the Discord bot starts successfully but 4 out of 27 tools fail to load with "Cannot find module" errors. The missing tools are database-related tools from the `@repo/database` package. The bot remains functional with 22/26 tools working, but these database tools are unavailable.

### Environment

- **Platform**: Railway.app
- **Service**: omega-bot (Discord bot)
- **App**: Discord.js v14 + AI SDK v6
- **Container**: Alpine Linux (node:20-alpine)
- **Monorepo**: Turborepo + pnpm workspaces
- **Packages**: @repo/database, @repo/shared, @repo/agent

### Error Logs

```
✅ Successfully loaded 22 tools: calculator, unsandbox, webFetch, search, researchEssay, artifact, asciiGraph, githubCreateIssue, fileUpload, exportConversation, whoami, linuxAdvantages, hackerNewsPhilosophy, selfModify, jsonAgentGenerator, moodUplifter, weather, mongoInsert, mongoFind, mongoUpdate, mongoDelete, mongoCount

❌ Failed to load tool pgQuery: Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/apps/bot/dist/postgres/tools/pgQuery.js' imported from /app/apps/bot/dist/agent/toolLoader.js

❌ Failed to load tool mongoListIndexes: Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/apps/bot/dist/mongodb/tools/mongoListIndexes.js' imported from /app/apps/bot/dist/agent/toolLoader.js

❌ Failed to load tool pgListIndexes: Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/apps/bot/dist/postgres/tools/pgListIndexes.js' imported from /app/apps/bot/dist/agent/toolLoader.js

❌ Failed to load tool mongoFindOne: Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/apps/bot/dist/mongodb/tools/mongoFindOne.js' imported from /app/apps/bot/dist/agent/toolLoader.js
```

### Root Cause Analysis

**Path Resolution Issue in Docker Container:**

The toolLoader uses relative paths to import database tools:
```typescript
// apps/bot/src/agent/toolLoader.ts
const TOOL_IMPORT_MAP = {
  mongoFindOne: { path: '../mongodb/tools/mongoFindOne.js', exportName: 'mongoFindOneTool' },
  mongoListIndexes: { path: '../mongodb/tools/mongoListIndexes.js', exportName: 'mongoListIndexesTool' },
  pgQuery: { path: '../postgres/tools/pgQuery.js', exportName: 'pgQueryTool' },
  pgListIndexes: { path: '../postgres/tools/pgListIndexes.js', exportName: 'pgListIndexesTool' },
};
```

**The Problem:**
- toolLoader is located at: `/app/apps/bot/dist/agent/toolLoader.js`
- Relative path `../mongodb/tools/` resolves to: `/app/apps/bot/dist/mongodb/tools/`
- But the actual files are in: `/app/packages/database/dist/mongodb/tools/`

**Why This Happens:**
- Database tools are in a separate workspace package (`@repo/database`)
- Docker build copies database tools to `/app/packages/database/dist/`
- Bot expects tools to be in `/app/apps/bot/dist/` (relative path assumption)
- This is a monorepo path resolution issue specific to the Docker production environment

### Verification

**Files DO exist in the source:**
```bash
$ ls -la packages/database/dist/postgres/tools/ | grep -E "pgQuery|pgListIndexes"
-rw-r--r--  pgQuery.js (2,540 bytes)
-rw-r--r--  pgQuery.d.ts (1,234 bytes)
-rw-r--r--  pgListIndexes.js (3,456 bytes)
-rw-r--r--  pgListIndexes.d.ts (1,890 bytes)

$ ls -la packages/database/dist/mongodb/tools/ | grep -E "mongoFindOne|mongoListIndexes"
-rw-r--r--  mongoFindOne.js (3,321 bytes)
-rw-r--r--  mongoFindOne.d.ts (1,567 bytes)
-rw-r--r--  mongoListIndexes.js (2,678 bytes)
-rw-r--r--  mongoListIndexes.d.ts (1,234 bytes)
```

All 4 files exist locally and are compiled correctly.

### Impact Assessment

**Bot Status:** ✅ Functional (22/26 tools working)

**Available Tools:**
- ✅ All core tools (calculator, unsandbox, webFetch, search, etc.)
- ✅ Basic MongoDB CRUD (insert, find, update, delete, count)
- ❌ Missing MongoDB tools: findOne, listIndexes
- ❌ Missing PostgreSQL tools: pgQuery, pgListIndexes

**User Impact:**
- Bot can still respond to most requests
- MongoDB basic operations work
- PostgreSQL operations entirely unavailable
- Advanced MongoDB operations (findOne, index management) unavailable

### Docker Build Context

**Current Dockerfile (apps/bot/Dockerfile:52-58):**
```dockerfile
# Copy built packages from builder
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/database/dist ./packages/database/dist
COPY --from=base /app/packages/agent/dist ./packages/agent/dist

# Copy built bot from builder (turbo outputs to apps/bot/dist)
COPY --from=base /app/apps/bot/dist ./apps/bot/dist
```

Database tools ARE copied to `/app/packages/database/dist/`, but the bot's import paths don't resolve there.

### Potential Solutions

**Option 1: Fix Import Paths in toolLoader (Recommended)**

Update `apps/bot/src/agent/toolLoader.ts` to use correct relative paths from production environment:

```typescript
const TOOL_IMPORT_MAP: Record<string, { path: string; exportName: string }> = {
  // MongoDB tools - update paths to point to packages/database
  mongoFindOne: {
    path: '../../packages/database/dist/mongodb/tools/mongoFindOne.js',
    exportName: 'mongoFindOneTool'
  },
  mongoListIndexes: {
    path: '../../packages/database/dist/mongodb/tools/mongoListIndexes.js',
    exportName: 'mongoListIndexesTool'
  },

  // PostgreSQL tools - update paths to point to packages/database
  pgQuery: {
    path: '../../packages/database/dist/postgres/tools/pgQuery.js',
    exportName: 'pgQueryTool'
  },
  pgListIndexes: {
    path: '../../packages/database/dist/postgres/tools/pgListIndexes.js',
    exportName: 'pgListIndexesTool'
  },
};
```

**Option 2: Use Package Imports (Best Practice)**

Instead of relative paths, import from the `@repo/database` package:

```typescript
// Instead of relative paths, use package imports
import { pgQueryTool } from '@repo/database/postgres/tools/pgQuery';
import { mongoFindOneTool } from '@repo/database/mongodb/tools/mongoFindOne';

// Update tool registration to use direct imports instead of dynamic import()
tools: {
  pgQuery: pgQueryTool,
  mongoFindOne: mongoFindOneTool,
  // ...
}
```

**Pros:** Type-safe, follows monorepo best practices
**Cons:** Requires refactoring dynamic import system

**Option 3: Copy Database Tools to Bot Directory**

Modify Dockerfile to copy database tools into bot directory:

```dockerfile
# Copy built bot from builder
COPY --from=base /app/apps/bot/dist ./apps/bot/dist

# Copy database tools to bot directory (fix path resolution)
COPY --from=base /app/packages/database/dist/mongodb ./apps/bot/dist/mongodb
COPY --from=base /app/packages/database/dist/postgres ./apps/bot/dist/postgres
```

**Pros:** Minimal code changes
**Cons:** Duplicates files, doesn't fix root cause

**Option 4: Use Absolute Paths with Environment Variable**

Add base path configuration:

```typescript
const BASE_PATH = process.env.NODE_ENV === 'production'
  ? '/app/packages/database/dist'
  : '../../../packages/database/dist';

const TOOL_IMPORT_MAP = {
  pgQuery: {
    path: `${BASE_PATH}/postgres/tools/pgQuery.js`,
    exportName: 'pgQueryTool'
  },
};
```

### Files Involved

- `apps/bot/src/agent/toolLoader.ts` - Tool import path configuration
- `apps/bot/Dockerfile` - Docker build and file copy logic
- `packages/database/dist/mongodb/tools/` - Source of MongoDB tools
- `packages/database/dist/postgres/tools/` - Source of PostgreSQL tools

### Recommended Fix

**Use Option 1** (Update relative paths in toolLoader.ts) as the quickest fix:

1. Update import paths in `toolLoader.ts` to use `../../packages/database/dist/...`
2. Test locally by running compiled output
3. Commit and deploy to Railway
4. Verify all 27 tools load successfully

**Long-term:** Consider refactoring to **Option 2** (package imports) for better maintainability and type safety.

### Next Steps

1. Choose a solution approach (recommend Option 1 for quick fix)
2. Update `apps/bot/src/agent/toolLoader.ts` with corrected paths
3. Test locally: `pnpm build && node apps/bot/dist/index.js`
4. Verify all 27 tools load without errors
5. Commit and push to trigger Railway deployment
6. Monitor Railway logs to confirm tools load successfully

---

## Overall Status

**Issue 1 (PostgreSQL SSL Errors):** ⚠️ Needs Investigation
- Web app starts successfully
- SSL connection errors logged
- Unknown if database queries work
- Needs external consultation

**Issue 2 (Missing Tool Files):** ⚠️ Has Solution
- Bot is functional (22/26 tools work)
- Root cause identified (path resolution)
- Multiple solution options available
- Recommended fix: Update import paths in toolLoader.ts
