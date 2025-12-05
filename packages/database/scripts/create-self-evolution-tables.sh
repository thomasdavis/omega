#!/bin/bash
# Create self_evolution_v0 tables for AI self-improvement scaffolding
# Part of Self-Evolution v0 (scheduler + DB + safety rails)
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-self-evolution-tables.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating self-evolution v0 tables..."

psql "$DB_URL" << 'EOF'
-- Create feature_flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create evolution_runs table
CREATE TABLE IF NOT EXISTS evolution_runs (
  id SERIAL PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mode TEXT NOT NULL CHECK (mode IN ('dry-run','active')),
  status TEXT NOT NULL CHECK (status IN ('success','failure','skipped')),
  notes TEXT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Create evolution_reflections table
CREATE TABLE IF NOT EXISTS evolution_reflections (
  id SERIAL PRIMARY KEY,
  run_id INT NOT NULL REFERENCES evolution_runs(id) ON DELETE CASCADE,
  summary TEXT,
  insights JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create evolution_candidates table
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

-- Create evolution_changes table
CREATE TABLE IF NOT EXISTS evolution_changes (
  id SERIAL PRIMARY KEY,
  run_id INT NOT NULL REFERENCES evolution_runs(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  diff_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create guardrail_checks table
CREATE TABLE IF NOT EXISTS guardrail_checks (
  id SERIAL PRIMARY KEY,
  run_id INT NOT NULL REFERENCES evolution_runs(id) ON DELETE CASCADE,
  check_name TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_runs_at ON evolution_runs(run_at);
CREATE INDEX IF NOT EXISTS idx_reflections_run ON evolution_reflections(run_id);
CREATE INDEX IF NOT EXISTS idx_candidates_run ON evolution_candidates(run_id);
CREATE INDEX IF NOT EXISTS idx_changes_run ON evolution_changes(run_id);
CREATE INDEX IF NOT EXISTS idx_guardrails_run ON guardrail_checks(run_id);

-- Seed self_evolution_v0 feature flag (idempotent)
INSERT INTO feature_flags(key, value)
VALUES ('self_evolution_v0', '{"enabled": false, "mode": "dry-run"}')
ON CONFLICT (key) DO NOTHING;

-- Verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('feature_flags', 'evolution_runs', 'evolution_reflections', 'evolution_candidates', 'evolution_changes', 'guardrail_checks')
ORDER BY table_name;

EOF

echo "✅ Self-evolution v0 tables created successfully!"
