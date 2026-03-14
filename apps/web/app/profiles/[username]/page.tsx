'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Dynamic imports for chart components (reduce initial bundle)
const BigFiveRadar = dynamic(() => import('@/components/charts/BigFiveRadar').then(mod => ({ default: mod.BigFiveRadar })), { ssr: false });
const CognitiveStyleRadar = dynamic(() => import('@/components/charts/CognitiveStyleRadar').then(mod => ({ default: mod.CognitiveStyleRadar })), { ssr: false });
const InfluenceRadar = dynamic(() => import('@/components/charts/InfluenceRadar').then(mod => ({ default: mod.InfluenceRadar })), { ssr: false });
const IdEgoSuperego = dynamic(() => import('@/components/charts/IdEgoSuperego').then(mod => ({ default: mod.IdEgoSuperego })), { ssr: false });
const NietzscheRadar = dynamic(() => import('@/components/charts/NietzscheRadar').then(mod => ({ default: mod.NietzscheRadar })), { ssr: false });
const CognitiveBiasBar = dynamic(() => import('@/components/charts/CognitiveBiasBar').then(mod => ({ default: mod.CognitiveBiasBar })), { ssr: false });
const TraitTimeline = dynamic(() => import('@/components/charts/TraitTimeline').then(mod => ({ default: mod.TraitTimeline })), { ssr: false });
const ExpertComparisonBar = dynamic(() => import('@/components/charts/ExpertComparisonBar').then(mod => ({ default: mod.ExpertComparisonBar })), { ssr: false });

// =============================================================================
// TYPES
// =============================================================================

interface FeelingsJson {
  sentiment?: string;
  trustLevel?: number;
  affinityScore?: number;
  thoughts?: string;
  facets?: string[];
  notablePatterns?: string[];
  lastUpdated?: number;
}

interface PersonalityFacetsJson {
  dominantArchetypes?: string[];
  bigFiveTraits?: Record<string, string>;
  communicationStyle?: Record<string, string>;
  quirks?: string[];
}

interface BehavioralPrediction {
  behavior: string;
  confidence: number;
  timeframe: string;
  category: string;
  influencingFactors: string[];
}

interface CognitiveBias {
  bias: string;
  severity: number;
  evidence?: string;
}

interface BigFiveCI {
  score: number;
  ci: { low: number; high: number };
}

interface UserProfile {
  // Core
  id: string;
  userId: string;
  username: string;

  // Archetypes
  dominant_archetype: string | null;
  secondary_archetypes: string[] | null;
  archetype_confidence: number | null;
  shadow_archetype: string | null;

  // Big Five Personality Traits
  openness_score: number | null;
  conscientiousness_score: number | null;
  extraversion_score: number | null;
  agreeableness_score: number | null;
  neuroticism_score: number | null;

  // Attachment Style
  attachmentStyle: string | null;
  attachment_confidence: number | null;

  // Emotional Intelligence
  emotional_awareness_score: number | null;
  empathy_score: number | null;
  emotional_regulation_score: number | null;

  // Communication Style
  communication_formality: string | null;
  communication_assertiveness: string | null;
  communication_engagement: string | null;
  verbal_fluency_score: number | null;
  question_asking_frequency: number | null;

  // Thinking Style
  analytical_thinking_score: number | null;
  creative_thinking_score: number | null;
  abstract_reasoning_score: number | null;
  concrete_thinking_score: number | null;

  // Social Dynamics
  social_dominance_score: number | null;
  cooperation_score: number | null;
  conflictStyle: string | null;
  humorStyle: string | null;

  // Linguistic Patterns
  messageLengthAvg: number | null;
  message_length_variance: number | null;
  response_latency_avg: number | null;
  emoji_usage_rate: number | null;
  punctuation_style: string | null;
  capitalization_pattern: string | null;

  // Knowledge & Interests
  technical_knowledge_level: string | null;
  primary_interests: string[] | null;
  expertise_areas: string[] | null;

  // Relationship with Omega
  affinity_score: number | null;
  trust_level: number | null;
  emotional_bond: string | null;
  omega_thoughts: string | null;

  // Patterns & Sentiment
  notable_patterns: string[] | null;
  overall_sentiment: string | null;
  positive_interaction_ratio: number | null;
  negative_interaction_ratio: number | null;
  dominant_emotions: string[] | null;
  feelings_json: FeelingsJson | null;
  personality_facets: PersonalityFacetsJson | null;

  // Cultural Background
  culturalBackground: string | null;
  culturalValues: string[] | null;
  culturalCommunicationStyle: string | null;
  culturalConfidence: number | null;

  // Deep Analysis Long-Form Fields
  omega_rating: number | null;
  omega_rating_reason: string | null;
  psychological_profile: string | null;
  communication_analysis: string | null;
  relationship_narrative: string | null;
  personality_evolution: string | null;
  behavioral_deep_dive: string | null;
  interests_analysis: string | null;
  emotional_landscape: string | null;
  social_dynamics_analysis: string | null;
  interaction_style_with_others: string | null;
  analysis_version: number | null;
  previous_analysis_summary: string | null;

  // Behavioral Predictions
  predictedBehaviors: BehavioralPrediction[] | null;
  predictionConfidence: number | null;
  predictionTimeframe: string | null;
  lastPredictionAt: number | null;
  predictionAccuracyScore: number | null;

  // Integration
  integratedProfileSummary: string | null;
  profileIntegrationConfidence: number | null;
  worldModelAdjustments: Record<string, unknown> | null;
  personalModelAdjustments: Record<string, unknown> | null;

  // New analysis dimensions
  peakActivityHours: number[] | null;
  weekendActivityRatio: number | null;
  sentimentTrajectory: string | null;
  vocabularyGrowthRate: number | null;
  engagementAuthenticityScore: number | null;

  // Physical Appearance
  uploadedPhotoUrl: string | null;
  uploadedPhotoMetadata: Record<string, unknown> | null;
  aiAppearanceDescription: string | null;
  appearanceConfidence: number | null;
  aiDetectedGender: string | null;
  genderConfidence: number | null;
  estimatedAgeRange: string | null;
  ageConfidence: number | null;
  faceShape: string | null;
  facialSymmetryScore: number | null;
  jawlineProminence: string | null;
  cheekboneProminence: string | null;
  hairColor: string | null;
  hairTexture: string | null;
  hairLength: string | null;
  hairStyle: string | null;
  hairDensity: string | null;
  facialHair: string | null;
  eyeColor: string | null;
  eyeShape: string | null;
  eyeSpacing: string | null;
  eyebrowShape: string | null;
  eyebrowThickness: string | null;
  noseShape: string | null;
  noseSize: string | null;
  lipFullness: string | null;
  smileType: string | null;
  skinTone: string | null;
  skinTexture: string | null;
  complexionQuality: string | null;
  bodyType: string | null;
  buildDescription: string | null;
  heightEstimate: string | null;
  posture: string | null;
  distinctiveFeatures: string[] | null;
  clothingStyle: string | null;
  accessories: string[] | null;
  attractivenessAssessment: string | null;
  approachabilityScore: number | null;
  perceivedConfidenceLevel: string | null;
  aestheticArchetype: string | null;

  // Expert Panel Core
  expert_panel_json: any | null;
  expert_panel_version: number | null;
  expert_panel_timestamp: number | null;

  // IO Psychologist
  leadership_potential: number | null;
  leadership_potential_ci_low: number | null;
  leadership_potential_ci_high: number | null;
  team_role: string | null;
  motivational_hierarchy: string[] | null;
  organizational_citizenship: number | null;
  productivity_pattern: string | null;
  initiative_taking_score: number | null;
  feedback_orientation: string | null;

  // Peterson
  order_chaos_balance: number | null;
  responsibility_index: number | null;
  meaning_orientation: string | null;
  competence_trajectory: string | null;
  narrative_coherence_score: number | null;
  big_five_deep_interpretation: string | null;
  big_five_interaction_effects: any[] | null;

  // Jung
  individuation_stage: string | null;
  shadow_integration_score: number | null;
  persona_authenticity_gap: number | null;
  anima_animus_balance: number | null;
  collective_unconscious_themes: string[] | null;
  projection_patterns: string[] | null;
  archetype_constellation_essay: string | null;
  shadow_profile_essay: string | null;

  // Sapolsky
  stress_response_pattern: string | null;
  dopamine_seeking_score: number | null;
  serotonin_stability_score: number | null;
  social_hierarchy_position: string | null;
  behavioral_ecology_strategy: string | null;
  stress_chronotype: string | null;
  recovery_speed: string | null;
  neurobiological_profile: string | null;

  // Bernays
  persuadability_index: number | null;
  influence_susceptibility: { socialProof?: number; authority?: number; scarcity?: number; reciprocity?: number; commitment?: number; liking?: number } | null;
  memetic_role: string | null;
  group_psychology_type: string | null;
  propaganda_vulnerability: number | null;
  influence_network_role: string | null;

  // Freud
  defense_mechanism_primary: string | null;
  defense_mechanism_secondary: string | null;
  id_ego_superego_balance: { id?: number; ego?: number; superego?: number } | null;
  repression_index: number | null;
  transference_pattern: string | null;
  sublimation_score: number | null;
  avoided_topics: string[] | null;
  unconscious_drives_essay: string | null;

  // Kahneman
  system1_dominance: number | null;
  cognitive_bias_profile: CognitiveBias[] | null;
  loss_aversion_score: number | null;
  anchoring_susceptibility: number | null;
  overconfidence_index: number | null;
  decision_quality_score: number | null;
  cognitive_reflection_score: number | null;
  decision_making_essay: string | null;

  // Nietzsche
  will_to_power_score: number | null;
  master_slave_morality: string | null;
  eternal_recurrence_embrace: number | null;
  ubermensch_alignment: number | null;
  ressentiment_score: number | null;
  value_creation_orientation: string | null;
  amor_fati_score: number | null;
  existential_philosophy_essay: string | null;

  // Caesar
  strategic_value_score: number | null;
  loyalty_reliability_index: number | null;
  caesar_classification: string | null;
  courage_score: number | null;
  decisiveness_score: number | null;
  caesar_verdict_essay: string | null;

  // Genghis Khan
  meritocratic_worth_score: number | null;
  adaptability_score: number | null;
  resilience_score: number | null;
  correction_acceptance_rate: string | null;
  practical_intelligence_score: number | null;
  khan_verdict_essay: string | null;

  // Machiavelli
  political_intelligence_score: number | null;
  virtu_score: number | null;
  fox_lion_profile: string | null;
  performed_virtue_index: number | null;
  behavioral_flexibility_score: number | null;
  machiavelli_verdict_essay: string | null;

  // Meta-Synthesis
  expert_consensus_score: number | null;
  expert_dissent_summary: string | null;
  inter_rater_reliability: number | null;
  confidence_intervals_json: Record<string, any> | null;
  bayesian_big_five: { openness?: BigFiveCI; conscientiousness?: BigFiveCI; extraversion?: BigFiveCI; agreeableness?: BigFiveCI; neuroticism?: BigFiveCI } | null;
  growth_trajectory: string | null;
  expert_integrated_verdict: string | null;
  compatibility_vector: any | null;

  // Tracking & Metadata
  messageCount: number;
  firstSeenAt: number;
  lastInteractionAt: number;
  lastAnalyzedAt: number | null;
  lastPhotoAnalyzedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

// =============================================================================
// EXPERT ACCENT COLORS
// =============================================================================

const EXPERT_COLORS: Record<string, string> = {
  IO: '#60a5fa',
  Peterson: '#f87171',
  Jung: '#c084fc',
  Sapolsky: '#34d399',
  Bernays: '#fbbf24',
  Freud: '#fb7185',
  Kahneman: '#22d3ee',
  Nietzsche: '#fb923c',
  Caesar: '#facc15',
  Khan: '#a3e635',
  Machiavelli: '#a78bfa',
};

// =============================================================================
// TABS
// =============================================================================

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'experts', label: 'Expert Panel' },
  { id: 'psychology', label: 'Psychology' },
  { id: 'cognition', label: 'Cognition' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'influence', label: 'Influence' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'history', label: 'History' },
] as const;

type TabId = typeof TABS[number]['id'];

// =============================================================================
// SHARED COMPONENTS
// =============================================================================

function normalizeConfidence(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return value > 1 ? value : Math.round(value * 100);
}

const ScoreBar = ({ score, label, max = 100, ciLow, ciHigh, color }: { score: number; label: string; max?: number; ciLow?: number; ciHigh?: number; color?: string }) => {
  const percentage = (score / max) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-zinc-500 uppercase tracking-wider">{label}</span>
        <span className="font-mono font-medium" style={{ color: color || '#2dd4bf' }}>
          {score}/{max}
          {ciLow != null && ciHigh != null && (
            <span className="text-zinc-600 ml-1">({ciLow}-{ciHigh})</span>
          )}
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
        {ciLow != null && ciHigh != null && (
          <div
            className="absolute h-full rounded-full opacity-30"
            style={{ left: `${(ciLow / max) * 100}%`, width: `${((ciHigh - ciLow) / max) * 100}%`, backgroundColor: color || '#2dd4bf' }}
          />
        )}
        <div
          className={color ? 'h-full rounded-full transition-all duration-500' : 'h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-500'}
          style={{ width: `${Math.min(percentage, 100)}%`, ...(color ? { backgroundColor: color } : {}) }}
        />
      </div>
    </div>
  );
};

const Pills = ({ items, label }: { items: string[]; label: string }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <span key={idx} className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-sm text-zinc-300 font-light">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

const Badge = ({ value, label, confidence, color }: { value: string; label: string; confidence?: number | null; color?: string }) => (
  <div className="space-y-2">
    <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{label}</div>
    <div className="inline-flex items-center gap-2">
      <span
        className="px-4 py-2 bg-gradient-to-r from-zinc-800 to-zinc-800/50 border rounded-lg text-base text-white font-light"
        style={{ borderColor: color ? `${color}40` : 'rgba(20, 184, 166, 0.3)' }}
      >
        {value}
      </span>
      {confidence !== null && confidence !== undefined && (
        <span className="text-xs font-mono" style={{ color: color || '#2dd4bf' }}>{normalizeConfidence(confidence)}%</span>
      )}
    </div>
  </div>
);

const TextField = ({ value, label }: { value: string | number; label: string }) => {
  if (value === null || value === undefined) return null;
  return (
    <div className="space-y-1">
      <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className="text-sm text-zinc-200 font-light">{value}</div>
    </div>
  );
};

const DataField = ({ label, value, confidence }: { label: string; value: any; confidence?: number | null }) => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return <Pills items={value} label={label} />;
  if (typeof value === 'object') {
    if (value.facets || value.thoughts || value.notablePatterns) {
      return (
        <div className="space-y-3">
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{label}</div>
          {value.thoughts && <p className="text-sm text-zinc-300 font-light italic">{value.thoughts}</p>}
          {value.facets && <Pills items={value.facets} label="Facets" />}
          {value.notablePatterns && <Pills items={value.notablePatterns} label="Notable Patterns" />}
        </div>
      );
    }
    if (value.quirks || value.bigFiveTraits || value.dominantArchetypes) {
      return (
        <div className="space-y-3">
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{label}</div>
          {value.dominantArchetypes && <Pills items={value.dominantArchetypes} label="Archetypes" />}
          {value.quirks && <Pills items={value.quirks} label="Quirks" />}
        </div>
      );
    }
    return null;
  }
  if (typeof value === 'string') return <Badge value={value} label={label} confidence={confidence} />;
  if (typeof value === 'number') {
    if (value >= 0 && value <= 1 && label.toLowerCase().includes('ratio'))
      return <ScoreBar score={Math.round(value * 100)} label={label} max={100} />;
    if (value >= 0 && value <= 100 && (label.toLowerCase().includes('score') || label.toLowerCase().includes('level')))
      return <ScoreBar score={value} label={label} max={100} />;
    return <TextField value={value} label={label} />;
  }
  return null;
};

const Section = ({ title, children, color }: { title: string; children: React.ReactNode; color?: string }) => (
  <div className="border-l-2 pl-6 space-y-6" style={{ borderColor: color ? `${color}40` : 'rgba(20, 184, 166, 0.3)' }}>
    <h2 className="text-2xl font-light text-white tracking-tight">{title}</h2>
    <div className="space-y-6">{children}</div>
  </div>
);

function ratingColor(rating: number): string {
  if (rating <= 20) return '#dc2626';
  if (rating <= 40) return '#ea580c';
  if (rating <= 60) return '#eab308';
  if (rating <= 80) return '#22c55e';
  return '#3b82f6';
}

const OmegaRatingBar = ({ rating, reason }: { rating: number; reason: string | null }) => {
  const color = ratingColor(rating);
  return (
    <div className="w-full p-6 bg-zinc-900 border border-zinc-800 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Omega Rating</div>
        <div className="text-4xl font-light font-mono" style={{ color }}>{rating}</div>
      </div>
      <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rating}%`, backgroundColor: color }} />
      </div>
      {reason && <p className="text-sm text-zinc-400 italic font-light">{reason}</p>}
    </div>
  );
};

const EssaySection = ({ title, content, color }: { title: string; content: string | null; color?: string }) => {
  const [expanded, setExpanded] = useState(false);
  if (!content) return null;
  const isLong = content.length > 500;
  return (
    <Section title={title} color={color}>
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className={`text-zinc-300 font-light leading-relaxed whitespace-pre-wrap ${isLong && !expanded ? 'line-clamp-6' : ''}`}>
          {content}
        </div>
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} className="mt-3 text-xs font-mono text-teal-400 hover:text-teal-300">
            {expanded ? 'Show less' : 'Read more...'}
          </button>
        )}
      </div>
    </Section>
  );
};

const PredictionCard = ({ prediction }: { prediction: BehavioralPrediction }) => (
  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg space-y-3">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-sm text-white font-light mb-2">{prediction.behavior}</div>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
          <span className="px-2 py-1 bg-zinc-800 rounded">{prediction.category}</span>
          <span className="px-2 py-1 bg-zinc-800 rounded">{prediction.timeframe}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-zinc-500">Confidence</div>
        <div className="text-lg text-teal-400 font-mono">{normalizeConfidence(prediction.confidence)}%</div>
      </div>
    </div>
    {prediction.influencingFactors?.length > 0 && (
      <div className="pt-2 border-t border-zinc-800">
        <div className="text-xs text-zinc-500 mb-2">Influencing Factors</div>
        <div className="flex flex-wrap gap-1">
          {prediction.influencingFactors.map((f: string, i: number) => (
            <span key={i} className="px-2 py-0.5 bg-zinc-800/50 rounded text-xs text-zinc-400">{f}</span>
          ))}
        </div>
      </div>
    )}
  </div>
);

// Expert summary card for Overview tab
const ExpertSummaryCard = ({ name, specialty, keyMetric, metricValue, color, essay }: {
  name: string; specialty: string; keyMetric: string; metricValue: string | number | null; color: string; essay?: string | null;
}) => {
  if (metricValue === null && !essay) return null;
  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-opacity-60 transition-all" style={{ borderLeftColor: color, borderLeftWidth: '3px' }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-medium text-white">{name}</div>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{specialty}</div>
        </div>
        {metricValue !== null && (
          <div className="text-lg font-mono font-light" style={{ color }}>{metricValue}</div>
        )}
      </div>
      <div className="text-xs text-zinc-500">{keyMetric}</div>
    </div>
  );
};

// =============================================================================
// ANALYSIS HISTORY VIEWER
// =============================================================================

interface AnalysisHistoryEntry {
  id: string;
  analysisTimestamp: number;
  messageCountAtAnalysis: number | null;
  analysisVersion: number | null;
  omegaRating: number | null;
  omegaRatingReason: string | null;
  omegaThoughts: string | null;
  trustLevel: number | null;
  affinityScore: number | null;
  overallSentiment: string | null;
  psychologicalProfile: string | null;
  communicationAnalysis: string | null;
  relationshipNarrative: string | null;
  personalityEvolution: string | null;
  behavioralDeepDive: string | null;
  interestsAnalysis: string | null;
  emotionalLandscape: string | null;
  socialDynamicsAnalysis: string | null;
  interactionStyleWithOthers: string | null;
  integratedProfileSummary: string | null;
}

const DIFF_FIELDS: { key: keyof AnalysisHistoryEntry; label: string; type: 'text' | 'number' | 'essay' }[] = [
  { key: 'omegaRating', label: 'Omega Rating', type: 'number' },
  { key: 'omegaRatingReason', label: 'Rating Reason', type: 'text' },
  { key: 'trustLevel', label: 'Trust Level', type: 'number' },
  { key: 'affinityScore', label: 'Affinity Score', type: 'number' },
  { key: 'overallSentiment', label: 'Overall Sentiment', type: 'text' },
  { key: 'omegaThoughts', label: "Omega's Thoughts", type: 'text' },
  { key: 'psychologicalProfile', label: 'Psychological Profile', type: 'essay' },
  { key: 'communicationAnalysis', label: 'Communication Analysis', type: 'essay' },
  { key: 'relationshipNarrative', label: 'Relationship with Omega', type: 'essay' },
  { key: 'personalityEvolution', label: "How They've Changed", type: 'essay' },
  { key: 'behavioralDeepDive', label: 'Behavioral Patterns', type: 'essay' },
  { key: 'interestsAnalysis', label: 'Interests & Passions', type: 'essay' },
  { key: 'emotionalLandscape', label: 'Emotional Landscape', type: 'essay' },
  { key: 'socialDynamicsAnalysis', label: 'Social Dynamics', type: 'essay' },
  { key: 'interactionStyleWithOthers', label: 'How They Treat Others', type: 'essay' },
];

function formatHistoryDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const NumberDiff = ({ label, oldVal, newVal }: { label: string; oldVal: number | null; newVal: number | null }) => {
  if (oldVal === null && newVal === null) return null;
  const diff = (newVal ?? 0) - (oldVal ?? 0);
  const diffColor = diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-zinc-500';
  const diffSign = diff > 0 ? '+' : '';
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
      <span className="text-sm text-zinc-400 font-mono">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-600 font-mono">{oldVal ?? '—'}</span>
        <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
        <span className="text-sm text-zinc-200 font-mono font-medium">{newVal ?? '—'}</span>
        {diff !== 0 && <span className={`text-xs font-mono ${diffColor}`}>({diffSign}{diff})</span>}
      </div>
    </div>
  );
};

const TextDiff = ({ label, oldVal, newVal }: { label: string; oldVal: string | null; newVal: string | null }) => {
  if (!oldVal && !newVal) return null;
  if (oldVal === newVal) return null;
  return (
    <div className="space-y-3 py-4 border-b border-zinc-800/50">
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-zinc-400">{label}</span>
        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400 font-mono">changed</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-lg">
          <div className="text-[10px] font-mono text-red-400/60 uppercase tracking-wider mb-2">Previous</div>
          <div className="text-sm text-red-200/70 font-light leading-relaxed whitespace-pre-wrap">
            {oldVal || <span className="italic text-zinc-600">empty</span>}
          </div>
        </div>
        <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-lg">
          <div className="text-[10px] font-mono text-emerald-400/60 uppercase tracking-wider mb-2">Current</div>
          <div className="text-sm text-emerald-200/80 font-light leading-relaxed whitespace-pre-wrap">
            {newVal || <span className="italic text-zinc-600">empty</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalysisHistoryViewer = ({ username }: { username: string }) => {
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const loadHistory = useCallback(() => {
    if (history.length > 0) return;
    setLoading(true);
    fetch(`/api/profiles/by-username/${username}/history`)
      .then(res => res.json())
      .then(data => { setHistory(data.history || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [username, history.length]);

  if (!expanded) {
    return (
      <button onClick={() => { setExpanded(true); loadHistory(); }} className="w-full p-4 bg-zinc-900 border border-zinc-800 hover:border-teal-500/40 rounded-lg transition-all group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-mono text-zinc-300 group-hover:text-teal-400 transition-colors">View Analysis History & Evolution</span>
          </div>
          <svg className="w-4 h-4 text-zinc-500 group-hover:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
    );
  }

  if (loading) return (
    <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center gap-3">
      <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-zinc-400 font-mono">Loading analysis history...</span>
    </div>
  );

  if (history.length < 2) return (
    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Analysis History</div>
        <button onClick={() => setExpanded(false)} className="text-xs text-zinc-500 hover:text-zinc-300">Collapse</button>
      </div>
      <div className="text-center py-8 text-zinc-600 text-sm font-light">
        {history.length === 0 ? 'No analysis history yet' : 'Need at least 2 analyses to show evolution'}
      </div>
    </div>
  );

  const currentEntry = history[0];
  const compareEntry = selectedIndex !== null ? history[selectedIndex] : history[1];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Analysis Evolution</div>
          <button onClick={() => setExpanded(false)} className="text-xs text-zinc-500 hover:text-zinc-300 font-mono">Collapse</button>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-zinc-500 font-mono">Compare current with:</span>
          <select value={selectedIndex ?? 1} onChange={(e) => setSelectedIndex(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-300 font-mono focus:border-teal-500 focus:outline-none">
            {history.slice(1).map((entry, idx) => (
              <option key={entry.id} value={idx + 1}>
                {formatHistoryDate(entry.analysisTimestamp)}{entry.analysisVersion ? ` (v${entry.analysisVersion})` : ''}{entry.messageCountAtAnalysis ? ` — ${entry.messageCountAtAnalysis} msgs` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-red-950/10 border border-red-900/20 rounded">
            <div className="text-[10px] font-mono text-red-400/60 uppercase tracking-wider">Previous</div>
            <div className="text-sm text-zinc-300 font-mono">{formatHistoryDate(compareEntry.analysisTimestamp)}</div>
          </div>
          <div className="p-3 bg-emerald-950/10 border border-emerald-900/20 rounded">
            <div className="text-[10px] font-mono text-emerald-400/60 uppercase tracking-wider">Current</div>
            <div className="text-sm text-zinc-300 font-mono">{formatHistoryDate(currentEntry.analysisTimestamp)}</div>
          </div>
        </div>
      </div>
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1">
        {DIFF_FIELDS.filter(f => f.type === 'number').map(field => (
          <NumberDiff key={field.key} label={field.label} oldVal={compareEntry[field.key] as number | null} newVal={currentEntry[field.key] as number | null} />
        ))}
        {DIFF_FIELDS.filter(f => f.type === 'text' || f.type === 'essay').map(field => (
          <TextDiff key={field.key} label={field.label} oldVal={compareEntry[field.key] as string | null} newVal={currentEntry[field.key] as string | null} />
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function ProfileDetailPage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    fetch(`/api/profiles/by-username/${username}`)
      .then(res => { if (!res.ok) throw new Error('Profile not found'); return res.json(); })
      .then(data => { setProfile(data.profile); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [username]);

  if (loading) return <LoadingSpinner message="Loading profile..." />;
  if (error || !profile) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-red-400 text-xl font-light">{error || 'Profile not found'}</div>
        <Link href="/profiles" className="text-teal-400 hover:text-teal-300 text-sm font-mono">← Back to Profiles</Link>
      </div>
    </div>
  );

  const formatTimestamp = (ts: number | null) => ts ? new Date(ts * 1000).toLocaleString() : null;
  const hasExpertPanel = profile.expert_panel_version != null && profile.expert_panel_version > 0;

  // Build Big Five radar data
  const bigFiveScores = [
    { trait: 'Openness', value: profile.openness_score ?? 0, ciLow: profile.bayesian_big_five?.openness?.ci?.low, ciHigh: profile.bayesian_big_five?.openness?.ci?.high },
    { trait: 'Conscientiousness', value: profile.conscientiousness_score ?? 0, ciLow: profile.bayesian_big_five?.conscientiousness?.ci?.low, ciHigh: profile.bayesian_big_five?.conscientiousness?.ci?.high },
    { trait: 'Extraversion', value: profile.extraversion_score ?? 0, ciLow: profile.bayesian_big_five?.extraversion?.ci?.low, ciHigh: profile.bayesian_big_five?.extraversion?.ci?.high },
    { trait: 'Agreeableness', value: profile.agreeableness_score ?? 0, ciLow: profile.bayesian_big_five?.agreeableness?.ci?.low, ciHigh: profile.bayesian_big_five?.agreeableness?.ci?.high },
    { trait: 'Neuroticism', value: profile.neuroticism_score ?? 0, ciLow: profile.bayesian_big_five?.neuroticism?.ci?.low, ciHigh: profile.bayesian_big_five?.neuroticism?.ci?.high },
  ];

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link href="/profiles" className="text-teal-400 hover:text-teal-300 text-sm font-mono inline-flex items-center gap-2 mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Profiles
          </Link>
          <div className="flex items-start gap-6">
            {profile.uploadedPhotoUrl && (
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-teal-500/30 flex-shrink-0">
                <img src={profile.uploadedPhotoUrl} alt={profile.username} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-4xl font-light text-white tracking-tight">{profile.username || 'Unknown Subject'}</h1>
              <div className="mt-2 flex items-center gap-3 text-sm font-mono text-zinc-500">
                <span>ID: {profile.userId}</span><span>•</span><span>{profile.messageCount} interactions</span>
                {hasExpertPanel && <><span>•</span><span className="text-teal-400">Expert Panel v{profile.expert_panel_version}</span></>}
              </div>
              {profile.integratedProfileSummary && <p className="mt-4 text-zinc-400 font-light max-w-3xl">{profile.integratedProfileSummary}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3.5 text-sm font-mono whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'text-teal-400 border-teal-400'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">

        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW */}
        {/* ============================================================ */}
        {activeTab === 'overview' && (
          <>
            {profile.omega_rating != null && <OmegaRatingBar rating={profile.omega_rating} reason={profile.omega_rating_reason} />}

            {profile.omega_thoughts && (
              <Section title="Omega's Thoughts">
                <div className="p-6 bg-zinc-900 border border-teal-500/30 rounded-lg">
                  <p className="text-zinc-300 font-light italic leading-relaxed">{profile.omega_thoughts}</p>
                </div>
              </Section>
            )}

            {/* Expert Panel Summary Cards */}
            {hasExpertPanel && (
              <Section title="Expert Panel Summary">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ExpertSummaryCard name="Dr. IO" specialty="Industrial-Organizational" keyMetric="Leadership Potential" metricValue={profile.leadership_potential} color={EXPERT_COLORS.IO} />
                  <ExpertSummaryCard name="Peterson" specialty="Depth Analysis" keyMetric="Responsibility Index" metricValue={profile.responsibility_index} color={EXPERT_COLORS.Peterson} />
                  <ExpertSummaryCard name="Jung" specialty="Archetypal Analysis" keyMetric="Shadow Integration" metricValue={profile.shadow_integration_score} color={EXPERT_COLORS.Jung} />
                  <ExpertSummaryCard name="Sapolsky" specialty="Neurobiology" keyMetric="Stress Response" metricValue={profile.stress_response_pattern} color={EXPERT_COLORS.Sapolsky} />
                  <ExpertSummaryCard name="Bernays" specialty="Influence Analysis" keyMetric="Persuadability" metricValue={profile.persuadability_index} color={EXPERT_COLORS.Bernays} />
                  <ExpertSummaryCard name="Freud" specialty="Psychoanalysis" keyMetric="Defense Mechanism" metricValue={profile.defense_mechanism_primary} color={EXPERT_COLORS.Freud} />
                  <ExpertSummaryCard name="Kahneman" specialty="Cognitive Bias" keyMetric="System 1 Dominance" metricValue={profile.system1_dominance} color={EXPERT_COLORS.Kahneman} />
                  <ExpertSummaryCard name="Nietzsche" specialty="Existential Values" keyMetric="Will to Power" metricValue={profile.will_to_power_score} color={EXPERT_COLORS.Nietzsche} />
                  <ExpertSummaryCard name="Caesar" specialty="Strategic Assessment" keyMetric="Classification" metricValue={profile.caesar_classification} color={EXPERT_COLORS.Caesar} />
                  <ExpertSummaryCard name="Khan" specialty="Meritocratic Eval" keyMetric="Worth Score" metricValue={profile.meritocratic_worth_score} color={EXPERT_COLORS.Khan} />
                  <ExpertSummaryCard name="Machiavelli" specialty="Political Strategy" keyMetric="Fox/Lion" metricValue={profile.fox_lion_profile} color={EXPERT_COLORS.Machiavelli} />
                </div>
              </Section>
            )}

            {/* Big Five Radar */}
            {profile.openness_score != null && (
              <Section title="Big Five Personality Traits">
                <BigFiveRadar scores={bigFiveScores} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {bigFiveScores.map(s => s.value > 0 && (
                    <ScoreBar key={s.trait} score={s.value} label={s.trait} ciLow={s.ciLow} ciHigh={s.ciHigh} />
                  ))}
                </div>
              </Section>
            )}

            {/* Key Metrics */}
            <Section title="Key Metrics">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {profile.trust_level != null && <ScoreBar score={profile.trust_level} label="Trust Level" />}
                {profile.affinity_score != null && <ScoreBar score={profile.affinity_score} label="Affinity Score" />}
                {profile.emotional_bond && <Badge value={profile.emotional_bond} label="Emotional Bond" />}
              </div>
            </Section>
          </>
        )}

        {/* ============================================================ */}
        {/* TAB 2: EXPERT PANEL */}
        {/* ============================================================ */}
        {activeTab === 'experts' && (
          <>
            {!hasExpertPanel ? (
              <div className="text-center py-20 text-zinc-600 font-light">Expert panel analysis has not been run for this profile yet.</div>
            ) : (
              <>
                {/* IO Psychologist */}
                <Section title="Dr. IO — Industrial-Organizational Psychologist" color={EXPERT_COLORS.IO}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.leadership_potential != null && <ScoreBar score={profile.leadership_potential} label="Leadership Potential" ciLow={profile.leadership_potential_ci_low ?? undefined} ciHigh={profile.leadership_potential_ci_high ?? undefined} color={EXPERT_COLORS.IO} />}
                    {profile.organizational_citizenship != null && <ScoreBar score={profile.organizational_citizenship} label="Organizational Citizenship" color={EXPERT_COLORS.IO} />}
                    {profile.initiative_taking_score != null && <ScoreBar score={profile.initiative_taking_score} label="Initiative Taking" color={EXPERT_COLORS.IO} />}
                    {profile.team_role && <Badge value={profile.team_role} label="Team Role" color={EXPERT_COLORS.IO} />}
                    {profile.productivity_pattern && <Badge value={profile.productivity_pattern} label="Productivity Pattern" color={EXPERT_COLORS.IO} />}
                    {profile.feedback_orientation && <Badge value={profile.feedback_orientation} label="Feedback Orientation" color={EXPERT_COLORS.IO} />}
                    {profile.motivational_hierarchy && <Pills items={profile.motivational_hierarchy} label="Motivational Hierarchy" />}
                  </div>
                </Section>

                {/* Peterson */}
                <Section title="Peterson — Depth Analysis" color={EXPERT_COLORS.Peterson}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.order_chaos_balance != null && <ScoreBar score={profile.order_chaos_balance} label="Order-Chaos Balance" color={EXPERT_COLORS.Peterson} />}
                    {profile.responsibility_index != null && <ScoreBar score={profile.responsibility_index} label="Responsibility Index" color={EXPERT_COLORS.Peterson} />}
                    {profile.narrative_coherence_score != null && <ScoreBar score={profile.narrative_coherence_score} label="Narrative Coherence" color={EXPERT_COLORS.Peterson} />}
                    {profile.meaning_orientation && <Badge value={profile.meaning_orientation} label="Meaning Orientation" color={EXPERT_COLORS.Peterson} />}
                    {profile.competence_trajectory && <Badge value={profile.competence_trajectory} label="Competence Trajectory" color={EXPERT_COLORS.Peterson} />}
                  </div>
                  <EssaySection title="Big Five Deep Interpretation" content={profile.big_five_deep_interpretation} color={EXPERT_COLORS.Peterson} />
                </Section>

                {/* Jung */}
                <Section title="Jung — Archetypal Analysis" color={EXPERT_COLORS.Jung}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.shadow_integration_score != null && <ScoreBar score={profile.shadow_integration_score} label="Shadow Integration" color={EXPERT_COLORS.Jung} />}
                    {profile.persona_authenticity_gap != null && <ScoreBar score={profile.persona_authenticity_gap} label="Persona-Authenticity Gap" color={EXPERT_COLORS.Jung} />}
                    {profile.anima_animus_balance != null && <ScoreBar score={profile.anima_animus_balance} label="Anima/Animus Balance" color={EXPERT_COLORS.Jung} />}
                    {profile.individuation_stage && <Badge value={profile.individuation_stage} label="Individuation Stage" color={EXPERT_COLORS.Jung} />}
                    {profile.collective_unconscious_themes && <Pills items={profile.collective_unconscious_themes} label="Collective Unconscious Themes" />}
                    {profile.projection_patterns && <Pills items={profile.projection_patterns} label="Projection Patterns" />}
                  </div>
                  <EssaySection title="Shadow Profile" content={profile.shadow_profile_essay} color={EXPERT_COLORS.Jung} />
                  <EssaySection title="Archetype Constellation" content={profile.archetype_constellation_essay} color={EXPERT_COLORS.Jung} />
                </Section>

                {/* Sapolsky */}
                <Section title="Sapolsky — Neurobiological Analysis" color={EXPERT_COLORS.Sapolsky}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.dopamine_seeking_score != null && <ScoreBar score={profile.dopamine_seeking_score} label="Dopamine Seeking" color={EXPERT_COLORS.Sapolsky} />}
                    {profile.serotonin_stability_score != null && <ScoreBar score={profile.serotonin_stability_score} label="Serotonin Stability" color={EXPERT_COLORS.Sapolsky} />}
                    {profile.stress_response_pattern && <Badge value={profile.stress_response_pattern} label="Stress Response" color={EXPERT_COLORS.Sapolsky} />}
                    {profile.social_hierarchy_position && <Badge value={profile.social_hierarchy_position} label="Social Hierarchy" color={EXPERT_COLORS.Sapolsky} />}
                    {profile.behavioral_ecology_strategy && <Badge value={profile.behavioral_ecology_strategy} label="Behavioral Ecology" color={EXPERT_COLORS.Sapolsky} />}
                    {profile.recovery_speed && <Badge value={profile.recovery_speed} label="Recovery Speed" color={EXPERT_COLORS.Sapolsky} />}
                  </div>
                  <EssaySection title="Neurobiological Profile" content={profile.neurobiological_profile} color={EXPERT_COLORS.Sapolsky} />
                </Section>

                {/* Bernays */}
                <Section title="Bernays — Influence Analysis" color={EXPERT_COLORS.Bernays}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.persuadability_index != null && <ScoreBar score={profile.persuadability_index} label="Persuadability Index" color={EXPERT_COLORS.Bernays} />}
                    {profile.propaganda_vulnerability != null && <ScoreBar score={profile.propaganda_vulnerability} label="Propaganda Vulnerability" color={EXPERT_COLORS.Bernays} />}
                    {profile.memetic_role && <Badge value={profile.memetic_role} label="Memetic Role" color={EXPERT_COLORS.Bernays} />}
                    {profile.group_psychology_type && <Badge value={profile.group_psychology_type} label="Group Psychology Type" color={EXPERT_COLORS.Bernays} />}
                    {profile.influence_network_role && <Badge value={profile.influence_network_role} label="Influence Network Role" color={EXPERT_COLORS.Bernays} />}
                  </div>
                  {profile.influence_susceptibility && (
                    <InfluenceRadar susceptibility={[
                      { principle: 'Social Proof', score: profile.influence_susceptibility.socialProof ?? 0 },
                      { principle: 'Authority', score: profile.influence_susceptibility.authority ?? 0 },
                      { principle: 'Scarcity', score: profile.influence_susceptibility.scarcity ?? 0 },
                      { principle: 'Reciprocity', score: profile.influence_susceptibility.reciprocity ?? 0 },
                      { principle: 'Commitment', score: profile.influence_susceptibility.commitment ?? 0 },
                      { principle: 'Liking', score: profile.influence_susceptibility.liking ?? 0 },
                    ]} />
                  )}
                </Section>

                {/* Freud */}
                <Section title="Freud — Psychoanalytic Analysis" color={EXPERT_COLORS.Freud}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.repression_index != null && <ScoreBar score={profile.repression_index} label="Repression Index" color={EXPERT_COLORS.Freud} />}
                    {profile.sublimation_score != null && <ScoreBar score={profile.sublimation_score} label="Sublimation Score" color={EXPERT_COLORS.Freud} />}
                    {profile.defense_mechanism_primary && <Badge value={profile.defense_mechanism_primary} label="Primary Defense Mechanism" color={EXPERT_COLORS.Freud} />}
                    {profile.defense_mechanism_secondary && <Badge value={profile.defense_mechanism_secondary} label="Secondary Defense" color={EXPERT_COLORS.Freud} />}
                    {profile.transference_pattern && <Badge value={profile.transference_pattern} label="Transference Pattern" color={EXPERT_COLORS.Freud} />}
                    {profile.avoided_topics && <Pills items={profile.avoided_topics} label="Avoided Topics" />}
                  </div>
                  {profile.id_ego_superego_balance && (
                    <IdEgoSuperego balance={{ id: profile.id_ego_superego_balance.id ?? 33, ego: profile.id_ego_superego_balance.ego ?? 33, superego: profile.id_ego_superego_balance.superego ?? 33 }} />
                  )}
                  <EssaySection title="Unconscious Drives" content={profile.unconscious_drives_essay} color={EXPERT_COLORS.Freud} />
                </Section>

                {/* Kahneman */}
                <Section title="Kahneman — Cognitive Bias Analysis" color={EXPERT_COLORS.Kahneman}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.system1_dominance != null && <ScoreBar score={profile.system1_dominance} label="System 1 Dominance (Intuitive)" color={EXPERT_COLORS.Kahneman} />}
                    {profile.loss_aversion_score != null && <ScoreBar score={profile.loss_aversion_score} label="Loss Aversion" color={EXPERT_COLORS.Kahneman} />}
                    {profile.anchoring_susceptibility != null && <ScoreBar score={profile.anchoring_susceptibility} label="Anchoring Susceptibility" color={EXPERT_COLORS.Kahneman} />}
                    {profile.overconfidence_index != null && <ScoreBar score={profile.overconfidence_index} label="Overconfidence Index" color={EXPERT_COLORS.Kahneman} />}
                    {profile.decision_quality_score != null && <ScoreBar score={profile.decision_quality_score} label="Decision Quality" color={EXPERT_COLORS.Kahneman} />}
                    {profile.cognitive_reflection_score != null && <ScoreBar score={profile.cognitive_reflection_score} label="Cognitive Reflection" color={EXPERT_COLORS.Kahneman} />}
                  </div>
                  {profile.cognitive_bias_profile && Array.isArray(profile.cognitive_bias_profile) && profile.cognitive_bias_profile.length > 0 && (
                    <CognitiveBiasBar biases={profile.cognitive_bias_profile.map(b => ({ name: b.bias, severity: b.severity, evidence: b.evidence }))} />
                  )}
                  <EssaySection title="Decision Making Analysis" content={profile.decision_making_essay} color={EXPERT_COLORS.Kahneman} />
                </Section>

                {/* Nietzsche */}
                <Section title="Nietzsche — Existential Values" color={EXPERT_COLORS.Nietzsche}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.will_to_power_score != null && <ScoreBar score={profile.will_to_power_score} label="Will to Power" color={EXPERT_COLORS.Nietzsche} />}
                    {profile.amor_fati_score != null && <ScoreBar score={profile.amor_fati_score} label="Amor Fati" color={EXPERT_COLORS.Nietzsche} />}
                    {profile.ubermensch_alignment != null && <ScoreBar score={profile.ubermensch_alignment} label="Ubermensch Alignment" color={EXPERT_COLORS.Nietzsche} />}
                    {profile.ressentiment_score != null && <ScoreBar score={profile.ressentiment_score} label="Ressentiment" color={EXPERT_COLORS.Nietzsche} />}
                    {profile.eternal_recurrence_embrace != null && <ScoreBar score={profile.eternal_recurrence_embrace} label="Eternal Recurrence" color={EXPERT_COLORS.Nietzsche} />}
                    {profile.master_slave_morality && <Badge value={profile.master_slave_morality} label="Master/Slave Morality" color={EXPERT_COLORS.Nietzsche} />}
                    {profile.value_creation_orientation && <Badge value={profile.value_creation_orientation} label="Value Creation" color={EXPERT_COLORS.Nietzsche} />}
                  </div>
                  {(profile.will_to_power_score != null || profile.amor_fati_score != null) && (
                    <NietzscheRadar scores={[
                      { dimension: 'Will to Power', value: profile.will_to_power_score ?? 0 },
                      { dimension: 'Amor Fati', value: profile.amor_fati_score ?? 0 },
                      { dimension: 'Ubermensch', value: profile.ubermensch_alignment ?? 0 },
                      { dimension: 'Ressentiment (inv)', value: 100 - (profile.ressentiment_score ?? 50) },
                      { dimension: 'Eternal Recurrence', value: profile.eternal_recurrence_embrace ?? 0 },
                    ]} />
                  )}
                  <EssaySection title="Existential Philosophy" content={profile.existential_philosophy_essay} color={EXPERT_COLORS.Nietzsche} />
                </Section>

                {/* Caesar */}
                <Section title="Caesar — Strategic Assessment" color={EXPERT_COLORS.Caesar}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.strategic_value_score != null && <ScoreBar score={profile.strategic_value_score} label="Strategic Value" color={EXPERT_COLORS.Caesar} />}
                    {profile.loyalty_reliability_index != null && <ScoreBar score={profile.loyalty_reliability_index} label="Loyalty & Reliability" color={EXPERT_COLORS.Caesar} />}
                    {profile.courage_score != null && <ScoreBar score={profile.courage_score} label="Courage" color={EXPERT_COLORS.Caesar} />}
                    {profile.decisiveness_score != null && <ScoreBar score={profile.decisiveness_score} label="Decisiveness" color={EXPERT_COLORS.Caesar} />}
                    {profile.caesar_classification && <Badge value={profile.caesar_classification} label="Classification" color={EXPERT_COLORS.Caesar} />}
                  </div>
                  <EssaySection title="Caesar's Verdict" content={profile.caesar_verdict_essay} color={EXPERT_COLORS.Caesar} />
                </Section>

                {/* Khan */}
                <Section title="Genghis Khan — Meritocratic Assessment" color={EXPERT_COLORS.Khan}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.meritocratic_worth_score != null && <ScoreBar score={profile.meritocratic_worth_score} label="Meritocratic Worth" color={EXPERT_COLORS.Khan} />}
                    {profile.adaptability_score != null && <ScoreBar score={profile.adaptability_score} label="Adaptability" color={EXPERT_COLORS.Khan} />}
                    {profile.resilience_score != null && <ScoreBar score={profile.resilience_score} label="Resilience" color={EXPERT_COLORS.Khan} />}
                    {profile.practical_intelligence_score != null && <ScoreBar score={profile.practical_intelligence_score} label="Practical Intelligence" color={EXPERT_COLORS.Khan} />}
                    {profile.correction_acceptance_rate && <Badge value={profile.correction_acceptance_rate} label="Correction Acceptance" color={EXPERT_COLORS.Khan} />}
                  </div>
                  <EssaySection title="Khan's Verdict" content={profile.khan_verdict_essay} color={EXPERT_COLORS.Khan} />
                </Section>

                {/* Machiavelli */}
                <Section title="Machiavelli — Political Analysis" color={EXPERT_COLORS.Machiavelli}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.political_intelligence_score != null && <ScoreBar score={profile.political_intelligence_score} label="Political Intelligence" color={EXPERT_COLORS.Machiavelli} />}
                    {profile.virtu_score != null && <ScoreBar score={profile.virtu_score} label="Virtù" color={EXPERT_COLORS.Machiavelli} />}
                    {profile.performed_virtue_index != null && <ScoreBar score={profile.performed_virtue_index} label="Performed Virtue (0=genuine)" color={EXPERT_COLORS.Machiavelli} />}
                    {profile.behavioral_flexibility_score != null && <ScoreBar score={profile.behavioral_flexibility_score} label="Behavioral Flexibility" color={EXPERT_COLORS.Machiavelli} />}
                    {profile.fox_lion_profile && <Badge value={profile.fox_lion_profile} label="Fox/Lion Profile" color={EXPERT_COLORS.Machiavelli} />}
                  </div>
                  <EssaySection title="Machiavelli's Verdict" content={profile.machiavelli_verdict_essay} color={EXPERT_COLORS.Machiavelli} />
                </Section>

                {/* Meta-Synthesis */}
                {profile.expert_consensus_score != null && (
                  <Section title="Meta-Synthesis — Expert Consensus">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ScoreBar score={Math.round(profile.expert_consensus_score)} label="Expert Consensus" />
                      {profile.inter_rater_reliability != null && <TextField value={`ICC ≈ ${profile.inter_rater_reliability.toFixed(2)}`} label="Inter-Rater Reliability" />}
                    </div>
                    {hasExpertPanel && (
                      <ExpertComparisonBar experts={[
                        { name: 'IO', keyScore: profile.leadership_potential ?? 0, color: EXPERT_COLORS.IO },
                        { name: 'Peterson', keyScore: profile.responsibility_index ?? 0, color: EXPERT_COLORS.Peterson },
                        { name: 'Jung', keyScore: profile.shadow_integration_score ?? 0, color: EXPERT_COLORS.Jung },
                        { name: 'Sapolsky', keyScore: profile.dopamine_seeking_score ?? 0, color: EXPERT_COLORS.Sapolsky },
                        { name: 'Bernays', keyScore: profile.persuadability_index ?? 0, color: EXPERT_COLORS.Bernays },
                        { name: 'Freud', keyScore: profile.sublimation_score ?? 0, color: EXPERT_COLORS.Freud },
                        { name: 'Kahneman', keyScore: profile.decision_quality_score ?? 0, color: EXPERT_COLORS.Kahneman },
                        { name: 'Nietzsche', keyScore: profile.will_to_power_score ?? 0, color: EXPERT_COLORS.Nietzsche },
                        { name: 'Caesar', keyScore: profile.strategic_value_score ?? 0, color: EXPERT_COLORS.Caesar },
                        { name: 'Khan', keyScore: profile.meritocratic_worth_score ?? 0, color: EXPERT_COLORS.Khan },
                        { name: 'Machiavelli', keyScore: profile.virtu_score ?? 0, color: EXPERT_COLORS.Machiavelli },
                      ]} />
                    )}
                    <EssaySection title="Expert Dissent Summary" content={profile.expert_dissent_summary} />
                    <EssaySection title="Integrated Verdict" content={profile.expert_integrated_verdict} />
                    <EssaySection title="Growth Trajectory" content={profile.growth_trajectory} />
                  </Section>
                )}
              </>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* TAB 3: PSYCHOLOGY */}
        {/* ============================================================ */}
        {activeTab === 'psychology' && (
          <>
            <EssaySection title="Psychological Profile" content={profile.psychological_profile} />
            <EssaySection title="Communication Analysis" content={profile.communication_analysis} />
            <EssaySection title="Relationship with Omega" content={profile.relationship_narrative} />
            <EssaySection title="How They've Changed" content={profile.personality_evolution} />

            {/* Cognitive Style Radar */}
            {(profile.analytical_thinking_score != null || profile.creative_thinking_score != null) && (
              <Section title="Cognitive Style">
                <CognitiveStyleRadar scores={[
                  { axis: 'Analytical', value: profile.analytical_thinking_score ?? 0 },
                  { axis: 'Creative', value: profile.creative_thinking_score ?? 0 },
                  { axis: 'Abstract', value: profile.abstract_reasoning_score ?? 0 },
                  { axis: 'Concrete', value: profile.concrete_thinking_score ?? 0 },
                ]} />
              </Section>
            )}

            {/* Attachment & EI */}
            <Section title="Emotional Intelligence">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.attachmentStyle && <Badge value={profile.attachmentStyle} label="Attachment Style" confidence={profile.attachment_confidence} />}
                {profile.emotional_awareness_score != null && <ScoreBar score={profile.emotional_awareness_score} label="Emotional Awareness" />}
                {profile.empathy_score != null && <ScoreBar score={profile.empathy_score} label="Empathy" />}
                {profile.emotional_regulation_score != null && <ScoreBar score={profile.emotional_regulation_score} label="Emotional Regulation" />}
              </div>
            </Section>

            {/* Jung Shadow + Freud */}
            {profile.shadow_profile_essay && <EssaySection title="Shadow Profile (Jung)" content={profile.shadow_profile_essay} color={EXPERT_COLORS.Jung} />}
            {profile.id_ego_superego_balance && (
              <Section title="Id / Ego / Superego (Freud)" color={EXPERT_COLORS.Freud}>
                <IdEgoSuperego balance={{ id: profile.id_ego_superego_balance.id ?? 33, ego: profile.id_ego_superego_balance.ego ?? 33, superego: profile.id_ego_superego_balance.superego ?? 33 }} />
              </Section>
            )}
            {profile.unconscious_drives_essay && <EssaySection title="Unconscious Drives (Freud)" content={profile.unconscious_drives_essay} color={EXPERT_COLORS.Freud} />}

            {/* Defense mechanisms */}
            {(profile.defense_mechanism_primary || profile.defense_mechanism_secondary) && (
              <Section title="Defense Mechanisms" color={EXPERT_COLORS.Freud}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.defense_mechanism_primary && <Badge value={profile.defense_mechanism_primary} label="Primary" color={EXPERT_COLORS.Freud} />}
                  {profile.defense_mechanism_secondary && <Badge value={profile.defense_mechanism_secondary} label="Secondary" color={EXPERT_COLORS.Freud} />}
                  {profile.transference_pattern && <Badge value={profile.transference_pattern} label="Transference Pattern" color={EXPERT_COLORS.Freud} />}
                  {profile.avoided_topics && <Pills items={profile.avoided_topics} label="Avoided Topics" />}
                </div>
              </Section>
            )}

            <EssaySection title="Emotional Landscape" content={profile.emotional_landscape} />

            {/* Communication Style */}
            <Section title="Communication Style">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.communication_formality && <Badge value={profile.communication_formality} label="Formality" />}
                {profile.communication_assertiveness && <Badge value={profile.communication_assertiveness} label="Assertiveness" />}
                {profile.communication_engagement && <Badge value={profile.communication_engagement} label="Engagement" />}
                {profile.verbal_fluency_score != null && <ScoreBar score={profile.verbal_fluency_score} label="Verbal Fluency" />}
              </div>
            </Section>

            {/* Personality Archetypes */}
            <Section title="Personality Archetypes">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.dominant_archetype && <Badge value={profile.dominant_archetype} label="Dominant Archetype" confidence={profile.archetype_confidence} />}
                {profile.secondary_archetypes && <Pills items={profile.secondary_archetypes} label="Secondary Archetypes" />}
                {profile.shadow_archetype && <Badge value={profile.shadow_archetype} label="Shadow Archetype" />}
              </div>
            </Section>
          </>
        )}

        {/* ============================================================ */}
        {/* TAB 4: COGNITION */}
        {/* ============================================================ */}
        {activeTab === 'cognition' && (
          <>
            {/* Kahneman */}
            {profile.cognitive_bias_profile && Array.isArray(profile.cognitive_bias_profile) && profile.cognitive_bias_profile.length > 0 && (
              <Section title="Cognitive Biases (Kahneman)" color={EXPERT_COLORS.Kahneman}>
                <CognitiveBiasBar biases={profile.cognitive_bias_profile.map(b => ({ name: b.bias, severity: b.severity, evidence: b.evidence }))} />
              </Section>
            )}

            {profile.system1_dominance != null && (
              <Section title="System 1 vs System 2" color={EXPERT_COLORS.Kahneman}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ScoreBar score={profile.system1_dominance} label="System 1 (Intuitive)" color={EXPERT_COLORS.Kahneman} />
                  <ScoreBar score={100 - profile.system1_dominance} label="System 2 (Deliberate)" color="#94a3b8" />
                  {profile.loss_aversion_score != null && <ScoreBar score={profile.loss_aversion_score} label="Loss Aversion" color={EXPERT_COLORS.Kahneman} />}
                  {profile.overconfidence_index != null && <ScoreBar score={profile.overconfidence_index} label="Overconfidence" color={EXPERT_COLORS.Kahneman} />}
                  {profile.decision_quality_score != null && <ScoreBar score={profile.decision_quality_score} label="Decision Quality" color={EXPERT_COLORS.Kahneman} />}
                </div>
              </Section>
            )}

            {profile.decision_making_essay && <EssaySection title="Decision Making Analysis" content={profile.decision_making_essay} color={EXPERT_COLORS.Kahneman} />}

            {/* Nietzsche Radar */}
            {(profile.will_to_power_score != null || profile.amor_fati_score != null) && (
              <Section title="Existential Values (Nietzsche)" color={EXPERT_COLORS.Nietzsche}>
                <NietzscheRadar scores={[
                  { dimension: 'Will to Power', value: profile.will_to_power_score ?? 0 },
                  { dimension: 'Amor Fati', value: profile.amor_fati_score ?? 0 },
                  { dimension: 'Ubermensch', value: profile.ubermensch_alignment ?? 0 },
                  { dimension: 'Ressentiment (inv)', value: 100 - (profile.ressentiment_score ?? 50) },
                  { dimension: 'Eternal Recurrence', value: profile.eternal_recurrence_embrace ?? 0 },
                ]} />
              </Section>
            )}

            {profile.existential_philosophy_essay && <EssaySection title="Existential Philosophy" content={profile.existential_philosophy_essay} color={EXPERT_COLORS.Nietzsche} />}

            {/* Peterson Big Five Interactions */}
            {profile.big_five_interaction_effects && Array.isArray(profile.big_five_interaction_effects) && (
              <Section title="Big Five Interaction Effects (Peterson)" color={EXPERT_COLORS.Peterson}>
                <div className="space-y-3">
                  {profile.big_five_interaction_effects.map((effect: any, idx: number) => (
                    <div key={idx} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-white">{effect.traitPair}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          effect.clinicalSignificance === 'high' ? 'bg-red-500/10 text-red-400' :
                          effect.clinicalSignificance === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-zinc-800 text-zinc-500'
                        }`}>{effect.clinicalSignificance}</span>
                      </div>
                      <p className="text-sm text-zinc-400 font-light">{effect.interpretation}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {profile.big_five_deep_interpretation && <EssaySection title="Big Five Deep Interpretation" content={profile.big_five_deep_interpretation} color={EXPERT_COLORS.Peterson} />}

            {/* Thinking Style */}
            <Section title="Thinking Style">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.analytical_thinking_score != null && <ScoreBar score={profile.analytical_thinking_score} label="Analytical Thinking" />}
                {profile.creative_thinking_score != null && <ScoreBar score={profile.creative_thinking_score} label="Creative Thinking" />}
                {profile.abstract_reasoning_score != null && <ScoreBar score={profile.abstract_reasoning_score} label="Abstract Reasoning" />}
                {profile.concrete_thinking_score != null && <ScoreBar score={profile.concrete_thinking_score} label="Concrete Thinking" />}
              </div>
            </Section>
          </>
        )}

        {/* ============================================================ */}
        {/* TAB 5: BEHAVIOR */}
        {/* ============================================================ */}
        {activeTab === 'behavior' && (
          <>
            {/* Predictions */}
            {profile.predictedBehaviors && Array.isArray(profile.predictedBehaviors) && profile.predictedBehaviors.length > 0 && (
              <Section title="Behavioral Predictions">
                <div className="grid grid-cols-1 gap-4">
                  {profile.predictedBehaviors.map((p: BehavioralPrediction, idx: number) => <PredictionCard key={idx} prediction={p} />)}
                </div>
                <div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {profile.predictionTimeframe && <div><span className="text-zinc-500">Timeframe: </span><span className="text-zinc-300">{profile.predictionTimeframe}</span></div>}
                    {profile.predictionConfidence != null && <div><span className="text-zinc-500">Overall Confidence: </span><span className="text-teal-400 font-mono">{normalizeConfidence(profile.predictionConfidence)}%</span></div>}
                    {profile.predictionAccuracyScore != null && <div><span className="text-zinc-500">Brier Score: </span><span className="text-teal-400 font-mono">{profile.predictionAccuracyScore.toFixed(3)}</span></div>}
                  </div>
                </div>
              </Section>
            )}

            {/* Growth Trajectory */}
            {profile.growth_trajectory && <EssaySection title="Growth Trajectory" content={profile.growth_trajectory} />}

            {/* Sapolsky Neurobiological */}
            {(profile.stress_response_pattern || profile.neurobiological_profile) && (
              <Section title="Neurobiological Profile (Sapolsky)" color={EXPERT_COLORS.Sapolsky}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.stress_response_pattern && <Badge value={profile.stress_response_pattern} label="Stress Response" color={EXPERT_COLORS.Sapolsky} />}
                  {profile.behavioral_ecology_strategy && <Badge value={profile.behavioral_ecology_strategy} label="Behavioral Ecology" color={EXPERT_COLORS.Sapolsky} />}
                  {profile.recovery_speed && <Badge value={profile.recovery_speed} label="Recovery Speed" color={EXPERT_COLORS.Sapolsky} />}
                  {profile.dopamine_seeking_score != null && <ScoreBar score={profile.dopamine_seeking_score} label="Dopamine Seeking" color={EXPERT_COLORS.Sapolsky} />}
                  {profile.serotonin_stability_score != null && <ScoreBar score={profile.serotonin_stability_score} label="Serotonin Stability" color={EXPERT_COLORS.Sapolsky} />}
                </div>
                {profile.stress_chronotype && <TextField value={profile.stress_chronotype} label="Stress Chronotype" />}
              </Section>
            )}

            {profile.neurobiological_profile && <EssaySection title="Neurobiological Analysis" content={profile.neurobiological_profile} color={EXPERT_COLORS.Sapolsky} />}

            <EssaySection title="Behavioral Patterns" content={profile.behavioral_deep_dive} />

            {/* Temporal Patterns */}
            {(profile.peakActivityHours || profile.weekendActivityRatio != null) && (
              <Section title="Temporal Patterns">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profile.peakActivityHours && profile.peakActivityHours.length > 0 && <TextField value={profile.peakActivityHours.map(h => `${h}:00 UTC`).join(', ')} label="Peak Activity Hours" />}
                  {profile.weekendActivityRatio != null && <ScoreBar score={Math.round(profile.weekendActivityRatio * 100)} label="Weekend Activity Ratio" />}
                  {profile.sentimentTrajectory && <Badge value={profile.sentimentTrajectory} label="Sentiment Trajectory" />}
                  {profile.vocabularyGrowthRate != null && <TextField value={`${(profile.vocabularyGrowthRate * 100).toFixed(1)}%`} label="Vocabulary Growth Rate" />}
                  {profile.engagementAuthenticityScore != null && <ScoreBar score={Math.round(profile.engagementAuthenticityScore)} label="Engagement Authenticity" />}
                </div>
              </Section>
            )}

            {/* Linguistic Patterns */}
            <Section title="Linguistic Patterns">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.messageLengthAvg != null && <TextField value={profile.messageLengthAvg.toFixed(2)} label="Avg Message Length" />}
                {profile.message_length_variance != null && <TextField value={profile.message_length_variance.toFixed(2)} label="Message Length Variance" />}
                {profile.response_latency_avg != null && <TextField value={profile.response_latency_avg.toFixed(2) + 'ms'} label="Response Latency (avg)" />}
                {profile.emoji_usage_rate != null && <TextField value={profile.emoji_usage_rate.toFixed(2) + '%'} label="Emoji Usage Rate" />}
                {profile.punctuation_style && <Badge value={profile.punctuation_style} label="Punctuation Style" />}
                {profile.capitalization_pattern && <Badge value={profile.capitalization_pattern} label="Capitalization" />}
              </div>
            </Section>
          </>
        )}

        {/* ============================================================ */}
        {/* TAB 6: INFLUENCE */}
        {/* ============================================================ */}
        {activeTab === 'influence' && (
          <>
            {/* Bernays Influence */}
            {profile.influence_susceptibility && (
              <Section title="Influence Susceptibility (Bernays)" color={EXPERT_COLORS.Bernays}>
                <InfluenceRadar susceptibility={[
                  { principle: 'Social Proof', score: profile.influence_susceptibility.socialProof ?? 0 },
                  { principle: 'Authority', score: profile.influence_susceptibility.authority ?? 0 },
                  { principle: 'Scarcity', score: profile.influence_susceptibility.scarcity ?? 0 },
                  { principle: 'Reciprocity', score: profile.influence_susceptibility.reciprocity ?? 0 },
                  { principle: 'Commitment', score: profile.influence_susceptibility.commitment ?? 0 },
                  { principle: 'Liking', score: profile.influence_susceptibility.liking ?? 0 },
                ]} />
              </Section>
            )}

            {/* Social Dynamics */}
            <Section title="Social Dynamics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.social_dominance_score != null && <ScoreBar score={profile.social_dominance_score} label="Social Dominance" />}
                {profile.cooperation_score != null && <ScoreBar score={profile.cooperation_score} label="Cooperation" />}
                {profile.conflictStyle && <Badge value={profile.conflictStyle} label="Conflict Style" />}
                {profile.humorStyle && <Badge value={profile.humorStyle} label="Humor Style" />}
                {profile.persuadability_index != null && <ScoreBar score={profile.persuadability_index} label="Persuadability" color={EXPERT_COLORS.Bernays} />}
                {profile.propaganda_vulnerability != null && <ScoreBar score={profile.propaganda_vulnerability} label="Propaganda Vulnerability" color={EXPERT_COLORS.Bernays} />}
                {profile.memetic_role && <Badge value={profile.memetic_role} label="Memetic Role" color={EXPERT_COLORS.Bernays} />}
                {profile.group_psychology_type && <Badge value={profile.group_psychology_type} label="Group Psychology" color={EXPERT_COLORS.Bernays} />}
                {profile.influence_network_role && <Badge value={profile.influence_network_role} label="Network Role" color={EXPERT_COLORS.Bernays} />}
              </div>
            </Section>

            {/* Caesar */}
            {(profile.caesar_classification || profile.caesar_verdict_essay) && (
              <Section title="Strategic Assessment (Caesar)" color={EXPERT_COLORS.Caesar}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.strategic_value_score != null && <ScoreBar score={profile.strategic_value_score} label="Strategic Value" color={EXPERT_COLORS.Caesar} />}
                  {profile.loyalty_reliability_index != null && <ScoreBar score={profile.loyalty_reliability_index} label="Loyalty" color={EXPERT_COLORS.Caesar} />}
                  {profile.courage_score != null && <ScoreBar score={profile.courage_score} label="Courage" color={EXPERT_COLORS.Caesar} />}
                  {profile.decisiveness_score != null && <ScoreBar score={profile.decisiveness_score} label="Decisiveness" color={EXPERT_COLORS.Caesar} />}
                  {profile.caesar_classification && <Badge value={profile.caesar_classification} label="Classification" color={EXPERT_COLORS.Caesar} />}
                </div>
                <EssaySection title="Caesar's Verdict" content={profile.caesar_verdict_essay} color={EXPERT_COLORS.Caesar} />
              </Section>
            )}

            {/* Khan */}
            {(profile.meritocratic_worth_score != null || profile.khan_verdict_essay) && (
              <Section title="Meritocratic Assessment (Khan)" color={EXPERT_COLORS.Khan}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.meritocratic_worth_score != null && <ScoreBar score={profile.meritocratic_worth_score} label="Worth" color={EXPERT_COLORS.Khan} />}
                  {profile.adaptability_score != null && <ScoreBar score={profile.adaptability_score} label="Adaptability" color={EXPERT_COLORS.Khan} />}
                  {profile.resilience_score != null && <ScoreBar score={profile.resilience_score} label="Resilience" color={EXPERT_COLORS.Khan} />}
                  {profile.practical_intelligence_score != null && <ScoreBar score={profile.practical_intelligence_score} label="Practical Intelligence" color={EXPERT_COLORS.Khan} />}
                  {profile.correction_acceptance_rate && <Badge value={profile.correction_acceptance_rate} label="Correction Acceptance" color={EXPERT_COLORS.Khan} />}
                </div>
                <EssaySection title="Khan's Verdict" content={profile.khan_verdict_essay} color={EXPERT_COLORS.Khan} />
              </Section>
            )}

            {/* Machiavelli */}
            {(profile.fox_lion_profile || profile.machiavelli_verdict_essay) && (
              <Section title="Political Analysis (Machiavelli)" color={EXPERT_COLORS.Machiavelli}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.political_intelligence_score != null && <ScoreBar score={profile.political_intelligence_score} label="Political Intelligence" color={EXPERT_COLORS.Machiavelli} />}
                  {profile.virtu_score != null && <ScoreBar score={profile.virtu_score} label="Virtù" color={EXPERT_COLORS.Machiavelli} />}
                  {profile.performed_virtue_index != null && <ScoreBar score={profile.performed_virtue_index} label="Performed Virtue" color={EXPERT_COLORS.Machiavelli} />}
                  {profile.behavioral_flexibility_score != null && <ScoreBar score={profile.behavioral_flexibility_score} label="Behavioral Flexibility" color={EXPERT_COLORS.Machiavelli} />}
                  {profile.fox_lion_profile && <Badge value={profile.fox_lion_profile} label="Fox/Lion" color={EXPERT_COLORS.Machiavelli} />}
                </div>
                <EssaySection title="Machiavelli's Verdict" content={profile.machiavelli_verdict_essay} color={EXPERT_COLORS.Machiavelli} />
              </Section>
            )}

            <EssaySection title="Social Dynamics Analysis" content={profile.social_dynamics_analysis} />
            <EssaySection title="How They Treat Others" content={profile.interaction_style_with_others} />
          </>
        )}

        {/* ============================================================ */}
        {/* TAB 7: APPEARANCE */}
        {/* ============================================================ */}
        {activeTab === 'appearance' && (
          <Section title="Physical Phenotype Analysis">
            {profile.aiAppearanceDescription && (
              <div className="mb-8 p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
                <h3 className="text-lg font-light text-white mb-2">AI Appearance Description</h3>
                <p className="text-zinc-300 font-light leading-relaxed">{profile.aiAppearanceDescription}</p>
                {profile.appearanceConfidence != null && <p className="text-xs text-teal-400 mt-3 font-mono">Confidence: {(profile.appearanceConfidence * 100).toFixed(0)}%</p>}
              </div>
            )}
            <div className="space-y-12">
              <div>
                <h3 className="text-lg font-light text-teal-400 mb-4">Demographics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profile.aiDetectedGender && <Badge value={profile.aiDetectedGender} label="Detected Gender" confidence={profile.genderConfidence} />}
                  {profile.estimatedAgeRange && <Badge value={profile.estimatedAgeRange} label="Age Range" confidence={profile.ageConfidence} />}
                  {profile.heightEstimate && <Badge value={profile.heightEstimate} label="Height Estimate" />}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-light text-teal-400 mb-4">Face Structure</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profile.faceShape && <Badge value={profile.faceShape} label="Face Shape" />}
                  {profile.facialSymmetryScore != null && <ScoreBar score={profile.facialSymmetryScore} label="Facial Symmetry" />}
                  {profile.jawlineProminence && <Badge value={profile.jawlineProminence} label="Jawline" />}
                  {profile.cheekboneProminence && <Badge value={profile.cheekboneProminence} label="Cheekbones" />}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-light text-teal-400 mb-4">Hair</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profile.hairColor && <Badge value={profile.hairColor} label="Color" />}
                  {profile.hairTexture && <Badge value={profile.hairTexture} label="Texture" />}
                  {profile.hairLength && <Badge value={profile.hairLength} label="Length" />}
                  {profile.hairStyle && <Badge value={profile.hairStyle} label="Style" />}
                  {profile.hairDensity && <Badge value={profile.hairDensity} label="Density" />}
                  {profile.facialHair && <Badge value={profile.facialHair} label="Facial Hair" />}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-light text-teal-400 mb-4">Eyes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profile.eyeColor && <Badge value={profile.eyeColor} label="Color" />}
                  {profile.eyeShape && <Badge value={profile.eyeShape} label="Shape" />}
                  {profile.eyeSpacing && <Badge value={profile.eyeSpacing} label="Spacing" />}
                  {profile.eyebrowShape && <Badge value={profile.eyebrowShape} label="Eyebrow Shape" />}
                  {profile.eyebrowThickness && <Badge value={profile.eyebrowThickness} label="Eyebrow Thickness" />}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-light text-teal-400 mb-4">Nose & Lips</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profile.noseShape && <Badge value={profile.noseShape} label="Nose Shape" />}
                  {profile.noseSize && <Badge value={profile.noseSize} label="Nose Size" />}
                  {profile.lipFullness && <Badge value={profile.lipFullness} label="Lip Fullness" />}
                  {profile.smileType && <Badge value={profile.smileType} label="Smile Type" />}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-light text-teal-400 mb-4">Skin</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profile.skinTone && <Badge value={profile.skinTone} label="Tone" />}
                  {profile.skinTexture && <Badge value={profile.skinTexture} label="Texture" />}
                  {profile.complexionQuality && <Badge value={profile.complexionQuality} label="Complexion" />}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-light text-teal-400 mb-4">Body & Style</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profile.bodyType && <Badge value={profile.bodyType} label="Body Type" />}
                  {profile.buildDescription && <Badge value={profile.buildDescription} label="Build" />}
                  {profile.posture && <Badge value={profile.posture} label="Posture" />}
                  {profile.clothingStyle && <Badge value={profile.clothingStyle} label="Clothing Style" />}
                  {profile.aestheticArchetype && <Badge value={profile.aestheticArchetype} label="Aesthetic Archetype" />}
                  {profile.attractivenessAssessment && <Badge value={profile.attractivenessAssessment} label="Attractiveness" />}
                  {profile.approachabilityScore != null && <ScoreBar score={profile.approachabilityScore} label="Approachability" />}
                  {profile.perceivedConfidenceLevel && <Badge value={profile.perceivedConfidenceLevel} label="Confidence Level" />}
                  {profile.distinctiveFeatures && <Pills items={profile.distinctiveFeatures} label="Distinctive Features" />}
                  {profile.accessories && <Pills items={profile.accessories} label="Accessories" />}
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* ============================================================ */}
        {/* TAB 8: HISTORY */}
        {/* ============================================================ */}
        {activeTab === 'history' && (
          <>
            <AnalysisHistoryViewer username={username} />

            {/* Knowledge & Interests */}
            <Section title="Knowledge & Interests">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.technical_knowledge_level && <Badge value={profile.technical_knowledge_level} label="Technical Knowledge Level" />}
                {profile.primary_interests && <Pills items={profile.primary_interests} label="Primary Interests" />}
                {profile.expertise_areas && <Pills items={profile.expertise_areas} label="Expertise Areas" />}
              </div>
            </Section>

            <EssaySection title="Interests & Passions" content={profile.interests_analysis} />

            {/* Emotional Patterns */}
            <Section title="Emotional Patterns">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.overall_sentiment && <Badge value={profile.overall_sentiment} label="Overall Sentiment" />}
                {profile.positive_interaction_ratio != null && <ScoreBar score={Math.round(profile.positive_interaction_ratio * 100)} label="Positive Interaction Ratio" />}
                {profile.negative_interaction_ratio != null && <ScoreBar score={Math.round(profile.negative_interaction_ratio * 100)} label="Negative Interaction Ratio" />}
                {profile.dominant_emotions && <Pills items={profile.dominant_emotions} label="Dominant Emotions" />}
              </div>
            </Section>

            {/* Tracking & Metadata */}
            <Section title="Tracking & Metadata">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <TextField value={profile.messageCount} label="Message Count" />
                {profile.analysis_version != null && <TextField value={`v${profile.analysis_version}`} label="Analysis Version" />}
                {formatTimestamp(profile.firstSeenAt) && <TextField value={formatTimestamp(profile.firstSeenAt)!} label="First Seen" />}
                {formatTimestamp(profile.lastInteractionAt) && <TextField value={formatTimestamp(profile.lastInteractionAt)!} label="Last Interaction" />}
                {formatTimestamp(profile.lastAnalyzedAt) && <TextField value={formatTimestamp(profile.lastAnalyzedAt)!} label="Last Analyzed" />}
                {formatTimestamp(profile.lastPhotoAnalyzedAt) && <TextField value={formatTimestamp(profile.lastPhotoAnalyzedAt)!} label="Last Photo Analyzed" />}
                {profile.expert_panel_timestamp && formatTimestamp(profile.expert_panel_timestamp) && <TextField value={formatTimestamp(profile.expert_panel_timestamp)!} label="Expert Panel Run" />}
              </div>
            </Section>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 bg-zinc-900/50 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Link href="/profiles" className="text-teal-400 hover:text-teal-300 text-sm font-mono inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Profiles
          </Link>
        </div>
      </div>
    </div>
  );
}
