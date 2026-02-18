#!/bin/bash
# Add index on tool_name column in generated_images table
# This improves query performance for comic listing and other tool-filtered queries
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/add-tool-name-index.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "Creating index on generated_images.tool_name..."

psql "$DB_URL" << 'EOF'
CREATE INDEX IF NOT EXISTS idx_generated_images_tool_name ON generated_images(tool_name);
EOF

echo "Migration completed successfully!"
