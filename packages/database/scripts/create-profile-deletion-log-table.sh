#!/bin/bash
# Create profile_deletion_log table for "Right to be Forgotten" audit trail
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-profile-deletion-log-table.sh'

set -e

echo "Creating profile_deletion_log table..."

psql "$DATABASE_URL" << 'EOF'
-- Create profile_deletion_log table for auditing profile deletions
CREATE TABLE IF NOT EXISTS profile_deletion_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  tables_affected JSONB,
  records_deleted JSONB,
  metadata JSONB,
  requested_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
  completed_at BIGINT DEFAULT (EXTRACT(epoch FROM now()))::bigint,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_profile_deletion_log_user_id ON profile_deletion_log(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_deletion_log_requested_at ON profile_deletion_log(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_deletion_log_status ON profile_deletion_log(status);

-- Verify table creation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profile_deletion_log'
ORDER BY ordinal_position;

EOF

echo "profile_deletion_log table created successfully!"
