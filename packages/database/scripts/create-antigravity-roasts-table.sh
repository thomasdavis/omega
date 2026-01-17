#!/bin/bash
# Create antigravity_roasts table migration script
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-antigravity-roasts-table.sh'

set -e

echo "🔧 Creating antigravity_roasts table..."

psql "$DATABASE_URL" << 'EOF'
-- Create antigravity_roasts table to track AI-generated antigravity roasts
CREATE TABLE IF NOT EXISTS antigravity_roasts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  message_content TEXT,
  matched_keyword VARCHAR(255) NOT NULL,
  roast_content TEXT NOT NULL,
  user_profile_data JSONB,
  ai_model VARCHAR(255),
  generation_time_ms INTEGER,
  banned_but_no_perm BOOLEAN DEFAULT false,
  channel_id VARCHAR(255),
  guild_id VARCHAR(255),
  roast_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_antigravity_roasts_user_id ON antigravity_roasts(user_id);
CREATE INDEX IF NOT EXISTS idx_antigravity_roasts_roast_timestamp ON antigravity_roasts(roast_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_antigravity_roasts_matched_keyword ON antigravity_roasts(matched_keyword);
CREATE INDEX IF NOT EXISTS idx_antigravity_roasts_guild_id ON antigravity_roasts(guild_id);
CREATE INDEX IF NOT EXISTS idx_antigravity_roasts_channel_id ON antigravity_roasts(channel_id);

-- Verify table creation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'antigravity_roasts'
ORDER BY ordinal_position;

EOF

echo "✅ antigravity_roasts table created successfully!"
