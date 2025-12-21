#!/bin/bash
# Create location_mentions table migration script
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-location-mentions-table.sh'

set -e

echo "🔧 Creating location_mentions table..."

psql "$DATABASE_URL" << 'EOF'
-- Create location_mentions table
CREATE TABLE IF NOT EXISTS location_mentions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  location_text VARCHAR(512) NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_location_mentions_user ON location_mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_location_mentions_timestamp ON location_mentions(timestamp DESC);

-- Verify table creation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'location_mentions'
ORDER BY ordinal_position;

EOF

echo "✅ location_mentions table created successfully!"
