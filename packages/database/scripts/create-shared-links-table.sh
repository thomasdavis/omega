#!/bin/bash
# Create shared_links table for Discord link collection with topic tags
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-shared-links-table.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating shared_links table..."

psql "$DB_URL" << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "shared_links" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "tags" JSONB DEFAULT '[]'::jsonb,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "channel_name" TEXT NOT NULL,
    "guild_id" TEXT,
    "message_id" TEXT NOT NULL,
    "message_content" TEXT,
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "is_archived" BOOLEAN DEFAULT false,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    "updated_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "shared_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (for fast lookups by user)
CREATE INDEX IF NOT EXISTS "idx_shared_links_user_id" ON "shared_links"("user_id");

-- CreateIndex (for fast lookups by channel)
CREATE INDEX IF NOT EXISTS "idx_shared_links_channel_id" ON "shared_links"("channel_id");

-- CreateIndex (for fast temporal queries)
CREATE INDEX IF NOT EXISTS "idx_shared_links_created_at" ON "shared_links"("created_at" DESC);

-- CreateIndex (for tag search using GIN)
CREATE INDEX IF NOT EXISTS "idx_shared_links_tags" ON "shared_links" USING GIN("tags");

-- CreateIndex (for filtering archived links)
CREATE INDEX IF NOT EXISTS "idx_shared_links_is_archived" ON "shared_links"("is_archived");

-- CreateIndex (for URL uniqueness checks)
CREATE INDEX IF NOT EXISTS "idx_shared_links_url" ON "shared_links"("url");

-- CreateIndex (for message reference lookups)
CREATE INDEX IF NOT EXISTS "idx_shared_links_message_id" ON "shared_links"("message_id");

-- Verify table creation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'shared_links'
ORDER BY ordinal_position;

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'shared_links'
ORDER BY indexname;

EOF

echo "✅ shared_links table created successfully!"
