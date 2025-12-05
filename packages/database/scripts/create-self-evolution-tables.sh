#!/bin/bash
# Create self-evolution tables for the Self-Evolution Engine
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-self-evolution-tables.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating self-evolution tables..."

psql "$DB_URL" << 'EOF'
-- CreateTable self_evolution_runs
CREATE TABLE IF NOT EXISTS "self_evolution_runs" (
    "id" SERIAL PRIMARY KEY,
    "run_date" DATE NOT NULL,
    "branch_name" VARCHAR(128) NOT NULL,
    "pr_number" INTEGER,
    "status" VARCHAR(32) NOT NULL CHECK ("status" IN ('planned','running','succeeded','skipped','failed','rolled_back')),
    "summary" TEXT,
    "diff_stats" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- CreateTable self_evolution_reflections
CREATE TABLE IF NOT EXISTS "self_evolution_reflections" (
    "id" SERIAL PRIMARY KEY,
    "run_id" INTEGER NOT NULL REFERENCES "self_evolution_runs"("id") ON DELETE CASCADE,
    "inputs" JSONB NOT NULL,
    "findings" TEXT,
    "feelings" JSONB,
    "suggestions" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- CreateTable self_evolution_proposals
CREATE TABLE IF NOT EXISTS "self_evolution_proposals" (
    "id" SERIAL PRIMARY KEY,
    "run_id" INTEGER NOT NULL REFERENCES "self_evolution_runs"("id") ON DELETE CASCADE,
    "category" VARCHAR(32) NOT NULL CHECK ("category" IN ('capability','persona','infra','docs','wildcard')),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "risk_level" SMALLINT DEFAULT 1 CHECK ("risk_level" BETWEEN 1 AND 5),
    "estimated_impact" SMALLINT DEFAULT 1 CHECK ("estimated_impact" BETWEEN 1 AND 5),
    "decision" VARCHAR(16) NOT NULL DEFAULT 'deferred' CHECK ("decision" IN ('approved','deferred','rejected')),
    "rationale" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- CreateTable self_evolution_actions
CREATE TABLE IF NOT EXISTS "self_evolution_actions" (
    "id" SERIAL PRIMARY KEY,
    "run_id" INTEGER NOT NULL REFERENCES "self_evolution_runs"("id") ON DELETE CASCADE,
    "proposal_id" INTEGER REFERENCES "self_evolution_proposals"("id") ON DELETE SET NULL,
    "action_type" VARCHAR(32) NOT NULL CHECK ("action_type" IN ('create_issue','open_pr','update_prompt','toggle_flag','schedule_task')),
    "details" JSONB NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','done','failed','rolled_back')),
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "completed_at" TIMESTAMPTZ
);

-- CreateTable self_evolution_guardrails
CREATE TABLE IF NOT EXISTS "self_evolution_guardrails" (
    "id" SERIAL PRIMARY KEY,
    "run_id" INTEGER NOT NULL REFERENCES "self_evolution_runs"("id") ON DELETE CASCADE,
    "checks" JSONB NOT NULL,
    "result" VARCHAR(16) NOT NULL CHECK ("result" IN ('pass','fail')),
    "violations" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- CreateTable self_evolution_rollbacks
CREATE TABLE IF NOT EXISTS "self_evolution_rollbacks" (
    "id" SERIAL PRIMARY KEY,
    "run_id" INTEGER NOT NULL REFERENCES "self_evolution_runs"("id") ON DELETE CASCADE,
    "pr_number" INTEGER NOT NULL,
    "reason" TEXT,
    "performed_at" TIMESTAMPTZ DEFAULT NOW(),
    "details" JSONB
);

-- CreateTable feature_flags
CREATE TABLE IF NOT EXISTS "feature_flags" (
    "id" SERIAL PRIMARY KEY,
    "key" VARCHAR(128) UNIQUE NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- CreateTable safety_policy
CREATE TABLE IF NOT EXISTS "safety_policy" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(64) NOT NULL DEFAULT 'default',
    "allowlist" JSONB NOT NULL,
    "blocklist" JSONB NOT NULL,
    "diff_cap_loc" INTEGER NOT NULL DEFAULT 500,
    "diff_cap_files" INTEGER NOT NULL DEFAULT 10,
    "max_modified_dirs" INTEGER NOT NULL DEFAULT 4,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- CreateIndexes for self_evolution_runs
CREATE INDEX IF NOT EXISTS "idx_runs_date" ON "self_evolution_runs"("run_date");
CREATE INDEX IF NOT EXISTS "idx_runs_status" ON "self_evolution_runs"("status");

-- CreateIndexes for self_evolution_reflections
CREATE INDEX IF NOT EXISTS "idx_reflections_run_id" ON "self_evolution_reflections"("run_id");

-- CreateIndexes for self_evolution_proposals
CREATE INDEX IF NOT EXISTS "idx_proposals_run_id" ON "self_evolution_proposals"("run_id");
CREATE INDEX IF NOT EXISTS "idx_proposals_decision" ON "self_evolution_proposals"("decision");

-- CreateIndexes for self_evolution_actions
CREATE INDEX IF NOT EXISTS "idx_actions_run_id" ON "self_evolution_actions"("run_id");
CREATE INDEX IF NOT EXISTS "idx_actions_status" ON "self_evolution_actions"("status");

-- CreateIndex for safety_policy (unique name)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_safety_policy_name" ON "safety_policy"("name");

-- Verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'self_evolution_runs',
    'self_evolution_reflections',
    'self_evolution_proposals',
    'self_evolution_actions',
    'self_evolution_guardrails',
    'self_evolution_rollbacks',
    'feature_flags',
    'safety_policy'
)
ORDER BY table_name;

-- Verify indexes were created
SELECT
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'self_evolution_runs',
    'self_evolution_reflections',
    'self_evolution_proposals',
    'self_evolution_actions',
    'self_evolution_guardrails',
    'self_evolution_rollbacks',
    'feature_flags',
    'safety_policy'
)
ORDER BY tablename, indexname;
EOF

echo "✅ Migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run: cd packages/database && pnpm prisma db pull"
echo "2. Run: pnpm prisma generate"
