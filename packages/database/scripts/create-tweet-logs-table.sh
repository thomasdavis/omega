#!/bin/bash
# Create tweet_logs table for audit trail of all tweets posted by the bot
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-tweet-logs-table.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating tweet_logs table..."

psql "$DB_URL" << 'EOF'
-- Create tweet_logs table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS tweet_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  tweet_content TEXT NOT NULL,
  tweet_id VARCHAR(255),
  tweet_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  channel_id VARCHAR(255),
  channel_name VARCHAR(255),
  guild_id VARCHAR(255),
  message_id VARCHAR(255),
  request_type VARCHAR(50) DEFAULT 'manual',
  metadata JSONB,
  moderation_flags JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tweet_logs_user_id ON tweet_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tweet_logs_created_at ON tweet_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tweet_logs_status ON tweet_logs(status);
CREATE INDEX IF NOT EXISTS idx_tweet_logs_channel_id ON tweet_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_tweet_logs_tweet_id ON tweet_logs(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_logs_metadata_gin ON tweet_logs USING GIN (metadata);

-- Verify table creation
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tweet_logs'
ORDER BY ordinal_position;

-- Display count
SELECT COUNT(*) as total_tweet_logs FROM tweet_logs;
EOF

echo "✅ Migration completed successfully!"
