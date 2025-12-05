-- Create user_feelings table for tracking user emotions and moods over time
CREATE TABLE IF NOT EXISTS "user_feelings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT,
    "feeling_type" TEXT NOT NULL,
    "intensity" INTEGER,
    "valence" TEXT,
    "notes" TEXT,
    "context" JSONB,
    "triggers" JSONB,
    "physical_state" TEXT,
    "mental_state" TEXT,
    "metadata" JSONB,
    "timestamp" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "user_feelings_pkey" PRIMARY KEY ("id")
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "idx_user_feelings_user_id" ON "user_feelings"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_feelings_timestamp" ON "user_feelings"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_feelings_feeling_type" ON "user_feelings"("feeling_type");
CREATE INDEX IF NOT EXISTS "idx_user_feelings_user_timestamp" ON "user_feelings"("user_id", "timestamp" DESC);
