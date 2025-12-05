#!/bin/bash
# Create caricatures table directly in PostgreSQL
# Usage: ./create-caricatures-table.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating caricatures table..."

psql "$DB_URL" << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "caricatures" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "description" TEXT,
    "personality_tags" JSONB,
    "metadata" JSONB,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    "updated_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "caricatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_caricatures_user_id" ON "caricatures"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_caricatures_created_at" ON "caricatures"("created_at" DESC);

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'caricatures';
EOF

echo "✅ Migration completed successfully!"
