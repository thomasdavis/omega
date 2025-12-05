#!/bin/bash
# Create self-evolution tables directly in PostgreSQL
# Usage: ./create-evolution-tables.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating self-evolution tables..."

psql "$DB_URL" << 'EOF'
-- Self Reflections Table
CREATE TABLE IF NOT EXISTS self_reflections (
  id SERIAL PRIMARY KEY,
  run_date DATE NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  feelings JSONB NOT NULL,
  metrics JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_self_reflections_run_date ON self_reflections(run_date);

-- Evolution Proposals Table
CREATE TABLE IF NOT EXISTS evolution_proposals (
  id SERIAL PRIMARY KEY,
  run_date DATE NOT NULL,
  type VARCHAR(32) NOT NULL CHECK (type IN ('capability','anticipatory','wildcard','other')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  risk_level VARCHAR(16) NOT NULL CHECK (risk_level IN ('low','medium','high')),
  expected_impact JSONB,
  status VARCHAR(32) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','selected','deferred','rejected','implemented')),
  issue_number INTEGER,
  pr_number INTEGER,
  branch_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evolution_proposals_run_date ON evolution_proposals(run_date);
CREATE INDEX IF NOT EXISTS idx_evolution_proposals_status ON evolution_proposals(status);

-- Sanity Checks Table
CREATE TABLE IF NOT EXISTS sanity_checks (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER NOT NULL REFERENCES evolution_proposals(id) ON DELETE CASCADE,
  checks JSONB NOT NULL,
  score NUMERIC(5,2),
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  logs_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sanity_checks_proposal_id ON sanity_checks(proposal_id);

-- Experiments Table
CREATE TABLE IF NOT EXISTS experiments (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER REFERENCES evolution_proposals(id) ON DELETE SET NULL,
  flag_key VARCHAR(100),
  rollout_percent INTEGER CHECK (rollout_percent BETWEEN 0 AND 100),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experiments_flag_key ON experiments(flag_key);

-- Feature Flags Table
CREATE TABLE IF NOT EXISTS feature_flags (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percent INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);

-- Evolution Audit Log Table
CREATE TABLE IF NOT EXISTS evolution_audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  actor VARCHAR(100) NOT NULL DEFAULT 'omega',
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('self_reflections', 'evolution_proposals', 'sanity_checks', 'experiments', 'feature_flags', 'evolution_audit_log')
ORDER BY table_name;
EOF

echo "✅ Migration completed successfully!"
