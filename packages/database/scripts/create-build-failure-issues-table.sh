#!/bin/bash
# Create build_failure_issues table directly in PostgreSQL
# Usage: ./create-build-failure-issues-table.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating build_failure_issues table..."

psql "$DB_URL" << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "build_failure_issues" (
    "id" SERIAL PRIMARY KEY,
    "discord_message_id" VARCHAR(255) NOT NULL UNIQUE,
    "channel_id" VARCHAR(255) NOT NULL,
    "issue_number" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "message_snippet" TEXT
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_build_failure_msg_id" ON "build_failure_issues"("discord_message_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_build_failure_issue_number" ON "build_failure_issues"("issue_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_build_failure_created_at" ON "build_failure_issues"("created_at" DESC);

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'build_failure_issues';
EOF

echo "✅ Migration completed successfully!"
