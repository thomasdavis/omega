#!/bin/bash
# Add basic profile fields to user_profiles table for user-editable profile information
# Usage: ./add-user-profile-basic-fields.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Adding avatar_url, bio, and preferences fields to user_profiles table..."

psql "$DB_URL" << 'EOF'
-- Add avatar_url column for user avatar/profile picture
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add bio column for user biography/description
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add preferences column for user preferences (JSONB for flexibility)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferences JSONB;

-- Create index on preferences JSONB column for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences_gin ON user_profiles USING GIN (preferences);

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('avatar_url', 'bio', 'preferences')
ORDER BY column_name;
EOF

echo "✅ Migration completed successfully!"
