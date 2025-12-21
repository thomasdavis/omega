#!/bin/bash
# Create user_notifications and user_preferences tables
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-notifications-tables.sh'

set -e

echo "🔧 Creating notifications tables..."

psql "$DATABASE_URL" << 'EOF'
-- Create user_notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  username TEXT,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_issue TEXT,
  related_pr TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user_notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON user_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON user_notifications(notification_type);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  username TEXT,
  notify_feature_complete BOOLEAN DEFAULT true,
  notify_mentions BOOLEAN DEFAULT true,
  notify_pr_updates BOOLEAN DEFAULT true,
  notification_channel TEXT DEFAULT 'discord',
  preferences JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Verify table creation
SELECT 'user_notifications' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_notifications'
ORDER BY ordinal_position;

SELECT 'user_preferences' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_preferences'
ORDER BY ordinal_position;
EOF

echo "✅ Notifications tables created successfully!"
