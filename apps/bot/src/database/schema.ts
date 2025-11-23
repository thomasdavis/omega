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
      ai_summary TEXT,
      sentiment_analysis TEXT,
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

  // Create collaborative documents table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL,
      created_by_username TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      is_public INTEGER DEFAULT 1,
      metadata TEXT
    )
  `);

  // Create indexes for documents table
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC)
  `);

  // Create document collaborators table (for tracking who has access)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS document_collaborators (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT,
      role TEXT DEFAULT 'editor',
      joined_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_collaborators_document_id ON document_collaborators(document_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON document_collaborators(user_id)
  `);

  // Create unique constraint to prevent duplicate collaborators
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_collaborators_unique ON document_collaborators(document_id, user_id)
  `);

  // Run migrations to add new columns to existing tables
  await runMigrations();

  console.log('✅ Database schema initialized');
  console.log('   - messages table with FTS5 search');
  console.log('   - queries table with execution tracking');
  console.log('   - documents table with collaborative editing');
  console.log('   - document_collaborators table for access control');
}

/**
 * Run database migrations
 * Adds new columns to existing tables if they don't exist
 */
async function runMigrations(): Promise<void> {
  const db = getDatabase();

  console.log('🔄 Running database migrations...');

  // Migration 1: Add ai_summary and sentiment_analysis columns to messages table
  try {
    // Check if columns exist by trying to query them
    await db.execute(`SELECT ai_summary, sentiment_analysis FROM messages LIMIT 0`);
    console.log('   ✓ Messages table already has ai_summary and sentiment_analysis columns');
  } catch (error) {
    // Columns don't exist, add them
    console.log('   + Adding ai_summary and sentiment_analysis columns to messages table');
    await db.execute(`ALTER TABLE messages ADD COLUMN ai_summary TEXT`);
    await db.execute(`ALTER TABLE messages ADD COLUMN sentiment_analysis TEXT`);
    console.log('   ✓ Added ai_summary and sentiment_analysis columns');
  }

  // Migration 2: Add response_decision column to messages table
  try {
    // Check if column exists by trying to query it
    await db.execute(`SELECT response_decision FROM messages LIMIT 0`);
    console.log('   ✓ Messages table already has response_decision column');
  } catch (error) {
    // Column doesn't exist, add it
    console.log('   + Adding response_decision column to messages table');
    await db.execute(`ALTER TABLE messages ADD COLUMN response_decision TEXT`);
    console.log('   ✓ Added response_decision column');
  }

  console.log('✅ Migrations completed');
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
  ai_summary?: string;
  sentiment_analysis?: string;
  response_decision?: string;
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

/**
 * Document record interface
 */
export interface DocumentRecord {
  id: string;
  title: string;
  content: string;
  created_by: string;
  created_by_username?: string;
  created_at: number;
  updated_at: number;
  is_public: number;
  metadata?: string;
}

/**
 * Document collaborator record interface
 */
export interface DocumentCollaboratorRecord {
  id: string;
  document_id: string;
  user_id: string;
  username?: string;
  role: string;
  joined_at: number;
}
