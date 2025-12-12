#!/bin/bash
# Create openrouter_requests table for tracking OpenRouter API usage
# Usage: ./create-openrouter-table.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating openrouter_requests table..."

psql "$DB_URL" << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "openrouter_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT,
    "model" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT,
    "tokens_used" INTEGER,
    "cost_usd" REAL,
    "latency_ms" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "openrouter_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_openrouter_requests_user_id" ON "openrouter_requests"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_openrouter_requests_created_at" ON "openrouter_requests"("created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_openrouter_requests_model" ON "openrouter_requests"("model");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_openrouter_requests_status" ON "openrouter_requests"("status");

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'openrouter_requests';
EOF

echo "✅ Migration completed successfully!"
