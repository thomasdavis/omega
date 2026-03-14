#!/bin/bash
# Add expert panel profiling fields to user_profiles and user_analysis_history tables
# All fields are nullable for backwards compatibility
# Idempotent: uses IF NOT EXISTS

set -euo pipefail

DB_URL="${DATABASE_URL:-${DATABASE_PUBLIC_URL:-}}"
if [ -z "$DB_URL" ]; then
  echo "ERROR: DATABASE_URL or DATABASE_PUBLIC_URL must be set"
  exit 1
fi

echo "Adding expert panel fields to user_profiles..."

psql "$DB_URL" <<'SQL'
-- Expert Panel Core
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS expert_panel_json JSONB;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS expert_panel_version INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS expert_panel_timestamp BIGINT;

-- IO Psychologist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS leadership_potential INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS leadership_potential_ci_low INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS leadership_potential_ci_high INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS team_role TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS motivational_hierarchy JSONB;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS organizational_citizenship INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS productivity_pattern TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS initiative_taking_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS feedback_orientation TEXT;

-- Peterson
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS order_chaos_balance INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS responsibility_index INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS meaning_orientation TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS competence_trajectory TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS narrative_coherence_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS big_five_deep_interpretation TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS big_five_interaction_effects JSONB;

-- Jung
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS individuation_stage TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS shadow_integration_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS persona_authenticity_gap INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS anima_animus_balance INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS collective_unconscious_themes JSONB;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS projection_patterns JSONB;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS archetype_constellation_essay TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS shadow_profile_essay TEXT;

-- Sapolsky
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stress_response_pattern TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dopamine_seeking_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS serotonin_stability_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS social_hierarchy_position TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS behavioral_ecology_strategy TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stress_chronotype TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS recovery_speed TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS neurobiological_profile TEXT;

-- Bernays
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS persuadability_index INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS influence_susceptibility JSONB;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS memetic_role TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS group_psychology_type TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS propaganda_vulnerability INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS influence_network_role TEXT;

-- Freud
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS defense_mechanism_primary TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS defense_mechanism_secondary TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS id_ego_superego_balance JSONB;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS repression_index INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS transference_pattern TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sublimation_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avoided_topics JSONB;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS unconscious_drives_essay TEXT;

-- Kahneman
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS system1_dominance INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cognitive_bias_profile JSONB;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS loss_aversion_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS anchoring_susceptibility INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS overconfidence_index INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS decision_quality_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cognitive_reflection_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS decision_making_essay TEXT;

-- Nietzsche
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS will_to_power_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS master_slave_morality TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS eternal_recurrence_embrace INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ubermensch_alignment INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ressentiment_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS value_creation_orientation TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS amor_fati_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS existential_philosophy_essay TEXT;

-- Caesar
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS strategic_value_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS loyalty_reliability_index INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS caesar_classification TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS courage_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS decisiveness_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS caesar_verdict_essay TEXT;

-- Genghis Khan
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS meritocratic_worth_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS adaptability_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS resilience_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS correction_acceptance_rate TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS practical_intelligence_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS khan_verdict_essay TEXT;

-- Machiavelli
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS political_intelligence_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS virtu_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS fox_lion_profile TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS performed_virtue_index INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS behavioral_flexibility_score INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS machiavelli_verdict_essay TEXT;

-- Meta-Synthesis
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS expert_consensus_score REAL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS expert_dissent_summary TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS inter_rater_reliability REAL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS confidence_intervals_json JSONB;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bayesian_big_five JSONB;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS growth_trajectory TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS expert_integrated_verdict TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS compatibility_vector JSONB;

-- Analysis History: expert panel snapshot
ALTER TABLE user_analysis_history ADD COLUMN IF NOT EXISTS expert_panel_snapshot JSONB;

SQL

echo "Expert panel fields added successfully!"
