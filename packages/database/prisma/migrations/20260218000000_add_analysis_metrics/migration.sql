-- Add new analysis metrics columns to user_profiles
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "peak_activity_hours" JSONB;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "weekend_activity_ratio" DOUBLE PRECISION;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "sentiment_trajectory" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "vocabulary_growth_rate" DOUBLE PRECISION;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "engagement_authenticity_score" DOUBLE PRECISION;
