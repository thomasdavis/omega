'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Typed sub-interfaces
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

  // Face Structure
  faceShape: string | null;
  facialSymmetryScore: number | null;
  jawlineProminence: string | null;
  cheekboneProminence: string | null;

  // Hair
  hairColor: string | null;
  hairTexture: string | null;
  hairLength: string | null;
  hairStyle: string | null;
  hairDensity: string | null;
  facialHair: string | null;

  // Eyes
  eyeColor: string | null;
  eyeShape: string | null;
  eyeSpacing: string | null;
  eyebrowShape: string | null;
  eyebrowThickness: string | null;

  // Nose & Lips
  noseShape: string | null;
  noseSize: string | null;
  lipFullness: string | null;
  smileType: string | null;

  // Skin
  skinTone: string | null;
  skinTexture: string | null;
  complexionQuality: string | null;

  // Body
  bodyType: string | null;
  buildDescription: string | null;
  heightEstimate: string | null;
  posture: string | null;
  distinctiveFeatures: string[] | null;

  // Style & Presentation
  clothingStyle: string | null;
  accessories: string[] | null;
  attractivenessAssessment: string | null;
  approachabilityScore: number | null;
  perceivedConfidenceLevel: string | null;
  aestheticArchetype: string | null;

  // Tracking & Metadata
  messageCount: number;
  firstSeenAt: number;
  lastInteractionAt: number;
  lastAnalyzedAt: number | null;
  lastPhotoAnalyzedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

/** Normalize confidence: if >1 display as-is (already percentage), if 0-1 multiply by 100 */
function normalizeConfidence(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return value > 1 ? value : Math.round(value * 100);
}

// Progress bar component for scores
const ScoreBar = ({ score, label, max = 100 }: { score: number; label: string; max?: number }) => {
  const percentage = (score / max) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-zinc-500 uppercase tracking-wider">{label}</span>
        <span className="font-mono text-teal-400 font-medium">{score}/{max}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-500"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

// Pills component for arrays
const Pills = ({ items, label }: { items: string[]; label: string }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <span
            key={idx}
            className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-sm text-zinc-300 font-light"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

// Badge component for categorical values
const Badge = ({ value, label, confidence }: { value: string; label: string; confidence?: number | null }) => {
  return (
    <div className="space-y-2">
      <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className="inline-flex items-center gap-2">
        <span className="px-4 py-2 bg-gradient-to-r from-zinc-800 to-zinc-800/50 border border-teal-500/30 rounded-lg text-base text-white font-light">
          {value}
        </span>
        {confidence !== null && confidence !== undefined && (
          <span className="text-xs text-teal-400 font-mono">{normalizeConfidence(confidence)}%</span>
        )}
      </div>
    </div>
  );
};

// Text field component
const TextField = ({ value, label }: { value: string | number; label: string }) => {
  if (value === null || value === undefined) return null;

  return (
    <div className="space-y-1">
      <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className="text-sm text-zinc-200 font-light">{value}</div>
    </div>
  );
};

// Prediction card component
const PredictionCard = ({ prediction }: { prediction: BehavioralPrediction }) => {
  return (
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
      {prediction.influencingFactors && prediction.influencingFactors.length > 0 && (
        <div className="pt-2 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 mb-2">Influencing Factors</div>
          <div className="flex flex-wrap gap-1">
            {prediction.influencingFactors.map((factor: string, idx: number) => (
              <span key={idx} className="px-2 py-0.5 bg-zinc-800/50 rounded text-xs text-zinc-400">
                {factor}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const DataField = ({ label, value, confidence }: { label: string; value: any; confidence?: number | null }) => {
  if (value === null || value === undefined) return null;

  // Handle arrays
  if (Array.isArray(value)) {
    return <Pills items={value} label={label} />;
  }

  // Handle objects (but not if they're complex nested structures)
  if (typeof value === 'object') {
    // Check for feelings_json structure
    if (value.facets || value.thoughts || value.notablePatterns) {
      return (
        <div className="space-y-3">
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{label}</div>
          {value.thoughts && (
            <p className="text-sm text-zinc-300 font-light italic">{value.thoughts}</p>
          )}
          {value.facets && <Pills items={value.facets} label="Facets" />}
          {value.notablePatterns && <Pills items={value.notablePatterns} label="Notable Patterns" />}
        </div>
      );
    }

    // Check for personality_facets structure
    if (value.quirks || value.bigFiveTraits || value.dominantArchetypes) {
      return (
        <div className="space-y-3">
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{label}</div>
          {value.dominantArchetypes && <Pills items={value.dominantArchetypes} label="Archetypes" />}
          {value.quirks && <Pills items={value.quirks} label="Quirks" />}
        </div>
      );
    }

    // Fallback for other objects
    return null;
  }

  // Handle strings
  if (typeof value === 'string') {
    return <Badge value={value} label={label} confidence={confidence} />;
  }

  // Handle numbers
  if (typeof value === 'number') {
    // If it looks like a percentage or ratio
    if (value >= 0 && value <= 1 && label.toLowerCase().includes('ratio')) {
      return <ScoreBar score={Math.round(value * 100)} label={label} max={100} />;
    }
    // If it's a score out of 100
    if (value >= 0 && value <= 100 && (label.toLowerCase().includes('score') || label.toLowerCase().includes('level'))) {
      return <ScoreBar score={value} label={label} max={100} />;
    }
    // Otherwise just display as text
    return <TextField value={value} label={label} />;
  }

  return null;
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border-l-2 border-teal-500/30 pl-6 space-y-6">
    <h2 className="text-2xl font-light text-white tracking-tight">{title}</h2>
    <div className="space-y-6">
      {children}
    </div>
  </div>
);

// Omega Rating color function
function ratingColor(rating: number): string {
  if (rating <= 20) return '#dc2626'; // blood red
  if (rating <= 40) return '#ea580c'; // orange-red
  if (rating <= 60) return '#eab308'; // yellow
  if (rating <= 80) return '#22c55e'; // green
  return '#3b82f6'; // blue
}

// Omega Rating Bar component
const OmegaRatingBar = ({ rating, reason }: { rating: number; reason: string | null }) => {
  const color = ratingColor(rating);
  return (
    <div className="w-full p-6 bg-zinc-900 border border-zinc-800 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Omega Rating</div>
        <div className="text-4xl font-light font-mono" style={{ color }}>{rating}</div>
      </div>
      <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${rating}%`, backgroundColor: color }}
        />
      </div>
      {reason && (
        <p className="text-sm text-zinc-400 italic font-light">{reason}</p>
      )}
    </div>
  );
};

// Essay section for long-form text
const EssaySection = ({ title, content }: { title: string; content: string | null }) => {
  if (!content) return null;
  return (
    <Section title={title}>
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="text-zinc-300 font-light leading-relaxed whitespace-pre-wrap">{content}</div>
      </div>
    </Section>
  );
};

// =============================================================================
// ANALYSIS HISTORY DIFF
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

// Which fields to compare (label + key pairs)
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
  { key: 'personalityEvolution', label: 'How They\'ve Changed', type: 'essay' },
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

// Number diff indicator
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
        {diff !== 0 && (
          <span className={`text-xs font-mono ${diffColor}`}>({diffSign}{diff})</span>
        )}
      </div>
    </div>
  );
};

// Text diff: shows old/new side by side with change highlighting
const TextDiff = ({ label, oldVal, newVal }: { label: string; oldVal: string | null; newVal: string | null }) => {
  if (!oldVal && !newVal) return null;
  const changed = oldVal !== newVal;
  if (!changed) return null;

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

// History timeline + diff viewer component
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
      .then(data => {
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [username, history.length]);

  if (!expanded) {
    return (
      <button
        onClick={() => { setExpanded(true); loadHistory(); }}
        className="w-full p-4 bg-zinc-900 border border-zinc-800 hover:border-teal-500/40 rounded-lg transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-mono text-zinc-300 group-hover:text-teal-400 transition-colors">
              View Analysis History & Evolution
            </span>
          </div>
          <svg className="w-4 h-4 text-zinc-500 group-hover:text-teal-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-center gap-3">
          <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-400 font-mono">Loading analysis history...</span>
        </div>
      </div>
    );
  }

  if (history.length < 2) {
    return (
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Analysis History</div>
          <button onClick={() => setExpanded(false)} className="text-xs text-zinc-500 hover:text-zinc-300">
            Collapse
          </button>
        </div>
        <div className="text-center py-8">
          <div className="text-zinc-600 text-sm font-light">
            {history.length === 0 ? 'No analysis history yet' : 'Need at least 2 analyses to show evolution'}
          </div>
          <div className="text-zinc-700 text-xs mt-1">
            History is recorded each time the profile analysis runs
          </div>
        </div>
      </div>
    );
  }

  // The current (most recent) entry is index 0
  const currentEntry = history[0];
  // The comparison entry (defaults to the second most recent)
  const compareEntry = selectedIndex !== null ? history[selectedIndex] : history[1];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Analysis Evolution</div>
          </div>
          <button onClick={() => setExpanded(false)} className="text-xs text-zinc-500 hover:text-zinc-300 font-mono">
            Collapse
          </button>
        </div>

        {/* Timeline selector */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-zinc-500 font-mono">Compare current with:</span>
          <select
            value={selectedIndex ?? 1}
            onChange={(e) => setSelectedIndex(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-300 font-mono focus:border-teal-500 focus:outline-none"
          >
            {history.slice(1).map((entry, idx) => (
              <option key={entry.id} value={idx + 1}>
                {formatHistoryDate(entry.analysisTimestamp)}
                {entry.analysisVersion ? ` (v${entry.analysisVersion})` : ''}
                {entry.messageCountAtAnalysis ? ` — ${entry.messageCountAtAnalysis} msgs` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Date labels */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-red-950/10 border border-red-900/20 rounded">
            <div className="text-[10px] font-mono text-red-400/60 uppercase tracking-wider">Previous</div>
            <div className="text-sm text-zinc-300 font-mono">{formatHistoryDate(compareEntry.analysisTimestamp)}</div>
            {compareEntry.messageCountAtAnalysis && (
              <div className="text-xs text-zinc-600 font-mono">{compareEntry.messageCountAtAnalysis} messages analyzed</div>
            )}
          </div>
          <div className="p-3 bg-emerald-950/10 border border-emerald-900/20 rounded">
            <div className="text-[10px] font-mono text-emerald-400/60 uppercase tracking-wider">Current</div>
            <div className="text-sm text-zinc-300 font-mono">{formatHistoryDate(currentEntry.analysisTimestamp)}</div>
            {currentEntry.messageCountAtAnalysis && (
              <div className="text-xs text-zinc-600 font-mono">{currentEntry.messageCountAtAnalysis} messages analyzed</div>
            )}
          </div>
        </div>
      </div>

      {/* Diff content */}
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1">
        {/* Number diffs first */}
        {DIFF_FIELDS.filter(f => f.type === 'number').map(field => (
          <NumberDiff
            key={field.key}
            label={field.label}
            oldVal={compareEntry[field.key] as number | null}
            newVal={currentEntry[field.key] as number | null}
          />
        ))}

        {/* Short text diffs */}
        {DIFF_FIELDS.filter(f => f.type === 'text').map(field => (
          <TextDiff
            key={field.key}
            label={field.label}
            oldVal={compareEntry[field.key] as string | null}
            newVal={currentEntry[field.key] as string | null}
          />
        ))}

        {/* Essay diffs */}
        {DIFF_FIELDS.filter(f => f.type === 'essay').map(field => (
          <TextDiff
            key={field.key}
            label={field.label}
            oldVal={compareEntry[field.key] as string | null}
            newVal={currentEntry[field.key] as string | null}
          />
        ))}

        {/* No changes indicator */}
        {DIFF_FIELDS.every(f => compareEntry[f.key] === currentEntry[f.key]) && (
          <div className="text-center py-8">
            <div className="text-zinc-600 text-sm font-light">No changes detected between these analyses</div>
          </div>
        )}
      </div>

      {/* Full timeline */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3">Timeline ({history.length} analyses)</div>
        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-800" />
          <div className="space-y-2">
            {history.map((entry, idx) => {
              const isSelected = idx === (selectedIndex ?? 1);
              const isCurrent = idx === 0;
              return (
                <button
                  key={entry.id}
                  onClick={() => { if (idx > 0) setSelectedIndex(idx); }}
                  disabled={idx === 0}
                  className={`relative flex items-center gap-3 w-full text-left pl-6 py-1.5 rounded transition-colors ${
                    isCurrent ? 'cursor-default' : 'hover:bg-zinc-800/50 cursor-pointer'
                  } ${isSelected ? 'bg-zinc-800/30' : ''}`}
                >
                  <div className={`absolute left-0 w-[15px] h-[15px] rounded-full border-2 ${
                    isCurrent
                      ? 'border-teal-400 bg-teal-400/20'
                      : isSelected
                        ? 'border-amber-400 bg-amber-400/20'
                        : 'border-zinc-700 bg-zinc-900'
                  }`} />
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-zinc-400">
                        {formatHistoryDate(entry.analysisTimestamp)}
                      </span>
                      {isCurrent && (
                        <span className="ml-2 text-[10px] font-mono text-teal-400 uppercase">current</span>
                      )}
                      {isSelected && !isCurrent && (
                        <span className="ml-2 text-[10px] font-mono text-amber-400 uppercase">comparing</span>
                      )}
                    </div>
                    {entry.omegaRating !== null && (
                      <span className="text-xs font-mono" style={{ color: ratingColor(entry.omegaRating) }}>
                        {entry.omegaRating}/100
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ProfileDetailPage() {
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/profiles/by-username/${username}`)
      .then(res => {
        if (!res.ok) throw new Error('Profile not found');
        return res.json();
      })
      .then(data => {
        setProfile(data.profile);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [username]);

  if (loading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-400 text-xl font-light">{error || 'Profile not found'}</div>
          <Link href="/profiles" className="text-teal-400 hover:text-teal-300 text-sm font-mono">
            ← Back to Profiles
          </Link>
        </div>
      </div>
    );
  }

  // Helper to convert Unix timestamp to Date
  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return null;
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header with Photo */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link href="/profiles" className="text-teal-400 hover:text-teal-300 text-sm font-mono inline-flex items-center gap-2 mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Profiles
          </Link>

          <div className="flex items-start gap-6">
            {profile.uploadedPhotoUrl && (
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-teal-500/30 flex-shrink-0">
                <img src={profile.uploadedPhotoUrl} alt={profile.username || 'Profile'} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-4xl font-light text-white tracking-tight">
                {profile.username || 'Unknown Subject'}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-sm font-mono text-zinc-500">
                <span>ID: {profile.userId}</span>
                <span>•</span>
                <span>{profile.messageCount} interactions</span>
              </div>
              {profile.integratedProfileSummary && (
                <p className="mt-4 text-zinc-400 font-light max-w-3xl">
                  {profile.integratedProfileSummary}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        {/* Omega Rating Bar — always at the top */}
        {profile.omega_rating !== null && profile.omega_rating !== undefined && (
          <OmegaRatingBar rating={profile.omega_rating} reason={profile.omega_rating_reason} />
        )}

        {/* Analysis History & Evolution Diff */}
        <AnalysisHistoryViewer username={username} />

        {/* Omega's Perspective */}
        {profile.omega_thoughts && (
          <Section title="Omega's Thoughts">
            <div className="p-6 bg-zinc-900 border border-teal-500/30 rounded-lg">
              <p className="text-zinc-300 font-light italic leading-relaxed">{profile.omega_thoughts}</p>
            </div>
          </Section>
        )}

        {/* Personality Archetypes */}
        <Section title="Personality Archetypes">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.dominant_archetype && (
              <DataField label="Dominant Archetype" value={profile.dominant_archetype} confidence={profile.archetype_confidence} />
            )}
            {profile.secondary_archetypes && (
              <DataField label="Secondary Archetypes" value={profile.secondary_archetypes} />
            )}
            {profile.shadow_archetype && (
              <DataField label="Shadow Archetype" value={profile.shadow_archetype} />
            )}
          </div>
        </Section>

        {/* Big Five Personality Traits */}
        <Section title="Big Five Personality Traits">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.openness_score !== null && <ScoreBar score={profile.openness_score} label="Openness" />}
            {profile.conscientiousness_score !== null && <ScoreBar score={profile.conscientiousness_score} label="Conscientiousness" />}
            {profile.extraversion_score !== null && <ScoreBar score={profile.extraversion_score} label="Extraversion" />}
            {profile.agreeableness_score !== null && <ScoreBar score={profile.agreeableness_score} label="Agreeableness" />}
            {profile.neuroticism_score !== null && <ScoreBar score={profile.neuroticism_score} label="Neuroticism" />}
          </div>
        </Section>

        {/* Emotional Intelligence */}
        <Section title="Emotional Intelligence">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.attachmentStyle && (
              <DataField label="Attachment Style" value={profile.attachmentStyle} confidence={profile.attachment_confidence} />
            )}
            {profile.emotional_awareness_score !== null && <ScoreBar score={profile.emotional_awareness_score} label="Emotional Awareness" />}
            {profile.empathy_score !== null && <ScoreBar score={profile.empathy_score} label="Empathy" />}
            {profile.emotional_regulation_score !== null && <ScoreBar score={profile.emotional_regulation_score} label="Emotional Regulation" />}
          </div>
        </Section>

        {/* Communication Style */}
        <Section title="Communication Style">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.communication_formality && <DataField label="Formality" value={profile.communication_formality} />}
            {profile.communication_assertiveness && <DataField label="Assertiveness" value={profile.communication_assertiveness} />}
            {profile.communication_engagement && <DataField label="Engagement" value={profile.communication_engagement} />}
            {profile.verbal_fluency_score !== null && <ScoreBar score={profile.verbal_fluency_score} label="Verbal Fluency" />}
            {profile.question_asking_frequency !== null && <TextField value={(profile.question_asking_frequency * 100).toFixed(2) + '%'} label="Question Asking Frequency" />}
          </div>
        </Section>

        {/* Thinking Style */}
        <Section title="Thinking Style">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.analytical_thinking_score !== null && <ScoreBar score={profile.analytical_thinking_score} label="Analytical Thinking" />}
            {profile.creative_thinking_score !== null && <ScoreBar score={profile.creative_thinking_score} label="Creative Thinking" />}
            {profile.abstract_reasoning_score !== null && <ScoreBar score={profile.abstract_reasoning_score} label="Abstract Reasoning" />}
            {profile.concrete_thinking_score !== null && <ScoreBar score={profile.concrete_thinking_score} label="Concrete Thinking" />}
          </div>
        </Section>

        {/* Social Dynamics */}
        <Section title="Social Dynamics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.social_dominance_score !== null && <ScoreBar score={profile.social_dominance_score} label="Social Dominance" />}
            {profile.cooperation_score !== null && <ScoreBar score={profile.cooperation_score} label="Cooperation" />}
            {profile.conflictStyle && <DataField label="Conflict Style" value={profile.conflictStyle} />}
            {profile.humorStyle && <DataField label="Humor Style" value={profile.humorStyle} />}
          </div>
        </Section>

        {/* Linguistic Patterns */}
        <Section title="Linguistic Patterns">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.messageLengthAvg !== null && <TextField value={profile.messageLengthAvg.toFixed(2)} label="Average Message Length" />}
            {profile.message_length_variance !== null && <TextField value={profile.message_length_variance.toFixed(2)} label="Message Length Variance" />}
            {profile.response_latency_avg !== null && <TextField value={profile.response_latency_avg.toFixed(2) + 'ms'} label="Response Latency (avg)" />}
            {profile.emoji_usage_rate !== null && <TextField value={(profile.emoji_usage_rate).toFixed(2) + '%'} label="Emoji Usage Rate" />}
            {profile.punctuation_style && <DataField label="Punctuation Style" value={profile.punctuation_style} />}
            {profile.capitalization_pattern && <DataField label="Capitalization Pattern" value={profile.capitalization_pattern} />}
          </div>
        </Section>

        {/* Knowledge & Interests */}
        <Section title="Knowledge & Interests">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.technical_knowledge_level && <DataField label="Technical Knowledge Level" value={profile.technical_knowledge_level} />}
            {profile.primary_interests && <DataField label="Primary Interests" value={profile.primary_interests} />}
            {profile.expertise_areas && <DataField label="Expertise Areas" value={profile.expertise_areas} />}
          </div>
        </Section>

        {/* Relationship with Omega */}
        <Section title="Relationship with Omega">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.affinity_score !== null && <ScoreBar score={profile.affinity_score} label="Affinity Score" />}
            {profile.trust_level !== null && <ScoreBar score={profile.trust_level} label="Trust Level" />}
            {profile.emotional_bond && <DataField label="Emotional Bond" value={profile.emotional_bond} />}
          </div>
        </Section>

        {/* Emotional Patterns */}
        <Section title="Emotional Patterns">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.overall_sentiment && <DataField label="Overall Sentiment" value={profile.overall_sentiment} />}
            {profile.positive_interaction_ratio !== null && <ScoreBar score={Math.round(profile.positive_interaction_ratio * 100)} label="Positive Interaction Ratio" />}
            {profile.negative_interaction_ratio !== null && <ScoreBar score={Math.round(profile.negative_interaction_ratio * 100)} label="Negative Interaction Ratio" />}
            {profile.dominant_emotions && <DataField label="Dominant Emotions" value={profile.dominant_emotions} />}
            {profile.feelings_json && <DataField label="Feelings Analysis" value={profile.feelings_json} />}
            {profile.notable_patterns && <DataField label="Notable Patterns" value={profile.notable_patterns} />}
            {profile.personality_facets && <DataField label="Personality Facets" value={profile.personality_facets} />}
          </div>
        </Section>

        {/* Cultural Background */}
        <Section title="Cultural Background">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.culturalBackground && <DataField label="Cultural Background" value={profile.culturalBackground} />}
            {profile.culturalValues && <DataField label="Cultural Values" value={profile.culturalValues} />}
            {profile.culturalCommunicationStyle && <DataField label="Communication Style" value={profile.culturalCommunicationStyle} />}
            {profile.culturalConfidence !== null && <ScoreBar score={normalizeConfidence(profile.culturalConfidence) ?? 0} label="Cultural Analysis Confidence" />}
          </div>
        </Section>

        {/* Deep Analysis Essays */}
        <EssaySection title="Psychological Profile" content={profile.psychological_profile} />
        <EssaySection title="Communication Analysis" content={profile.communication_analysis} />
        <EssaySection title="Relationship with Omega" content={profile.relationship_narrative} />
        <EssaySection title="How They've Changed" content={profile.personality_evolution} />
        <EssaySection title="Behavioral Patterns" content={profile.behavioral_deep_dive} />
        <EssaySection title="Interests &amp; Passions" content={profile.interests_analysis} />
        <EssaySection title="Emotional Landscape" content={profile.emotional_landscape} />
        <EssaySection title="Social Dynamics" content={profile.social_dynamics_analysis} />
        <EssaySection title="How They Treat Others" content={profile.interaction_style_with_others} />

        {/* Behavioral Predictions */}
        {profile.predictedBehaviors && Array.isArray(profile.predictedBehaviors) && profile.predictedBehaviors.length > 0 && (
          <Section title="Behavioral Predictions">
            <div className="grid grid-cols-1 gap-4">
              {profile.predictedBehaviors.map((prediction: any, idx: number) => (
                <PredictionCard key={idx} prediction={prediction} />
              ))}
            </div>
            {profile.predictionTimeframe && (
              <div className="mt-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-500">Timeframe: </span>
                    <span className="text-zinc-300">{profile.predictionTimeframe}</span>
                  </div>
                  {profile.predictionConfidence !== null && (
                    <div>
                      <span className="text-zinc-500">Overall Confidence: </span>
                      <span className="text-teal-400 font-mono">{normalizeConfidence(profile.predictionConfidence)}%</span>
                    </div>
                  )}
                  {profile.predictionAccuracyScore !== null && (
                    <div>
                      <span className="text-zinc-500">Accuracy Score: </span>
                      <span className="text-teal-400 font-mono">{normalizeConfidence(profile.predictionAccuracyScore)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Profile Integration */}
        {profile.profileIntegrationConfidence !== null && (
          <Section title="Profile Integration">
            <div className="grid grid-cols-1 gap-6">
              <ScoreBar score={normalizeConfidence(profile.profileIntegrationConfidence) ?? 0} label="Integration Confidence" />
            </div>
          </Section>
        )}

        {/* Physical Phenotype Analysis */}
        <Section title="Physical Phenotype Analysis">
          {profile.aiAppearanceDescription && (
            <div className="mb-8 p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
              <h3 className="text-lg font-light text-white mb-2">AI Appearance Description</h3>
              <p className="text-zinc-300 font-light leading-relaxed">{profile.aiAppearanceDescription}</p>
              {profile.appearanceConfidence && (
                <p className="text-xs text-teal-400 mt-3 font-mono">
                  Confidence: {(profile.appearanceConfidence * 100).toFixed(0)}%
                </p>
              )}
            </div>
          )}

          <div className="space-y-12">
            {/* Basic Demographics */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Demographics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.aiDetectedGender && <DataField label="Detected Gender" value={profile.aiDetectedGender} confidence={profile.genderConfidence} />}
                {profile.estimatedAgeRange && <DataField label="Age Range" value={profile.estimatedAgeRange} confidence={profile.ageConfidence} />}
                {profile.heightEstimate && <DataField label="Height Estimate" value={profile.heightEstimate} />}
              </div>
            </div>

            {/* Face Structure */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Face Structure</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.faceShape && <DataField label="Face Shape" value={profile.faceShape} />}
                {profile.facialSymmetryScore !== null && <ScoreBar score={profile.facialSymmetryScore} label="Facial Symmetry" />}
                {profile.jawlineProminence && <DataField label="Jawline" value={profile.jawlineProminence} />}
                {profile.cheekboneProminence && <DataField label="Cheekbones" value={profile.cheekboneProminence} />}
              </div>
            </div>

            {/* Hair */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Hair</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.hairColor && <DataField label="Hair Color" value={profile.hairColor} />}
                {profile.hairTexture && <DataField label="Hair Texture" value={profile.hairTexture} />}
                {profile.hairLength && <DataField label="Hair Length" value={profile.hairLength} />}
                {profile.hairStyle && <DataField label="Hair Style" value={profile.hairStyle} />}
                {profile.hairDensity && <DataField label="Hair Density" value={profile.hairDensity} />}
                {profile.facialHair && <DataField label="Facial Hair" value={profile.facialHair} />}
              </div>
            </div>

            {/* Eyes */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Eyes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.eyeColor && <DataField label="Eye Color" value={profile.eyeColor} />}
                {profile.eyeShape && <DataField label="Eye Shape" value={profile.eyeShape} />}
                {profile.eyeSpacing && <DataField label="Eye Spacing" value={profile.eyeSpacing} />}
                {profile.eyebrowShape && <DataField label="Eyebrow Shape" value={profile.eyebrowShape} />}
                {profile.eyebrowThickness && <DataField label="Eyebrow Thickness" value={profile.eyebrowThickness} />}
              </div>
            </div>

            {/* Nose & Lips */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Nose & Lips</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.noseShape && <DataField label="Nose Shape" value={profile.noseShape} />}
                {profile.noseSize && <DataField label="Nose Size" value={profile.noseSize} />}
                {profile.lipFullness && <DataField label="Lip Fullness" value={profile.lipFullness} />}
                {profile.smileType && <DataField label="Smile Type" value={profile.smileType} />}
              </div>
            </div>

            {/* Skin */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Skin</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.skinTone && <DataField label="Skin Tone" value={profile.skinTone} />}
                {profile.skinTexture && <DataField label="Skin Texture" value={profile.skinTexture} />}
                {profile.complexionQuality && <DataField label="Complexion Quality" value={profile.complexionQuality} />}
              </div>
            </div>

            {/* Body */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Body</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.bodyType && <DataField label="Body Type" value={profile.bodyType} />}
                {profile.buildDescription && <DataField label="Build" value={profile.buildDescription} />}
                {profile.posture && <DataField label="Posture" value={profile.posture} />}
                {profile.distinctiveFeatures && <DataField label="Distinctive Features" value={profile.distinctiveFeatures} />}
              </div>
            </div>

            {/* Style & Presentation */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Style & Presentation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.clothingStyle && <DataField label="Clothing Style" value={profile.clothingStyle} />}
                {profile.accessories && <DataField label="Accessories" value={profile.accessories} />}
                {profile.aestheticArchetype && <DataField label="Aesthetic Archetype" value={profile.aestheticArchetype} />}
              </div>
            </div>

            {/* Overall Impressions */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Overall Impressions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.attractivenessAssessment && <DataField label="Attractiveness" value={profile.attractivenessAssessment} />}
                {profile.approachabilityScore !== null && <ScoreBar score={profile.approachabilityScore} label="Approachability" />}
                {profile.perceivedConfidenceLevel && <DataField label="Confidence Level" value={profile.perceivedConfidenceLevel} />}
              </div>
            </div>
          </div>
        </Section>

        {/* Analysis Metrics */}
        {(profile.peakActivityHours || profile.weekendActivityRatio !== null || profile.sentimentTrajectory || profile.vocabularyGrowthRate !== null || profile.engagementAuthenticityScore !== null) && (
          <Section title="Analysis Metrics">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile.peakActivityHours && profile.peakActivityHours.length > 0 && (
                <TextField value={profile.peakActivityHours.map(h => `${h}:00 UTC`).join(', ')} label="Peak Activity Hours" />
              )}
              {profile.weekendActivityRatio !== null && (
                <ScoreBar score={Math.round(profile.weekendActivityRatio * 100)} label="Weekend Activity Ratio" />
              )}
              {profile.sentimentTrajectory && (
                <DataField label="Sentiment Trajectory" value={profile.sentimentTrajectory} />
              )}
              {profile.vocabularyGrowthRate !== null && (
                <TextField value={`${(profile.vocabularyGrowthRate * 100).toFixed(1)}%`} label="Vocabulary Growth Rate" />
              )}
              {profile.engagementAuthenticityScore !== null && (
                <ScoreBar score={Math.round(profile.engagementAuthenticityScore)} label="Engagement Authenticity" />
              )}
            </div>
          </Section>
        )}

        {/* Tracking & Metadata */}
        <Section title="Tracking & Metadata">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TextField value={profile.messageCount} label="Message Count" />
            {formatTimestamp(profile.firstSeenAt) && <TextField value={formatTimestamp(profile.firstSeenAt)!} label="First Seen" />}
            {formatTimestamp(profile.lastInteractionAt) && <TextField value={formatTimestamp(profile.lastInteractionAt)!} label="Last Interaction" />}
            {formatTimestamp(profile.lastAnalyzedAt) && <TextField value={formatTimestamp(profile.lastAnalyzedAt)!} label="Last Analyzed" />}
            {formatTimestamp(profile.lastPhotoAnalyzedAt) && <TextField value={formatTimestamp(profile.lastPhotoAnalyzedAt)!} label="Last Photo Analyzed" />}
            {formatTimestamp(profile.createdAt) && <TextField value={formatTimestamp(profile.createdAt)!} label="Created" />}
            {formatTimestamp(profile.updatedAt) && <TextField value={formatTimestamp(profile.updatedAt)!} label="Updated" />}
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 bg-zinc-900/50 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Link href="/profiles" className="text-teal-400 hover:text-teal-300 text-sm font-mono inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Profiles
          </Link>
        </div>
      </div>
    </div>
  );
}
