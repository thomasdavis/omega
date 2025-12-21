#!/bin/bash
# Verify generated_images table exists and show its structure
# Usage: ./verify-generated-images-table.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🔍 Checking if generated_images table exists..."

psql "$DB_URL" << 'EOF'
-- Check if table exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'generated_images'
    )
    THEN '✅ Table exists'
    ELSE '❌ Table does NOT exist'
  END as table_status;

-- If table exists, show its structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'generated_images'
ORDER BY ordinal_position;

-- Show indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'generated_images'
ORDER BY indexname;

-- Show record count
SELECT
  COUNT(*) as total_images,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_image,
  MAX(created_at) as last_image
FROM generated_images;
EOF

echo "✅ Verification completed!"
