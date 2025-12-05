#!/bin/bash
# Create user_feelings table directly in PostgreSQL
# Usage: ./create-user-feelings-table.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating user_feelings table..."

psql "$DB_URL" << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "user_feelings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT,
    "feeling_type" TEXT NOT NULL,
    "intensity" INTEGER,
    "valence" TEXT,
    "notes" TEXT,
    "context" JSONB,
    "triggers" JSONB,
    "physical_state" TEXT,
    "mental_state" TEXT,
    "metadata" JSONB,
    "timestamp" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "user_feelings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_user_feelings_user_id" ON "user_feelings"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_feelings_timestamp" ON "user_feelings"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_feelings_feeling_type" ON "user_feelings"("feeling_type");
CREATE INDEX IF NOT EXISTS "idx_user_feelings_user_timestamp" ON "user_feelings"("user_id", "timestamp" DESC);

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_feelings';
EOF

echo "✅ Migration completed successfully!"
