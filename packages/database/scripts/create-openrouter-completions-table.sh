#!/bin/bash
# Create openrouter_completions table directly in PostgreSQL
# Usage: ./create-openrouter-completions-table.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating openrouter_completions table..."

psql "$DB_URL" << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "openrouter_completions" (
    "id" SERIAL PRIMARY KEY,
    "user_id" TEXT,
    "username" TEXT,
    "model" TEXT NOT NULL,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "cost" DECIMAL(10, 6),
    "request_data" JSONB,
    "response_data" JSONB,
    "finish_reason" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CreateIndex - for querying completions by user
CREATE INDEX IF NOT EXISTS "idx_openrouter_completions_user_id" ON "openrouter_completions"("user_id");

-- CreateIndex - for querying completions by date
CREATE INDEX IF NOT EXISTS "idx_openrouter_completions_created_at" ON "openrouter_completions"("created_at" DESC);

-- CreateIndex - for querying completions by model
CREATE INDEX IF NOT EXISTS "idx_openrouter_completions_model" ON "openrouter_completions"("model");

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'openrouter_completions';
EOF

echo "✅ Migration completed successfully!"
