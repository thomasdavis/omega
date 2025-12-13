#!/bin/bash
# Create decision_log table for append-only decision tracking
# Issue #878 - Append-only log with blame history for all decisions
# Issue #879 - Create denormalized append-only decision log table
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-decision-log-table.sh'

set -e

echo "🔧 Creating decision_log table..."

psql "$DATABASE_URL" << 'EOF'
-- Create decision_log table (append-only, immutable)
CREATE TABLE IF NOT EXISTS decision_log (
  id SERIAL PRIMARY KEY,
  decision_id TEXT NOT NULL,
  decision_type VARCHAR(100) NOT NULL,
  decision_description TEXT NOT NULL,
  decision_context JSONB DEFAULT '{}',

  -- User/Actor information (who made the decision)
  user_id VARCHAR(255),
  username VARCHAR(255),
  actor_type VARCHAR(50) DEFAULT 'user',

  -- Blame/Attribution information
  responsible_module VARCHAR(255),
  responsible_component VARCHAR(255),
  blame_chain JSONB DEFAULT '[]',

  -- Metadata and additional details
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',

  -- Decision outcome tracking
  outcome VARCHAR(50),
  outcome_details JSONB DEFAULT '{}',

  -- Timestamps (immutable after insert)
  decided_at TIMESTAMPTZ NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure append-only by preventing updates/deletes at application level
  -- Database triggers can be added later if needed for enforcement

  CONSTRAINT decision_log_pkey PRIMARY KEY (id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_decision_log_decision_id ON decision_log(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_log_user_id ON decision_log(user_id);
CREATE INDEX IF NOT EXISTS idx_decision_log_username ON decision_log(username);
CREATE INDEX IF NOT EXISTS idx_decision_log_decision_type ON decision_log(decision_type);
CREATE INDEX IF NOT EXISTS idx_decision_log_responsible_module ON decision_log(responsible_module);
CREATE INDEX IF NOT EXISTS idx_decision_log_responsible_component ON decision_log(responsible_component);
CREATE INDEX IF NOT EXISTS idx_decision_log_decided_at ON decision_log(decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_log_logged_at ON decision_log(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_log_outcome ON decision_log(outcome);

-- GIN index for JSONB columns for efficient querying
CREATE INDEX IF NOT EXISTS idx_decision_log_metadata_gin ON decision_log USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_decision_log_context_gin ON decision_log USING GIN (decision_context);
CREATE INDEX IF NOT EXISTS idx_decision_log_blame_chain_gin ON decision_log USING GIN (blame_chain);

-- GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_decision_log_tags_gin ON decision_log USING GIN (tags);

-- Add comment to document append-only nature
COMMENT ON TABLE decision_log IS 'Append-only immutable log for all bot decisions. No updates or deletes should be performed.';

-- Verify table creation
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'decision_log'
ORDER BY ordinal_position;

EOF

echo "✅ Decision log table created successfully!"
