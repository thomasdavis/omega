#!/bin/bash
# Add notification settings column to user_profiles table
# Usage: ./add-notification-settings.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Adding notify_on_feature_complete column to user_profiles table..."

psql "$DB_URL" << 'EOF'
-- Add notification preference column
ALTER TABLE "user_profiles"
ADD COLUMN IF NOT EXISTS "notify_on_feature_complete" BOOLEAN NOT NULL DEFAULT true;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name = 'notify_on_feature_complete';
EOF

echo "✅ Migration completed successfully!"
