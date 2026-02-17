-- Conversations and conversation messages tables
-- Tracks multi-turn conversations between users and the bot

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  channel_id VARCHAR(255),
  started_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel_id ON conversations (channel_id);
CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON conversations (started_at DESC);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(50) NOT NULL,
  user_id VARCHAR(255),
  username VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_id ON conversation_messages (user_id);
