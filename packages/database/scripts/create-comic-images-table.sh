#!/bin/bash
# Create comic_images table for storing generated comic image data
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-comic-images-table.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating comic_images table..."

psql "$DB_URL" << 'EOF'
-- Create comic_images table
CREATE TABLE IF NOT EXISTS comic_images (
  id SERIAL PRIMARY KEY,
  comic_id INTEGER NOT NULL,
  image_url VARCHAR(2048) NOT NULL,
  image_data BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comic_images_comic_id ON comic_images(comic_id);
CREATE INDEX IF NOT EXISTS idx_comic_images_created_at ON comic_images(created_at DESC);

-- Verify table creation
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'comic_images'
ORDER BY ordinal_position;

-- Display count
SELECT COUNT(*) as total_comic_images FROM comic_images;
EOF

echo "✅ Migration completed successfully!"
