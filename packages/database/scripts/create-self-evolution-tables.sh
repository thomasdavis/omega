#!/bin/bash
# Create self_evolution_* tables directly in PostgreSQL
# Usage: ./create-self-evolution-tables.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating self_evolution tables..."

psql "$DB_URL" << 'EOF'
-- CreateTable: self_evolution_runs
CREATE TABLE IF NOT EXISTS "self_evolution_runs" (
  "id" SERIAL PRIMARY KEY,
  "run_date" DATE NOT NULL,
  "started_at" TIMESTAMPTZ DEFAULT NOW(),
  "finished_at" TIMESTAMPTZ,
  "status" VARCHAR(32) NOT NULL CHECK (status IN ('planned','in_progress','queued_pr','merged','rolled_back','skipped','failed')),
  "summary" TEXT
);

-- CreateTable: self_evolution_candidates
CREATE TABLE IF NOT EXISTS "self_evolution_candidates" (
  "id" SERIAL PRIMARY KEY,
  "run_id" INTEGER NOT NULL REFERENCES "self_evolution_runs"("id") ON DELETE CASCADE,
  "category" VARCHAR(16) NOT NULL CHECK (category IN ('capability','anticipatory','wildcard','persona')),
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "risk_score" INTEGER CHECK (risk_score BETWEEN 0 AND 5),
  "impact_score" INTEGER CHECK (impact_score BETWEEN 0 AND 5),
  "effort_score" INTEGER CHECK (effort_score BETWEEN 0 AND 5),
  "novelty_score" INTEGER CHECK (novelty_score BETWEEN 0 AND 5),
  "priority" NUMERIC(4,2),
  "selected" BOOLEAN DEFAULT FALSE,
  "rejection_reason" TEXT
);

-- CreateTable: self_evolution_actions
CREATE TABLE IF NOT EXISTS "self_evolution_actions" (
  "id" SERIAL PRIMARY KEY,
  "run_id" INTEGER NOT NULL REFERENCES "self_evolution_runs"("id") ON DELETE CASCADE,
  "candidate_id" INTEGER REFERENCES "self_evolution_candidates"("id") ON DELETE SET NULL,
  "branch_name" VARCHAR(255),
  "pr_number" INTEGER,
  "issue_number" INTEGER,
  "commit_sha" VARCHAR(128),
  "feature_flag_key" VARCHAR(128),
  "canary_percentage" INTEGER CHECK (canary_percentage BETWEEN 0 AND 100),
  "tests_passed" BOOLEAN,
  "checks" JSONB
);

-- CreateTable: self_evolution_metrics
CREATE TABLE IF NOT EXISTS "self_evolution_metrics" (
  "id" SERIAL PRIMARY KEY,
  "run_id" INTEGER NOT NULL REFERENCES "self_evolution_runs"("id") ON DELETE CASCADE,
  "metric_key" VARCHAR(64) NOT NULL,
  "metric_value" NUMERIC,
  "details" JSONB
);

-- CreateTable: self_evolution_sanity
CREATE TABLE IF NOT EXISTS "self_evolution_sanity" (
  "id" SERIAL PRIMARY KEY,
  "run_id" INTEGER NOT NULL REFERENCES "self_evolution_runs"("id") ON DELETE CASCADE,
  "rules" JSONB,
  "passed" BOOLEAN DEFAULT FALSE,
  "details" TEXT
);

-- CreateTable: self_evolution_approvals
CREATE TABLE IF NOT EXISTS "self_evolution_approvals" (
  "id" SERIAL PRIMARY KEY,
  "run_id" INTEGER NOT NULL REFERENCES "self_evolution_runs"("id") ON DELETE CASCADE,
  "required" BOOLEAN DEFAULT FALSE,
  "approver" VARCHAR(128),
  "decision" VARCHAR(32) CHECK (decision IN ('approved','rejected')),
  "approved_at" TIMESTAMPTZ,
  "notes" TEXT
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "idx_runs_date" ON "self_evolution_runs"("run_date");
CREATE INDEX IF NOT EXISTS "idx_runs_status" ON "self_evolution_runs"("status");
CREATE INDEX IF NOT EXISTS "idx_candidates_run" ON "self_evolution_candidates"("run_id");
CREATE INDEX IF NOT EXISTS "idx_candidates_selected" ON "self_evolution_candidates"("selected");
CREATE INDEX IF NOT EXISTS "idx_actions_pr" ON "self_evolution_actions"("pr_number");
CREATE INDEX IF NOT EXISTS "idx_actions_run" ON "self_evolution_actions"("run_id");

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'self_evolution%'
ORDER BY table_name;

-- Show row counts
SELECT
  'self_evolution_runs' as table_name,
  COUNT(*) as row_count
FROM "self_evolution_runs"
UNION ALL
SELECT
  'self_evolution_candidates',
  COUNT(*)
FROM "self_evolution_candidates"
UNION ALL
SELECT
  'self_evolution_actions',
  COUNT(*)
FROM "self_evolution_actions"
UNION ALL
SELECT
  'self_evolution_metrics',
  COUNT(*)
FROM "self_evolution_metrics"
UNION ALL
SELECT
  'self_evolution_sanity',
  COUNT(*)
FROM "self_evolution_sanity"
UNION ALL
SELECT
  'self_evolution_approvals',
  COUNT(*)
FROM "self_evolution_approvals";
EOF

echo "✅ Migration completed successfully!"
