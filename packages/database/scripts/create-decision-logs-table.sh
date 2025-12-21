#!/bin/bash
# Create decision_logs table for append-only audit trail of bot decisions
# Usage: ./create-decision-logs-table.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating decision_logs table..."

psql "$DB_URL" << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "decision_logs" (
    "id" SERIAL PRIMARY KEY,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "user_id" VARCHAR(255),
    "username" VARCHAR(255),
    "decision_description" TEXT NOT NULL,
    "blame" TEXT,
    "metadata" JSONB
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_decision_logs_timestamp" ON "decision_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_decision_logs_user_id" ON "decision_logs"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_decision_logs_metadata_gin" ON "decision_logs" USING GIN ("metadata");

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'decision_logs';
EOF

echo "✅ Migration completed successfully!"
