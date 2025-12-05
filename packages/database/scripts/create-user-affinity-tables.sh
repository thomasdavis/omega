#!/bin/bash
# Create user affinity and collaboration tracking tables migration script
# Run with: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-user-affinity-tables.sh'

set -e

echo "🔧 Creating user affinity and collaboration tracking tables..."

psql "$DATABASE_URL" << 'EOF'
-- Create user_affinities table
-- Stores affinity scores between pairs of users based on personality types and interests
CREATE TABLE IF NOT EXISTS user_affinities (
  id TEXT PRIMARY KEY,
  user_id_1 TEXT NOT NULL,
  user_id_2 TEXT NOT NULL,
  username_1 TEXT NOT NULL,
  username_2 TEXT NOT NULL,
  affinity_score REAL NOT NULL CHECK (affinity_score >= 0.0 AND affinity_score <= 1.0),
  personality_compatibility REAL CHECK (personality_compatibility >= 0.0 AND personality_compatibility <= 1.0),
  interest_alignment REAL CHECK (interest_alignment >= 0.0 AND interest_alignment <= 1.0),
  communication_compatibility REAL CHECK (communication_compatibility >= 0.0 AND communication_compatibility <= 1.0),
  compatibility_factors JSONB,
  calculated_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
  CONSTRAINT unique_user_pair UNIQUE (user_id_1, user_id_2)
);

-- Create collaboration_history table
-- Tracks past collaborations between users
CREATE TABLE IF NOT EXISTS collaboration_history (
  id TEXT PRIMARY KEY,
  user_id_1 TEXT NOT NULL,
  user_id_2 TEXT NOT NULL,
  username_1 TEXT NOT NULL,
  username_2 TEXT NOT NULL,
  collaboration_type TEXT NOT NULL,
  project_name TEXT,
  project_description TEXT,
  start_date BIGINT NOT NULL,
  end_date BIGINT,
  success_rating REAL CHECK (success_rating >= 0.0 AND success_rating <= 1.0),
  user_1_satisfaction INTEGER CHECK (user_1_satisfaction >= 1 AND user_1_satisfaction <= 10),
  user_2_satisfaction INTEGER CHECK (user_2_satisfaction >= 1 AND user_2_satisfaction <= 10),
  collaboration_notes TEXT,
  metadata JSONB,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint
);

-- Create collaboration_predictions table
-- Stores predicted collaboration potential between users
CREATE TABLE IF NOT EXISTS collaboration_predictions (
  id TEXT PRIMARY KEY,
  user_id_1 TEXT NOT NULL,
  user_id_2 TEXT NOT NULL,
  username_1 TEXT NOT NULL,
  username_2 TEXT NOT NULL,
  predicted_success_score REAL NOT NULL CHECK (predicted_success_score >= 0.0 AND predicted_success_score <= 1.0),
  confidence_level REAL NOT NULL CHECK (confidence_level >= 0.0 AND confidence_level <= 1.0),
  recommended_collaboration_types JSONB,
  potential_challenges JSONB,
  synergy_factors JSONB,
  prediction_reasoning TEXT,
  prediction_model_version TEXT,
  predicted_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
  CONSTRAINT unique_prediction_pair UNIQUE (user_id_1, user_id_2)
);

-- Create indexes for user_affinities
CREATE INDEX IF NOT EXISTS idx_user_affinities_user_1 ON user_affinities(user_id_1);
CREATE INDEX IF NOT EXISTS idx_user_affinities_user_2 ON user_affinities(user_id_2);
CREATE INDEX IF NOT EXISTS idx_user_affinities_score ON user_affinities(affinity_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_affinities_calculated_at ON user_affinities(calculated_at DESC);

-- Create indexes for collaboration_history
CREATE INDEX IF NOT EXISTS idx_collaboration_history_user_1 ON collaboration_history(user_id_1);
CREATE INDEX IF NOT EXISTS idx_collaboration_history_user_2 ON collaboration_history(user_id_2);
CREATE INDEX IF NOT EXISTS idx_collaboration_history_type ON collaboration_history(collaboration_type);
CREATE INDEX IF NOT EXISTS idx_collaboration_history_start_date ON collaboration_history(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_history_success_rating ON collaboration_history(success_rating DESC);

-- Create indexes for collaboration_predictions
CREATE INDEX IF NOT EXISTS idx_collaboration_predictions_user_1 ON collaboration_predictions(user_id_1);
CREATE INDEX IF NOT EXISTS idx_collaboration_predictions_user_2 ON collaboration_predictions(user_id_2);
CREATE INDEX IF NOT EXISTS idx_collaboration_predictions_score ON collaboration_predictions(predicted_success_score DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_predictions_predicted_at ON collaboration_predictions(predicted_at DESC);

-- Verify table creation
SELECT 'user_affinities' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_affinities'
ORDER BY ordinal_position;

SELECT 'collaboration_history' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'collaboration_history'
ORDER BY ordinal_position;

SELECT 'collaboration_predictions' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'collaboration_predictions'
ORDER BY ordinal_position;

EOF

echo "✅ User affinity and collaboration tracking tables created successfully!"
