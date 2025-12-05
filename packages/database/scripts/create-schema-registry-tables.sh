#!/bin/bash
# Create schema registry tables for extensible database management
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-schema-registry-tables.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating schema registry tables..."

psql "$DB_URL" << 'EOF'
-- Create schema_registry table
CREATE TABLE IF NOT EXISTS schema_registry (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  owner VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on schema_registry
CREATE INDEX IF NOT EXISTS idx_schema_registry_name ON schema_registry(name);

-- Create schema_fields table
CREATE TABLE IF NOT EXISTS schema_fields (
  id SERIAL PRIMARY KEY,
  schema_id INTEGER NOT NULL REFERENCES schema_registry(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  field_type VARCHAR(64) NOT NULL,
  is_nullable BOOLEAN DEFAULT TRUE,
  default_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on schema_fields
CREATE INDEX IF NOT EXISTS idx_schema_fields_schema_id ON schema_fields(schema_id);

-- Create schema_requests table
CREATE TABLE IF NOT EXISTS schema_requests (
  id SERIAL PRIMARY KEY,
  requester_user_id VARCHAR(255) NOT NULL,
  schema_name VARCHAR(255) NOT NULL,
  request_payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ NULL
);

-- Create indexes on schema_requests
CREATE INDEX IF NOT EXISTS idx_schema_requests_requester ON schema_requests(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_schema_requests_status ON schema_requests(status);

-- Create schema_changes_audit table
CREATE TABLE IF NOT EXISTS schema_changes_audit (
  id SERIAL PRIMARY KEY,
  schema_id INTEGER NULL,
  request_id INTEGER NULL,
  change_summary TEXT,
  migration_sql TEXT,
  applied_by VARCHAR(255),
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes on schema_changes_audit
CREATE INDEX IF NOT EXISTS idx_schema_changes_audit_schema_id ON schema_changes_audit(schema_id);
CREATE INDEX IF NOT EXISTS idx_schema_changes_audit_applied_at ON schema_changes_audit(applied_at DESC);

-- Create auto_create_log table
CREATE TABLE IF NOT EXISTS auto_create_log (
  id SERIAL PRIMARY KEY,
  schema_name VARCHAR(255),
  table_name VARCHAR(255),
  action VARCHAR(50),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on auto_create_log
CREATE INDEX IF NOT EXISTS idx_auto_create_log_table ON auto_create_log(table_name);
CREATE INDEX IF NOT EXISTS idx_auto_create_log_created_at ON auto_create_log(created_at DESC);

-- Create notifications table (from issue #683)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  delivered BOOLEAN DEFAULT FALSE,
  delivery_channel VARCHAR(50) DEFAULT 'dm',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_delivered ON notifications(delivered);

-- Verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'schema_registry',
    'schema_fields',
    'schema_requests',
    'schema_changes_audit',
    'auto_create_log',
    'notifications'
  )
ORDER BY table_name;

EOF

echo "✅ Schema registry tables created successfully!"
