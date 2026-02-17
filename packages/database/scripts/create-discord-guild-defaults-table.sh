#!/bin/bash
# Create discord_guild_defaults table migration script
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-discord-guild-defaults-table.sh'

set -e

echo "Creating discord_guild_defaults table..."

psql "$DATABASE_URL" << 'EOF'
-- Create discord_guild_defaults table
-- Stores default guild IDs per Discord server (or per user within a server)
CREATE TABLE IF NOT EXISTS discord_guild_defaults (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  server_id VARCHAR(255),
  guild_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_discord_guild_defaults_user_id ON discord_guild_defaults(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_guild_defaults_server_id ON discord_guild_defaults(server_id);

-- Verify table creation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'discord_guild_defaults'
ORDER BY ordinal_position;

EOF

echo "discord_guild_defaults table created successfully!"
