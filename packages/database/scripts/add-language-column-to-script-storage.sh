#!/bin/bash
# Add missing 'language' column to script_storage table
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/add-language-column-to-script-storage.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Adding 'language' column to script_storage table..."

psql "$DB_URL" << 'EOF'
-- Add language column if it doesn't exist
ALTER TABLE script_storage
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'javascript';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'script_storage'
ORDER BY ordinal_position;
EOF

echo "✅ Migration completed successfully!"
