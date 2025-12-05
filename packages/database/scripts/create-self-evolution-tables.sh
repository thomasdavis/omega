#!/bin/bash
# Create self-evolution framework tables directly in PostgreSQL
# Usage: ./create-self-evolution-tables.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating self-evolution framework tables..."

psql "$DB_URL" << 'EOF'
-- CreateTable: self_evolution_cycles
CREATE TABLE IF NOT EXISTS "self_evolution_cycles" (
    "id" SERIAL PRIMARY KEY,
    "cycle_date" DATE UNIQUE NOT NULL,
    "started_at" TIMESTAMPTZ DEFAULT NOW(),
    "ended_at" TIMESTAMPTZ,
    "summary" TEXT,
    "wildcard_title" TEXT,
    "status" VARCHAR(32) DEFAULT 'planned' CHECK ("status" IN ('planned','running','completed','failed','reverted'))
);

-- CreateTable: self_evolution_actions
CREATE TABLE IF NOT EXISTS "self_evolution_actions" (
    "id" SERIAL PRIMARY KEY,
    "cycle_id" INTEGER NOT NULL REFERENCES "self_evolution_cycles"("id") ON DELETE CASCADE,
    "type" VARCHAR(32) NOT NULL CHECK ("type" IN ('capability','future','wildcard','prompt','persona')),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "issue_number" INTEGER,
    "pr_number" INTEGER,
    "branch_name" VARCHAR(128),
    "status" VARCHAR(32) DEFAULT 'planned' CHECK ("status" IN ('planned','in_progress','done','skipped','reverted','failed')),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- CreateTable: self_evolution_sanity_checks
CREATE TABLE IF NOT EXISTS "self_evolution_sanity_checks" (
    "id" SERIAL PRIMARY KEY,
    "cycle_id" INTEGER NOT NULL REFERENCES "self_evolution_cycles"("id") ON DELETE CASCADE,
    "check_name" VARCHAR(128) NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "result" VARCHAR(32) CHECK ("result" IN ('pass','warn','fail')),
    "details" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- CreateTable: self_evolution_metrics
CREATE TABLE IF NOT EXISTS "self_evolution_metrics" (
    "id" SERIAL PRIMARY KEY,
    "cycle_id" INTEGER NOT NULL REFERENCES "self_evolution_cycles"("id") ON DELETE CASCADE,
    "metric_name" VARCHAR(128) NOT NULL,
    "metric_value" DOUBLE PRECISION,
    "unit" VARCHAR(32),
    "details" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- CreateTable: self_evolution_branches
CREATE TABLE IF NOT EXISTS "self_evolution_branches" (
    "id" SERIAL PRIMARY KEY,
    "cycle_id" INTEGER NOT NULL REFERENCES "self_evolution_cycles"("id") ON DELETE CASCADE,
    "branch_name" VARCHAR(128) UNIQUE NOT NULL,
    "base_branch" VARCHAR(64) DEFAULT 'main',
    "pr_number" INTEGER,
    "merged" BOOLEAN DEFAULT FALSE,
    "closed" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- CreateIndexes: self_evolution_cycles
CREATE INDEX IF NOT EXISTS "idx_cycles_date" ON "self_evolution_cycles"("cycle_date");

-- CreateIndexes: self_evolution_actions
CREATE INDEX IF NOT EXISTS "idx_actions_cycle" ON "self_evolution_actions"("cycle_id");
CREATE INDEX IF NOT EXISTS "idx_actions_status" ON "self_evolution_actions"("status");

-- CreateIndexes: self_evolution_sanity_checks
CREATE INDEX IF NOT EXISTS "idx_checks_cycle" ON "self_evolution_sanity_checks"("cycle_id");

-- CreateIndexes: self_evolution_metrics
CREATE INDEX IF NOT EXISTS "idx_metrics_cycle" ON "self_evolution_metrics"("cycle_id");

-- CreateIndexes: self_evolution_branches
CREATE INDEX IF NOT EXISTS "idx_branches_cycle" ON "self_evolution_branches"("cycle_id");

-- Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('self_evolution_cycles', 'self_evolution_actions', 'self_evolution_sanity_checks', 'self_evolution_metrics', 'self_evolution_branches')
ORDER BY table_name;
EOF

echo "✅ Self-evolution framework tables created successfully!"
