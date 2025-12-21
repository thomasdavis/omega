#!/bin/bash
# Verify that avatar_url, bio, and preferences columns exist in user_profiles table
# Usage: ./verify-user-profile-columns.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🔍 Checking user_profiles table for avatar_url, bio, and preferences columns..."

psql "$DB_URL" << 'EOF'
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('avatar_url', 'bio', 'preferences')
ORDER BY column_name;
EOF

echo ""
echo "🔍 Checking for GIN index on preferences column..."

psql "$DB_URL" << 'EOF'
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_profiles'
AND indexname = 'idx_user_profiles_preferences_gin';
EOF

echo ""
echo "✅ Verification complete!"
