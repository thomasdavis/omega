#!/bin/bash
# Create video_files table directly in PostgreSQL
# Usage: ./create-video-files-table.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating video storage table (video_files)..."

psql "$DB_URL" << 'EOF'
-- CreateTable video_files
CREATE TABLE IF NOT EXISTS "video_files" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "video_data" BYTEA NOT NULL,
    "filename" TEXT NOT NULL,
    "file_size" INTEGER,
    "format" TEXT DEFAULT 'mp4',
    "duration" REAL,
    "width" INTEGER,
    "height" INTEGER,
    "fps" INTEGER,
    "image_references" JSONB,
    "metadata" JSONB,
    "created_by" TEXT,
    "created_by_username" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_video_files_created_at" ON "video_files"("created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_video_files_created_by" ON "video_files"("created_by");

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_files';
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'video_files' ORDER BY ordinal_position;
EOF

echo "✅ Migration completed successfully!"
