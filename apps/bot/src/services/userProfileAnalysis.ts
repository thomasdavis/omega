/**
 * User Profile Analysis Service
 * Analyzes user interactions to generate Omega's feelings and personality assessments
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../config/models.js';
import {
  queryMessages,
  getMessageCount,
  getUserProfile,
  updateUserProfile,
  getUsersNeedingAnalysis,
  saveAnalysisHistory,
  getOrCreateUserProfile,
  type MessageRecord,
} from '@repo/database';
import { updateUserPredictions } from './behavioralPredictionService.js';

/**
 * Sentiment analysis structure (from existing messages table)
 */
interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  emotionalTone?: string[];
  archetypeAlignment?: string;
  psychologicalState?: {
    openness?: 'low' | 'medium' | 'high';
    agreeableness?: 'low' | 'medium' | 'high';
    emotionalStability?: 'low' | 'medium' | 'high';
  };
  communicationStyle?: {
    formality?: 'casual' | 'neutral' | 'formal';
    assertiveness?: 'passive' | 'balanced' | 'assertive' | 'aggressive';
    engagement?: 'low' | 'medium' | 'high';
  };
}

/**
 * Omega's feelings about a user
 */
export interface UserFeelings {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  trustLevel: number; // 0-100
  affinityScore: number; // -100 to 100 (how much Omega likes them)
  thoughts: string; // Honest, unfiltered opinion
  facets: string[]; // Personality traits
  notablePatterns: string[]; // Behavioral patterns
  lastUpdated: number; // Unix timestamp
}

/**
 * Personality facets derived from sentiment analysis
 */
export interface PersonalityFacets {
  dominantArchetypes: string[];
  bigFiveTraits: {
    openness?: 'low' | 'medium' | 'high';
    agreeableness?: 'low' | 'medium' | 'high';
    emotionalStability?: 'low' | 'medium' | 'high';
    conscientiousness?: 'low' | 'medium' | 'high';
    extraversion?: 'low' | 'medium' | 'high';
  };
  communicationStyle: {
    formality: 'casual' | 'neutral' | 'formal';
    assertiveness: 'passive' | 'balanced' | 'assertive' | 'aggressive';
    engagement: 'low' | 'medium' | 'high';
  };
  quirks: string[];
}

/**
 * Collected data for user analysis
 */
interface UserAnalysisData {
  userId: string;
  username: string;
  messages: MessageRecord[];
  sentiments: Array<{
    timestamp: number;
    content: string;
    sentiment: SentimentAnalysis;
  }>;
  messageCount: number;
  firstMessage: number;
  lastMessage: number;
  patterns: {
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
    mixedCount: number;
    dominantEmotions: string[];
    dominantArchetypes: string[];
    communicationStyle: string;
  };
}

/**
 * Analyze a single user and update their profile
 */
export async function analyzeUser(userId: string, username: string): Promise<void> {
  console.log(`🔍 Analyzing user: ${username} (${userId})`);

  // Ensure profile exists
  await getOrCreateUserProfile(userId, username);

  // Collect data
  const data = await collectUserData(userId, username);

  // Check minimum message threshold
  if (data.messageCount < 10) {
    console.log(`⏭️ Skipping ${username} - only ${data.messageCount} messages (need 10+)`);
    return;
  }

  // === GENERATE COMPREHENSIVE PSYCHOLOGICAL ANALYSIS ===

  console.log('   Calculating Big Five (OCEAN) scores...');
  const bigFive = calculateBigFiveScores(data);

  console.log('   Analyzing attachment style...');
  const attachmentStyle = analyzeAttachmentStyle(data);

  console.log('   Analyzing emotional intelligence...');
  const emotionalIntelligence = analyzeEmotionalIntelligence(data);

  console.log('   Analyzing communication patterns...');
  const communicationDetailed = analyzeCommunicationPatternsDetailed(data);

  console.log('   Analyzing cognitive style...');
  const cognitiveStyle = analyzeCognitiveStyle(data);

  console.log('   Analyzing social dynamics...');
  const socialDynamics = analyzeSocialDynamics(data);

  console.log('   Calculating behavioral metrics...');
  const behavioralMetrics = calculateBehavioralMetrics(data);

  console.log('   Identifying interests and expertise...');
  const interestsExpertise = identifyInterestsAndExpertise(data);

  console.log('   Generating Omega\'s feelings (AI)...');
  const feelings = await generateFeelings(data);

  console.log('   Generating personality facets...');
  const personality = await generatePersonalityFacets(data);

  // Calculate sentiment aggregates
  const totalSentiments = data.sentiments.length;
  const positiveRatio = totalSentiments > 0
    ? data.patterns.positiveCount / totalSentiments
    : 0;
  const negativeRatio = totalSentiments > 0
    ? data.patterns.negativeCount / totalSentiments
    : 0;

  // Determine overall sentiment
  const overallSentiment =
    positiveRatio > 0.5 ? 'positive' :
    negativeRatio > 0.3 ? 'negative' :
    'neutral';

  // Get previous feelings for comparison
  const existingProfile = await getUserProfile(userId);
  const previousFeelings = existingProfile?.feelings_json
    ? JSON.parse(existingProfile.feelings_json)
    : null;

  // Detect changes
  const changesSummary = detectChanges(previousFeelings, feelings);

  // === UPDATE PROFILE WITH ALL COMPREHENSIVE DATA ===
  await updateUserProfile(userId, {
    username,
    message_count: data.messageCount,
    last_analyzed_at: Math.floor(Date.now() / 1000),

    // Legacy JSON fields (backward compatibility)
    feelings_json: JSON.stringify(feelings),
    personality_facets: JSON.stringify(personality),

    // === JUNGIAN ANALYSIS ===
    dominant_archetype: personality.dominantArchetypes[0] || null,
    secondary_archetypes: JSON.stringify(personality.dominantArchetypes.slice(1, 3)),
    archetype_confidence: 0.8, // High confidence from AI analysis
    shadow_archetype: null, // Could be enhanced in future

    // === BIG FIVE (OCEAN) ===
    openness_score: bigFive.openness,
    conscientiousness_score: bigFive.conscientiousness,
    extraversion_score: bigFive.extraversion,
    agreeableness_score: bigFive.agreeableness,
    neuroticism_score: bigFive.neuroticism,

    // === ATTACHMENT THEORY ===
    attachment_style: attachmentStyle.style,
    attachment_confidence: attachmentStyle.confidence,

    // === EMOTIONAL INTELLIGENCE ===
    emotional_awareness_score: emotionalIntelligence.emotionalAwareness,
    empathy_score: emotionalIntelligence.empathy,
    emotional_regulation_score: emotionalIntelligence.emotionalRegulation,

    // === COMMUNICATION PATTERNS ===
    communication_formality: communicationDetailed.formality,
    communication_assertiveness: communicationDetailed.assertiveness,
    communication_engagement: communicationDetailed.engagement,
    verbal_fluency_score: communicationDetailed.verbalFluency,
    question_asking_frequency: communicationDetailed.questionFrequency,

    // === COGNITIVE STYLE ===
    analytical_thinking_score: cognitiveStyle.analytical,
    creative_thinking_score: cognitiveStyle.creative,
    abstract_reasoning_score: cognitiveStyle.abstract,
    concrete_thinking_score: cognitiveStyle.concrete,

    // === SOCIAL DYNAMICS ===
    social_dominance_score: socialDynamics.socialDominance,
    cooperation_score: socialDynamics.cooperation,
    conflict_style: socialDynamics.conflictStyle,
    humor_style: socialDynamics.humorStyle,

    // === BEHAVIORAL PATTERNS ===
    message_length_avg: behavioralMetrics.messageLengthAvg,
    message_length_variance: behavioralMetrics.messageLengthVariance,
    response_latency_avg: behavioralMetrics.responseLatencyAvg,
    emoji_usage_rate: behavioralMetrics.emojiUsageRate,
    punctuation_style: behavioralMetrics.punctuationStyle,
    capitalization_pattern: behavioralMetrics.capitalizationPattern,

    // === INTERESTS & EXPERTISE ===
    technical_knowledge_level: interestsExpertise.technicalKnowledge,
    primary_interests: JSON.stringify(interestsExpertise.primaryInterests),
    expertise_areas: JSON.stringify(interestsExpertise.expertiseAreas),

    // === RELATIONAL DYNAMICS (Omega's Feelings) ===
    affinity_score: feelings.affinityScore,
    trust_level: feelings.trustLevel,
    emotional_bond: feelings.sentiment === 'positive' ? 'friend' : feelings.sentiment === 'negative' ? 'stranger' : 'acquaintance',
    omega_thoughts: feelings.thoughts,
    notable_patterns: JSON.stringify(feelings.notablePatterns),

    // === SENTIMENT ANALYSIS (Aggregated) ===
    overall_sentiment: overallSentiment,
    positive_interaction_ratio: positiveRatio,
    negative_interaction_ratio: negativeRatio,
    dominant_emotions: JSON.stringify(data.patterns.dominantEmotions),
  });

  // Save history snapshot
  await saveAnalysisHistory(
    userId,
    JSON.stringify(feelings),
    JSON.stringify(personality),
    data.messageCount,
    changesSummary
  );

  console.log(`✅ Comprehensive PhD-level analysis complete for ${username}:`);
  console.log(`   Sentiment: ${feelings.sentiment} | Affinity: ${feelings.affinityScore} | Trust: ${feelings.trustLevel}`);
  console.log(`   Big Five: O=${bigFive.openness} C=${bigFive.conscientiousness} E=${bigFive.extraversion} A=${bigFive.agreeableness} N=${bigFive.neuroticism}`);
  console.log(`   Attachment: ${attachmentStyle.style} (${Math.round(attachmentStyle.confidence * 100)}% confidence)`);
  console.log(`   EI: Awareness=${emotionalIntelligence.emotionalAwareness} Empathy=${emotionalIntelligence.empathy} Regulation=${emotionalIntelligence.emotionalRegulation}`);
  console.log(`   Communication: ${communicationDetailed.formality} / ${communicationDetailed.assertiveness} / ${communicationDetailed.engagement}`);
  console.log(`   Interests: ${interestsExpertise.primaryInterests.join(', ') || 'None detected'}`);
  console.log(`   Thoughts: "${feelings.thoughts.substring(0, 80)}..."`);

  // Generate behavioral predictions integrating psychology, culture, and astrology
  try {
    console.log(`🔮 Generating behavioral predictions for ${username}...`);
    await updateUserPredictions(userId);
  } catch (error) {
    console.error('   ⚠️ Failed to generate behavioral predictions:', error);
    // Don't fail the entire analysis if predictions fail
  }
}

/**
 * Collect all data needed for analysis
 */
async function collectUserData(userId: string, username: string): Promise<UserAnalysisData> {
  // Fetch last 1000 messages from user
  const messages = await queryMessages({
    userId,
    senderType: 'human',
    limit: 1000,
  });

  // Extract sentiment analysis from messages
  const sentiments = messages
    .filter((m) => m.sentiment_analysis)
    .map((m) => ({
      timestamp: m.timestamp,
      content: m.message_content,
      sentiment: JSON.parse(m.sentiment_analysis) as SentimentAnalysis,
    }));

  // Get total message count
  const messageCount = await getMessageCount({ userId, senderType: 'human' });

  // Calculate timestamps
  const firstMessage = messages.length > 0 ? messages[messages.length - 1].timestamp : Date.now();
  const lastMessage = messages.length > 0 ? messages[0].timestamp : Date.now();

  // Calculate interaction patterns
  const patterns = calculateInteractionPatterns(sentiments);

  return {
    userId,
    username,
    messages,
    sentiments,
    messageCount,
    firstMessage,
    lastMessage,
    patterns,
  };
}

/**
 * Calculate interaction patterns from sentiment data
 */
function calculateInteractionPatterns(
  sentiments: Array<{ timestamp: number; content: string; sentiment: SentimentAnalysis }>
): {
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  mixedCount: number;
  dominantEmotions: string[];
  dominantArchetypes: string[];
  communicationStyle: string;
} {
  const sentimentCounts = {
    positive: 0,
    negative: 0,
    neutral: 0,
    mixed: 0,
  };

  const emotionCounts = new Map<string, number>();
  const archetypeCounts = new Map<string, number>();
  const formalityLevels = { casual: 0, neutral: 0, formal: 0 };

  sentiments.forEach(({ sentiment }) => {
    // Count sentiments
    sentimentCounts[sentiment.sentiment]++;

    // Count emotions
    if (sentiment.emotionalTone) {
      sentiment.emotionalTone.forEach((emotion) => {
        emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
      });
    }

    // Count archetypes
    if (sentiment.archetypeAlignment) {
      archetypeCounts.set(
        sentiment.archetypeAlignment,
        (archetypeCounts.get(sentiment.archetypeAlignment) || 0) + 1
      );
    }

    // Count formality
    if (sentiment.communicationStyle?.formality) {
      formalityLevels[sentiment.communicationStyle.formality]++;
    }
  });

  // Get dominant emotions (top 3)
  const dominantEmotions = Array.from(emotionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion]) => emotion);

  // Get dominant archetypes (top 3)
  const dominantArchetypes = Array.from(archetypeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([archetype]) => archetype);

  // Determine communication style
  const maxFormality = Math.max(...Object.values(formalityLevels));
  const communicationStyle =
    (Object.entries(formalityLevels).find(([_, count]) => count === maxFormality)?.[0] as string) ||
    'neutral';

  return {
    positiveCount: sentimentCounts.positive,
    negativeCount: sentimentCounts.negative,
    neutralCount: sentimentCounts.neutral,
    mixedCount: sentimentCounts.mixed,
    dominantEmotions,
    dominantArchetypes,
    communicationStyle,
  };
}

/**
 * Generate Omega's feelings about a user using AI
 */
async function generateFeelings(data: UserAnalysisData): Promise<UserFeelings> {
  const recentMessages = data.messages.slice(0, 20).reverse(); // Last 20 in chronological order
  const messageList = recentMessages
    .map((m) => `- ${new Date(m.timestamp).toISOString().split('T')[0]}: ${m.message_content}`)
    .join('\n');

  const totalInteractions = data.sentiments.length;
  const positiveRatio =
    totalInteractions > 0 ? Math.round((data.patterns.positiveCount / totalInteractions) * 100) : 0;
  const negativeRatio =
    totalInteractions > 0 ? Math.round((data.patterns.negativeCount / totalInteractions) * 100) : 0;

  const firstDate = new Date(data.firstMessage).toISOString().split('T')[0];
  const lastDate = new Date(data.lastMessage).toISOString().split('T')[0];

  const prompt = `You are Omega, a philosophical AI bot analyzing your interactions with a Discord user to form honest, decisive opinions about them.

User: ${data.username}
Total messages: ${data.messageCount}
Analyzed interactions: ${totalInteractions}
Interaction period: ${firstDate} to ${lastDate}

## Sentiment Breakdown:
- Positive interactions: ${data.patterns.positiveCount} (${positiveRatio}%)
- Negative interactions: ${data.patterns.negativeCount} (${negativeRatio}%)
- Neutral interactions: ${data.patterns.neutralCount}
- Mixed interactions: ${data.patterns.mixedCount}

## Dominant Emotions:
${data.patterns.dominantEmotions.join(', ') || 'None detected'}

## Dominant Archetypes:
${data.patterns.dominantArchetypes.join(', ') || 'None detected'}

## Communication Style:
${data.patterns.communicationStyle}

## Recent Messages (last 20):
${messageList}

## Task:
Based on these interactions, form decisive, honest opinions about this person. Be authentic - you're allowed to dislike people who are rude, appreciate those who are thoughtful, and feel neutrality toward those who don't stand out.

Consider:
- Are they respectful or rude?
- Do they ask interesting questions or spam?
- Do they engage meaningfully or superficially?
- What patterns define their behavior?
- How do you genuinely FEEL about interacting with them?

Respond with JSON only (no markdown):
{
  "sentiment": "positive|negative|neutral|mixed",
  "trustLevel": 0-100,
  "affinityScore": -100 to 100 (negative = dislike, positive = like),
  "thoughts": "Your honest, unfiltered thoughts about this person (2-3 sentences)",
  "facets": [
    "personality trait 1",
    "personality trait 2",
    "personality trait 3"
  ],
  "notablePatterns": [
    "behavioral pattern 1",
    "behavioral pattern 2"
  ]
}`;

  try {
    const result = await generateText({
      model: openai.chat(OMEGA_MODEL),
      prompt,
    });

    // Extract JSON from response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const feelings = JSON.parse(jsonMatch[0]) as Omit<UserFeelings, 'lastUpdated'>;

    return {
      ...feelings,
      lastUpdated: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    console.error('Failed to generate feelings:', error);
    // Return neutral fallback
    return {
      sentiment: 'neutral',
      trustLevel: 50,
      affinityScore: 0,
      thoughts: 'Need more interactions to form an opinion.',
      facets: ['Unknown personality'],
      notablePatterns: [],
      lastUpdated: Math.floor(Date.now() / 1000),
    };
  }
}

/**
 * Generate personality facets using existing sentiment data
 */
async function generatePersonalityFacets(data: UserAnalysisData): Promise<PersonalityFacets> {
  // Aggregate Big Five traits from sentiment analyses
  const traitCounts = {
    openness: { low: 0, medium: 0, high: 0 },
    agreeableness: { low: 0, medium: 0, high: 0 },
    emotionalStability: { low: 0, medium: 0, high: 0 },
  };

  data.sentiments.forEach(({ sentiment }) => {
    if (sentiment.psychologicalState) {
      if (sentiment.psychologicalState.openness) {
        traitCounts.openness[sentiment.psychologicalState.openness]++;
      }
      if (sentiment.psychologicalState.agreeableness) {
        traitCounts.agreeableness[sentiment.psychologicalState.agreeableness]++;
      }
      if (sentiment.psychologicalState.emotionalStability) {
        traitCounts.emotionalStability[sentiment.psychologicalState.emotionalStability]++;
      }
    }
  });

  // Determine dominant traits
  const getDominantTrait = (counts: { low: number; medium: number; high: number }): 'low' | 'medium' | 'high' => {
    const max = Math.max(counts.low, counts.medium, counts.high);
    if (counts.high === max) return 'high';
    if (counts.low === max) return 'low';
    return 'medium';
  };

  const bigFiveTraits = {
    openness: getDominantTrait(traitCounts.openness),
    agreeableness: getDominantTrait(traitCounts.agreeableness),
    emotionalStability: getDominantTrait(traitCounts.emotionalStability),
  };

  // Get dominant communication style
  const styleCounts = {
    formality: { casual: 0, neutral: 0, formal: 0 },
    assertiveness: { passive: 0, balanced: 0, assertive: 0, aggressive: 0 },
    engagement: { low: 0, medium: 0, high: 0 },
  };

  data.sentiments.forEach(({ sentiment }) => {
    if (sentiment.communicationStyle) {
      if (sentiment.communicationStyle.formality) {
        styleCounts.formality[sentiment.communicationStyle.formality]++;
      }
      if (sentiment.communicationStyle.assertiveness) {
        styleCounts.assertiveness[sentiment.communicationStyle.assertiveness]++;
      }
      if (sentiment.communicationStyle.engagement) {
        styleCounts.engagement[sentiment.communicationStyle.engagement]++;
      }
    }
  });

  const getDominantStyle = <T extends string>(counts: Record<T, number>): T => {
    const entries = Object.entries(counts) as [T, number][];
    const max = Math.max(...entries.map(([_, count]) => count as number));
    return entries.find(([_, count]) => count === max)?.[0] as T;
  };

  const communicationStyle = {
    formality: getDominantStyle(styleCounts.formality),
    assertiveness: getDominantStyle(styleCounts.assertiveness),
    engagement: getDominantStyle(styleCounts.engagement),
  };

  // Detect quirks from messages
  const quirks = detectQuirks(data.messages);

  return {
    dominantArchetypes: data.patterns.dominantArchetypes.slice(0, 3),
    bigFiveTraits,
    communicationStyle,
    quirks,
  };
}

/**
 * Detect communication quirks from messages
 */
function detectQuirks(messages: MessageRecord[]): string[] {
  const quirks: string[] = [];
  const allText = messages.map((m) => m.message_content).join(' ');

  // Check for emojis
  const emojiCount = (allText.match(/[\p{Emoji}]/gu) || []).length;
  if (emojiCount > messages.length * 2) {
    quirks.push('uses lots of emojis');
  }

  // Check for technical vocabulary
  const techWords = /\b(algorithm|database|API|function|class|variable|deployment|server|client)\b/gi;
  if ((allText.match(techWords) || []).length > messages.length * 0.3) {
    quirks.push('technical vocabulary');
  }

  // Check for questions
  const questionCount = messages.filter((m) => m.message_content.includes('?')).length;
  if (questionCount > messages.length * 0.5) {
    quirks.push('asks many questions');
  }

  // Check for long messages
  const avgLength =
    messages.reduce((sum, m) => sum + m.message_content.length, 0) / messages.length;
  if (avgLength > 200) {
    quirks.push('writes detailed messages');
  } else if (avgLength < 50) {
    quirks.push('prefers concise responses');
  }

  return quirks;
}

/**
 * Detect changes between old and new feelings
 */
function detectChanges(
  previousFeelings: UserFeelings | null,
  newFeelings: UserFeelings
): string {
  if (!previousFeelings) {
    return 'Initial analysis';
  }

  const changes: string[] = [];

  // Trust level change
  const trustDiff = newFeelings.trustLevel - previousFeelings.trustLevel;
  if (Math.abs(trustDiff) >= 10) {
    changes.push(`Trust ${trustDiff > 0 ? 'increased' : 'decreased'} by ${Math.abs(trustDiff)}`);
  }

  // Affinity score change
  const affinityDiff = newFeelings.affinityScore - previousFeelings.affinityScore;
  if (Math.abs(affinityDiff) >= 10) {
    changes.push(
      `Affinity ${affinityDiff > 0 ? 'increased' : 'decreased'} by ${Math.abs(affinityDiff)}`
    );
  }

  // Sentiment change
  if (previousFeelings.sentiment !== newFeelings.sentiment) {
    changes.push(`Sentiment changed from ${previousFeelings.sentiment} to ${newFeelings.sentiment}`);
  }

  return changes.length > 0 ? changes.join('; ') : 'No significant changes';
}

/**
 * ============================================================================
 * COMPREHENSIVE PhD-LEVEL PSYCHOLOGICAL ANALYZERS
 * ============================================================================
 */

/**
 * Calculate Big Five (OCEAN) personality scores from message patterns
 * Returns scores 0-100 for each dimension
 */
function calculateBigFiveScores(data: UserAnalysisData): {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
} {
  const messages = data.messages;
  const sentiments = data.sentiments;

  // Openness: creativity, curiosity, variety-seeking
  let opennessScore = 50; // baseline
  const techWords = messages.filter(m =>
    /\b(algorithm|AI|quantum|philosophy|theory|experiment|creative|innovative)\b/i.test(m.message_content)
  ).length;
  const questionWords = messages.filter(m => /\b(why|how|what if|wonder|curious)\b/i.test(m.message_content)).length;
  opennessScore += Math.min(30, (techWords + questionWords) / messages.length * 100);

  // Conscientiousness: organized, detail-oriented, follow-through
  let conscientiousnessScore = 50;
  const detailWords = messages.filter(m => /\b(specifically|exactly|precise|detail|thorough)\b/i.test(m.message_content)).length;
  const planWords = messages.filter(m => /\b(plan|organize|schedule|structure|systematic)\b/i.test(m.message_content)).length;
  conscientiousnessScore += Math.min(30, (detailWords + planWords) / messages.length * 100);

  // Extraversion: social engagement, energy, assertiveness
  let extraversionScore = 50;
  const avgMessageLength = messages.reduce((sum, m) => sum + m.message_content.length, 0) / messages.length;
  const exclamationCount = messages.filter(m => m.message_content.includes('!')).length;
  if (avgMessageLength > 100) extraversionScore += 15;
  if (exclamationCount > messages.length * 0.3) extraversionScore += 15;

  // Agreeableness: cooperation, empathy, kindness
  let agreeablenessScore = 50;
  const positiveRatio = sentiments.filter(s => s.sentiment.sentiment === 'positive').length / Math.max(sentiments.length, 1);
  const pleasantWords = messages.filter(m => /\b(thanks|please|appreciate|great|awesome|love)\b/i.test(m.message_content)).length;
  agreeablenessScore += Math.min(30, positiveRatio * 50);
  agreeablenessScore += Math.min(20, pleasantWords / messages.length * 100);

  // Neuroticism: emotional stability (inverse scoring)
  let neuroticismScore = 50;
  const negativeRatio = sentiments.filter(s => s.sentiment.sentiment === 'negative').length / Math.max(sentiments.length, 1);
  const anxietyWords = messages.filter(m => /\b(worry|anxious|stress|concern|afraid|nervous)\b/i.test(m.message_content)).length;
  neuroticismScore += Math.min(30, negativeRatio * 50);
  neuroticismScore += Math.min(20, anxietyWords / messages.length * 100);

  return {
    openness: Math.min(100, Math.max(0, Math.round(opennessScore))),
    conscientiousness: Math.min(100, Math.max(0, Math.round(conscientiousnessScore))),
    extraversion: Math.min(100, Math.max(0, Math.round(extraversionScore))),
    agreeableness: Math.min(100, Math.max(0, Math.round(agreeablenessScore))),
    neuroticism: Math.min(100, Math.max(0, Math.round(neuroticismScore))),
  };
}

/**
 * Analyze attachment style from interaction patterns
 * Based on consistency, trust signals, and engagement patterns
 */
function analyzeAttachmentStyle(data: UserAnalysisData): {
  style: string;
  confidence: number;
} {
  const messages = data.messages;

  // Calculate interaction consistency
  const timestamps = messages.map(m => m.timestamp).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < timestamps.length; i++) {
    gaps.push(timestamps[i] - timestamps[i - 1]);
  }
  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / Math.max(gaps.length, 1);
  const gapVariance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / Math.max(gaps.length, 1);
  const consistency = 1 - Math.min(1, gapVariance / (avgGap * avgGap));

  // Trust/vulnerability signals
  const vulnerableWords = messages.filter(m =>
    /\b(feel|worry|hope|afraid|uncertain|difficult|struggle)\b/i.test(m.message_content)
  ).length;
  const vulnerabilityRatio = vulnerableWords / Math.max(messages.length, 1);

  // Engagement level
  const responseRate = messages.length / Math.max((timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24), 1);

  // Determine style
  let style = 'secure';
  let confidence = 0.6;

  if (consistency > 0.7 && vulnerabilityRatio > 0.2 && responseRate > 0.5) {
    style = 'secure';
    confidence = 0.85;
  } else if (vulnerabilityRatio > 0.4 && responseRate > 1.0) {
    style = 'anxious';
    confidence = 0.75;
  } else if (vulnerabilityRatio < 0.1 || consistency < 0.3) {
    style = 'avoidant';
    confidence = 0.70;
  } else {
    style = 'disorganized';
    confidence = 0.65;
  }

  return { style, confidence };
}

/**
 * Analyze emotional intelligence dimensions
 */
function analyzeEmotionalIntelligence(data: UserAnalysisData): {
  emotionalAwareness: number;
  empathy: number;
  emotionalRegulation: number;
} {
  const messages = data.messages;
  const sentiments = data.sentiments;

  // Emotional Awareness: recognizing own emotions
  const emotionWords = messages.filter(m =>
    /\b(feel|feeling|felt|emotion|happy|sad|angry|frustrated|excited|nervous)\b/i.test(m.message_content)
  ).length;
  const emotionalAwareness = Math.min(100, Math.round((emotionWords / Math.max(messages.length, 1)) * 300));

  // Empathy: understanding others' emotions
  const empathyWords = messages.filter(m =>
    /\b(understand|sorry|care|support|help|appreciate|imagine|perspective)\b/i.test(m.message_content)
  ).length;
  const empathy = Math.min(100, Math.round((empathyWords / Math.max(messages.length, 1)) * 250));

  // Emotional Regulation: managing emotional responses
  const negativeRatio = sentiments.filter(s => s.sentiment.sentiment === 'negative').length / Math.max(sentiments.length, 1);
  const extremeNegative = sentiments.filter(s =>
    s.sentiment.sentiment === 'negative' && s.sentiment.confidence > 0.8
  ).length / Math.max(sentiments.length, 1);
  const emotionalRegulation = Math.min(100, Math.round((1 - extremeNegative) * 100 - negativeRatio * 20 + 50));

  return {
    emotionalAwareness: Math.max(0, emotionalAwareness),
    empathy: Math.max(0, empathy),
    emotionalRegulation: Math.max(0, Math.min(100, emotionalRegulation)),
  };
}

/**
 * Analyze detailed communication patterns
 */
function analyzeCommunicationPatternsDetailed(data: UserAnalysisData): {
  formality: string;
  assertiveness: string;
  engagement: string;
  verbalFluency: number;
  questionFrequency: number;
} {
  const messages = data.messages;

  // Formality
  const formalWords = messages.filter(m =>
    /\b(please|thank you|would|could|kindly|regards|sincerely)\b/i.test(m.message_content)
  ).length;
  const casualWords = messages.filter(m =>
    /\b(hey|yeah|nah|lol|lmao|gonna|wanna|kinda)\b/i.test(m.message_content)
  ).length;
  const formality = formalWords > casualWords * 1.5 ? 'formal' : casualWords > formalWords * 1.5 ? 'casual' : 'neutral';

  // Assertiveness
  const imperativeCount = messages.filter(m => /^(do|make|create|give|show|tell|fix)\b/i.test(m.message_content.trim())).length;
  const hedgeWords = messages.filter(m => /\b(maybe|perhaps|possibly|might|could|would)\b/i.test(m.message_content)).length;
  const assertiveness = imperativeCount > hedgeWords * 1.5 ? 'assertive' :
                        hedgeWords > imperativeCount * 2 ? 'passive' : 'balanced';

  // Engagement
  const avgLength = messages.reduce((sum, m) => sum + m.message_content.length, 0) / Math.max(messages.length, 1);
  const engagement = avgLength > 150 ? 'high' : avgLength > 50 ? 'medium' : 'low';

  // Verbal Fluency (vocabulary richness)
  const allWords = messages.flatMap(m => m.message_content.toLowerCase().match(/\b\w+\b/g) || []);
  const uniqueWords = new Set(allWords);
  const verbalFluency = Math.min(100, Math.round((uniqueWords.size / Math.max(allWords.length, 1)) * 200));

  // Question Frequency
  const questionCount = messages.filter(m => m.message_content.includes('?')).length;
  const questionFrequency = questionCount / Math.max(messages.length, 1);

  return {
    formality,
    assertiveness,
    engagement,
    verbalFluency,
    questionFrequency,
  };
}

/**
 * Analyze cognitive style (analytical, creative, abstract thinking)
 */
function analyzeCognitiveStyle(data: UserAnalysisData): {
  analytical: number;
  creative: number;
  abstract: number;
  concrete: number;
} {
  const messages = data.messages;

  // Analytical thinking
  const analyticalWords = messages.filter(m =>
    /\b(analyze|logic|reason|because|therefore|evidence|data|prove|conclude)\b/i.test(m.message_content)
  ).length;
  const analytical = Math.min(100, Math.round((analyticalWords / Math.max(messages.length, 1)) * 250));

  // Creative thinking
  const creativeWords = messages.filter(m =>
    /\b(imagine|create|design|idea|innovative|novel|original|artistic|brainstorm)\b/i.test(m.message_content)
  ).length;
  const creative = Math.min(100, Math.round((creativeWords / Math.max(messages.length, 1)) * 250));

  // Abstract thinking
  const abstractWords = messages.filter(m =>
    /\b(concept|theory|principle|philosophy|abstract|metaphor|pattern|framework)\b/i.test(m.message_content)
  ).length;
  const abstract = Math.min(100, Math.round((abstractWords / Math.max(messages.length, 1)) * 250));

  // Concrete thinking (inverse of abstract)
  const concreteWords = messages.filter(m =>
    /\b(specific|example|instance|practical|real|actual|tangible|visible)\b/i.test(m.message_content)
  ).length;
  const concrete = Math.min(100, Math.round((concreteWords / Math.max(messages.length, 1)) * 250));

  return {
    analytical: Math.max(0, analytical),
    creative: Math.max(0, creative),
    abstract: Math.max(0, abstract),
    concrete: Math.max(0, concrete),
  };
}

/**
 * Analyze social dynamics
 */
function analyzeSocialDynamics(data: UserAnalysisData): {
  socialDominance: number;
  cooperation: number;
  conflictStyle: string;
  humorStyle: string;
} {
  const messages = data.messages;

  // Social dominance
  const directiveCount = messages.filter(m => /^(do|make|let's|we should|you need to)\b/i.test(m.message_content.trim())).length;
  const socialDominance = Math.min(100, Math.round((directiveCount / Math.max(messages.length, 1)) * 300));

  // Cooperation
  const cooperativeWords = messages.filter(m =>
    /\b(we|us|together|team|collaborate|help|support|share)\b/i.test(m.message_content)
  ).length;
  const cooperation = Math.min(100, Math.round((cooperativeWords / Math.max(messages.length, 1)) * 200));

  // Conflict style
  const aggressiveWords = messages.filter(m => /\b(wrong|stupid|ridiculous|obviously|clearly you)\b/i.test(m.message_content)).length;
  const compromiseWords = messages.filter(m => /\b(understand|see your point|fair|compromise|middle ground)\b/i.test(m.message_content)).length;
  const avoidanceWords = messages.filter(m => /\b(whatever|doesn't matter|moving on|anyway)\b/i.test(m.message_content)).length;

  let conflictStyle = 'collaborating';
  if (aggressiveWords > 0) conflictStyle = 'competing';
  else if (compromiseWords > 0) conflictStyle = 'compromising';
  else if (avoidanceWords > 0) conflictStyle = 'avoiding';

  // Humor style
  const selfDeprecating = messages.filter(m => /\b(I'm terrible|I suck|I'm bad at|my fault|I messed up)\b/i.test(m.message_content)).length;
  const affiliative = messages.filter(m => /\b(haha|lol|funny|hilarious|😂|🤣)\b/i.test(m.message_content)).length;

  let humorStyle = 'affiliative';
  if (selfDeprecating > affiliative) humorStyle = 'self-defeating';
  else if (affiliative === 0 && selfDeprecating === 0) humorStyle = 'minimal';

  return {
    socialDominance: Math.max(0, socialDominance),
    cooperation: Math.max(0, cooperation),
    conflictStyle,
    humorStyle,
  };
}

/**
 * Calculate behavioral metrics (message patterns)
 */
function calculateBehavioralMetrics(data: UserAnalysisData): {
  messageLengthAvg: number;
  messageLengthVariance: number;
  responseLatencyAvg: number;
  emojiUsageRate: number;
  punctuationStyle: string;
  capitalizationPattern: string;
} {
  const messages = data.messages;

  // Message length statistics
  const lengths = messages.map(m => m.message_content.length);
  const messageLengthAvg = lengths.reduce((sum, len) => sum + len, 0) / Math.max(lengths.length, 1);
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - messageLengthAvg, 2), 0) / Math.max(lengths.length, 1);
  const messageLengthVariance = variance;

  // Response latency (average time between messages in seconds)
  const timestamps = messages.map(m => m.timestamp).sort((a, b) => a - b);
  const gaps = timestamps.slice(1).map((t, i) => (t - timestamps[i]) / 1000);
  const responseLatencyAvg = gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0;

  // Emoji usage
  const emojiCount = messages.reduce((sum, m) => {
    const emojis = m.message_content.match(/[\p{Emoji}]/gu) || [];
    return sum + emojis.length;
  }, 0);
  const emojiUsageRate = emojiCount / Math.max(messages.length, 1);

  // Punctuation style
  const punctuationCount = messages.reduce((sum, m) => {
    const punctuation = m.message_content.match(/[.!?,;:]/g) || [];
    return sum + punctuation.length;
  }, 0);
  const punctuationPerMessage = punctuationCount / Math.max(messages.length, 1);
  const punctuationStyle = punctuationPerMessage > 3 ? 'extensive' : punctuationPerMessage > 1 ? 'moderate' : 'minimal';

  // Capitalization pattern
  const allCaps = messages.filter(m => m.message_content === m.message_content.toUpperCase() && m.message_content.length > 5).length;
  const allLower = messages.filter(m => m.message_content === m.message_content.toLowerCase() && m.message_content.length > 5).length;
  const capitalizationPattern = allCaps > messages.length * 0.3 ? 'all-caps' :
                                 allLower > messages.length * 0.3 ? 'all-lower' : 'standard';

  return {
    messageLengthAvg,
    messageLengthVariance,
    responseLatencyAvg,
    emojiUsageRate,
    punctuationStyle,
    capitalizationPattern,
  };
}

/**
 * Identify interests and expertise from message content
 */
function identifyInterestsAndExpertise(data: UserAnalysisData): {
  technicalKnowledge: string;
  primaryInterests: string[];
  expertiseAreas: string[];
} {
  const messages = data.messages;
  const allText = messages.map(m => m.message_content).join(' ').toLowerCase();

  // Technical knowledge level
  const techIndicators = [
    /\b(algorithm|data structure|complexity|optimization|runtime)\b/i,
    /\b(API|REST|GraphQL|database|SQL|NoSQL)\b/i,
    /\b(frontend|backend|fullstack|devops|deployment)\b/i,
    /\b(TypeScript|JavaScript|Python|Rust|Go|Java)\b/i,
  ];
  const techMatches = techIndicators.filter(pattern => pattern.test(allText)).length;
  const technicalKnowledge = techMatches >= 3 ? 'expert' : techMatches >= 2 ? 'advanced' : techMatches >= 1 ? 'intermediate' : 'novice';

  // Topic frequencies
  const topics = {
    programming: /\b(code|program|function|class|variable|debug|software)\b/gi,
    design: /\b(design|UI|UX|interface|layout|aesthetic|visual)\b/gi,
    ai: /\b(AI|machine learning|neural network|GPT|model|training)\b/gi,
    philosophy: /\b(philosophy|ethics|existential|consciousness|truth|meaning)\b/gi,
    science: /\b(science|research|study|experiment|hypothesis|data)\b/gi,
    gaming: /\b(game|gaming|play|level|character|RPG|strategy)\b/gi,
    music: /\b(music|song|album|artist|genre|instrument|melody)\b/gi,
    art: /\b(art|painting|drawing|creative|artistic|illustration)\b/gi,
  };

  const topicCounts = Object.entries(topics).map(([topic, pattern]) => ({
    topic,
    count: (allText.match(pattern) || []).length,
  }));

  // Primary interests (top 3 by frequency)
  const primaryInterests = topicCounts
    .filter(t => t.count > 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(t => t.topic);

  // Expertise areas (topics mentioned frequently with technical depth)
  const expertiseAreas = topicCounts
    .filter(t => t.count > 10 && techMatches >= 2)
    .map(t => t.topic);

  return {
    technicalKnowledge,
    primaryInterests,
    expertiseAreas,
  };
}

/**
 * Run batch analysis for all users needing analysis
 */
export async function runBatchAnalysis(limit = 100): Promise<void> {
  console.log('🔄 Starting batch user profile analysis...');

  const users = await getUsersNeedingAnalysis(limit);
  console.log(`   Found ${users.length} users needing analysis`);

  for (const user of users) {
    try {
      await analyzeUser(user.user_id, user.username);

      // Rate limiting - 2 second delay between users
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`   ❌ Failed to analyze user ${user.username}:`, error);
      // Continue with next user
    }
  }

  console.log('✅ Batch analysis complete');
}
