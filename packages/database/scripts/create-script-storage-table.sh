#!/bin/bash
# Create script_storage table directly in PostgreSQL
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-script-storage-table.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating script_storage table..."

psql "$DB_URL" << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "script_storage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT,
    "script_name" TEXT NOT NULL,
    "script_content" TEXT NOT NULL,
    "language" TEXT DEFAULT 'javascript',
    "description" TEXT,
    "tags" JSONB,
    "metadata" JSONB,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    "updated_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "script_storage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_script_storage_user_id" ON "script_storage"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_script_storage_created_at" ON "script_storage"("created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_script_storage_script_name" ON "script_storage"("script_name");

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'script_storage';
EOF

echo "✅ Migration completed successfully!"
