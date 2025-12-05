#!/bin/bash
# Create self_evolution_* tables for tracking self-evolution runs
# Usage: ./create-self-evolution-tables.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating self_evolution tables..."

psql "$DB_URL" << 'EOF'
-- Self Evolution Runs Table
-- Tracks each self-evolution run with overall metrics
CREATE TABLE IF NOT EXISTS "self_evolution_runs" (
    "id" TEXT NOT NULL,
    "run_timestamp" BIGINT NOT NULL,
    "trigger_type" VARCHAR(50) NOT NULL, -- 'nightly', 'post_merge', 'manual'
    "total_prs_created" INTEGER DEFAULT 0,
    "total_prs_merged" INTEGER DEFAULT 0,
    "total_prs_rolled_back" INTEGER DEFAULT 0,
    "guardrail_pass_rate" REAL, -- percentage 0-100
    "avg_pr_cycle_time_hours" REAL,
    "wildcard_features_used" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "completed_at" BIGINT,
    "status" VARCHAR(20) DEFAULT 'running', -- 'running', 'completed', 'failed'
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    "updated_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "self_evolution_runs_pkey" PRIMARY KEY ("id")
);

-- Self Evolution PR Details Table
-- Tracks individual PRs created during self-evolution
CREATE TABLE IF NOT EXISTS "self_evolution_prs" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "pr_number" INTEGER NOT NULL,
    "pr_title" TEXT NOT NULL,
    "pr_url" TEXT NOT NULL,
    "category" VARCHAR(100), -- 'bug_fix', 'feature', 'refactor', etc.
    "category_confidence" REAL,
    "created_at" BIGINT NOT NULL,
    "merged_at" BIGINT,
    "closed_at" BIGINT,
    "rolled_back_at" BIGINT,
    "cycle_time_hours" REAL,
    "guardrails_passed" BOOLEAN DEFAULT true,
    "guardrail_failures" JSONB, -- array of failed guardrails
    "is_wildcard_feature" BOOLEAN DEFAULT false,
    "wildcard_reason" TEXT,
    "metadata" JSONB,
    "status" VARCHAR(20) DEFAULT 'open', -- 'open', 'merged', 'closed', 'rolled_back'

    CONSTRAINT "self_evolution_prs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "self_evolution_prs_run_fkey" FOREIGN KEY ("run_id")
        REFERENCES "self_evolution_runs"("id") ON DELETE CASCADE
);

-- Self Evolution Categories Table
-- Tracks which categories were chosen vs rejected
CREATE TABLE IF NOT EXISTS "self_evolution_categories" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "was_chosen" BOOLEAN NOT NULL,
    "reason" TEXT,
    "confidence_score" REAL,
    "metadata" JSONB,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "self_evolution_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "self_evolution_categories_run_fkey" FOREIGN KEY ("run_id")
        REFERENCES "self_evolution_runs"("id") ON DELETE CASCADE
);

-- Self Evolution Metrics Snapshot Table
-- Stores aggregated metrics for quick dashboard rendering
CREATE TABLE IF NOT EXISTS "self_evolution_metrics" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "metric_name" VARCHAR(100) NOT NULL,
    "metric_value" REAL NOT NULL,
    "metric_unit" VARCHAR(50),
    "snapshot_timestamp" BIGINT NOT NULL,
    "metadata" JSONB,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "self_evolution_metrics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "self_evolution_metrics_run_fkey" FOREIGN KEY ("run_id")
        REFERENCES "self_evolution_runs"("id") ON DELETE CASCADE
);

-- Indexes for performance

-- Runs indexes
CREATE INDEX IF NOT EXISTS "idx_self_evolution_runs_timestamp"
    ON "self_evolution_runs"("run_timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_self_evolution_runs_status"
    ON "self_evolution_runs"("status");
CREATE INDEX IF NOT EXISTS "idx_self_evolution_runs_trigger_type"
    ON "self_evolution_runs"("trigger_type");

-- PRs indexes
CREATE INDEX IF NOT EXISTS "idx_self_evolution_prs_run_id"
    ON "self_evolution_prs"("run_id");
CREATE INDEX IF NOT EXISTS "idx_self_evolution_prs_status"
    ON "self_evolution_prs"("status");
CREATE INDEX IF NOT EXISTS "idx_self_evolution_prs_category"
    ON "self_evolution_prs"("category");
CREATE INDEX IF NOT EXISTS "idx_self_evolution_prs_created_at"
    ON "self_evolution_prs"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_self_evolution_prs_is_wildcard"
    ON "self_evolution_prs"("is_wildcard_feature");

-- Categories indexes
CREATE INDEX IF NOT EXISTS "idx_self_evolution_categories_run_id"
    ON "self_evolution_categories"("run_id");
CREATE INDEX IF NOT EXISTS "idx_self_evolution_categories_category"
    ON "self_evolution_categories"("category");
CREATE INDEX IF NOT EXISTS "idx_self_evolution_categories_was_chosen"
    ON "self_evolution_categories"("was_chosen");

-- Metrics indexes
CREATE INDEX IF NOT EXISTS "idx_self_evolution_metrics_run_id"
    ON "self_evolution_metrics"("run_id");
CREATE INDEX IF NOT EXISTS "idx_self_evolution_metrics_name"
    ON "self_evolution_metrics"("metric_name");
CREATE INDEX IF NOT EXISTS "idx_self_evolution_metrics_timestamp"
    ON "self_evolution_metrics"("snapshot_timestamp" DESC);

-- Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'self_evolution_%'
ORDER BY table_name;

EOF

echo "✅ Self evolution tables created successfully!"
