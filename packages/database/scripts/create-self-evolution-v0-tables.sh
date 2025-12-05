#!/bin/bash
# Create self-evolution v0 tables and indexes directly in PostgreSQL
# Part of Self-Evolution v0 (scheduler + DB + safety rails)
# Usage: ./create-self-evolution-v0-tables.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating self-evolution v0 tables (feature_flags, evolution_runs, evolution_reflections, evolution_candidates, evolution_changes, guardrail_checks)..."

psql "$DB_URL" << 'EOF'
-- CreateTable feature_flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CreateTable evolution_runs
CREATE TABLE IF NOT EXISTS evolution_runs (
  id SERIAL PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mode TEXT NOT NULL CHECK (mode IN ('dry-run','active')),
  status TEXT NOT NULL CHECK (status IN ('success','failure','skipped')),
  notes TEXT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- CreateTable evolution_reflections
CREATE TABLE IF NOT EXISTS evolution_reflections (
  id SERIAL PRIMARY KEY,
  run_id INT NOT NULL REFERENCES evolution_runs(id) ON DELETE CASCADE,
  summary TEXT,
  insights JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CreateTable evolution_candidates
CREATE TABLE IF NOT EXISTS evolution_candidates (
  id SERIAL PRIMARY KEY,
  run_id INT NOT NULL REFERENCES evolution_runs(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  rationale TEXT,
  proposal JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_level TEXT,
  score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CreateTable evolution_changes
CREATE TABLE IF NOT EXISTS evolution_changes (
  id SERIAL PRIMARY KEY,
  run_id INT NOT NULL REFERENCES evolution_runs(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  diff_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CreateTable guardrail_checks
CREATE TABLE IF NOT EXISTS guardrail_checks (
  id SERIAL PRIMARY KEY,
  run_id INT NOT NULL REFERENCES evolution_runs(id) ON DELETE CASCADE,
  check_name TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_runs_at ON evolution_runs(run_at);
CREATE INDEX IF NOT EXISTS idx_reflections_run ON evolution_reflections(run_id);
CREATE INDEX IF NOT EXISTS idx_candidates_run ON evolution_candidates(run_id);
CREATE INDEX IF NOT EXISTS idx_changes_run ON evolution_changes(run_id);
CREATE INDEX IF NOT EXISTS idx_guardrails_run ON guardrail_checks(run_id);

-- Seed feature flag
INSERT INTO feature_flags(key, value)
VALUES ('self_evolution_v0', '{"enabled": false, "mode": "dry-run"}')
ON CONFLICT (key) DO NOTHING;

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('feature_flags', 'evolution_runs', 'evolution_reflections', 'evolution_candidates', 'evolution_changes', 'guardrail_checks')
ORDER BY table_name;

-- Verify seed
SELECT key, value FROM feature_flags WHERE key = 'self_evolution_v0';
EOF

echo "✅ Migration completed successfully!"
