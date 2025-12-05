#!/bin/bash
set -e  # Exit on error

# Check environment variable
if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"
echo "🚀 Creating self-evolution safety tables..."

# Use heredoc for SQL
psql "$DB_URL" << 'EOF'
-- ============================================================================
-- Self-Evolution Safety Tables
-- ============================================================================
-- Purpose: Enforce guardrails and track rollbacks for self-evolution loop
-- Created: 2025-12-05
-- ============================================================================

-- safety_policy table: Configurable safety parameters for self-evolution
CREATE TABLE IF NOT EXISTS "safety_policy" (
    "id" SERIAL PRIMARY KEY,
    "policy_name" TEXT NOT NULL UNIQUE,
    "max_lines_of_code" INTEGER NOT NULL DEFAULT 500,
    "max_files_changed" INTEGER NOT NULL DEFAULT 10,
    "max_directories_affected" INTEGER NOT NULL DEFAULT 4,
    "allow_patterns" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "block_patterns" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "require_canary_tests" BOOLEAN NOT NULL DEFAULT true,
    "auto_rollback_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    "updated_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    "metadata" JSONB
);

-- self_evolution_rollbacks table: Track rollback events and failures
CREATE TABLE IF NOT EXISTS "self_evolution_rollbacks" (
    "id" SERIAL PRIMARY KEY,
    "pr_number" INTEGER NOT NULL,
    "pr_url" TEXT NOT NULL,
    "rollback_reason" TEXT NOT NULL,
    "failure_type" TEXT NOT NULL,
    "files_affected" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "error_details" JSONB,
    "rollback_commit_sha" TEXT,
    "rollback_branch" TEXT,
    "rollback_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    "resolved_at" BIGINT,
    "resolved_by" TEXT,
    "metadata" JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_safety_policy_active"
    ON "safety_policy"("is_active") WHERE "is_active" = true;

CREATE INDEX IF NOT EXISTS "idx_safety_policy_policy_name"
    ON "safety_policy"("policy_name");

CREATE INDEX IF NOT EXISTS "idx_safety_policy_created_at"
    ON "safety_policy"("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_rollbacks_pr_number"
    ON "self_evolution_rollbacks"("pr_number");

CREATE INDEX IF NOT EXISTS "idx_rollbacks_status"
    ON "self_evolution_rollbacks"("rollback_status");

CREATE INDEX IF NOT EXISTS "idx_rollbacks_created_at"
    ON "self_evolution_rollbacks"("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_rollbacks_failure_type"
    ON "self_evolution_rollbacks"("failure_type");

-- Insert default safety policy
INSERT INTO "safety_policy" (
    "policy_name",
    "max_lines_of_code",
    "max_files_changed",
    "max_directories_affected",
    "allow_patterns",
    "block_patterns",
    "require_canary_tests",
    "auto_rollback_enabled",
    "is_active",
    "metadata"
)
VALUES (
    'default',
    500,
    10,
    4,
    '["prompts/**/*", "docs/**/*", "apps/bot/src/agent/tools/**/*.ts", ".github/workflows/*.yml", "config/feature-flags.*"]'::jsonb,
    '["apps/bot/src/index.ts", "packages/database/prisma/schema.prisma", "packages/database/scripts/**/*", ".env*", "*.secret*", "credentials.*", "railway.json", "scripts/deploy-*"]'::jsonb,
    true,
    true,
    true,
    '{"description": "Default safety policy for self-evolution loop", "version": "1.0", "created_by": "claude"}'::jsonb
)
ON CONFLICT ("policy_name") DO UPDATE SET
    "max_lines_of_code" = EXCLUDED."max_lines_of_code",
    "max_files_changed" = EXCLUDED."max_files_changed",
    "max_directories_affected" = EXCLUDED."max_directories_affected",
    "allow_patterns" = EXCLUDED."allow_patterns",
    "block_patterns" = EXCLUDED."block_patterns",
    "require_canary_tests" = EXCLUDED."require_canary_tests",
    "auto_rollback_enabled" = EXCLUDED."auto_rollback_enabled",
    "updated_at" = (EXTRACT(epoch FROM now()))::bigint;

-- Verify tables were created
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_name IN ('safety_policy', 'self_evolution_rollbacks')
ORDER BY table_name;

-- Show default policy
SELECT
    policy_name,
    max_lines_of_code,
    max_files_changed,
    max_directories_affected,
    is_active
FROM safety_policy
WHERE policy_name = 'default';

EOF

echo "✅ Migration completed successfully!"
echo "   - Created safety_policy table with default policy"
echo "   - Created self_evolution_rollbacks table"
echo "   - Created performance indexes"
