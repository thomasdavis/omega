-- PostgreSQL Schema Migration: SQLite to PostgreSQL
-- Converted from packages/database/src/libsql/schema.ts
-- This script creates all tables with PostgreSQL-native types

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  timestamp BIGINT NOT NULL,
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
  metadata JSONB,
  ai_summary TEXT,
  sentiment_analysis JSONB,
  response_decision JSONB,
  interaction_type TEXT,
  user_intent TEXT,
  bot_perception TEXT,
  conversation_quality TEXT,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);

-- Create GIN index for full-text search (PostgreSQL equivalent of FTS5)
CREATE INDEX IF NOT EXISTS idx_messages_fts ON messages USING GIN(
  to_tsvector('english',
    COALESCE(message_content, '') || ' ' ||
    COALESCE(tool_name, '') || ' ' ||
    COALESCE(username, '')
  )
);

-- ============================================================================
-- QUERIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS queries (
  id TEXT PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  query_text TEXT NOT NULL,
  translated_sql TEXT,
  ai_summary TEXT,
  query_result JSONB,
  result_count INTEGER,
  error TEXT,
  execution_time_ms INTEGER,
  sentiment_analysis JSONB,
  query_complexity TEXT,
  user_satisfaction TEXT,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

-- Create indexes for queries table
CREATE INDEX IF NOT EXISTS idx_queries_timestamp ON queries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_by_username TEXT,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  is_public BOOLEAN DEFAULT TRUE,
  metadata JSONB
);

-- Create indexes for documents table
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);

-- ============================================================================
-- DOCUMENT_COLLABORATORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_collaborators (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT,
  role TEXT DEFAULT 'editor',
  joined_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_collaborators_document_id ON document_collaborators(document_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON document_collaborators(user_id);

-- Create unique constraint to prevent duplicate collaborators
CREATE UNIQUE INDEX IF NOT EXISTS idx_collaborators_unique ON document_collaborators(document_id, user_id);

-- ============================================================================
-- USER_PROFILES TABLE (PhD-Level Profiling)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,

  -- === PSYCHOLOGICAL PROFILE (PhD-Level) ===

  -- Jungian Analysis
  dominant_archetype TEXT,
  secondary_archetypes JSONB,
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
  primary_interests JSONB,
  expertise_areas JSONB,

  -- Relational Dynamics (Omega's Feelings)
  affinity_score INTEGER,
  trust_level INTEGER,
  emotional_bond TEXT,
  omega_thoughts TEXT,
  notable_patterns JSONB,

  -- Sentiment Analysis (Aggregated)
  overall_sentiment TEXT,
  positive_interaction_ratio REAL,
  negative_interaction_ratio REAL,
  dominant_emotions JSONB,

  -- Legacy fields (keep for backward compatibility)
  feelings_json JSONB,
  personality_facets JSONB,

  -- === CULTURAL BACKGROUND ===
  cultural_background TEXT,
  cultural_values JSONB,
  cultural_communication_style TEXT,
  cultural_confidence REAL,

  -- === ASTROLOGICAL DATA ===
  zodiac_sign TEXT,
  zodiac_element TEXT,
  zodiac_modality TEXT,
  birth_date TEXT,
  astrological_confidence REAL,

  -- === BEHAVIORAL PREDICTIONS ===
  predicted_behaviors JSONB,
  prediction_confidence REAL,
  prediction_timeframe TEXT,
  last_prediction_at BIGINT,
  prediction_accuracy_score REAL,

  -- === PSYCHO-CULTURAL-ASTROLOGICAL INTEGRATION ===
  integrated_profile_summary TEXT,
  profile_integration_confidence REAL,
  world_model_adjustments JSONB,
  personal_model_adjustments JSONB,

  -- === PHYSICAL PHENOTYPE ANALYSIS ===

  -- Photo Data
  uploaded_photo_url TEXT,
  uploaded_photo_metadata JSONB,
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
  distinctive_features JSONB,
  clothing_style TEXT,
  accessories JSONB,

  -- Overall Impression
  attractiveness_assessment TEXT,
  approachability_score INTEGER,
  perceived_confidence_level TEXT,
  aesthetic_archetype TEXT,

  -- === TRACKING & METADATA ===
  first_seen_at BIGINT NOT NULL,
  last_interaction_at BIGINT NOT NULL,
  last_analyzed_at BIGINT,
  last_photo_analyzed_at BIGINT,
  message_count INTEGER DEFAULT 0,

  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

-- Create indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_analyzed ON user_profiles(last_analyzed_at);

-- ============================================================================
-- USER_ANALYSIS_HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_analysis_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  analysis_timestamp BIGINT NOT NULL,

  -- Snapshots
  feelings_snapshot JSONB,
  personality_snapshot JSONB,
  message_count_at_analysis INTEGER,
  changes_summary TEXT,

  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,

  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Create indexes for user_analysis_history
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON user_analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_timestamp ON user_analysis_history(analysis_timestamp DESC);

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- Key differences from SQLite:
-- 1. INTEGER → BIGINT for Unix timestamps (supports larger values)
-- 2. TEXT JSON fields → JSONB (native JSON with indexing)
-- 3. INTEGER boolean → BOOLEAN (native type)
-- 4. strftime('%s', 'now') → EXTRACT(EPOCH FROM NOW())::BIGINT
-- 5. FTS5 virtual table → GIN index with to_tsvector()
-- 6. Foreign key constraints work by default (no need to enable)
