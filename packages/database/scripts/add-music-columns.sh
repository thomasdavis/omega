#!/bin/bash
# Add missing columns to abc_sheet_music and midi_files tables
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/add-music-columns.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Adding missing columns to music tables..."

psql "$DB_URL" << 'EOF'
-- Add missing columns to abc_sheet_music
ALTER TABLE abc_sheet_music ADD COLUMN IF NOT EXISTS composer TEXT;
ALTER TABLE abc_sheet_music ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE abc_sheet_music ADD COLUMN IF NOT EXISTS time_signature TEXT;
ALTER TABLE abc_sheet_music ADD COLUMN IF NOT EXISTS tempo TEXT;
ALTER TABLE abc_sheet_music ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE abc_sheet_music ADD COLUMN IF NOT EXISTS musical_structure TEXT;
ALTER TABLE abc_sheet_music ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE abc_sheet_music ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE abc_sheet_music ADD COLUMN IF NOT EXISTS created_by_username TEXT;
ALTER TABLE abc_sheet_music ADD COLUMN IF NOT EXISTS created_at BIGINT DEFAULT (EXTRACT(epoch FROM now()))::bigint;

-- Add missing columns to midi_files
ALTER TABLE midi_files ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE midi_files ADD COLUMN IF NOT EXISTS abc_notation TEXT;
ALTER TABLE midi_files ADD COLUMN IF NOT EXISTS abc_sheet_music_id TEXT;
ALTER TABLE midi_files ADD COLUMN IF NOT EXISTS artifact_path TEXT;
ALTER TABLE midi_files ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE midi_files ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE midi_files ADD COLUMN IF NOT EXISTS created_by_username TEXT;
ALTER TABLE midi_files ADD COLUMN IF NOT EXISTS created_at BIGINT DEFAULT (EXTRACT(epoch FROM now()))::bigint;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_abc_sheet_music_created_at ON abc_sheet_music(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abc_sheet_music_created_by ON abc_sheet_music(created_by);
CREATE INDEX IF NOT EXISTS idx_midi_files_created_at ON midi_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_midi_files_created_by ON midi_files(created_by);
CREATE INDEX IF NOT EXISTS idx_midi_files_abc_sheet_music_id ON midi_files(abc_sheet_music_id);

-- Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'abc_sheet_music'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'midi_files'
ORDER BY ordinal_position;
EOF

echo "✅ Migration completed successfully!"
