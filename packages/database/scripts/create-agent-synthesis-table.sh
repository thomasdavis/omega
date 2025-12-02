#!/bin/bash
# Create agent_syntheses table directly in PostgreSQL
# Usage: ./create-agent-synthesis-table.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating agent_syntheses table..."

psql "$DB_URL" << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_syntheses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "synthesis_content" TEXT NOT NULL,
    "message_count" INTEGER NOT NULL,
    "generated_at" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    "updated_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "agent_syntheses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agent_syntheses_user_id_key" ON "agent_syntheses"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_agent_synthesis_user_id" ON "agent_syntheses"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_agent_synthesis_generated_at" ON "agent_syntheses"("generated_at" DESC);

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agent_syntheses';
EOF

echo "✅ Migration completed successfully!"
