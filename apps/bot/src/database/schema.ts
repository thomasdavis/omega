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
      response_decision TEXT,
      interaction_type TEXT,
      user_intent TEXT,
      bot_perception TEXT,
      conversation_quality TEXT,
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
      sentiment_analysis TEXT,
      query_complexity TEXT,
      user_satisfaction TEXT,
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

  // Migration 3: Add interaction metrics columns to messages table
  try {
    await db.execute(`SELECT interaction_type, user_intent, bot_perception, conversation_quality FROM messages LIMIT 0`);
    console.log('   ✓ Messages table already has interaction metrics columns');
  } catch (error) {
    console.log('   + Adding interaction metrics columns to messages table');
    await db.execute(`ALTER TABLE messages ADD COLUMN interaction_type TEXT`);
    await db.execute(`ALTER TABLE messages ADD COLUMN user_intent TEXT`);
    await db.execute(`ALTER TABLE messages ADD COLUMN bot_perception TEXT`);
    await db.execute(`ALTER TABLE messages ADD COLUMN conversation_quality TEXT`);
    console.log('   ✓ Added interaction metrics columns');
  }

  // Migration 4: Add sentiment and quality columns to queries table
  try {
    await db.execute(`SELECT sentiment_analysis, query_complexity, user_satisfaction FROM queries LIMIT 0`);
    console.log('   ✓ Queries table already has sentiment and quality columns');
  } catch (error) {
    console.log('   + Adding sentiment and quality columns to queries table');
    await db.execute(`ALTER TABLE queries ADD COLUMN sentiment_analysis TEXT`);
    await db.execute(`ALTER TABLE queries ADD COLUMN query_complexity TEXT`);
    await db.execute(`ALTER TABLE queries ADD COLUMN user_satisfaction TEXT`);
    console.log('   ✓ Added sentiment and quality columns to queries table');
  }

  // Migration 5: Create user_profiles and user_analysis_history tables
  await migrationUserProfiles();

  // Migration 6: Add PhD-level profiling fields to existing user_profiles
  await migrationPhDProfilingFields();

  console.log('✅ Migrations completed');
}

/**
 * Migration 3: Add user profiling tables
 * Creates tables for storing Omega's feelings and personality assessments about users
 */
async function migrationUserProfiles(): Promise<void> {
  const db = getDatabase();

  console.log('   + Creating user_profiles table');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,

      -- === PSYCHOLOGICAL PROFILE (PhD-Level) ===

      -- Jungian Analysis
      dominant_archetype TEXT,
      secondary_archetypes TEXT,
      archetype_confidence REAL,
      shadow_archetype TEXT,

      -- Big Five Personality (OCEAN)
      openness_score INTEGER,
      conscientiousness_score INTEGER,
      extraversion_score INTEGER,
      agreeableness_score INTEGER,
      neuroticism_score INTEGER,

      -- Attachment Theory
      attachment_style TEXT,
      attachment_confidence REAL,

      -- Emotional Intelligence
      emotional_awareness_score INTEGER,
      empathy_score INTEGER,
      emotional_regulation_score INTEGER,

      -- Communication Patterns
      communication_formality TEXT,
      communication_assertiveness TEXT,
      communication_engagement TEXT,
      verbal_fluency_score INTEGER,
      question_asking_frequency REAL,

      -- Cognitive Style
      analytical_thinking_score INTEGER,
      creative_thinking_score INTEGER,
      abstract_reasoning_score INTEGER,
      concrete_thinking_score INTEGER,

      -- Social Dynamics
      social_dominance_score INTEGER,
      cooperation_score INTEGER,
      conflict_style TEXT,
      humor_style TEXT,

      -- Behavioral Patterns
      message_length_avg REAL,
      message_length_variance REAL,
      response_latency_avg REAL,
      emoji_usage_rate REAL,
      punctuation_style TEXT,
      capitalization_pattern TEXT,

      -- Interests & Expertise
      technical_knowledge_level TEXT,
      primary_interests TEXT,
      expertise_areas TEXT,

      -- Relational Dynamics (Omega's Feelings)
      affinity_score INTEGER,
      trust_level INTEGER,
      emotional_bond TEXT,
      omega_thoughts TEXT,
      notable_patterns TEXT,

      -- Sentiment Analysis (Aggregated)
      overall_sentiment TEXT,
      positive_interaction_ratio REAL,
      negative_interaction_ratio REAL,
      dominant_emotions TEXT,

      -- Legacy fields (keep for backward compatibility)
      feelings_json TEXT,
      personality_facets TEXT,

      -- === PHYSICAL PHENOTYPE ANALYSIS ===

      -- Photo Data
      uploaded_photo_url TEXT,
      uploaded_photo_metadata TEXT,
      ai_appearance_description TEXT,
      appearance_confidence REAL DEFAULT 0.0,

      -- Gender & Age
      ai_detected_gender TEXT,
      gender_confidence REAL,
      estimated_age_range TEXT,
      age_confidence REAL,

      -- Facial Structure
      face_shape TEXT,
      facial_symmetry_score INTEGER,
      jawline_prominence TEXT,
      cheekbone_prominence TEXT,

      -- Hair Analysis
      hair_color TEXT,
      hair_texture TEXT,
      hair_length TEXT,
      hair_style TEXT,
      hair_density TEXT,
      facial_hair TEXT,

      -- Eyes
      eye_color TEXT,
      eye_shape TEXT,
      eye_spacing TEXT,
      eyebrow_shape TEXT,
      eyebrow_thickness TEXT,

      -- Nose
      nose_shape TEXT,
      nose_size TEXT,

      -- Mouth & Lips
      lip_fullness TEXT,
      smile_type TEXT,

      -- Skin
      skin_tone TEXT,
      skin_texture TEXT,
      complexion_quality TEXT,

      -- Build & Stature
      body_type TEXT,
      build_description TEXT,
      height_estimate TEXT,
      posture TEXT,

      -- Distinctive Features
      distinctive_features TEXT,
      clothing_style TEXT,
      accessories TEXT,

      -- Overall Impression
      attractiveness_assessment TEXT,
      approachability_score INTEGER,
      perceived_confidence_level TEXT,
      aesthetic_archetype TEXT,

      -- === TRACKING & METADATA ===
      first_seen_at INTEGER NOT NULL,
      last_interaction_at INTEGER NOT NULL,
      last_analyzed_at INTEGER,
      last_photo_analyzed_at INTEGER,
      message_count INTEGER DEFAULT 0,

      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create indexes for user_profiles
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_user_profiles_last_analyzed ON user_profiles(last_analyzed_at)
  `);

  console.log('   + Creating user_analysis_history table');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_analysis_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      analysis_timestamp INTEGER NOT NULL,

      -- Snapshots
      feelings_snapshot TEXT,
      personality_snapshot TEXT,
      message_count_at_analysis INTEGER,
      changes_summary TEXT,

      created_at INTEGER DEFAULT (strftime('%s', 'now')),

      FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
    )
  `);

  // Create indexes for user_analysis_history
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON user_analysis_history(user_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_analysis_history_timestamp ON user_analysis_history(analysis_timestamp DESC)
  `);

  console.log('   ✓ User profiling tables created');
}

/**
 * Migration 6: Add PhD-level profiling fields
 * Adds ~70 new fields to user_profiles for comprehensive psychological and phenotype analysis
 */
async function migrationPhDProfilingFields(): Promise<void> {
  const db = getDatabase();

  console.log('   + Adding PhD-level profiling fields to user_profiles table');

  // Helper function to safely add a column
  const addColumn = async (columnName: string, columnType: string) => {
    try {
      await db.execute(`SELECT ${columnName} FROM user_profiles LIMIT 0`);
      // Column exists, skip
    } catch (error) {
      console.log(`     - Adding column: ${columnName}`);
      await db.execute(`ALTER TABLE user_profiles ADD COLUMN ${columnName} ${columnType}`);
    }
  };

  // === PSYCHOLOGICAL PROFILE FIELDS ===

  // Jungian Analysis
  await addColumn('dominant_archetype', 'TEXT');
  await addColumn('secondary_archetypes', 'TEXT');
  await addColumn('archetype_confidence', 'REAL');
  await addColumn('shadow_archetype', 'TEXT');

  // Big Five Personality (OCEAN)
  await addColumn('openness_score', 'INTEGER');
  await addColumn('conscientiousness_score', 'INTEGER');
  await addColumn('extraversion_score', 'INTEGER');
  await addColumn('agreeableness_score', 'INTEGER');
  await addColumn('neuroticism_score', 'INTEGER');

  // Attachment Theory
  await addColumn('attachment_style', 'TEXT');
  await addColumn('attachment_confidence', 'REAL');

  // Emotional Intelligence
  await addColumn('emotional_awareness_score', 'INTEGER');
  await addColumn('empathy_score', 'INTEGER');
  await addColumn('emotional_regulation_score', 'INTEGER');

  // Communication Patterns
  await addColumn('communication_formality', 'TEXT');
  await addColumn('communication_assertiveness', 'TEXT');
  await addColumn('communication_engagement', 'TEXT');
  await addColumn('verbal_fluency_score', 'INTEGER');
  await addColumn('question_asking_frequency', 'REAL');

  // Cognitive Style
  await addColumn('analytical_thinking_score', 'INTEGER');
  await addColumn('creative_thinking_score', 'INTEGER');
  await addColumn('abstract_reasoning_score', 'INTEGER');
  await addColumn('concrete_thinking_score', 'INTEGER');

  // Social Dynamics
  await addColumn('social_dominance_score', 'INTEGER');
  await addColumn('cooperation_score', 'INTEGER');
  await addColumn('conflict_style', 'TEXT');
  await addColumn('humor_style', 'TEXT');

  // Behavioral Patterns
  await addColumn('message_length_avg', 'REAL');
  await addColumn('message_length_variance', 'REAL');
  await addColumn('response_latency_avg', 'REAL');
  await addColumn('emoji_usage_rate', 'REAL');
  await addColumn('punctuation_style', 'TEXT');
  await addColumn('capitalization_pattern', 'TEXT');

  // Interests & Expertise
  await addColumn('technical_knowledge_level', 'TEXT');
  await addColumn('primary_interests', 'TEXT');
  await addColumn('expertise_areas', 'TEXT');

  // Relational Dynamics (Omega's Feelings)
  await addColumn('affinity_score', 'INTEGER');
  await addColumn('trust_level', 'INTEGER');
  await addColumn('emotional_bond', 'TEXT');
  await addColumn('omega_thoughts', 'TEXT');
  await addColumn('notable_patterns', 'TEXT');

  // Sentiment Analysis (Aggregated)
  await addColumn('overall_sentiment', 'TEXT');
  await addColumn('positive_interaction_ratio', 'REAL');
  await addColumn('negative_interaction_ratio', 'REAL');
  await addColumn('dominant_emotions', 'TEXT');

  // === PHYSICAL PHENOTYPE ANALYSIS FIELDS ===

  // Gender & Age
  await addColumn('ai_detected_gender', 'TEXT');
  await addColumn('gender_confidence', 'REAL');
  await addColumn('estimated_age_range', 'TEXT');
  await addColumn('age_confidence', 'REAL');

  // Facial Structure
  await addColumn('face_shape', 'TEXT');
  await addColumn('facial_symmetry_score', 'INTEGER');
  await addColumn('jawline_prominence', 'TEXT');
  await addColumn('cheekbone_prominence', 'TEXT');

  // Hair Analysis
  await addColumn('hair_color', 'TEXT');
  await addColumn('hair_texture', 'TEXT');
  await addColumn('hair_length', 'TEXT');
  await addColumn('hair_style', 'TEXT');
  await addColumn('hair_density', 'TEXT');
  await addColumn('facial_hair', 'TEXT');

  // Eyes
  await addColumn('eye_color', 'TEXT');
  await addColumn('eye_shape', 'TEXT');
  await addColumn('eye_spacing', 'TEXT');
  await addColumn('eyebrow_shape', 'TEXT');
  await addColumn('eyebrow_thickness', 'TEXT');

  // Nose
  await addColumn('nose_shape', 'TEXT');
  await addColumn('nose_size', 'TEXT');

  // Mouth & Lips
  await addColumn('lip_fullness', 'TEXT');
  await addColumn('smile_type', 'TEXT');

  // Skin
  await addColumn('skin_tone', 'TEXT');
  await addColumn('skin_texture', 'TEXT');
  await addColumn('complexion_quality', 'TEXT');

  // Build & Stature
  await addColumn('body_type', 'TEXT');
  await addColumn('build_description', 'TEXT');
  await addColumn('height_estimate', 'TEXT');
  await addColumn('posture', 'TEXT');

  // Distinctive Features
  await addColumn('distinctive_features', 'TEXT');
  await addColumn('clothing_style', 'TEXT');
  await addColumn('accessories', 'TEXT');

  // Overall Impression
  await addColumn('attractiveness_assessment', 'TEXT');
  await addColumn('approachability_score', 'INTEGER');
  await addColumn('perceived_confidence_level', 'TEXT');
  await addColumn('aesthetic_archetype', 'TEXT');

  // Tracking
  await addColumn('last_photo_analyzed_at', 'INTEGER');

  console.log('   ✓ PhD-level profiling fields added to user_profiles table');
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
  interaction_type?: string;
  user_intent?: string;
  bot_perception?: string;
  conversation_quality?: string;
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
  sentiment_analysis?: string;
  query_complexity?: string;
  user_satisfaction?: string;
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

/**
 * User profile record interface
 * Stores Omega's comprehensive psychological and phenotype understanding of each user
 */
export interface UserProfileRecord {
  // Identity
  id: string;
  user_id: string;
  username: string;

  // === PSYCHOLOGICAL PROFILE (PhD-Level) ===

  // Jungian Analysis
  dominant_archetype?: string;
  secondary_archetypes?: string; // JSON array
  archetype_confidence?: number;
  shadow_archetype?: string;

  // Big Five Personality (OCEAN)
  openness_score?: number;
  conscientiousness_score?: number;
  extraversion_score?: number;
  agreeableness_score?: number;
  neuroticism_score?: number;

  // Attachment Theory
  attachment_style?: string;
  attachment_confidence?: number;

  // Emotional Intelligence
  emotional_awareness_score?: number;
  empathy_score?: number;
  emotional_regulation_score?: number;

  // Communication Patterns
  communication_formality?: string;
  communication_assertiveness?: string;
  communication_engagement?: string;
  verbal_fluency_score?: number;
  question_asking_frequency?: number;

  // Cognitive Style
  analytical_thinking_score?: number;
  creative_thinking_score?: number;
  abstract_reasoning_score?: number;
  concrete_thinking_score?: number;

  // Social Dynamics
  social_dominance_score?: number;
  cooperation_score?: number;
  conflict_style?: string;
  humor_style?: string;

  // Behavioral Patterns
  message_length_avg?: number;
  message_length_variance?: number;
  response_latency_avg?: number;
  emoji_usage_rate?: number;
  punctuation_style?: string;
  capitalization_pattern?: string;

  // Interests & Expertise
  technical_knowledge_level?: string;
  primary_interests?: string; // JSON array
  expertise_areas?: string; // JSON array

  // Relational Dynamics (Omega's Feelings)
  affinity_score?: number;
  trust_level?: number;
  emotional_bond?: string;
  omega_thoughts?: string;
  notable_patterns?: string; // JSON array

  // Sentiment Analysis (Aggregated)
  overall_sentiment?: string;
  positive_interaction_ratio?: number;
  negative_interaction_ratio?: number;
  dominant_emotions?: string; // JSON array

  // Legacy fields (backward compatibility)
  feelings_json?: string;
  personality_facets?: string;

  // === PHYSICAL PHENOTYPE ANALYSIS ===

  // Photo Data
  uploaded_photo_url?: string;
  uploaded_photo_metadata?: string;
  ai_appearance_description?: string;
  appearance_confidence: number;

  // Gender & Age
  ai_detected_gender?: string;
  gender_confidence?: number;
  estimated_age_range?: string;
  age_confidence?: number;

  // Facial Structure
  face_shape?: string;
  facial_symmetry_score?: number;
  jawline_prominence?: string;
  cheekbone_prominence?: string;

  // Hair Analysis
  hair_color?: string;
  hair_texture?: string;
  hair_length?: string;
  hair_style?: string;
  hair_density?: string;
  facial_hair?: string;

  // Eyes
  eye_color?: string;
  eye_shape?: string;
  eye_spacing?: string;
  eyebrow_shape?: string;
  eyebrow_thickness?: string;

  // Nose
  nose_shape?: string;
  nose_size?: string;

  // Mouth & Lips
  lip_fullness?: string;
  smile_type?: string;

  // Skin
  skin_tone?: string;
  skin_texture?: string;
  complexion_quality?: string;

  // Build & Stature
  body_type?: string;
  build_description?: string;
  height_estimate?: string;
  posture?: string;

  // Distinctive Features
  distinctive_features?: string; // JSON array
  clothing_style?: string;
  accessories?: string; // JSON array

  // Overall Impression
  attractiveness_assessment?: string;
  approachability_score?: number;
  perceived_confidence_level?: string;
  aesthetic_archetype?: string;

  // === TRACKING & METADATA ===
  first_seen_at: number;
  last_interaction_at: number;
  last_analyzed_at?: number;
  last_photo_analyzed_at?: number;
  message_count: number;
  created_at: number;
  updated_at: number;
}

/**
 * User analysis history record interface
 * Tracks evolution of Omega's feelings over time
 */
export interface UserAnalysisHistoryRecord {
  id: string;
  user_id: string;
  analysis_timestamp: number;
  feelings_snapshot?: string;
  personality_snapshot?: string;
  message_count_at_analysis: number;
  changes_summary?: string;
  created_at: number;
}
