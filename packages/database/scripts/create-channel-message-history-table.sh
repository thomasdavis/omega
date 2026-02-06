#!/bin/bash
# Create channel_message_history table migration script
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-channel-message-history-table.sh'

set -e

echo "🔧 Creating channel_message_history table..."

psql "$DATABASE_URL" << 'EOF'
-- Create channel_message_history table
CREATE TABLE IF NOT EXISTS channel_message_history (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(255) NOT NULL UNIQUE,
  channel_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  message_content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_channel_user_timestamp ON channel_message_history(channel_id, user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_channel_message_history_channel_id ON channel_message_history(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_message_history_user_id ON channel_message_history(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_message_history_timestamp ON channel_message_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_channel_message_history_message_id ON channel_message_history(message_id);

-- Verify table creation
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'channel_message_history'
ORDER BY ordinal_position;

EOF

echo "✅ Channel message history table created successfully!"
