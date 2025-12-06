#!/bin/bash
# Create geo_guess table migration script
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-geo-guess-table.sh'

set -e

echo "🌍 Creating geo_guess table..."

psql "$DATABASE_URL" << 'EOF'
-- Create geo_guess table
CREATE TABLE IF NOT EXISTS geo_guess (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  photo_url VARCHAR(2048),
  guessed_location VARCHAR(255),
  confidence_score FLOAT,
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_geo_guess_user ON geo_guess(user_id);
CREATE INDEX IF NOT EXISTS idx_geo_guess_analyzed_at ON geo_guess(analyzed_at DESC);

-- Verify table creation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'geo_guess'
ORDER BY ordinal_position;

EOF

echo "✅ geo_guess table created successfully!"
