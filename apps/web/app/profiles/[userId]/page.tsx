'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface UserProfile {
  // Core
  userId: string;
  username: string | null;

  // Emotional State
  currentFeelings: any;
  emotionalState: string | null;
  emotionalTrend: string | null;
  emotionalVolatility: number | null;
  stressLevel: number | null;
  moodHistory: any;

  // Personality Traits
  bigFiveOpenness: number | null;
  bigFiveConscientiousness: number | null;
  bigFiveExtraversion: number | null;
  bigFiveAgreeableness: number | null;
  bigFiveNeuroticism: number | null;
  mbtiType: string | null;
  enneagramType: string | null;
  enneagramWing: string | null;
  dominantTraits: any;
  personalityNotes: string | null;

  // Cognitive Patterns
  thinkingStyle: string | null;
  decisionMakingStyle: string | null;
  problemSolvingApproach: string | null;
  learningStyle: string | null;
  communicationStyle: string | null;
  conflictStyle: string | null;
  creativityLevel: number | null;
  analyticalLevel: number | null;

  // Interests & Values
  interests: any;
  hobbies: any;
  values: any;
  goals: any;
  fears: any;
  motivations: any;
  strengthsWeaknesses: any;

  // Social Patterns
  socialStyle: string | null;
  relationshipPatterns: string | null;
  attachmentStyle: string | null;
  socialEnergyLevel: number | null;
  groupDynamicsRole: string | null;

  // Linguistic Patterns
  vocabularyComplexity: number | null;
  sentimentTrend: string | null;
  formalityLevel: number | null;
  humorStyle: string | null;
  sarcasmFrequency: number | null;
  emojiUsagePattern: string | null;
  typingPatterns: string | null;
  commonPhrases: any;

  // Behavioral Patterns
  activityPattern: string | null;
  responseTimeAvg: number | null;
  messageLengthAvg: number | null;
  topicPreferences: any;
  conversationInitiationRate: number | null;

  // Life Context
  lifeStage: string | null;
  lifeCircumstances: string | null;
  recentLifeEvents: any;
  supportNetwork: string | null;

  // Mental Health Indicators
  anxietyIndicators: any;
  depressionIndicators: any;
  wellbeingScore: number | null;
  copingMechanisms: any;
  riskFactors: any;
  protectiveFactors: any;

  // Cultural Background
  culturalBackground: string | null;
  culturalValues: any;
  culturalCommunicationStyle: string | null;
  culturalConfidence: number | null;

  // Astrological Data
  zodiacSign: string | null;
  zodiacElement: string | null;
  zodiacModality: string | null;
  birthDate: Date | null;
  astrologicalConfidence: number | null;

  // Behavioral Predictions
  predictedBehaviors: any;
  predictionConfidence: number | null;
  predictionTimeframe: string | null;
  lastPredictionAt: Date | null;
  predictionAccuracyScore: number | null;

  // Integration
  integratedProfileSummary: string | null;
  profileIntegrationConfidence: number | null;
  worldModelAdjustments: any;
  personalModelAdjustments: any;

  // Physical Phenotype
  uploadedPhotoUrl: string | null;
  aiAppearanceDescription: string | null;
  aiDetectedGender: string | null;
  estimatedAgeRange: string | null;
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
  distinctiveFeatures: any;
  clothingStyle: string | null;
  accessories: any;
  attractivenessAssessment: string | null;
  approachabilityScore: number | null;
  perceivedConfidenceLevel: string | null;
  aestheticArchetype: string | null;
  // Confidence scores
  faceShapeConfidence: number | null;
  hairColorConfidence: number | null;
  eyeColorConfidence: number | null;
  skinToneConfidence: number | null;
  genderConfidence: number | null;
  ageConfidence: number | null;
  bodyTypeConfidence: number | null;

  // Tracking & Metadata
  messageCount: number;
  firstSeenAt: Date;
  lastInteractionAt: Date;
  lastAnalyzedAt: Date | null;
  lastPhotoAnalyzedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
        {/* Emotional State */}
        <Section title="Emotional State">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Current Feelings" value={profile.currentFeelings} />
            <DataField label="Emotional State" value={profile.emotionalState} />
            <DataField label="Emotional Trend" value={profile.emotionalTrend} />
            <DataField label="Emotional Volatility" value={profile.emotionalVolatility} />
            <DataField label="Stress Level" value={profile.stressLevel} />
            <DataField label="Mood History" value={profile.moodHistory} />
          </div>
        </Section>

        {/* Personality Traits */}
        <Section title="Personality Traits">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Big Five: Openness" value={profile.bigFiveOpenness} />
            <DataField label="Big Five: Conscientiousness" value={profile.bigFiveConscientiousness} />
            <DataField label="Big Five: Extraversion" value={profile.bigFiveExtraversion} />
            <DataField label="Big Five: Agreeableness" value={profile.bigFiveAgreeableness} />
            <DataField label="Big Five: Neuroticism" value={profile.bigFiveNeuroticism} />
            <DataField label="MBTI Type" value={profile.mbtiType} />
            <DataField label="Enneagram Type" value={profile.enneagramType} />
            <DataField label="Enneagram Wing" value={profile.enneagramWing} />
            <DataField label="Dominant Traits" value={profile.dominantTraits} />
            <DataField label="Personality Notes" value={profile.personalityNotes} />
          </div>
        </Section>

        {/* Cognitive Patterns */}
        <Section title="Cognitive Patterns">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Thinking Style" value={profile.thinkingStyle} />
            <DataField label="Decision Making Style" value={profile.decisionMakingStyle} />
            <DataField label="Problem Solving Approach" value={profile.problemSolvingApproach} />
            <DataField label="Learning Style" value={profile.learningStyle} />
            <DataField label="Communication Style" value={profile.communicationStyle} />
            <DataField label="Conflict Style" value={profile.conflictStyle} />
            <DataField label="Creativity Level" value={profile.creativityLevel} />
            <DataField label="Analytical Level" value={profile.analyticalLevel} />
          </div>
        </Section>

        {/* Interests & Values */}
        <Section title="Interests & Values">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField label="Interests" value={profile.interests} />
            <DataField label="Hobbies" value={profile.hobbies} />
            <DataField label="Values" value={profile.values} />
            <DataField label="Goals" value={profile.goals} />
            <DataField label="Fears" value={profile.fears} />
            <DataField label="Motivations" value={profile.motivations} />
            <DataField label="Strengths & Weaknesses" value={profile.strengthsWeaknesses} />
          </div>
        </Section>

        {/* Social Patterns */}
        <Section title="Social Patterns">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Social Style" value={profile.socialStyle} />
            <DataField label="Relationship Patterns" value={profile.relationshipPatterns} />
            <DataField label="Attachment Style" value={profile.attachmentStyle} />
            <DataField label="Social Energy Level" value={profile.socialEnergyLevel} />
            <DataField label="Group Dynamics Role" value={profile.groupDynamicsRole} />
          </div>
        </Section>

        {/* Linguistic Patterns */}
        <Section title="Linguistic Patterns">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Vocabulary Complexity" value={profile.vocabularyComplexity} />
            <DataField label="Sentiment Trend" value={profile.sentimentTrend} />
            <DataField label="Formality Level" value={profile.formalityLevel} />
            <DataField label="Humor Style" value={profile.humorStyle} />
            <DataField label="Sarcasm Frequency" value={profile.sarcasmFrequency} />
            <DataField label="Emoji Usage Pattern" value={profile.emojiUsagePattern} />
            <DataField label="Typing Patterns" value={profile.typingPatterns} />
            <DataField label="Common Phrases" value={profile.commonPhrases} />
          </div>
        </Section>

        {/* Behavioral Patterns */}
        <Section title="Behavioral Patterns">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Activity Pattern" value={profile.activityPattern} />
            <DataField label="Response Time Avg (ms)" value={profile.responseTimeAvg} />
            <DataField label="Message Length Avg" value={profile.messageLengthAvg} />
            <DataField label="Topic Preferences" value={profile.topicPreferences} />
            <DataField label="Conversation Initiation Rate" value={profile.conversationInitiationRate} />
          </div>
        </Section>

        {/* Life Context */}
        <Section title="Life Context">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField label="Life Stage" value={profile.lifeStage} />
            <DataField label="Life Circumstances" value={profile.lifeCircumstances} />
            <DataField label="Recent Life Events" value={profile.recentLifeEvents} />
            <DataField label="Support Network" value={profile.supportNetwork} />
          </div>
        </Section>

        {/* Mental Health Indicators */}
        <Section title="Mental Health Indicators">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataField label="Anxiety Indicators" value={profile.anxietyIndicators} />
            <DataField label="Depression Indicators" value={profile.depressionIndicators} />
            <DataField label="Wellbeing Score" value={profile.wellbeingScore} />
            <DataField label="Coping Mechanisms" value={profile.copingMechanisms} />
            <DataField label="Risk Factors" value={profile.riskFactors} />
            <DataField label="Protective Factors" value={profile.protectiveFactors} />
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
            <DataField label="Birth Date" value={profile.birthDate ? new Date(profile.birthDate).toLocaleDateString() : null} />
            <DataField label="Astrological Confidence" value={profile.astrologicalConfidence} confidence={profile.astrologicalConfidence} />
          </div>
        </Section>

        {/* Behavioral Predictions */}
        <Section title="Behavioral Predictions">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField label="Predicted Behaviors" value={profile.predictedBehaviors} />
            <DataField label="Prediction Confidence" value={profile.predictionConfidence} confidence={profile.predictionConfidence} />
            <DataField label="Prediction Timeframe" value={profile.predictionTimeframe} />
            <DataField label="Last Prediction" value={profile.lastPredictionAt ? new Date(profile.lastPredictionAt).toLocaleString() : null} />
            <DataField label="Prediction Accuracy Score" value={profile.predictionAccuracyScore} />
          </div>
        </Section>

        {/* Integration */}
        <Section title="Profile Integration">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField label="Integrated Summary" value={profile.integratedProfileSummary} />
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
                <DataField label="Face Shape" value={profile.faceShape} confidence={profile.faceShapeConfidence} />
                <DataField label="Facial Symmetry Score" value={profile.facialSymmetryScore} />
                <DataField label="Jawline Prominence" value={profile.jawlineProminence} />
                <DataField label="Cheekbone Prominence" value={profile.cheekboneProminence} />
              </div>
            </div>

            {/* Hair */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Hair</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DataField label="Hair Color" value={profile.hairColor} confidence={profile.hairColorConfidence} />
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
                <DataField label="Eye Color" value={profile.eyeColor} confidence={profile.eyeColorConfidence} />
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
                <DataField label="Skin Tone" value={profile.skinTone} confidence={profile.skinToneConfidence} />
                <DataField label="Skin Texture" value={profile.skinTexture} />
                <DataField label="Complexion Quality" value={profile.complexionQuality} />
              </div>
            </div>

            {/* Body */}
            <div>
              <h3 className="text-lg font-light text-teal-400 mb-4">Body</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DataField label="Body Type" value={profile.bodyType} confidence={profile.bodyTypeConfidence} />
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

            {/* Impressions */}
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
            <DataField label="First Seen" value={new Date(profile.firstSeenAt).toLocaleString()} />
            <DataField label="Last Interaction" value={new Date(profile.lastInteractionAt).toLocaleString()} />
            <DataField label="Last Analyzed" value={profile.lastAnalyzedAt ? new Date(profile.lastAnalyzedAt).toLocaleString() : null} />
            <DataField label="Last Photo Analyzed" value={profile.lastPhotoAnalyzedAt ? new Date(profile.lastPhotoAnalyzedAt).toLocaleString() : null} />
            <DataField label="Created" value={new Date(profile.createdAt).toLocaleString()} />
            <DataField label="Updated" value={new Date(profile.updatedAt).toLocaleString()} />
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
