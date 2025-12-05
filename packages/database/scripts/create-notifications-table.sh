#!/bin/bash
# Create notifications table for tracking feature completion notifications
# Usage: ./create-notifications-table.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating notifications table..."

psql "$DB_URL" << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" VARCHAR(255) NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "source_id" INTEGER,
    "source_url" TEXT,
    "payload" JSONB,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "sent_at" TIMESTAMPTZ,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for efficient querying by user and status
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications"("user_id");

-- CreateIndex for status-based queries (pending/sent/failed)
CREATE INDEX IF NOT EXISTS "idx_notifications_status" ON "notifications"("status");

-- CreateIndex for efficient pagination and history queries
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications"("created_at" DESC);

-- CreateIndex for composite query optimization (user + status)
CREATE INDEX IF NOT EXISTS "idx_notifications_user_status" ON "notifications"("user_id", "status");

-- Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications';

-- Show table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
EOF

echo "✅ Migration completed successfully!"
