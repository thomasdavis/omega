#!/bin/bash
# Add index on tool_name column to generated_images table for faster comic listing queries
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/add-tool-name-index-to-generated-images.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Adding tool_name index to generated_images table..."

psql "$DB_URL" << 'EOF'
-- Add index on tool_name for faster filtering by tool type (e.g., comic listing)
CREATE INDEX IF NOT EXISTS idx_generated_images_tool_name ON generated_images(tool_name);

-- Verify the index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'generated_images' AND indexname = 'idx_generated_images_tool_name';
EOF

echo "✅ Migration completed successfully!"
