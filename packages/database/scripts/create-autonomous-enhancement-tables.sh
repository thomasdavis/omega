#!/bin/bash
# Create tables for Autonomous Enhancement Framework
# Issue #822 - Design and Implementation of Autonomous Enhancement Framework

psql "$DATABASE_URL" << 'EOF'
-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  workflow_definition JSONB NOT NULL DEFAULT '{}',
  tool_ids TEXT[] DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tools table
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  api_endpoint TEXT,
  specification JSONB NOT NULL DEFAULT '{}',
  is_core BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mcp_messages table (Multi-Component Protocol message bus)
CREATE TABLE IF NOT EXISTS mcp_messages (
  id SERIAL PRIMARY KEY,
  sender_type VARCHAR(50) NOT NULL,
  sender_id TEXT NOT NULL,
  receiver_type VARCHAR(50),
  receiver_id TEXT,
  message_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  processed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create context_store table (Knowledge & Context Store)
CREATE TABLE IF NOT EXISTS context_store (
  id SERIAL PRIMARY KEY,
  context_key VARCHAR(255) UNIQUE NOT NULL,
  context_type VARCHAR(100) DEFAULT 'general',
  context_value JSONB NOT NULL DEFAULT '{}',
  owner_type VARCHAR(50),
  owner_id TEXT,
  metadata JSONB DEFAULT '{}',
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create enhancement_events table (for Autonomous Enhancement Manager)
CREATE TABLE IF NOT EXISTS enhancement_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id TEXT,
  description TEXT,
  metrics JSONB DEFAULT '{}',
  action_taken VARCHAR(100),
  action_metadata JSONB DEFAULT '{}',
  severity VARCHAR(20) DEFAULT 'info',
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for agents
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at DESC);

-- Create indexes for skills
CREATE INDEX IF NOT EXISTS idx_skills_agent_id ON skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_skills_enabled ON skills(is_enabled);
CREATE INDEX IF NOT EXISTS idx_skills_usage ON skills(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_skills_last_used ON skills(last_used_at DESC);

-- Create indexes for tools
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE INDEX IF NOT EXISTS idx_tools_enabled ON tools(is_enabled);
CREATE INDEX IF NOT EXISTS idx_tools_core ON tools(is_core);
CREATE INDEX IF NOT EXISTS idx_tools_usage ON tools(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_tools_last_used ON tools(last_used_at DESC);

-- Create indexes for mcp_messages
CREATE INDEX IF NOT EXISTS idx_mcp_messages_sender ON mcp_messages(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_mcp_messages_receiver ON mcp_messages(receiver_type, receiver_id);
CREATE INDEX IF NOT EXISTS idx_mcp_messages_status ON mcp_messages(status);
CREATE INDEX IF NOT EXISTS idx_mcp_messages_type ON mcp_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_mcp_messages_sent_at ON mcp_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_messages_priority ON mcp_messages(priority DESC, sent_at ASC);

-- Create indexes for context_store
CREATE INDEX IF NOT EXISTS idx_context_store_key ON context_store(context_key);
CREATE INDEX IF NOT EXISTS idx_context_store_type ON context_store(context_type);
CREATE INDEX IF NOT EXISTS idx_context_store_owner ON context_store(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_context_store_updated_at ON context_store(updated_at DESC);

-- Create indexes for enhancement_events
CREATE INDEX IF NOT EXISTS idx_enhancement_events_type ON enhancement_events(event_type);
CREATE INDEX IF NOT EXISTS idx_enhancement_events_category ON enhancement_events(event_category);
CREATE INDEX IF NOT EXISTS idx_enhancement_events_entity ON enhancement_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_enhancement_events_occurred_at ON enhancement_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_enhancement_events_severity ON enhancement_events(severity);

-- Display table info
SELECT 'agents table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'agents'
ORDER BY ordinal_position;

SELECT 'skills table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'skills'
ORDER BY ordinal_position;

SELECT 'tools table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tools'
ORDER BY ordinal_position;

SELECT 'mcp_messages table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mcp_messages'
ORDER BY ordinal_position;

SELECT 'context_store table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'context_store'
ORDER BY ordinal_position;

SELECT 'enhancement_events table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'enhancement_events'
ORDER BY ordinal_position;

EOF

echo "✅ Autonomous Enhancement Framework tables created successfully"
