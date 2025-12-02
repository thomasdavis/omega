'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface UserProfile {
  // Core
  id: string;
  userId: string;
  username: string;

  // Archetypes
  dominant_archetype: string | null;
  secondary_archetypes: any;
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
  primary_interests: any;
  expertise_areas: any;

  // Relationship with Omega
  affinity_score: number | null;
  trust_level: number | null;
  emotional_bond: string | null;
  omega_thoughts: string | null;

  // Patterns & Sentiment
  notable_patterns: any;
  overall_sentiment: string | null;
  positive_interaction_ratio: number | null;
  negative_interaction_ratio: number | null;
  dominant_emotions: any;
  feelings_json: any;
  personality_facets: any;

  // Cultural Background
  culturalBackground: string | null;
  culturalValues: any;
  culturalCommunicationStyle: string | null;
  culturalConfidence: number | null;

  // Astrological Data
  zodiacSign: string | null;
  zodiacElement: string | null;
  zodiacModality: string | null;
  birthDate: string | null;
  astrologicalConfidence: number | null;

  // Behavioral Predictions
  predictedBehaviors: any;
  predictionConfidence: number | null;
  predictionTimeframe: string | null;
  lastPredictionAt: number | null;
  predictionAccuracyScore: number | null;

  // Integration
  integratedProfileSummary: string | null;
  profileIntegrationConfidence: number | null;
  worldModelAdjustments: any;
  personalModelAdjustments: any;

  // Physical Appearance
  uploadedPhotoUrl: string | null;
  uploadedPhotoMetadata: any;
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
  distinctiveFeatures: any;

  // Style & Presentation
  clothingStyle: string | null;
  accessories: any;
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

const DataField = ({ label, value, confidence }: { label: string; value: any; confidence?: number | null }) => {
  if (value === null || value === undefined) return null;

  const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);

  return (
    <div className="space-y-1">
      <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
        {label}
        {confidence !== null && confidence !== undefined && (
          <span className="text-teal-400">{(confidence * 100).toFixed(0)}%</span>
        )}
      </div>
      <div className="text-sm text-zinc-200 font-light whitespace-pre-wrap">
        {displayValue}
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border-l-2 border-teal-500/30 pl-6 space-y-6">
    <h2 className="text-2xl font-light text-white tracking-tight">{title}</h2>
    <div className="space-y-6">
      {children}
    </div>
  </div>
);

export default function ProfileDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/profiles/${userId}`)
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
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-xl font-light tracking-wide">Loading profile...</div>
      </div>
    );
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
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
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
        {/* Omega's Perspective */}
        {profile.omega_thoughts && (
          <Section title="Omega's Thoughts">
            <div className="p-6 bg-zinc-900 border border-teal-500/30 rounded">
              <p className="text-zinc-300 font-light italic">{profile.omega_thoughts}</p>
            </div>
          </Section>
        )}

        {/* Personality Archetypes */}
        <Section title="Personality Archetypes">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Dominant Archetype" value={profile.dominant_archetype} confidence={profile.archetype_confidence} />
            <DataField label="Secondary Archetypes" value={profile.secondary_archetypes} />
            <DataField label="Shadow Archetype" value={profile.shadow_archetype} />
          </div>
        </Section>

        {/* Big Five Personality Traits */}
        <Section title="Big Five Personality Traits">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Openness" value={profile.openness_score} />
            <DataField label="Conscientiousness" value={profile.conscientiousness_score} />
            <DataField label="Extraversion" value={profile.extraversion_score} />
            <DataField label="Agreeableness" value={profile.agreeableness_score} />
            <DataField label="Neuroticism" value={profile.neuroticism_score} />
          </div>
        </Section>

        {/* Emotional Intelligence */}
        <Section title="Emotional Intelligence">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Attachment Style" value={profile.attachmentStyle} confidence={profile.attachment_confidence} />
            <DataField label="Emotional Awareness" value={profile.emotional_awareness_score} />
            <DataField label="Empathy Score" value={profile.empathy_score} />
            <DataField label="Emotional Regulation" value={profile.emotional_regulation_score} />
          </div>
        </Section>

        {/* Communication Style */}
        <Section title="Communication Style">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Formality" value={profile.communication_formality} />
            <DataField label="Assertiveness" value={profile.communication_assertiveness} />
            <DataField label="Engagement" value={profile.communication_engagement} />
            <DataField label="Verbal Fluency" value={profile.verbal_fluency_score} />
            <DataField label="Question Asking Frequency" value={profile.question_asking_frequency} />
          </div>
        </Section>

        {/* Thinking Style */}
        <Section title="Thinking Style">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField label="Analytical Thinking" value={profile.analytical_thinking_score} />
            <DataField label="Creative Thinking" value={profile.creative_thinking_score} />
            <DataField label="Abstract Reasoning" value={profile.abstract_reasoning_score} />
            <DataField label="Concrete Thinking" value={profile.concrete_thinking_score} />
          </div>
        </Section>

        {/* Social Dynamics */}
        <Section title="Social Dynamics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField label="Social Dominance" value={profile.social_dominance_score} />
            <DataField label="Cooperation Score" value={profile.cooperation_score} />
            <DataField label="Conflict Style" value={profile.conflictStyle} />
            <DataField label="Humor Style" value={profile.humorStyle} />
          </div>
        </Section>

        {/* Linguistic Patterns */}
        <Section title="Linguistic Patterns">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Average Message Length" value={profile.messageLengthAvg} />
            <DataField label="Message Length Variance" value={profile.message_length_variance} />
            <DataField label="Response Latency (avg)" value={profile.response_latency_avg} />
            <DataField label="Emoji Usage Rate" value={profile.emoji_usage_rate} />
            <DataField label="Punctuation Style" value={profile.punctuation_style} />
            <DataField label="Capitalization Pattern" value={profile.capitalization_pattern} />
          </div>
        </Section>

        {/* Knowledge & Interests */}
        <Section title="Knowledge & Interests">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField label="Technical Knowledge Level" value={profile.technical_knowledge_level} />
            <DataField label="Primary Interests" value={profile.primary_interests} />
            <DataField label="Expertise Areas" value={profile.expertise_areas} />
          </div>
        </Section>

        {/* Relationship with Omega */}
        <Section title="Relationship with Omega">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Affinity Score" value={profile.affinity_score} />
            <DataField label="Trust Level" value={profile.trust_level} />
            <DataField label="Emotional Bond" value={profile.emotional_bond} />
          </div>
        </Section>

        {/* Emotional Patterns */}
        <Section title="Emotional Patterns">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField label="Overall Sentiment" value={profile.overall_sentiment} />
            <DataField label="Positive Interaction Ratio" value={profile.positive_interaction_ratio} />
            <DataField label="Negative Interaction Ratio" value={profile.negative_interaction_ratio} />
            <DataField label="Dominant Emotions" value={profile.dominant_emotions} />
            <DataField label="Feelings Data" value={profile.feelings_json} />
            <DataField label="Notable Patterns" value={profile.notable_patterns} />
            <DataField label="Personality Facets" value={profile.personality_facets} />
          </div>
        </Section>

        {/* Cultural Background */}
        <Section title="Cultural Background">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField label="Cultural Background" value={profile.culturalBackground} />
            <DataField label="Cultural Values" value={profile.culturalValues} />
            <DataField label="Cultural Communication Style" value={profile.culturalCommunicationStyle} />
            <DataField label="Cultural Analysis Confidence" value={profile.culturalConfidence} confidence={profile.culturalConfidence} />
          </div>
        </Section>

        {/* Astrological Data */}
        <Section title="Astrological Data">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Zodiac Sign" value={profile.zodiacSign} />
            <DataField label="Zodiac Element" value={profile.zodiacElement} />
            <DataField label="Zodiac Modality" value={profile.zodiacModality} />
            <DataField label="Birth Date" value={profile.birthDate} />
            <DataField label="Astrological Confidence" value={profile.astrologicalConfidence} confidence={profile.astrologicalConfidence} />
          </div>
        </Section>

        {/* Behavioral Predictions */}
        <Section title="Behavioral Predictions">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField label="Predicted Behaviors" value={profile.predictedBehaviors} />
            <DataField label="Prediction Confidence" value={profile.predictionConfidence} confidence={profile.predictionConfidence} />
            <DataField label="Prediction Timeframe" value={profile.predictionTimeframe} />
            <DataField label="Last Prediction" value={formatTimestamp(profile.lastPredictionAt)} />
            <DataField label="Prediction Accuracy Score" value={profile.predictionAccuracyScore} />
          </div>
        </Section>

        {/* Profile Integration */}
        <Section title="Profile Integration">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField label="Integration Confidence" value={profile.profileIntegrationConfidence} confidence={profile.profileIntegrationConfidence} />
            <DataField label="World Model Adjustments" value={profile.worldModelAdjustments} />
            <DataField label="Personal Model Adjustments" value={profile.personalModelAdjustments} />
          </div>
        </Section>

        {/* Physical Phenotype Analysis */}
        <Section title="Physical Phenotype Analysis">
          {profile.aiAppearanceDescription && (
            <div className="mb-8 p-6 bg-zinc-900 border border-zinc-800 rounded">
              <h3 className="text-lg font-light text-white mb-2">AI Appearance Description</h3>
              <p className="text-zinc-300 font-light">{profile.aiAppearanceDescription}</p>
              {profile.appearanceConfidence && (
                <p className="text-xs text-teal-400 mt-2">
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
                <DataField label="Detected Gender" value={profile.aiDetectedGender} confidence={profile.genderConfidence} />
                <DataField label="Estimated Age Range" value={profile.estimatedAgeRange} confidence={profile.ageConfidence} />
                <DataField label="Height Estimate" value={profile.heightEstimate} />
              </div>
            </div>

            {/* Face Structure */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Face Structure</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DataField label="Face Shape" value={profile.faceShape} />
                <DataField label="Facial Symmetry Score" value={profile.facialSymmetryScore} />
                <DataField label="Jawline Prominence" value={profile.jawlineProminence} />
                <DataField label="Cheekbone Prominence" value={profile.cheekboneProminence} />
              </div>
            </div>

            {/* Hair */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Hair</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DataField label="Hair Color" value={profile.hairColor} />
                <DataField label="Hair Texture" value={profile.hairTexture} />
                <DataField label="Hair Length" value={profile.hairLength} />
                <DataField label="Hair Style" value={profile.hairStyle} />
                <DataField label="Hair Density" value={profile.hairDensity} />
                <DataField label="Facial Hair" value={profile.facialHair} />
              </div>
            </div>

            {/* Eyes */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Eyes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DataField label="Eye Color" value={profile.eyeColor} />
                <DataField label="Eye Shape" value={profile.eyeShape} />
                <DataField label="Eye Spacing" value={profile.eyeSpacing} />
                <DataField label="Eyebrow Shape" value={profile.eyebrowShape} />
                <DataField label="Eyebrow Thickness" value={profile.eyebrowThickness} />
              </div>
            </div>

            {/* Nose & Lips */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Nose & Lips</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DataField label="Nose Shape" value={profile.noseShape} />
                <DataField label="Nose Size" value={profile.noseSize} />
                <DataField label="Lip Fullness" value={profile.lipFullness} />
                <DataField label="Smile Type" value={profile.smileType} />
              </div>
            </div>

            {/* Skin */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Skin</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DataField label="Skin Tone" value={profile.skinTone} />
                <DataField label="Skin Texture" value={profile.skinTexture} />
                <DataField label="Complexion Quality" value={profile.complexionQuality} />
              </div>
            </div>

            {/* Body */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Body</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DataField label="Body Type" value={profile.bodyType} />
                <DataField label="Build Description" value={profile.buildDescription} />
                <DataField label="Posture" value={profile.posture} />
                <DataField label="Distinctive Features" value={profile.distinctiveFeatures} />
              </div>
            </div>

            {/* Style & Presentation */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Style & Presentation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DataField label="Clothing Style" value={profile.clothingStyle} />
                <DataField label="Accessories" value={profile.accessories} />
                <DataField label="Aesthetic Archetype" value={profile.aestheticArchetype} />
              </div>
            </div>

            {/* Overall Impressions */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Overall Impressions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DataField label="Attractiveness Assessment" value={profile.attractivenessAssessment} />
                <DataField label="Approachability Score" value={profile.approachabilityScore} />
                <DataField label="Perceived Confidence Level" value={profile.perceivedConfidenceLevel} />
              </div>
            </div>
          </div>
        </Section>

        {/* Tracking & Metadata */}
        <Section title="Tracking & Metadata">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Message Count" value={profile.messageCount} />
            <DataField label="First Seen" value={formatTimestamp(profile.firstSeenAt)} />
            <DataField label="Last Interaction" value={formatTimestamp(profile.lastInteractionAt)} />
            <DataField label="Last Analyzed" value={formatTimestamp(profile.lastAnalyzedAt)} />
            <DataField label="Last Photo Analyzed" value={formatTimestamp(profile.lastPhotoAnalyzedAt)} />
            <DataField label="Created" value={formatTimestamp(profile.createdAt)} />
            <DataField label="Updated" value={formatTimestamp(profile.updatedAt)} />
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
