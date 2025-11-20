/**
 * Database Schema for Omega Bot
 * Defines tables for messages and queries
 */

import { getDatabase } from './client.js';

/**
 * Initialize database schema
 * Creates tables if they don't exist
 */
export async function initializeSchema(): Promise<void> {
  const db = getDatabase();

  console.log('📋 Initializing database schema...');

  // Create messages table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      sender_type TEXT NOT NULL CHECK(sender_type IN ('human', 'ai', 'tool')),
      user_id TEXT,
      username TEXT,
      channel_id TEXT,
      channel_name TEXT,
      guild_id TEXT,
      message_content TEXT NOT NULL,
      tool_name TEXT,
      tool_args TEXT,
      tool_result TEXT,
      session_id TEXT,
      parent_message_id TEXT,
      metadata TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create indexes for efficient querying
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)
  `);

  // Create FTS5 table for full-text search on message content
  await db.execute(`
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      message_content,
      tool_name,
      username,
      content='messages',
      content_rowid='rowid'
    )
  `);

  // Create trigger to keep FTS table in sync
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, message_content, tool_name, username)
      VALUES (new.rowid, new.message_content, new.tool_name, new.username);
    END
  `);

  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages BEGIN
      DELETE FROM messages_fts WHERE rowid = old.rowid;
    END
  `);

  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE ON messages BEGIN
      DELETE FROM messages_fts WHERE rowid = old.rowid;
      INSERT INTO messages_fts(rowid, message_content, tool_name, username)
      VALUES (new.rowid, new.message_content, new.tool_name, new.username);
    END
  `);

  // Create queries table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS queries (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      query_text TEXT NOT NULL,
      translated_sql TEXT,
      ai_summary TEXT,
      query_result TEXT,
      result_count INTEGER,
      error TEXT,
      execution_time_ms INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create indexes for queries table
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_queries_timestamp ON queries(timestamp DESC)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id)
  `);

  console.log('✅ Database schema initialized');
  console.log('   - messages table with FTS5 search');
  console.log('   - queries table with execution tracking');
}

/**
 * Message record interface
 */
export interface MessageRecord {
  id: string;
  timestamp: number;
  sender_type: 'human' | 'ai' | 'tool';
  user_id?: string;
  username?: string;
  channel_id?: string;
  channel_name?: string;
  guild_id?: string;
  message_content: string;
  tool_name?: string;
  tool_args?: string;
  tool_result?: string;
  session_id?: string;
  parent_message_id?: string;
  metadata?: string;
}

/**
 * Query record interface
 */
export interface QueryRecord {
  id: string;
  timestamp: number;
  user_id: string;
  username: string;
  query_text: string;
  translated_sql?: string;
  ai_summary?: string;
  query_result?: string;
  result_count?: number;
  error?: string;
  execution_time_ms?: number;
}
