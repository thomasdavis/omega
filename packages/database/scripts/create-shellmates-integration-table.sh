#!/bin/bash
# Create shellmates_profiles table for Shellmates.app integration
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-shellmates-integration-table.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating shellmates_profiles table..."

psql "$DB_URL" << 'EOF'
-- Create shellmates_profiles table for storing user profile data from Shellmates.app
CREATE TABLE IF NOT EXISTS shellmates_profiles (
  id SERIAL PRIMARY KEY,
  shellmates_user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  discord_user_id VARCHAR(255),
  discord_username VARCHAR(255),
  level INT,
  rank INT,
  points INT,
  challenges_completed INT,
  profile_url TEXT,
  profile_data JSONB,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint on shellmates_user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_shellmates_profiles_user_id_unique
  ON shellmates_profiles(shellmates_user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shellmates_profiles_username ON shellmates_profiles(username);
CREATE INDEX IF NOT EXISTS idx_shellmates_profiles_discord_user_id ON shellmates_profiles(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_shellmates_profiles_rank ON shellmates_profiles(rank);
CREATE INDEX IF NOT EXISTS idx_shellmates_profiles_level ON shellmates_profiles(level);
CREATE INDEX IF NOT EXISTS idx_shellmates_profiles_created_at ON shellmates_profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shellmates_profiles_data_gin ON shellmates_profiles USING GIN (profile_data);

-- Create shellmates_challenges table for storing challenge data
CREATE TABLE IF NOT EXISTS shellmates_challenges (
  id SERIAL PRIMARY KEY,
  shellmates_challenge_id VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  difficulty VARCHAR(50),
  points INT,
  solved_count INT,
  description TEXT,
  challenge_data JSONB,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for challenges
CREATE INDEX IF NOT EXISTS idx_shellmates_challenges_category ON shellmates_challenges(category);
CREATE INDEX IF NOT EXISTS idx_shellmates_challenges_difficulty ON shellmates_challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_shellmates_challenges_points ON shellmates_challenges(points);
CREATE INDEX IF NOT EXISTS idx_shellmates_challenges_created_at ON shellmates_challenges(created_at DESC);

-- Create shellmates_user_challenges table for tracking user challenge completions
CREATE TABLE IF NOT EXISTS shellmates_user_challenges (
  id SERIAL PRIMARY KEY,
  profile_id INT REFERENCES shellmates_profiles(id) ON DELETE CASCADE,
  challenge_id INT REFERENCES shellmates_challenges(id) ON DELETE CASCADE,
  solved_at TIMESTAMPTZ,
  solve_time_seconds INT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint and indexes for user challenges
CREATE UNIQUE INDEX IF NOT EXISTS idx_shellmates_user_challenges_unique
  ON shellmates_user_challenges(profile_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_shellmates_user_challenges_profile_id ON shellmates_user_challenges(profile_id);
CREATE INDEX IF NOT EXISTS idx_shellmates_user_challenges_challenge_id ON shellmates_user_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_shellmates_user_challenges_solved_at ON shellmates_user_challenges(solved_at DESC);

-- Verify table creation
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('shellmates_profiles', 'shellmates_challenges', 'shellmates_user_challenges')
ORDER BY table_name, ordinal_position;

-- Display counts
SELECT
  'shellmates_profiles' as table_name, COUNT(*) as row_count FROM shellmates_profiles
UNION ALL
SELECT
  'shellmates_challenges' as table_name, COUNT(*) as row_count FROM shellmates_challenges
UNION ALL
SELECT
  'shellmates_user_challenges' as table_name, COUNT(*) as row_count FROM shellmates_user_challenges;
EOF

echo "✅ Migration completed successfully!"
