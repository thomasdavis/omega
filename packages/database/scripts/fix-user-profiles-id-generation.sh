#!/bin/bash
# Fix user_profiles table to auto-generate ID column
# This migration addresses insert failures caused by missing or null IDs
#
# Changes:
# 1. Add DEFAULT gen_random_uuid()::text to id column for auto-generation
# 2. Ensures backward compatibility - existing code continues to work
# 3. Application code can optionally remove manual UUID generation
#
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/fix-user-profiles-id-generation.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Starting user_profiles ID auto-generation migration..."
echo ""
echo "This migration will:"
echo "  1. Add DEFAULT gen_random_uuid()::text to id column"
echo "  2. Verify the change was applied"
echo ""

psql "$DB_URL" << 'EOF'
-- Step 1: Add DEFAULT to id column for auto-generation
-- This allows inserts without specifying an ID
ALTER TABLE user_profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Verify the default was added
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name = 'id';

EOF

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "Next steps:"
echo "  1. Update Prisma schema: cd packages/database && pnpm prisma db pull && pnpm prisma generate"
echo "  2. Optionally update application code to remove manual UUID generation"
echo "  3. Test inserts work without specifying ID"
echo ""
