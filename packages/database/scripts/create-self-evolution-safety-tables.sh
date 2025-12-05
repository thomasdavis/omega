#!/bin/bash
# Create safety_policy and self_evolution_rollbacks tables for self-evolution guardrails

psql "$DATABASE_URL" << 'EOF'
-- ============================================================================
-- Safety Policy Table
-- Stores configurable guardrail settings for self-evolution loop
-- ============================================================================
CREATE TABLE IF NOT EXISTS safety_policy (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  policy_name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Diff caps
  max_lines_of_code INTEGER NOT NULL DEFAULT 500,
  max_files_changed INTEGER NOT NULL DEFAULT 10,
  max_directories_changed INTEGER NOT NULL DEFAULT 4,

  -- Allow/block lists stored as JSONB arrays for flexibility
  allowlist_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocklist_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Policy metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  policy_version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Validation
  CONSTRAINT check_positive_caps CHECK (
    max_lines_of_code > 0 AND
    max_files_changed > 0 AND
    max_directories_changed > 0
  )
);

-- Create indexes for safety_policy
CREATE INDEX IF NOT EXISTS idx_safety_policy_active ON safety_policy(is_active);
CREATE INDEX IF NOT EXISTS idx_safety_policy_name ON safety_policy(policy_name);
CREATE INDEX IF NOT EXISTS idx_safety_policy_created_at ON safety_policy(created_at DESC);

-- Insert default policy
INSERT INTO safety_policy (
  policy_name,
  description,
  max_lines_of_code,
  max_files_changed,
  max_directories_changed,
  allowlist_patterns,
  blocklist_patterns,
  is_active
) VALUES (
  'default',
  'Default self-evolution safety policy with standard guardrails',
  500,
  10,
  4,
  '["prompts/", "docs/", "apps/bot/src/agent/tools/", ".github/workflows/", "config/feature-flags"]'::jsonb,
  '["packages/agent/src/agent.ts", "packages/agent/src/toolLoader.ts", "packages/database/", "scripts/deploy-railway.sh", ".env", "credentials.json", "packages/database/scripts/", "packages/database/prisma/"]'::jsonb,
  true
) ON CONFLICT (policy_name) DO NOTHING;

-- ============================================================================
-- Self Evolution Rollbacks Table
-- Tracks failed self-evolution attempts and rollback actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS self_evolution_rollbacks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- PR/commit details
  pr_number INTEGER,
  pr_title TEXT,
  pr_url TEXT,
  commit_sha TEXT,
  branch_name TEXT,

  -- Failure details
  failure_reason TEXT NOT NULL,
  failure_type TEXT NOT NULL CHECK (failure_type IN (
    'guardrail_violation',
    'test_failure',
    'build_failure',
    'runtime_error',
    'manual_rollback',
    'other'
  )),
  violation_details JSONB,

  -- Rollback tracking
  rollback_status TEXT NOT NULL DEFAULT 'pending' CHECK (rollback_status IN (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'skipped'
  )),
  rollback_commit_sha TEXT,
  rollback_completed_at TIMESTAMPTZ,

  -- Metadata
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for self_evolution_rollbacks
CREATE INDEX IF NOT EXISTS idx_self_evolution_rollbacks_pr ON self_evolution_rollbacks(pr_number);
CREATE INDEX IF NOT EXISTS idx_self_evolution_rollbacks_status ON self_evolution_rollbacks(rollback_status);
CREATE INDEX IF NOT EXISTS idx_self_evolution_rollbacks_failure_type ON self_evolution_rollbacks(failure_type);
CREATE INDEX IF NOT EXISTS idx_self_evolution_rollbacks_created_at ON self_evolution_rollbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_self_evolution_rollbacks_branch ON self_evolution_rollbacks(branch_name);

-- ============================================================================
-- Display table schemas
-- ============================================================================
SELECT '=== safety_policy table ===' as info;
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'safety_policy'
ORDER BY ordinal_position;

SELECT '=== self_evolution_rollbacks table ===' as info;
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'self_evolution_rollbacks'
ORDER BY ordinal_position;

-- Display default policy
SELECT '=== Default Safety Policy ===' as info;
SELECT
  policy_name,
  max_lines_of_code,
  max_files_changed,
  max_directories_changed,
  is_active
FROM safety_policy
WHERE policy_name = 'default';

EOF

echo "✅ Self-evolution safety tables created successfully"
echo "   - safety_policy: Configurable guardrail settings"
echo "   - self_evolution_rollbacks: Rollback tracking"
echo "   - Default policy inserted with 500 LOC, 10 files, 4 dirs caps"
