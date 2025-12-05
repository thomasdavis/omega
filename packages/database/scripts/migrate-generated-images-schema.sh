#!/bin/bash
# Migrate generated_images table to new schema
# This migration drops the old table and creates a new one with the requested schema
# Usage: ./migrate-generated-images-schema.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Migrating generated_images table to new schema..."

psql "$DB_URL" << 'EOF'
-- Drop existing table (WARNING: This will delete all existing data)
DROP TABLE IF EXISTS "generated_images";

-- Create new table with requested schema
CREATE TABLE "generated_images" (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT,
  user_id VARCHAR(32) NOT NULL,
  username TEXT,
  tool_name TEXT NOT NULL DEFAULT 'generateUserImage',
  prompt TEXT NOT NULL,
  model TEXT,
  size VARCHAR(20),
  quality VARCHAR(20),
  style VARCHAR(20),
  n INTEGER DEFAULT 1,
  storage_url TEXT NOT NULL,
  storage_provider VARCHAR(50) DEFAULT 'omega',
  mime_type VARCHAR(50),
  bytes INTEGER,
  sha256 CHAR(64),
  tags TEXT[],
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  error TEXT,
  metadata JSONB,
  message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_generated_images_user_id_created_at ON generated_images(user_id, created_at DESC);
CREATE INDEX idx_generated_images_request_id ON generated_images(request_id);
CREATE INDEX idx_generated_images_status ON generated_images(status) WHERE status <> 'success';
CREATE INDEX idx_generated_images_storage_url ON generated_images(storage_url);
CREATE INDEX idx_generated_images_metadata_gin ON generated_images USING GIN (metadata);
CREATE INDEX idx_generated_images_tags_gin ON generated_images USING GIN (tags);

-- Verify
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'generated_images'
ORDER BY ordinal_position;
EOF

echo "✅ Migration completed successfully!"
