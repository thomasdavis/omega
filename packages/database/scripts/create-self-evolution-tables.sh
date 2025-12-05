#!/bin/bash
# Create self-evolution tables for autonomous capability development
# Usage: ./create-self-evolution-tables.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating self-evolution tables..."

psql "$DB_URL" << 'EOF'
-- Self Evolution Runs Table
CREATE TABLE IF NOT EXISTS self_evolution_runs (
  id SERIAL PRIMARY KEY,
  run_date DATE NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('planned','running','success','failed','reverted')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  summary TEXT,
  logs_url TEXT,
  metrics JSONB
);

-- Self Evolution Reflections Table
CREATE TABLE IF NOT EXISTS self_evolution_reflections (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES self_evolution_runs(id) ON DELETE CASCADE,
  insights TEXT NOT NULL,
  sentiment JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Self Evolution Proposals Table
CREATE TABLE IF NOT EXISTS self_evolution_proposals (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES self_evolution_runs(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('capability','prompt','persona','cleanup','wildcard')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  risk_level SMALLINT CHECK (risk_level BETWEEN 0 AND 5),
  effort SMALLINT CHECK (effort BETWEEN 0 AND 5),
  allowlisted BOOLEAN DEFAULT FALSE,
  blocked_reasons TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Self Evolution Actions Table
CREATE TABLE IF NOT EXISTS self_evolution_actions (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER NOT NULL REFERENCES self_evolution_proposals(id) ON DELETE CASCADE,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('issue','pr','prompt_change','tool_add','doc_update','config')),
  payload JSONB,
  status VARCHAR(20) NOT NULL CHECK (status IN ('planned','submitted','merged','rolled_back')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Self Evolution Rollbacks Table
CREATE TABLE IF NOT EXISTS self_evolution_rollbacks (
  id SERIAL PRIMARY KEY,
  action_id INTEGER NOT NULL REFERENCES self_evolution_actions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature Flags Table
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  value BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_runs_status_date ON self_evolution_runs(status, run_date);
CREATE INDEX IF NOT EXISTS idx_reflections_run ON self_evolution_reflections(run_id);
CREATE INDEX IF NOT EXISTS idx_proposals_run ON self_evolution_proposals(run_id);
CREATE INDEX IF NOT EXISTS idx_actions_proposal ON self_evolution_actions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON self_evolution_actions(status);

-- Verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'self_evolution_runs',
  'self_evolution_reflections',
  'self_evolution_proposals',
  'self_evolution_actions',
  'self_evolution_rollbacks',
  'feature_flags'
)
ORDER BY table_name;
EOF

echo "✅ Migration completed successfully!"
