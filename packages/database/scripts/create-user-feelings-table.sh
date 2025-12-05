#!/bin/bash
# Create user_feelings table migration script
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-user-feelings-table.sh'

set -e

echo "🔧 Creating user_feelings table..."

psql "$DATABASE_URL" << 'EOF'
-- Create user_feelings table
CREATE TABLE IF NOT EXISTS user_feelings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  feeling_type TEXT NOT NULL,
  intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 10),
  notes TEXT,
  context JSONB,
  recorded_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_feelings_user_id ON user_feelings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feelings_recorded_at ON user_feelings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feelings_feeling_type ON user_feelings(feeling_type);
CREATE INDEX IF NOT EXISTS idx_user_feelings_user_recorded ON user_feelings(user_id, recorded_at DESC);

-- Verify table creation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_feelings'
ORDER BY ordinal_position;

EOF

echo "✅ user_feelings table created successfully!"
