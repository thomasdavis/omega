#!/bin/bash
# Ensure user_profiles table has basic editable profile fields
# This script is idempotent and can be run multiple times safely
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/ensure-user-profile-basic-fields.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🔍 Checking current user_profiles schema..."
echo ""

# First, show current state
psql "$DB_URL" << 'EOF'
SELECT
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name IN ('avatar_url', 'bio', 'preferences') THEN '✓ Basic Field'
    ELSE ''
  END as category
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('user_id', 'username', 'avatar_url', 'bio', 'preferences', 'created_at', 'updated_at')
ORDER BY
  CASE column_name
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
echo "🚀 Applying migration to add basic user-editable profile fields..."
echo ""

psql "$DB_URL" << 'EOF'
-- Add avatar_url column for user avatar/profile picture URL
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add bio column for user biography/description (max ~1000 chars recommended)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add preferences column for user preferences (JSONB for flexibility)
-- Example: {"theme": "dark", "notifications": true, "language": "en"}
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferences JSONB;

-- Create GIN index on preferences JSONB column for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences_gin
  ON user_profiles USING GIN (preferences);

-- Create standard index on avatar_url for lookups (if needed)
CREATE INDEX IF NOT EXISTS idx_user_profiles_avatar_url
  ON user_profiles (avatar_url) WHERE avatar_url IS NOT NULL;

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('avatar_url', 'bio', 'preferences')
ORDER BY column_name;

-- Show indexes created
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_profiles'
  AND indexname IN ('idx_user_profiles_preferences_gin', 'idx_user_profiles_avatar_url')
ORDER BY indexname;
EOF

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "📊 Summary:"
echo "  - avatar_url: TEXT field for profile picture URLs"
echo "  - bio: TEXT field for user biography"
echo "  - preferences: JSONB field for user settings (with GIN index)"
echo ""
echo "Next steps:"
echo "  1. Update Prisma schema: cd packages/database && pnpm prisma db pull"
echo "  2. Generate Prisma client: pnpm prisma generate"
echo "  3. Run type check: pnpm type-check"
echo ""
