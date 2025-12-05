#!/bin/bash
# Create self-evolution tables for tracking daily reflection runs and safety policies

psql "$DATABASE_URL" << 'EOF'
-- Table for tracking safety policies/constraints
CREATE TABLE IF NOT EXISTS safety_policy (
  id SERIAL PRIMARY KEY,
  policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN ('max_loc', 'max_files', 'max_directories', 'allowlist', 'blocklist')),
  policy_value TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for tracking self-evolution runs
CREATE TABLE IF NOT EXISTS self_evolution_run (
  id SERIAL PRIMARY KEY,
  run_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  trigger_type VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  pr_number INTEGER,
  pr_url TEXT,
  branch_name TEXT,

  -- Metrics about the changes
  total_loc_changed INTEGER DEFAULT 0,
  total_files_changed INTEGER DEFAULT 0,
  total_directories_changed INTEGER DEFAULT 0,

  -- Run metadata
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  skip_reason TEXT,

  -- Analysis results (stored as JSONB for flexibility)
  reflection_summary JSONB,
  proposed_changes JSONB,
  safety_check_results JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for tracking individual changes within a run
CREATE TABLE IF NOT EXISTS self_evolution_change (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES self_evolution_run(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('create', 'modify', 'delete')),
  lines_added INTEGER DEFAULT 0,
  lines_removed INTEGER DEFAULT 0,
  change_category VARCHAR(100),
  change_description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_safety_policy_active ON safety_policy(is_active);
CREATE INDEX IF NOT EXISTS idx_safety_policy_type ON safety_policy(policy_type);

CREATE INDEX IF NOT EXISTS idx_self_evolution_run_date ON self_evolution_run(run_date DESC);
CREATE INDEX IF NOT EXISTS idx_self_evolution_run_status ON self_evolution_run(status);
CREATE INDEX IF NOT EXISTS idx_self_evolution_run_pr_number ON self_evolution_run(pr_number);

CREATE INDEX IF NOT EXISTS idx_self_evolution_change_run_id ON self_evolution_change(run_id);
CREATE INDEX IF NOT EXISTS idx_self_evolution_change_file_path ON self_evolution_change(file_path);

-- Insert default safety policies
INSERT INTO safety_policy (policy_type, policy_value, description, is_active)
VALUES
  ('max_loc', '500', 'Maximum lines of code changed per run', true),
  ('max_files', '10', 'Maximum files changed per run', true),
  ('max_directories', '4', 'Maximum directories affected per run', true),
  ('allowlist', 'prompts/', 'Allowed directory for modifications', true),
  ('allowlist', 'docs/', 'Allowed directory for modifications', true),
  ('allowlist', 'apps/bot/src/agent/tools:new_only', 'Allowed directory (new files only)', true),
  ('allowlist', '.github/workflows/:new_only', 'Allowed directory (new workflows only)', true),
  ('allowlist', 'config/feature-flags.*', 'Allowed file pattern', true),
  ('blocklist', 'apps/bot/src/index.ts', 'Core runtime entrypoint - blocked', true),
  ('blocklist', 'apps/*/src/index.ts', 'Runtime entrypoints - blocked', true),
  ('blocklist', 'scripts/deploy-*.sh', 'Deployment scripts - blocked', true),
  ('blocklist', '.env*', 'Environment files - blocked', true),
  ('blocklist', 'packages/database/scripts/*', 'Database migrations - blocked unless approved', true)
ON CONFLICT DO NOTHING;

-- Display table info
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('safety_policy', 'self_evolution_run', 'self_evolution_change')
ORDER BY table_name, ordinal_position;

EOF

echo "✅ self-evolution tables created successfully"
