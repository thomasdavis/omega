#!/bin/bash
# Create self_evolution_runs and safety_policy tables for the self-evolution workflow
# Usage: ./create-self-evolution-tables.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating self-evolution tables..."

psql "$DB_URL" << 'EOF'
-- CreateTable: safety_policy
-- Stores safety rules and constraints for self-evolution
CREATE TABLE IF NOT EXISTS "safety_policy" (
    "id" TEXT NOT NULL,
    "policy_name" TEXT NOT NULL,
    "max_loc" INTEGER NOT NULL DEFAULT 500,
    "max_files" INTEGER NOT NULL DEFAULT 10,
    "max_directories" INTEGER NOT NULL DEFAULT 4,
    "allowlist_paths" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "blocklist_paths" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "allow_new_files_only_paths" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "allow_new_workflows_only" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    "updated_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "safety_policy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "safety_policy_policy_name_key" ON "safety_policy"("policy_name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_safety_policy_is_active" ON "safety_policy"("is_active");

-- CreateTable: self_evolution_runs
-- Tracks each execution of the self-evolution workflow
CREATE TABLE IF NOT EXISTS "self_evolution_runs" (
    "id" TEXT NOT NULL,
    "run_date" TEXT NOT NULL,
    "branch_name" TEXT,
    "pr_number" INTEGER,
    "pr_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reflection_data" JSONB,
    "changes_summary" TEXT,
    "files_changed" INTEGER DEFAULT 0,
    "loc_changed" INTEGER DEFAULT 0,
    "directories_changed" INTEGER DEFAULT 0,
    "safety_policy_id" TEXT,
    "error_message" TEXT,
    "started_at" BIGINT NOT NULL,
    "completed_at" BIGINT,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    "updated_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "self_evolution_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "self_evolution_runs_run_date_key" ON "self_evolution_runs"("run_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_self_evolution_runs_status" ON "self_evolution_runs"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_self_evolution_runs_started_at" ON "self_evolution_runs"("started_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_self_evolution_runs_pr_number" ON "self_evolution_runs"("pr_number");

-- Insert default safety policy
INSERT INTO "safety_policy" (
    "id",
    "policy_name",
    "max_loc",
    "max_files",
    "max_directories",
    "allowlist_paths",
    "blocklist_paths",
    "allow_new_files_only_paths",
    "allow_new_workflows_only",
    "is_active"
) VALUES (
    gen_random_uuid()::text,
    'default',
    500,
    10,
    4,
    '["prompts/", "docs/", ".github/workflows/", "config/feature-flags"]'::jsonb,
    '["apps/bot/src/index.ts", "apps/web/src/pages/_app.tsx", "packages/database/scripts/", ".env", "railway.json"]'::jsonb,
    '["apps/bot/src/agent/tools/", ".github/workflows/"]'::jsonb,
    true,
    true
) ON CONFLICT ("policy_name") DO NOTHING;

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('safety_policy', 'self_evolution_runs')
ORDER BY table_name;

SELECT policy_name, is_active FROM "safety_policy" WHERE policy_name = 'default';
EOF

echo "✅ Migration completed successfully!"
echo "📊 Created tables: safety_policy, self_evolution_runs"
