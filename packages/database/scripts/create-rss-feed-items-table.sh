#!/bin/bash
# Create rss_feed_items table directly in PostgreSQL
# Usage: ./create-rss-feed-items-table.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating rss_feed_items table..."

psql "$DB_URL" << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "rss_feed_items" (
    "id" TEXT NOT NULL,
    "message_id" VARCHAR(255) NOT NULL,
    "summary" TEXT NOT NULL,
    "link" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "rss_feed_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex - Unique constraint on message_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS "rss_feed_items_message_id_key" ON "rss_feed_items"("message_id");

-- CreateIndex - For quick lookups by message_id
CREATE INDEX IF NOT EXISTS "idx_rss_message_id" ON "rss_feed_items"("message_id");

-- CreateIndex - For ordering by creation date
CREATE INDEX IF NOT EXISTS "idx_rss_created_at" ON "rss_feed_items"("created_at" DESC);

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rss_feed_items';
EOF

echo "✅ Migration completed successfully!"
