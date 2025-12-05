#!/bin/bash
# Create generated_images table directly in PostgreSQL
# Usage: ./create-generated-images-table.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating generated_images table..."

psql "$DB_URL" << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "generated_images" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_data" BYTEA,
    "prompt" TEXT NOT NULL,
    "revised_prompt" TEXT,
    "tool_used" TEXT NOT NULL,
    "model_used" TEXT,
    "filename" TEXT NOT NULL,
    "file_size" INTEGER,
    "artifact_path" TEXT,
    "public_url" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "format" TEXT DEFAULT 'png',
    "metadata" JSONB,
    "created_by" TEXT,
    "created_by_username" TEXT,
    "discord_message_id" TEXT,
    "github_issue_number" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_generated_images_created_at" ON "generated_images"("created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_generated_images_created_by" ON "generated_images"("created_by");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_generated_images_tool_used" ON "generated_images"("tool_used");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_generated_images_model_used" ON "generated_images"("model_used");

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'generated_images';
EOF

echo "✅ Migration completed successfully!"
