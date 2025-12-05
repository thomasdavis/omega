#!/bin/bash
# Create self-evolution tracking tables for wildcard feature proposals and actions

psql "$DATABASE_URL" << 'EOF'
-- Create self_evolution_proposals table
CREATE TABLE IF NOT EXISTS self_evolution_proposals (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('wildcard', 'tool', 'schema', 'feature', 'content')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT NOT NULL,
  proposed_changes JSONB NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  estimated_impact TEXT,
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proposed_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'rolled_back')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  review_notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create self_evolution_actions table
CREATE TABLE IF NOT EXISTS self_evolution_actions (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES self_evolution_proposals(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_details JSONB NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_by TEXT,
  execution_status TEXT NOT NULL CHECK (execution_status IN ('success', 'failed', 'partial')),
  execution_log TEXT,
  canary_test_results JSONB,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  rolled_back_at TIMESTAMPTZ,
  rollback_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for proposals
CREATE INDEX IF NOT EXISTS idx_self_evolution_proposals_category ON self_evolution_proposals(category);
CREATE INDEX IF NOT EXISTS idx_self_evolution_proposals_status ON self_evolution_proposals(status);
CREATE INDEX IF NOT EXISTS idx_self_evolution_proposals_proposed_at ON self_evolution_proposals(proposed_at DESC);
CREATE INDEX IF NOT EXISTS idx_self_evolution_proposals_risk_level ON self_evolution_proposals(risk_level);

-- Create indexes for actions
CREATE INDEX IF NOT EXISTS idx_self_evolution_actions_proposal_id ON self_evolution_actions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_self_evolution_actions_executed_at ON self_evolution_actions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_self_evolution_actions_execution_status ON self_evolution_actions(execution_status);
CREATE INDEX IF NOT EXISTS idx_self_evolution_actions_rollout_percentage ON self_evolution_actions(rollout_percentage);

-- Display table info
SELECT 'self_evolution_proposals table:' as info;
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'self_evolution_proposals'
ORDER BY ordinal_position;

SELECT 'self_evolution_actions table:' as info;
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'self_evolution_actions'
ORDER BY ordinal_position;

EOF

echo "✅ self-evolution tables created successfully"
