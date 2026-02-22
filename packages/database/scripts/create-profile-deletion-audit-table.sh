#!/bin/bash
# Create profile_deletion_audit table migration script
# Tracks profile deletion requests for "right to be forgotten" compliance
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-profile-deletion-audit-table.sh'

set -e

echo "Creating profile_deletion_audit table..."

psql "$DATABASE_URL" << 'EOF'
-- Create profile_deletion_audit table for GDPR/right-to-be-forgotten compliance
CREATE TABLE IF NOT EXISTS profile_deletion_audit (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  requested_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
  completed_at BIGINT,
  status TEXT NOT NULL DEFAULT 'completed',
  tables_affected JSONB,
  records_deleted JSONB,
  requested_by TEXT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_profile_deletion_audit_user_id ON profile_deletion_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_deletion_audit_requested_at ON profile_deletion_audit(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_deletion_audit_status ON profile_deletion_audit(status);

-- Verify table creation
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profile_deletion_audit'
ORDER BY ordinal_position;

EOF

echo "profile_deletion_audit table created successfully!"
