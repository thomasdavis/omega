#!/bin/bash
# Create tech_translations and tech_translation_feedback tables
# Usage: ./create-tech-translations-tables.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating tech_translations and tech_translation_feedback tables..."

psql "$DB_URL" << 'EOF'
-- CreateTable tech_translations
CREATE TABLE IF NOT EXISTS "tech_translations" (
    "id" SERIAL PRIMARY KEY,
    "user_id" VARCHAR(255) NOT NULL,
    "username" VARCHAR(255),
    "source_text" TEXT NOT NULL,
    "output_markdown" TEXT,
    "output_json" JSONB,
    "assumptions" JSONB,
    "risks" JSONB,
    "model" VARCHAR(100),
    "prompt_version" VARCHAR(50),
    "helpfulness_score" SMALLINT,
    "tags" TEXT[],
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- CreateTable tech_translation_feedback
CREATE TABLE IF NOT EXISTS "tech_translation_feedback" (
    "id" SERIAL PRIMARY KEY,
    "translation_id" INTEGER REFERENCES tech_translations(id) ON DELETE CASCADE,
    "user_id" VARCHAR(255),
    "rating" SMALLINT CHECK (rating BETWEEN 1 AND 5),
    "comment" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for tech_translations
CREATE INDEX IF NOT EXISTS idx_tech_translations_user_id ON tech_translations(user_id);
CREATE INDEX IF NOT EXISTS idx_tech_translations_created_at ON tech_translations(created_at);
CREATE INDEX IF NOT EXISTS idx_tech_translations_output_json ON tech_translations USING GIN (output_json);
-- Simple FTS on source_text (can upgrade to dedicated tsvector column later)
CREATE INDEX IF NOT EXISTS idx_tech_translations_fts ON tech_translations USING GIN (to_tsvector('simple', source_text));

-- Verify tables were created
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('tech_translations', 'tech_translation_feedback');

-- Show table structures
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tech_translations'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tech_translation_feedback'
ORDER BY ordinal_position;
EOF

echo "✅ Migration completed successfully!"
