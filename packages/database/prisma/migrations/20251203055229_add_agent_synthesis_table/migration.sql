-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_syntheses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "synthesis_content" TEXT NOT NULL,
    "message_count" INTEGER NOT NULL,
    "generated_at" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    "updated_at" BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,

    CONSTRAINT "agent_syntheses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agent_syntheses_user_id_key" ON "agent_syntheses"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_agent_synthesis_user_id" ON "agent_syntheses"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_agent_synthesis_generated_at" ON "agent_syntheses"("generated_at" DESC);
