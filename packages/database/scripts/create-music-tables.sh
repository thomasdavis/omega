#!/bin/bash
# Create abc_sheet_music and midi_files tables directly in PostgreSQL
# Usage: ./create-music-tables.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating music storage tables (abc_sheet_music and midi_files)..."

psql "$DB_URL" << 'EOF'
-- CreateTable abc_sheet_music
CREATE TABLE IF NOT EXISTS "abc_sheet_music" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "composer" TEXT,
    "key" TEXT,
    "time_signature" TEXT,
    "tempo" TEXT,
    "abc_notation" TEXT NOT NULL,
    "description" TEXT,
    "musical_structure" TEXT,
    "metadata" JSONB,
    "created_by" TEXT,
    "created_by_username" TEXT,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "abc_sheet_music_pkey" PRIMARY KEY ("id")
);

-- CreateTable midi_files
CREATE TABLE IF NOT EXISTS "midi_files" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "midi_data" BYTEA NOT NULL,
    "abc_notation" TEXT,
    "abc_sheet_music_id" TEXT,
    "filename" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "artifact_path" TEXT,
    "metadata" JSONB,
    "created_by" TEXT,
    "created_by_username" TEXT,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "midi_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_abc_sheet_music_created_at" ON "abc_sheet_music"("created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_abc_sheet_music_created_by" ON "abc_sheet_music"("created_by");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_midi_files_created_at" ON "midi_files"("created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_midi_files_created_by" ON "midi_files"("created_by");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_midi_files_abc_sheet_music_id" ON "midi_files"("abc_sheet_music_id");

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('abc_sheet_music', 'midi_files');
EOF

echo "✅ Migration completed successfully!"
