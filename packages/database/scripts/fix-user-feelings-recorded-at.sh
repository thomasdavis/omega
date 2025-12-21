#!/bin/bash
# Fix missing recorded_at column in user_feelings table
# This migration is idempotent and safe to run multiple times
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/fix-user-feelings-recorded-at.sh'

set -e

echo "🔧 Fixing user_feelings table - adding recorded_at column if missing..."

psql "$DATABASE_URL" << 'EOF'
-- Add recorded_at column if it doesn't exist
-- This handles the case where the table was created before the column was added
ALTER TABLE user_feelings
ADD COLUMN IF NOT EXISTS recorded_at BIGINT;

-- For existing rows without recorded_at, populate from created_at
-- This ensures backward compatibility with any existing data
UPDATE user_feelings
SET recorded_at = created_at
WHERE recorded_at IS NULL;

-- Now make the column NOT NULL since it's required
ALTER TABLE user_feelings
ALTER COLUMN recorded_at SET NOT NULL;

-- Create index if it doesn't exist (idempotent)
CREATE INDEX IF NOT EXISTS idx_user_feelings_recorded_at ON user_feelings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feelings_user_recorded ON user_feelings(user_id, recorded_at DESC);

-- Verify the fix
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_feelings'
  AND column_name = 'recorded_at';

-- Show sample data to verify
SELECT COUNT(*) as total_feelings,
       COUNT(recorded_at) as with_recorded_at,
       MIN(recorded_at) as oldest_recorded_at,
       MAX(recorded_at) as newest_recorded_at
FROM user_feelings;

EOF

echo "✅ user_feelings table fixed successfully!"
echo "   - recorded_at column exists and is NOT NULL"
echo "   - Indexes created for optimal query performance"
