#!/bin/bash
# Create autonomous_tools table for storing AI-generated tools

psql "$DATABASE_URL" << 'EOF'
-- Create autonomous_tools table
CREATE TABLE IF NOT EXISTS autonomous_tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('development', 'content', 'database', 'github', 'file', 'research', 'admin', 'specialized')),
  parameters JSONB NOT NULL,
  implementation TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  examples TEXT[] NOT NULL,
  tags TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  safety_validated BOOLEAN NOT NULL DEFAULT false,
  validation_notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_autonomous_tools_enabled ON autonomous_tools(is_enabled);
CREATE INDEX IF NOT EXISTS idx_autonomous_tools_category ON autonomous_tools(category);
CREATE INDEX IF NOT EXISTS idx_autonomous_tools_created_at ON autonomous_tools(created_at DESC);

-- Display table info
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'autonomous_tools'
ORDER BY ordinal_position;

EOF

echo "✅ autonomous_tools table created successfully"
