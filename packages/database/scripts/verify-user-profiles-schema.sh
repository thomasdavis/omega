#!/bin/bash
# Verify user_profiles schema and identify missing fields
# This is a read-only diagnostic script
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/verify-user-profiles-schema.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "═══════════════════════════════════════════════════════════"
echo "  USER PROFILES SCHEMA VERIFICATION"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "📊 Checking for basic user-editable fields..."
echo ""

psql "$DB_URL" << 'EOF'
-- Check for required basic fields
WITH required_fields AS (
  SELECT unnest(ARRAY['user_id', 'username', 'avatar_url', 'bio', 'preferences', 'created_at', 'updated_at']) AS field_name
),
current_fields AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'user_profiles'
)
SELECT
  rf.field_name,
  CASE
    WHEN cf.column_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
FROM required_fields rf
LEFT JOIN current_fields cf ON rf.field_name = cf.column_name
ORDER BY
  CASE rf.field_name
    WHEN 'user_id' THEN 1
    WHEN 'username' THEN 2
    WHEN 'avatar_url' THEN 3
    WHEN 'bio' THEN 4
    WHEN 'preferences' THEN 5
    WHEN 'created_at' THEN 6
    WHEN 'updated_at' THEN 7
  END;
EOF

echo ""
echo "📋 Full schema for basic fields (if they exist)..."
echo ""

psql "$DB_URL" << 'EOF'
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('user_id', 'username', 'avatar_url', 'bio', 'preferences', 'created_at', 'updated_at')
ORDER BY ordinal_position;
EOF

echo ""
echo "🔍 Checking indexes on basic fields..."
echo ""

psql "$DB_URL" << 'EOF'
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_profiles'
  AND (indexname LIKE '%user_id%'
    OR indexname LIKE '%username%'
    OR indexname LIKE '%avatar%'
    OR indexname LIKE '%preferences%')
ORDER BY indexname;
EOF

echo ""
echo "📈 Table statistics..."
echo ""

psql "$DB_URL" << 'EOF'
SELECT
  COUNT(*) AS total_profiles,
  COUNT(CASE WHEN avatar_url IS NOT NULL THEN 1 END) AS profiles_with_avatar,
  COUNT(CASE WHEN bio IS NOT NULL THEN 1 END) AS profiles_with_bio,
  COUNT(CASE WHEN preferences IS NOT NULL THEN 1 END) AS profiles_with_preferences
FROM user_profiles;
EOF

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  VERIFICATION COMPLETE"
echo "═══════════════════════════════════════════════════════════"
echo ""
