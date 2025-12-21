#!/bin/bash
# Create tos_summaries table for storing Terms of Service summaries
# Usage: ./create-tos-summaries-table.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating tos_summaries table..."

psql "$DB_URL" << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "tos_summaries" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "raw_content" TEXT,
    "summary" TEXT,
    "key_points" JSONB,
    "risk_flags" JSONB,
    "privacy_concerns" JSONB,
    "liability_limitations" TEXT,
    "content_hash" TEXT,
    "domain" TEXT,
    "fetch_status" TEXT DEFAULT 'success',
    "fetch_error" TEXT,
    "requested_by" TEXT,
    "requested_by_username" TEXT,
    "metadata" JSONB,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    "updated_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "tos_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex - Unique constraint on URL to prevent duplicate fetches
CREATE UNIQUE INDEX IF NOT EXISTS "tos_summaries_url_key" ON "tos_summaries"("url");

-- CreateIndex - Index on domain for quick lookups by domain
CREATE INDEX IF NOT EXISTS "idx_tos_summaries_domain" ON "tos_summaries"("domain");

-- CreateIndex - Index on requested_by for user-specific queries
CREATE INDEX IF NOT EXISTS "idx_tos_summaries_requested_by" ON "tos_summaries"("requested_by");

-- CreateIndex - Index on created_at for chronological queries
CREATE INDEX IF NOT EXISTS "idx_tos_summaries_created_at" ON "tos_summaries"("created_at" DESC);

-- CreateIndex - Index on content_hash for detecting duplicate content
CREATE INDEX IF NOT EXISTS "idx_tos_summaries_content_hash" ON "tos_summaries"("content_hash");

-- CreateIndex - GIN index on key_points JSONB for fast JSON queries
CREATE INDEX IF NOT EXISTS "idx_tos_summaries_key_points_gin" ON "tos_summaries" USING GIN("key_points");

-- CreateIndex - GIN index on risk_flags JSONB for fast JSON queries
CREATE INDEX IF NOT EXISTS "idx_tos_summaries_risk_flags_gin" ON "tos_summaries" USING GIN("risk_flags");

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tos_summaries'
ORDER BY ordinal_position;
EOF

echo "✅ Migration completed successfully!"
