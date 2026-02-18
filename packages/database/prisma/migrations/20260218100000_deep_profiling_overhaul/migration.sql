-- Deep Profiling Overhaul: Add long-form analysis fields, drop astrology

-- 1A. New long-form columns on user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS omega_rating INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS omega_rating_reason TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS psychological_profile TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS communication_analysis TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS relationship_narrative TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS personality_evolution TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS behavioral_deep_dive TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS interests_analysis TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emotional_landscape TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS social_dynamics_analysis TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS interaction_style_with_others TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS analysis_version INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS previous_analysis_summary TEXT;

-- 1B. Expand user_analysis_history for full snapshots
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS omega_rating INTEGER;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS omega_rating_reason TEXT;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS psychological_profile TEXT;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS communication_analysis TEXT;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS relationship_narrative TEXT;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS personality_evolution TEXT;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS behavioral_deep_dive TEXT;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS interests_analysis TEXT;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS emotional_landscape TEXT;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS social_dynamics_analysis TEXT;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS interaction_style_with_others TEXT;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS omega_thoughts TEXT;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS trust_level INTEGER;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS affinity_score INTEGER;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS overall_sentiment TEXT;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS analysis_version INTEGER;
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS integrated_profile_summary TEXT;

-- 1C. Drop astrology columns
ALTER TABLE user_profiles DROP COLUMN IF EXISTS zodiac_sign;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS zodiac_element;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS zodiac_modality;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS birth_date;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS astrological_confidence;
