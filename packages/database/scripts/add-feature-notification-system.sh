#!/usr/bin/env bash
#
# Add Feature Notification System
#
# This script adds:
# 1. notify_on_feature_complete column to user_profiles
# 2. feature_requests table to track issue/PR requesters
# 3. notifications table for audit trail
#

set -e

echo "🔧 Adding Feature Notification System tables and columns..."

# Execute SQL commands
psql "$DATABASE_URL" << 'EOF'

-- Add notification preference to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS notify_on_feature_complete BOOLEAN NOT NULL DEFAULT TRUE;

-- Create feature_requests table
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_issue_number INTEGER NOT NULL,
  github_pr_number INTEGER,
  requester_user_id TEXT NOT NULL,
  requester_username TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  requested_at BIGINT NOT NULL,
  completed_at BIGINT,
  merged_pr_url TEXT,
  merged_commit_sha TEXT,
  metadata JSONB,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now())::bigint),
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now())::bigint)
);

-- Create indexes for feature_requests
CREATE INDEX IF NOT EXISTS idx_feature_requests_issue_number ON feature_requests(github_issue_number);
CREATE INDEX IF NOT EXISTS idx_feature_requests_pr_number ON feature_requests(github_pr_number);
CREATE INDEX IF NOT EXISTS idx_feature_requests_requester ON feature_requests(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_requested_at ON feature_requests(requested_at DESC);

-- Create notifications table for audit trail
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  username TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  sent_at BIGINT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  discord_message_id TEXT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now())::bigint)
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event_type ON notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at DESC);

-- Display table info
SELECT 'user_profiles columns:' AS info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'notify_on_feature_complete'
ORDER BY ordinal_position;

SELECT 'feature_requests table created:' AS info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'feature_requests'
ORDER BY ordinal_position;

SELECT 'notifications table created:' AS info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

EOF

echo "✅ Feature Notification System migration complete!"
