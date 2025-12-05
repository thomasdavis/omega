/**
 * PostgreSQL Schema Type Definitions
 * Defines the record types for PostgreSQL database tables
 */

export type MessageRecord = {
  id: string;
  timestamp: number;
  sender_type: 'human' | 'ai' | 'tool';
  user_id: string | null;
  username: string | null;
  channel_id: string | null;
  channel_name: string | null;
  guild_id: string | null;
  message_content: string;
  tool_name: string | null;
  tool_args: string | null;
  tool_result: string | null;
  session_id: string | null;
  parent_message_id: string | null;
  metadata: any;
  ai_summary: string | null;
  sentiment_analysis: any;
  response_decision: any;
  interaction_type: string | null;
  user_intent: string | null;
  bot_perception: string | null;
  conversation_quality: string | null;
  created_at: number | null;
};

export type QueryRecord = {
  id: string;
  timestamp: number;
  user_id: string;
  username: string;
  query_text: string;
  translated_sql: string | null;
  ai_summary: string | null;
  query_result: any;
  result_count: number | null;
  error: string | null;
  execution_time_ms: number | null;
  sentiment_analysis: any;
  query_complexity: string | null;
  user_satisfaction: string | null;
  created_at: number | null;
};

export type DocumentRecord = {
  id: string;
  title: string;
  content: string;
  created_by: string;
  created_by_username: string | null;
  created_at: number;
  updated_at: number;
  is_public: boolean;
  metadata: any;
};

export type DocumentCollaboratorRecord = {
  id: string;
  document_id: string;
  user_id: string;
  username: string | null;
  role: string | null;
  joined_at: number | null;
};

export type UserProfileRecord = {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  first_seen_at: number;
  last_interaction_at: number;
  last_analyzed_at: number | null;
  last_photo_analyzed_at: number | null;
  message_count: number;
  created_at: number | null;
  updated_at: number | null;

  // Psychological profile fields (keeping same as before for brevity)
  dominant_archetype: string | null;
  secondary_archetypes: any;
  archetype_confidence: number | null;
  shadow_archetype: string | null;

  // Big Five
  openness_score: number | null;
  conscientiousness_score: number | null;
  extraversion_score: number | null;
  agreeableness_score: number | null;
  neuroticism_score: number | null;

  // Other fields
  attachment_style: string | null;
  attachment_confidence: number | null;
  emotional_awareness_score: number | null;
  empathy_score: number | null;
  emotional_regulation_score: number | null;
  communication_formality: string | null;
  communication_assertiveness: string | null;
  communication_engagement: string | null;
  verbal_fluency_score: number | null;
  question_asking_frequency: number | null;
  analytical_thinking_score: number | null;
  creative_thinking_score: number | null;
  abstract_reasoning_score: number | null;
  concrete_thinking_score: number | null;
  social_dominance_score: number | null;
  cooperation_score: number | null;
  conflict_style: string | null;
  humor_style: string | null;
  message_length_avg: number | null;
  message_length_variance: number | null;
  response_latency_avg: number | null;
  emoji_usage_rate: number | null;
  punctuation_style: string | null;
  capitalization_pattern: string | null;
  technical_knowledge_level: string | null;
  primary_interests: any;
  expertise_areas: any;
  affinity_score: number | null;
  trust_level: number | null;
  emotional_bond: string | null;
  omega_thoughts: string | null;
  notable_patterns: any;
  overall_sentiment: string | null;
  positive_interaction_ratio: number | null;
  negative_interaction_ratio: number | null;
  dominant_emotions: any;
  feelings_json: any;
  personality_facets: any;
  cultural_background: string | null;
  cultural_values: any;
  cultural_communication_style: string | null;
  cultural_confidence: number | null;
  zodiac_sign: string | null;
  zodiac_element: string | null;
  zodiac_modality: string | null;
  birth_date: string | null;
  astrological_confidence: number | null;
  predicted_behaviors: any;
  prediction_confidence: number | null;
  prediction_timeframe: string | null;
  last_prediction_at: number | null;
  prediction_accuracy_score: number | null;
  integrated_profile_summary: string | null;
  profile_integration_confidence: number | null;
  world_model_adjustments: any;
  personal_model_adjustments: any;
  uploaded_photo_url: string | null;
  uploaded_photo_metadata: any;
  ai_appearance_description: string | null;
  appearance_confidence: number | null;
  ai_detected_gender: string | null;
  gender_confidence: number | null;
  estimated_age_range: string | null;
  age_confidence: number | null;
  face_shape: string | null;
  facial_symmetry_score: number | null;
  jawline_prominence: string | null;
  cheekbone_prominence: string | null;
  hair_color: string | null;
  hair_texture: string | null;
  hair_length: string | null;
  hair_style: string | null;
  hair_density: string | null;
  facial_hair: string | null;
  eye_color: string | null;
  eye_shape: string | null;
  eye_spacing: string | null;
  eyebrow_shape: string | null;
  eyebrow_thickness: string | null;
  nose_shape: string | null;
  nose_size: string | null;
  lip_fullness: string | null;
  smile_type: string | null;
  skin_tone: string | null;
  skin_texture: string | null;
  complexion_quality: string | null;
  body_type: string | null;
  build_description: string | null;
  height_estimate: string | null;
  posture: string | null;
  distinctive_features: any;
  clothing_style: string | null;
  accessories: any;
  attractiveness_assessment: string | null;
  approachability_score: number | null;
  perceived_confidence_level: string | null;
  aesthetic_archetype: string | null;
};

export type UserAnalysisHistoryRecord = {
  id: string;
  user_id: string;
  analysis_timestamp: number;
  message_count_at_analysis: number | null;
  feelings_snapshot: any;
  personality_snapshot: any;
  changes_summary: string | null;
  created_at: number | null;
};

export type SelfEvolutionCycleRecord = {
  id: number;
  cycle_date: string;
  started_at: Date;
  ended_at: Date | null;
  summary: string | null;
  wildcard_title: string | null;
  status: 'planned' | 'running' | 'completed' | 'failed' | 'reverted';
};

export type SelfEvolutionActionRecord = {
  id: number;
  cycle_id: number;
  type: 'capability' | 'future' | 'wildcard' | 'prompt' | 'persona';
  title: string;
  description: string | null;
  issue_number: number | null;
  pr_number: number | null;
  branch_name: string | null;
  status: 'planned' | 'in_progress' | 'done' | 'skipped' | 'reverted' | 'failed';
  notes: string | null;
  created_at: Date;
};

export type SelfEvolutionSanityCheckRecord = {
  id: number;
  cycle_id: number;
  check_name: string;
  passed: boolean;
  result: 'pass' | 'warn' | 'fail';
  details: any;
  created_at: Date;
};

export type SelfEvolutionMetricRecord = {
  id: number;
  cycle_id: number;
  metric_name: string;
  metric_value: number | null;
  unit: string | null;
  details: any;
  created_at: Date;
};

export type SelfEvolutionBranchRecord = {
  id: number;
  cycle_id: number;
  branch_name: string;
  base_branch: string;
  pr_number: number | null;
  merged: boolean;
  closed: boolean;
  created_at: Date;
};
