#!/bin/bash
# Verify that avatar_url, bio, and preferences columns exist in user_profiles table
# Usage: ./verify-user-profile-columns.sh
# Exit code 0: All columns and indexes exist
# Exit code 1: Missing columns or indexes

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🔍 Checking user_profiles table for avatar_url, bio, and preferences columns..."

# Check columns and capture count
COLUMN_COUNT=$(psql "$DB_URL" -t -c "
SELECT COUNT(*)
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('avatar_url', 'bio', 'preferences');
" | xargs)

if [ "$COLUMN_COUNT" -ne 3 ]; then
  echo "❌ Error: Expected 3 columns (avatar_url, bio, preferences) but found $COLUMN_COUNT"
  echo ""
  echo "Current columns in user_profiles table:"
  psql "$DB_URL" -c "
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('avatar_url', 'bio', 'preferences')
ORDER BY column_name;
"
  exit 1
fi

echo "✅ Found all 3 required columns"

# Display column details
psql "$DB_URL" -c "
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('avatar_url', 'bio', 'preferences')
ORDER BY column_name;
"

echo ""
echo "🔍 Checking for GIN index on preferences column..."

# Check for GIN index and capture count
INDEX_COUNT=$(psql "$DB_URL" -t -c "
SELECT COUNT(*)
FROM pg_indexes
WHERE tablename = 'user_profiles'
AND indexname = 'idx_user_profiles_preferences_gin';
" | xargs)

if [ "$INDEX_COUNT" -ne 1 ]; then
  echo "❌ Error: GIN index 'idx_user_profiles_preferences_gin' not found"
  echo ""
  echo "Existing indexes on user_profiles table:"
  psql "$DB_URL" -c "
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_profiles'
ORDER BY indexname;
"
  exit 1
fi

echo "✅ Found GIN index on preferences column"

# Display index details
psql "$DB_URL" -c "
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_profiles'
AND indexname = 'idx_user_profiles_preferences_gin';
"

echo ""
echo "✅ Verification complete! All columns and indexes are present."
