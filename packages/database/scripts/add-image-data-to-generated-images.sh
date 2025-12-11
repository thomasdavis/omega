#!/bin/bash
# Add image_data column to generated_images table for storing comic images
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/add-image-data-to-generated-images.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Adding image_data column to generated_images table..."

psql "$DB_URL" << 'EOF'
-- Add image_data column to store binary image data
ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS image_data BYTEA;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'generated_images' AND column_name = 'image_data';

-- Show table structure
\d generated_images
EOF

echo "✅ Migration completed successfully!"
