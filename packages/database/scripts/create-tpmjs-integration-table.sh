#!/bin/bash

# TPMJS SDK Integration Table Migration
# Creates a table to track TPMJS SDK tools integrated into Omega

set -e

echo "🔧 Creating TPMJS SDK integration table..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

# Run the migration
psql "$DATABASE_URL" <<'EOF'
-- Create TPMJS SDK tools tracking table
CREATE TABLE IF NOT EXISTS tpmjs_sdk_tools (
  id TEXT PRIMARY KEY,
  tool_name TEXT NOT NULL,
  tool_description TEXT,
  sdk_version TEXT,
  sdk_url TEXT DEFAULT 'https://tpmjs.com/sdk',
  category TEXT,
  parameters JSONB,
  metadata JSONB,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tpmjs_sdk_tools_enabled
  ON tpmjs_sdk_tools(is_enabled);

CREATE INDEX IF NOT EXISTS idx_tpmjs_sdk_tools_usage
  ON tpmjs_sdk_tools(usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_tpmjs_sdk_tools_category
  ON tpmjs_sdk_tools(category);

CREATE INDEX IF NOT EXISTS idx_tpmjs_sdk_tools_last_used
  ON tpmjs_sdk_tools(last_used_at DESC);

-- Create TPMJS SDK integration logs table
CREATE TABLE IF NOT EXISTS tpmjs_integration_logs (
  id SERIAL PRIMARY KEY,
  integration_mode TEXT NOT NULL, -- 'fetch', 'analyze', 'integrate'
  sdk_url TEXT NOT NULL,
  tools_found INTEGER DEFAULT 0,
  tools_integrated INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_tpmjs_integration_logs_created_at
  ON tpmjs_integration_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tpmjs_integration_logs_mode
  ON tpmjs_integration_logs(integration_mode);

-- Verify tables were created
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tpmjs_sdk_tools'
ORDER BY ordinal_position;

EOF

echo "✅ TPMJS SDK integration table created successfully!"
echo ""
echo "Tables created:"
echo "  - tpmjs_sdk_tools: Track integrated TPMJS SDK tools"
echo "  - tpmjs_integration_logs: Log integration operations"
echo ""
echo "Indexes created:"
echo "  - idx_tpmjs_sdk_tools_enabled"
echo "  - idx_tpmjs_sdk_tools_usage"
echo "  - idx_tpmjs_sdk_tools_category"
echo "  - idx_tpmjs_sdk_tools_last_used"
echo "  - idx_tpmjs_integration_logs_created_at"
echo "  - idx_tpmjs_integration_logs_mode"
