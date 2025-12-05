#!/bin/bash
# Create self-evolution tracking tables for observatory and metrics
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-self-evolution-tables.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating self-evolution tracking tables..."

psql "$DB_URL" << 'EOF'
-- Self-evolution runs table (main execution log)
CREATE TABLE IF NOT EXISTS self_evolution_runs (
  id SERIAL PRIMARY KEY,
  run_id VARCHAR(255) NOT NULL UNIQUE,
  triggered_by VARCHAR(255),
  trigger_source VARCHAR(100),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'running',
  total_duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_self_evolution_runs_run_id ON self_evolution_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_self_evolution_runs_started_at ON self_evolution_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_self_evolution_runs_status ON self_evolution_runs(status);

-- Self-evolution guardrails (pass/fail tracking)
CREATE TABLE IF NOT EXISTS self_evolution_guardrails (
  id SERIAL PRIMARY KEY,
  run_id VARCHAR(255) NOT NULL,
  guardrail_type VARCHAR(100) NOT NULL,
  passed BOOLEAN NOT NULL,
  check_timestamp TIMESTAMPTZ DEFAULT NOW(),
  details JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_self_evolution_guardrails_run_id ON self_evolution_guardrails(run_id);
CREATE INDEX IF NOT EXISTS idx_self_evolution_guardrails_type ON self_evolution_guardrails(guardrail_type);
CREATE INDEX IF NOT EXISTS idx_self_evolution_guardrails_passed ON self_evolution_guardrails(passed);
CREATE INDEX IF NOT EXISTS idx_self_evolution_guardrails_timestamp ON self_evolution_guardrails(check_timestamp DESC);

-- Self-evolution PR cycles (PR creation, review, merge tracking)
CREATE TABLE IF NOT EXISTS self_evolution_pr_cycles (
  id SERIAL PRIMARY KEY,
  run_id VARCHAR(255) NOT NULL,
  pr_number INTEGER NOT NULL,
  pr_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL,
  merged_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  review_count INTEGER DEFAULT 0,
  cycle_time_ms INTEGER,
  outcome VARCHAR(50),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_self_evolution_pr_cycles_run_id ON self_evolution_pr_cycles(run_id);
CREATE INDEX IF NOT EXISTS idx_self_evolution_pr_cycles_pr_number ON self_evolution_pr_cycles(pr_number);
CREATE INDEX IF NOT EXISTS idx_self_evolution_pr_cycles_created_at ON self_evolution_pr_cycles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_self_evolution_pr_cycles_outcome ON self_evolution_pr_cycles(outcome);

-- Self-evolution rollbacks (tracking reverts and rollbacks)
CREATE TABLE IF NOT EXISTS self_evolution_rollbacks (
  id SERIAL PRIMARY KEY,
  run_id VARCHAR(255) NOT NULL,
  rollback_type VARCHAR(100) NOT NULL,
  pr_number INTEGER,
  reason TEXT,
  rollback_timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_self_evolution_rollbacks_run_id ON self_evolution_rollbacks(run_id);
CREATE INDEX IF NOT EXISTS idx_self_evolution_rollbacks_type ON self_evolution_rollbacks(rollback_type);
CREATE INDEX IF NOT EXISTS idx_self_evolution_rollbacks_timestamp ON self_evolution_rollbacks(rollback_timestamp DESC);

-- Self-evolution categories (feature categories chosen/rejected)
CREATE TABLE IF NOT EXISTS self_evolution_categories (
  id SERIAL PRIMARY KEY,
  run_id VARCHAR(255) NOT NULL,
  category_name VARCHAR(255) NOT NULL,
  chosen BOOLEAN NOT NULL,
  confidence_score FLOAT,
  reasoning TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_self_evolution_categories_run_id ON self_evolution_categories(run_id);
CREATE INDEX IF NOT EXISTS idx_self_evolution_categories_chosen ON self_evolution_categories(chosen);
CREATE INDEX IF NOT EXISTS idx_self_evolution_categories_timestamp ON self_evolution_categories(timestamp DESC);

-- Self-evolution wildcards (daily wildcard feature tracking)
CREATE TABLE IF NOT EXISTS self_evolution_wildcards (
  id SERIAL PRIMARY KEY,
  run_id VARCHAR(255) NOT NULL,
  wildcard_name VARCHAR(255) NOT NULL,
  adopted BOOLEAN NOT NULL,
  user_feedback VARCHAR(500),
  impact_score FLOAT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_self_evolution_wildcards_run_id ON self_evolution_wildcards(run_id);
CREATE INDEX IF NOT EXISTS idx_self_evolution_wildcards_adopted ON self_evolution_wildcards(adopted);
CREATE INDEX IF NOT EXISTS idx_self_evolution_wildcards_timestamp ON self_evolution_wildcards(timestamp DESC);

-- Self-evolution metrics snapshots (aggregated metrics per run)
CREATE TABLE IF NOT EXISTS self_evolution_metrics (
  id SERIAL PRIMARY KEY,
  run_id VARCHAR(255) NOT NULL UNIQUE,
  guardrail_pass_rate FLOAT,
  avg_pr_cycle_time_ms INTEGER,
  rollback_count INTEGER DEFAULT 0,
  categories_chosen_count INTEGER DEFAULT 0,
  categories_rejected_count INTEGER DEFAULT 0,
  wildcard_adoption_rate FLOAT,
  snapshot_timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_self_evolution_metrics_run_id ON self_evolution_metrics(run_id);
CREATE INDEX IF NOT EXISTS idx_self_evolution_metrics_snapshot ON self_evolution_metrics(snapshot_timestamp DESC);

-- Verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'self_evolution_%'
ORDER BY table_name;

EOF

echo "✅ Self-evolution tracking tables created successfully!"
