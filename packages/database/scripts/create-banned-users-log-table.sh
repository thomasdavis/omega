#!/bin/bash
# Create banned_users_log table migration script
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-banned-users-log-table.sh'

set -e

echo "🔧 Creating banned_users_log table..."

psql "$DATABASE_URL" << 'EOF'
-- Create banned_users_log table
CREATE TABLE IF NOT EXISTS banned_users_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  message_content TEXT,
  ban_reason TEXT NOT NULL,
  banned_keyword VARCHAR(255),
  channel_id VARCHAR(255),
  guild_id VARCHAR(255),
  ban_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_banned_users_log_user_id ON banned_users_log(user_id);
CREATE INDEX IF NOT EXISTS idx_banned_users_log_ban_timestamp ON banned_users_log(ban_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_banned_users_log_banned_keyword ON banned_users_log(banned_keyword);
CREATE INDEX IF NOT EXISTS idx_banned_users_log_guild_id ON banned_users_log(guild_id);

-- Verify table creation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'banned_users_log'
ORDER BY ordinal_position;

EOF

echo "✅ banned_users_log table created successfully!"
