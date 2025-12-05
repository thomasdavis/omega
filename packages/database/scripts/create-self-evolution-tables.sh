#!/bin/bash
# Create self-evolution framework tables
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-self-evolution-tables.sh'

set -e

echo "🔧 Creating self-evolution framework tables..."

psql "$DATABASE_URL" << 'EOF'
-- Create self_evolution_cycles table
CREATE TABLE IF NOT EXISTS self_evolution_cycles (
  id SERIAL PRIMARY KEY,
  cycle_date DATE UNIQUE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  summary TEXT,
  wildcard_title TEXT,
  status VARCHAR(32) DEFAULT 'planned' CHECK (status IN ('planned','running','completed','failed','reverted'))
);

-- Create self_evolution_actions table
CREATE TABLE IF NOT EXISTS self_evolution_actions (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES self_evolution_cycles(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL CHECK (type IN ('capability','future','wildcard','prompt','persona')),
  title TEXT NOT NULL,
  description TEXT,
  issue_number INTEGER,
  pr_number INTEGER,
  branch_name VARCHAR(128),
  status VARCHAR(32) DEFAULT 'planned' CHECK (status IN ('planned','in_progress','done','skipped','reverted','failed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create self_evolution_sanity_checks table
CREATE TABLE IF NOT EXISTS self_evolution_sanity_checks (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES self_evolution_cycles(id) ON DELETE CASCADE,
  check_name VARCHAR(128) NOT NULL,
  passed BOOLEAN NOT NULL,
  result VARCHAR(32) CHECK (result IN ('pass','warn','fail')),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create self_evolution_metrics table
CREATE TABLE IF NOT EXISTS self_evolution_metrics (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES self_evolution_cycles(id) ON DELETE CASCADE,
  metric_name VARCHAR(128) NOT NULL,
  metric_value DOUBLE PRECISION,
  unit VARCHAR(32),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create self_evolution_branches table
CREATE TABLE IF NOT EXISTS self_evolution_branches (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES self_evolution_cycles(id) ON DELETE CASCADE,
  branch_name VARCHAR(128) UNIQUE NOT NULL,
  base_branch VARCHAR(64) DEFAULT 'main',
  pr_number INTEGER,
  merged BOOLEAN DEFAULT FALSE,
  closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_cycles_date ON self_evolution_cycles(cycle_date);
CREATE INDEX IF NOT EXISTS idx_actions_cycle ON self_evolution_actions(cycle_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON self_evolution_actions(status);
CREATE INDEX IF NOT EXISTS idx_checks_cycle ON self_evolution_sanity_checks(cycle_id);
CREATE INDEX IF NOT EXISTS idx_metrics_cycle ON self_evolution_metrics(cycle_id);
CREATE INDEX IF NOT EXISTS idx_branches_cycle ON self_evolution_branches(cycle_id);

-- Verify table creation
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'self_evolution%'
ORDER BY table_name;

EOF

echo "✅ Self-evolution framework tables created successfully!"
