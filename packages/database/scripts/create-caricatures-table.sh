#!/bin/bash
# Create caricatures table migration script
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-caricatures-table.sh'

set -e

echo "🔧 Creating caricatures table..."

psql "$DATABASE_URL" << 'EOF'
-- Create caricatures table
CREATE TABLE IF NOT EXISTS caricatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  username TEXT,
  image_url TEXT NOT NULL,
  description TEXT,
  style TEXT,
  source_photo_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for caricatures
CREATE INDEX IF NOT EXISTS idx_caricatures_user_id ON caricatures(user_id);
CREATE INDEX IF NOT EXISTS idx_caricatures_created_at ON caricatures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_caricatures_metadata ON caricatures USING GIN(metadata);

-- Verify table creation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'caricatures'
ORDER BY ordinal_position;
EOF

echo "✅ caricatures table created successfully!"
