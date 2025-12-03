# Database Migration - Agent Synthesis Table

## Overview

The agent synthesis feature requires a new PostgreSQL table to cache AI-generated identity syntheses. This reduces OpenAI API costs and improves response times.

## Migration Status

⚠️ **The `agent_syntheses` table needs to be created on Railway PostgreSQL**

## Option 1: Railway CLI (Recommended)

```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run the migration script
railway run bash packages/database/scripts/create-agent-synthesis-table.sh
```

## Option 2: Direct SQL via Railway Dashboard

1. Go to Railway Dashboard: https://railway.app
2. Select your project
3. Click on your PostgreSQL database
4. Click "Query" tab
5. Paste and run this SQL:

```sql
-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_syntheses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "synthesis_content" TEXT NOT NULL,
    "message_count" INTEGER NOT NULL,
    "generated_at" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    "updated_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "agent_syntheses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agent_syntheses_user_id_key" ON "agent_syntheses"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_agent_synthesis_user_id" ON "agent_syntheses"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_agent_synthesis_generated_at" ON "agent_syntheses"("generated_at" DESC);
```

## Option 3: Connect with psql

```bash
# Get DATABASE_URL from Railway
railway variables

# Connect with psql
psql "$DATABASE_URL"

# Run the SQL from migration file
\i packages/database/prisma/migrations/20251203055229_add_agent_synthesis_table/migration.sql
```

## Option 4: Using the TypeScript Script (Local with Railway Credentials)

```bash
# Make sure DATABASE_URL is set
export DATABASE_URL="postgresql://..."

# Or pull from Railway
railway variables | grep DATABASE_URL

# Run migration script
pnpm --filter=@repo/database migrate
```

## Verification

After running the migration, verify the table exists:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'agent_syntheses';
```

Expected output: `agent_syntheses`

## What This Table Does

- **Caches AI-generated identity syntheses** for 20 minutes
- **Reduces OpenAI API costs** by 95%+ for repeat visitors
- **Improves response times** from 5-30 seconds to instant
- **Stores**: synthesis content, generation timestamp, message count

## Graceful Degradation

⚠️ **Note**: The agent endpoint will still work without this table, but:
- ❌ No caching (every request calls OpenAI)
- ❌ Higher costs
- ❌ Slower response times
- ✅ Functionality preserved

You'll see warnings in logs:
```
[AgentSynthesis] Table does not exist. Synthesis generated but not cached.
```

## Table Schema

```typescript
model AgentSynthesis {
  id               String   // UUID
  userId           String   // Unique per user
  username         String   // For reference
  synthesisContent String   // Full markdown synthesis
  messageCount     Int      // Messages analyzed
  generatedAt      BigInt   // Unix timestamp (seconds)
  createdAt        BigInt   // Audit timestamp
  updatedAt        BigInt   // Audit timestamp
}
```

## Migration File Location

```
packages/database/prisma/migrations/20251203055229_add_agent_synthesis_table/migration.sql
```
