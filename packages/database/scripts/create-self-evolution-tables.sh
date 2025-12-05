#!/bin/bash
# Create self_evolution_proposals and self_evolution_actions tables
# for tracking autonomous wildcard feature changes

psql "$DATABASE_URL" << 'EOF'
-- Create proposals table for tracking proposed self-evolution changes
CREATE TABLE IF NOT EXISTS self_evolution_proposals (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('wildcard', 'enhancement', 'bugfix', 'optimization')),
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('saved_reply', 'prompt_flavor', 'tool_alias', 'joke_category', 'config_tweak')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT NOT NULL,
  proposed_change JSONB NOT NULL,
  allowlist_area TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  reversible BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'rolled_back')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create actions table for tracking executed self-evolution changes
CREATE TABLE IF NOT EXISTS self_evolution_actions (
  id TEXT PRIMARY KEY,
  proposal_id TEXT REFERENCES self_evolution_proposals(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('wildcard', 'enhancement', 'bugfix', 'optimization')),
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  executed_change JSONB NOT NULL,
  rollback_info JSONB,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  execution_time_ms INTEGER,
  user_feedback_score INTEGER CHECK (user_feedback_score >= 1 AND user_feedback_score <= 5),
  user_feedback_text TEXT,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rolled_back_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for proposals
CREATE INDEX IF NOT EXISTS idx_proposals_category ON self_evolution_proposals(category);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON self_evolution_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_proposed_at ON self_evolution_proposals(proposed_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_proposal_type ON self_evolution_proposals(proposal_type);
CREATE INDEX IF NOT EXISTS idx_proposals_risk_level ON self_evolution_proposals(risk_level);

-- Create indexes for actions
CREATE INDEX IF NOT EXISTS idx_actions_category ON self_evolution_actions(category);
CREATE INDEX IF NOT EXISTS idx_actions_proposal_id ON self_evolution_actions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_actions_executed_at ON self_evolution_actions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_actions_success ON self_evolution_actions(success);
CREATE INDEX IF NOT EXISTS idx_actions_rollout_percentage ON self_evolution_actions(rollout_percentage);

-- Display proposals table info
SELECT
  'self_evolution_proposals' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'self_evolution_proposals'
ORDER BY ordinal_position;

-- Display actions table info
SELECT
  'self_evolution_actions' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'self_evolution_actions'
ORDER BY ordinal_position;

EOF

echo "✅ self_evolution_proposals and self_evolution_actions tables created successfully"
