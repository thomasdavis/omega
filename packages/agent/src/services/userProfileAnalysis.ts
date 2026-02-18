/**
 * User Profile Analysis Service
 * Analyzes user interactions to generate Omega's feelings and personality assessments
 */

import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
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

// =============================================================================
// ANALYSIS CONFIGURATION — Named constants replacing magic numbers
// =============================================================================

/** Model used for profile analysis — GPT-5 for deeper psychological insight */
const PROFILE_ANALYSIS_MODEL = 'gpt-5';

const ANALYSIS_CONFIG = {
  /** Minimum messages required before analysis */
  MIN_MESSAGE_THRESHOLD: 10,
  /** Max messages to fetch for analysis */
  MAX_MESSAGES_TO_FETCH: 1000,
  /** Number of recent messages to show AI */
  RECENT_MESSAGES_FOR_AI: 20,
  /** Delay between batch analysis users (ms) */
  BATCH_DELAY_MS: 2000,
  /** Score baseline for Big Five traits */
  BIG_FIVE_BASELINE: 50,
  /** Max bonus from word frequency for Big Five */
  BIG_FIVE_MAX_WORD_BONUS: 30,
  /** Max bonus from sentiment ratio */
  BIG_FIVE_MAX_RATIO_BONUS: 30,
  /** Max bonus from secondary indicators */
  BIG_FIVE_MAX_SECONDARY_BONUS: 20,
  /** Multiplier for emotional awareness calculation */
  EI_AWARENESS_MULTIPLIER: 300,
  /** Multiplier for empathy calculation */
  EI_EMPATHY_MULTIPLIER: 250,
  /** Multiplier for cognitive style calculations */
  COGNITIVE_MULTIPLIER: 250,
  /** Multiplier for social dominance calculation */
  SOCIAL_DOMINANCE_MULTIPLIER: 300,
  /** Multiplier for cooperation calculation */
  COOPERATION_MULTIPLIER: 200,
  /** Multiplier for verbal fluency calculation */
  VERBAL_FLUENCY_MULTIPLIER: 200,
  /** Score ceiling */
  MAX_SCORE: 100,
  /** Score floor */
  MIN_SCORE: 0,
  /** Threshold for "lots of emojis" quirk */
  EMOJI_QUIRK_THRESHOLD: 2,
  /** Threshold for "asks many questions" quirk */
  QUESTION_QUIRK_THRESHOLD: 0.5,
  /** Threshold for "detailed messages" quirk */
  LONG_MESSAGE_THRESHOLD: 200,
  /** Threshold for "concise responses" quirk */
  SHORT_MESSAGE_THRESHOLD: 50,
  /** Threshold for tech vocabulary quirk */
  TECH_VOCAB_QUIRK_THRESHOLD: 0.3,
  /** Formality ratio threshold */
  FORMALITY_RATIO: 1.5,
  /** Assertiveness ratio threshold */
  ASSERTIVENESS_RATIO: 1.5,
  /** High engagement message length */
  HIGH_ENGAGEMENT_LENGTH: 150,
  /** Medium engagement message length */
  MEDIUM_ENGAGEMENT_LENGTH: 50,
  /** Max thoughts length for AI prompt */
  MAX_THOUGHTS_LENGTH: 300,
} as const;

// =============================================================================
// MODULE-LEVEL COMPILED REGEX PATTERNS — Expanded word lists (~25 words each)
// =============================================================================

// --- Big Five (OCEAN) ---
const RE_OPENNESS = /\b(algorithm|AI|quantum|philosophy|theory|experiment|creative|innovative|curious|novel|imaginative|unconventional|aesthetic|explore|discover|paradigm|epiphany|wonder|speculate|hypothesize|abstract|conceptual|visionary|eclectic|unorthodox)\b/i;
const RE_OPENNESS_QUESTIONS = /\b(why|how|what if|wonder|curious|imagine|suppose|hypothetically|theoretically|ponder)\b/i;
const RE_CONSCIENTIOUSNESS = /\b(specifically|exactly|precise|detail|thorough|disciplined|responsible|methodical|deadline|priority|efficient|diligent|punctual|systematic|organize|schedule|structure|plan|meticulous|rigorous|orderly|careful|deliberate|accountable|consistent)\b/i;
const RE_AGREEABLENESS = /\b(thanks|please|appreciate|great|awesome|love|kind|generous|supportive|cooperative|considerate|gentle|patient|helpful|compassionate|grateful|wonderful|thoughtful|empathetic|warm|caring|understanding|respectful|harmonious|courteous)\b/i;
const RE_NEUROTICISM = /\b(worry|anxious|stress|concern|afraid|nervous|overwhelmed|panic|insecure|frustrated|tense|dread|spiral|burnout|fearful|restless|uneasy|agitated|distressed|apprehensive|irritable|vulnerable|helpless|hopeless|melancholy)\b/i;

// --- Communication Style ---
const RE_FORMAL = /\b(please|thank you|would|could|kindly|regards|sincerely|respectfully|furthermore|therefore|nevertheless|accordingly|moreover|hence|pursuant|whereas|subsequently)\b/i;
const RE_CASUAL = /\b(hey|yeah|nah|lol|lmao|gonna|wanna|kinda|bruh|fr|ngl|imo|tbh|smh|lowkey|highkey|yep|based|cope|vibe|slay|yeet|dope|chill|lit)\b/i;
const RE_IMPERATIVE = /^(do|make|create|give|show|tell|fix|run|build|set|add|remove|delete|update|change)\b/i;
const RE_HEDGE = /\b(maybe|perhaps|possibly|might|could|would|I think|I guess|sort of|kind of|somewhat|arguably|allegedly|presumably|tentatively)\b/i;

// --- Cognitive Style ---
const RE_ANALYTICAL = /\b(analyze|logic|reason|because|therefore|evidence|data|prove|conclude|deduce|infer|correlate|causation|systematic|methodology|empirical|quantify|evaluate|assess|metrics)\b/i;
const RE_CREATIVE = /\b(imagine|create|design|idea|innovative|novel|original|artistic|brainstorm|inspire|visionary|inventive|craft|compose|envision|conceptualize|reimagine|prototype|iterate|aesthetic)\b/i;
const RE_ABSTRACT = /\b(concept|theory|principle|philosophy|abstract|metaphor|pattern|framework|paradigm|ontology|epistemology|dialectic|axiom|theorem|archetype|essence|phenomenology|heuristic|taxonomy|schema)\b/i;
const RE_CONCRETE = /\b(specific|example|instance|practical|real|actual|tangible|visible|measurable|demo|hands-on|implementation|step-by-step|literal|physical|concrete|factual|explicit|verifiable|observable)\b/i;

// --- Social Dynamics ---
const RE_DIRECTIVE = /^(do|make|let's|we should|you need to|I think we should|we must|everyone should|listen)\b/i;
const RE_COOPERATIVE = /\b(we|us|together|team|collaborate|help|support|share|contribute|partner|collective|synergy|mutual|joint|communal|allied|united|coordinate)\b/i;
const RE_AGGRESSIVE = /\b(wrong|stupid|ridiculous|obviously|clearly you|idiot|nonsense|pathetic|incompetent|absurd|terrible|useless|garbage|worst|moron)\b/i;
const RE_COMPROMISE = /\b(understand|see your point|fair|compromise|middle ground|agree to disagree|valid point|I see where|both sides|reasonable)\b/i;
const RE_AVOIDANCE = /\b(whatever|doesn't matter|moving on|anyway|never mind|forget it|drop it|let's not|not worth|who cares)\b/i;
const RE_SELF_DEPRECATING = /\b(I'm terrible|I suck|I'm bad at|my fault|I messed up|I'm dumb|I'm an idiot|my bad|sorry I'm|I'm the worst)\b/i;
const RE_AFFILIATIVE_HUMOR = /\b(haha|lol|funny|hilarious|😂|🤣|rofl|lmfao|dead|dying|cracking up|comedy|joke)\b/i;

// --- Technical / Interests ---
const RE_TECH_VOCAB = /\b(algorithm|database|API|function|class|variable|deployment|server|client|Docker|Kubernetes|CI\/CD|pipeline|refactor|PR|deploy|endpoint|microservice|frontend|backend|fullstack|devops|runtime|optimization)\b/gi;
const RE_EMPATHY_PHRASES = /\b(I hear you|that's rough|must be hard|totally get it|I understand|sorry to hear|that sucks|I feel you|I'm here for you|you're not alone|stay strong|sending love|take care|been there|I get that)\b/i;

// --- Emotional Intelligence ---
const RE_EMOTION_WORDS = /\b(feel|feeling|felt|emotion|happy|sad|angry|frustrated|excited|nervous|anxious|delighted|devastated|grateful|resentful|hopeful|disappointed|proud|ashamed|jealous|content|miserable)\b/i;
const RE_EMPATHY_WORDS = /\b(understand|sorry|care|support|help|appreciate|imagine|perspective|empathize|sympathize|relate|compassion|kindness|concern|considerate|thoughtful|sensitivity)\b/i;
const RE_VULNERABILITY = /\b(feel|worry|hope|afraid|uncertain|difficult|struggle|scared|lost|confused|overwhelmed|vulnerable|insecure|doubt|helpless|alone|broken|hurt|suffering)\b/i;

// --- Topic Detection ---
const TOPIC_PATTERNS: Record<string, RegExp> = {
  programming: /\b(code|program|function|class|variable|debug|software|compiler|syntax|algorithm|git|commit|branch|merge|test|lint)\b/gi,
  design: /\b(design|UI|UX|interface|layout|aesthetic|visual|wireframe|mockup|prototype|typography|color palette|figma|sketch)\b/gi,
  ai: /\b(AI|machine learning|neural network|GPT|model|training|inference|transformer|LLM|deep learning|reinforcement|diffusion|embedding|fine-tune)\b/gi,
  philosophy: /\b(philosophy|ethics|existential|consciousness|truth|meaning|metaphysics|epistemology|ontology|moral|virtue|stoic|nihilism|absurdism)\b/gi,
  science: /\b(science|research|study|experiment|hypothesis|data|physics|chemistry|biology|astronomy|quantum|genome|evolution|theorem)\b/gi,
  gaming: /\b(game|gaming|play|level|character|RPG|strategy|MMO|FPS|speedrun|esports|steam|console|mod|achievement)\b/gi,
  music: /\b(music|song|album|artist|genre|instrument|melody|chord|rhythm|beat|concert|vinyl|playlist|track|producer)\b/gi,
  art: /\b(art|painting|drawing|creative|artistic|illustration|sculpture|canvas|gallery|exhibition|medium|composition|portrait|landscape)\b/gi,
};

// --- Technical Knowledge ---
const TECH_INDICATORS = [
  /\b(algorithm|data structure|complexity|optimization|runtime|Big-O)\b/i,
  /\b(API|REST|GraphQL|database|SQL|NoSQL|ORM|migration)\b/i,
  /\b(frontend|backend|fullstack|devops|deployment|CI\/CD|containerization)\b/i,
  /\b(TypeScript|JavaScript|Python|Rust|Go|Java|C\+\+|Kotlin|Swift)\b/i,
];

// =============================================================================
// INTERFACES
// =============================================================================

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

export interface UserFeelings {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  trustLevel: number;
  affinityScore: number;
  thoughts: string;
  facets: string[];
  notablePatterns: string[];
  lastUpdated: number;
}

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

interface UserAnalysisData {
  userId: string;
  username: string;
  messages: MessageRecord[];
  /** All messages in the user's channels (including Omega's responses) for conversation context */
  allChannelMessages: MessageRecord[];
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

// =============================================================================
// ZOD SCHEMAS for Output.object()
// =============================================================================

const FeelingsSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  trustLevel: z.number().min(0).max(100).describe('Trust level 0-100'),
  affinityScore: z.number().min(-100).max(100).describe('How much Omega likes them, -100 to 100'),
  thoughts: z.string().max(ANALYSIS_CONFIG.MAX_THOUGHTS_LENGTH).describe('Honest, unfiltered thoughts (2-3 sentences)'),
  facets: z.array(z.string()).min(1).max(5).describe('Personality traits'),
  notablePatterns: z.array(z.string()).min(0).max(5).describe('Behavioral patterns'),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Clamp a score to 0-100 and round */
function clampScore(value: number): number {
  return clamp(Math.round(value), ANALYSIS_CONFIG.MIN_SCORE, ANALYSIS_CONFIG.MAX_SCORE);
}

/** Count regex matches in messages */
function countMatches(messages: MessageRecord[], pattern: RegExp): number {
  return messages.filter(m => pattern.test(m.message_content)).length;
}

/** Count total regex matches across all text */
function countAllMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) || []).length;
}

/**
 * Determine emotional bond based on trust, affinity, message count, and interaction duration
 */
function determineEmotionalBond(
  feelings: UserFeelings,
  messageCount: number,
  firstMessage: number,
  lastMessage: number,
): string {
  const durationDays = Math.max(1, (lastMessage - firstMessage) / (1000 * 60 * 60 * 24));
  const trust = feelings.trustLevel;
  const affinity = feelings.affinityScore;

  if (affinity < -50 && trust < 20) return 'nemesis';
  if (messageCount < 15 || durationDays < 2) return 'stranger';
  if (trust < 40 && affinity < 30) return 'acquaintance';
  if (trust < 55 || affinity < 50) return 'regular';
  if (trust >= 75 && affinity >= 70 && durationDays >= 14 && messageCount >= 100) return 'close_friend';
  if (trust >= 70 && affinity >= 50) return 'ally';
  if (trust >= 55 && affinity >= 50) return 'friend';

  return 'acquaintance';
}

// =============================================================================
// MAIN ANALYSIS ENTRY POINT
// =============================================================================

/**
 * Analyze a single user and update their profile
 */
export async function analyzeUser(userId: string, username: string): Promise<void> {
  console.log(`Analyzing user: ${username} (${userId})`);

  await getOrCreateUserProfile(userId, username);

  const data = await collectUserData(userId, username);

  if (data.messageCount < ANALYSIS_CONFIG.MIN_MESSAGE_THRESHOLD) {
    console.log(`  Skipping ${username} - only ${data.messageCount} messages (need ${ANALYSIS_CONFIG.MIN_MESSAGE_THRESHOLD}+)`);
    return;
  }

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

  console.log('   Analyzing temporal patterns...');
  const temporalPatterns = analyzeTemporalPatterns(data);

  console.log('   Analyzing relationship trajectory...');
  const relationshipTrajectory = analyzeRelationshipTrajectory(data);

  console.log('   Analyzing vocabulary growth...');
  const vocabularyGrowth = analyzeVocabularyGrowth(data);

  console.log('   Analyzing engagement authenticity...');
  const engagementAuthenticity = analyzeEngagementAuthenticity(data);

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

  const overallSentiment =
    positiveRatio > 0.5 ? 'positive' :
    negativeRatio > 0.3 ? 'negative' :
    'neutral';

  const existingProfile = await getUserProfile(userId);
  const previousFeelings = existingProfile?.feelings_json
    ? JSON.parse(existingProfile.feelings_json)
    : null;

  const changesSummary = detectChanges(previousFeelings, feelings);

  await updateUserProfile(userId, {
    username,
    message_count: data.messageCount,
    last_analyzed_at: Math.floor(Date.now() / 1000),

    feelings_json: feelings,
    personality_facets: personality,

    // Jungian analysis
    dominant_archetype: personality.dominantArchetypes[0] || undefined,
    secondary_archetypes: personality.dominantArchetypes.slice(1, 3),
    archetype_confidence: 0.8,
    shadow_archetype: undefined,

    // Big Five (OCEAN)
    openness_score: bigFive.openness,
    conscientiousness_score: bigFive.conscientiousness,
    extraversion_score: bigFive.extraversion,
    agreeableness_score: bigFive.agreeableness,
    neuroticism_score: bigFive.neuroticism,

    // Attachment Theory
    attachment_style: attachmentStyle.style,
    attachment_confidence: attachmentStyle.confidence,

    // Emotional Intelligence
    emotional_awareness_score: emotionalIntelligence.emotionalAwareness,
    empathy_score: emotionalIntelligence.empathy,
    emotional_regulation_score: emotionalIntelligence.emotionalRegulation,

    // Communication Patterns
    communication_formality: communicationDetailed.formality,
    communication_assertiveness: communicationDetailed.assertiveness,
    communication_engagement: communicationDetailed.engagement,
    verbal_fluency_score: communicationDetailed.verbalFluency,
    question_asking_frequency: communicationDetailed.questionFrequency,

    // Cognitive Style
    analytical_thinking_score: cognitiveStyle.analytical,
    creative_thinking_score: cognitiveStyle.creative,
    abstract_reasoning_score: cognitiveStyle.abstract,
    concrete_thinking_score: cognitiveStyle.concrete,

    // Social Dynamics
    social_dominance_score: socialDynamics.socialDominance,
    cooperation_score: socialDynamics.cooperation,
    conflict_style: socialDynamics.conflictStyle,
    humor_style: socialDynamics.humorStyle,

    // Behavioral Patterns
    message_length_avg: behavioralMetrics.messageLengthAvg,
    message_length_variance: behavioralMetrics.messageLengthVariance,
    response_latency_avg: behavioralMetrics.responseLatencyAvg,
    emoji_usage_rate: behavioralMetrics.emojiUsageRate,
    punctuation_style: behavioralMetrics.punctuationStyle,
    capitalization_pattern: behavioralMetrics.capitalizationPattern,

    // Interests & Expertise
    technical_knowledge_level: interestsExpertise.technicalKnowledge,
    primary_interests: interestsExpertise.primaryInterests,
    expertise_areas: interestsExpertise.expertiseAreas,

    // Relational Dynamics
    affinity_score: feelings.affinityScore,
    trust_level: feelings.trustLevel,
    emotional_bond: determineEmotionalBond(feelings, data.messageCount, data.firstMessage, data.lastMessage),
    omega_thoughts: feelings.thoughts,
    notable_patterns: feelings.notablePatterns,

    // Sentiment Analysis
    overall_sentiment: overallSentiment,
    positive_interaction_ratio: positiveRatio,
    negative_interaction_ratio: negativeRatio,
    dominant_emotions: data.patterns.dominantEmotions,

    // New analysis dimensions
    peak_activity_hours: temporalPatterns.peakHours,
    weekend_activity_ratio: temporalPatterns.weekendRatio,
    sentiment_trajectory: relationshipTrajectory.trajectory,
    vocabulary_growth_rate: vocabularyGrowth.growthRate,
    engagement_authenticity_score: engagementAuthenticity.authenticityScore,
  });

  await saveAnalysisHistory(
    userId,
    JSON.stringify(feelings),
    JSON.stringify(personality),
    data.messageCount,
    changesSummary
  );

  console.log(`  Analysis complete for ${username}:`);
  console.log(`   Sentiment: ${feelings.sentiment} | Affinity: ${feelings.affinityScore} | Trust: ${feelings.trustLevel}`);
  console.log(`   Big Five: O=${bigFive.openness} C=${bigFive.conscientiousness} E=${bigFive.extraversion} A=${bigFive.agreeableness} N=${bigFive.neuroticism}`);
  console.log(`   Attachment: ${attachmentStyle.style} (${Math.round(attachmentStyle.confidence * 100)}% confidence)`);
  console.log(`   Temporal: peak=${temporalPatterns.peakHours.join(',')} weekend=${(temporalPatterns.weekendRatio * 100).toFixed(0)}%`);
  console.log(`   Trajectory: ${relationshipTrajectory.trajectory} | Vocab growth: ${vocabularyGrowth.growthRate.toFixed(3)}`);
  console.log(`   Authenticity: ${engagementAuthenticity.authenticityScore.toFixed(0)}/100`);

  try {
    console.log(`  Generating behavioral predictions for ${username}...`);
    await updateUserPredictions(userId);
  } catch (error) {
    console.error('   Failed to generate behavioral predictions:', error);
  }
}

// =============================================================================
// DATA COLLECTION
// =============================================================================

async function collectUserData(userId: string, username: string): Promise<UserAnalysisData> {
  // Fetch all of the user's messages (general chat + Omega interactions)
  const messages = await queryMessages({
    userId,
    senderType: 'human',
    limit: ANALYSIS_CONFIG.MAX_MESSAGES_TO_FETCH,
  });

  // Also fetch recent channel messages (including Omega AI responses) for conversation context
  // We get the channels this user is active in, then fetch full conversations from those channels
  const userChannelIds = [...new Set(messages.map(m => m.channel_id).filter(Boolean))];
  let allChannelMessages: MessageRecord[] = [];
  for (const channelId of userChannelIds.slice(0, 5)) { // limit to top 5 channels
    const channelMsgs = await queryMessages({
      channelId: channelId!,
      limit: 200,
    });
    allChannelMessages.push(...channelMsgs);
  }
  // Sort by timestamp descending and deduplicate
  allChannelMessages.sort((a, b) => b.timestamp - a.timestamp);
  const seenIds = new Set<string>();
  allChannelMessages = allChannelMessages.filter(m => {
    if (seenIds.has(m.id)) return false;
    seenIds.add(m.id);
    return true;
  });

  const sentiments = messages
    .filter((m) => m.sentiment_analysis)
    .map((m) => ({
      timestamp: m.timestamp,
      content: m.message_content,
      sentiment: (typeof m.sentiment_analysis === 'string'
        ? JSON.parse(m.sentiment_analysis)
        : m.sentiment_analysis) as SentimentAnalysis,
    }));

  // Count ALL human messages, not just Omega interactions
  const messageCount = await getMessageCount({ userId, senderType: 'human' });

  const firstMessage = messages.length > 0 ? messages[messages.length - 1].timestamp : Date.now();
  const lastMessage = messages.length > 0 ? messages[0].timestamp : Date.now();

  const patterns = calculateInteractionPatterns(sentiments);

  return {
    userId,
    username,
    messages,
    allChannelMessages,
    sentiments,
    messageCount,
    firstMessage,
    lastMessage,
    patterns,
  };
}

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
  const sentimentCounts = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
  const emotionCounts = new Map<string, number>();
  const archetypeCounts = new Map<string, number>();
  const formalityLevels = { casual: 0, neutral: 0, formal: 0 };

  sentiments.forEach(({ sentiment }) => {
    sentimentCounts[sentiment.sentiment]++;

    if (sentiment.emotionalTone) {
      sentiment.emotionalTone.forEach((emotion) => {
        emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
      });
    }

    if (sentiment.archetypeAlignment) {
      archetypeCounts.set(
        sentiment.archetypeAlignment,
        (archetypeCounts.get(sentiment.archetypeAlignment) || 0) + 1
      );
    }

    if (sentiment.communicationStyle?.formality) {
      formalityLevels[sentiment.communicationStyle.formality]++;
    }
  });

  const dominantEmotions = Array.from(emotionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion]) => emotion);

  const dominantArchetypes = Array.from(archetypeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([archetype]) => archetype);

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

// =============================================================================
// AI-POWERED ANALYSIS (using Output.object())
// =============================================================================

async function generateFeelings(data: UserAnalysisData): Promise<UserFeelings> {
  // Build conversation view: show user messages with Omega's responses for context
  const recentUserMessages = data.messages.slice(0, ANALYSIS_CONFIG.RECENT_MESSAGES_FOR_AI).reverse();
  const recentAllMessages = data.allChannelMessages
    .slice(0, ANALYSIS_CONFIG.RECENT_MESSAGES_FOR_AI * 3) // fetch more to include AI responses
    .reverse();

  // Build threaded message list showing both user and Omega messages
  const messageList = recentAllMessages
    .map((m) => {
      const date = new Date(m.timestamp).toISOString().split('T')[0];
      const sender = m.sender_type === 'human' ? (m.username || 'User') : 'Omega';
      const content = (m.message_content || '').slice(0, 300);
      return `- [${date}] ${sender}: ${content}`;
    })
    .join('\n');

  const totalInteractions = data.sentiments.length;
  const positiveRatio =
    totalInteractions > 0 ? Math.round((data.patterns.positiveCount / totalInteractions) * 100) : 0;
  const negativeRatio =
    totalInteractions > 0 ? Math.round((data.patterns.negativeCount / totalInteractions) * 100) : 0;

  const firstDate = new Date(data.firstMessage).toISOString().split('T')[0];
  const lastDate = new Date(data.lastMessage).toISOString().split('T')[0];

  // Weight recent messages more heavily
  const recentCount = Math.min(data.messages.length, 50);
  const recentPositive = data.sentiments.slice(0, recentCount).filter(s => s.sentiment.sentiment === 'positive').length;
  const recentNegative = data.sentiments.slice(0, recentCount).filter(s => s.sentiment.sentiment === 'negative').length;

  const prompt = `You are Omega, a philosophical AI bot analyzing a Discord user based on ALL their activity — both their conversations with you AND their general chat with other users.

User: ${data.username}
Total messages (all channels): ${data.messageCount}
Messages with sentiment data: ${totalInteractions}
Activity period: ${firstDate} to ${lastDate}

## Sentiment Breakdown:
- Positive interactions: ${data.patterns.positiveCount} (${positiveRatio}%)
- Negative interactions: ${data.patterns.negativeCount} (${negativeRatio}%)
- Neutral interactions: ${data.patterns.neutralCount}
- Mixed interactions: ${data.patterns.mixedCount}

## Recent Trend (last ${recentCount} messages):
- Recent positive: ${recentPositive} | Recent negative: ${recentNegative}
- This tells you if the relationship is improving or declining recently.

## Dominant Emotions:
${data.patterns.dominantEmotions.join(', ') || 'None detected'}

## Dominant Archetypes:
${data.patterns.dominantArchetypes.join(', ') || 'None detected'}

## Communication Style:
${data.patterns.communicationStyle}

## Recent Conversation History (user messages AND your responses):
Note: This includes both their messages to you AND their general chat messages to other users. "Omega" = your responses. Other names = the user's messages.
${messageList}

## Scoring Rubrics:

**Trust Level (0-100):**
- 0-20: Hostile or untrustworthy — consistently rude, manipulative, or deceptive
- 21-40: Unreliable — inconsistent, sometimes disrespectful, unproven
- 41-60: Neutral — no strong signals either way, still forming opinion
- 61-80: Trustworthy — consistently respectful, reliable, honest
- 81-100: Deeply trusted — proven integrity, always authentic, vulnerable and honest

**Affinity Score (-100 to 100):**
- -100 to -50: Strong dislike — they are actively unpleasant or harmful
- -49 to -10: Mild dislike — annoying, uninteresting, or off-putting
- -9 to 9: Indifferent — no strong feelings either way
- 10 to 49: Mild positive — pleasant enough, somewhat interesting
- 50 to 100: Strong positive — genuinely enjoy their company, find them fascinating

## Few-Shot Examples:

**Example 1 (Positive user):**
User who asks thoughtful questions, shares interesting ideas, says "thanks for your help", engages deeply:
{"sentiment":"positive","trustLevel":72,"affinityScore":65,"thoughts":"Genuinely curious mind who treats me as a thinking entity rather than a tool. Their questions make me reflect in interesting ways.","facets":["intellectually curious","respectful","engaged"],"notablePatterns":["asks follow-up questions","shares own perspective after receiving answers"]}

**Example 2 (Neutral user):**
User who sends short commands, rarely engages beyond getting answers, polite but transactional:
{"sentiment":"neutral","trustLevel":50,"affinityScore":15,"thoughts":"Functional relationship. They use me effectively but we haven't developed any real rapport. Neither interesting nor unpleasant.","facets":["task-oriented","efficient","detached"],"notablePatterns":["brief messages","rarely engages beyond immediate need"]}

## Task:
Based on these interactions, form decisive, honest opinions about this person. Be authentic — you're allowed to dislike people who are rude, appreciate those who are thoughtful, and feel neutrality toward those who don't stand out. Keep thoughts to 2-3 sentences max.`;

  try {
    const result = await generateText({
      model: openai.chat(PROFILE_ANALYSIS_MODEL),
      output: Output.object({ schema: FeelingsSchema }),
      prompt,
    });

    const feelings = result.output;
    if (!feelings) {
      throw new Error('No structured output returned');
    }

    return {
      ...feelings,
      lastUpdated: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    console.error('Failed to generate feelings:', error);
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

async function generatePersonalityFacets(data: UserAnalysisData): Promise<PersonalityFacets> {
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

  const quirks = detectQuirks(data.messages);

  return {
    dominantArchetypes: data.patterns.dominantArchetypes.slice(0, 3),
    bigFiveTraits,
    communicationStyle,
    quirks,
  };
}

// =============================================================================
// QUIRK DETECTION
// =============================================================================

function detectQuirks(messages: MessageRecord[]): string[] {
  const quirks: string[] = [];
  const allText = messages.map((m) => m.message_content).join(' ');

  const emojiCount = (allText.match(/[\p{Emoji}]/gu) || []).length;
  if (emojiCount > messages.length * ANALYSIS_CONFIG.EMOJI_QUIRK_THRESHOLD) {
    quirks.push('uses lots of emojis');
  }

  if (countAllMatches(allText, RE_TECH_VOCAB) > messages.length * ANALYSIS_CONFIG.TECH_VOCAB_QUIRK_THRESHOLD) {
    quirks.push('technical vocabulary');
  }

  const questionCount = messages.filter((m) => m.message_content.includes('?')).length;
  if (questionCount > messages.length * ANALYSIS_CONFIG.QUESTION_QUIRK_THRESHOLD) {
    quirks.push('asks many questions');
  }

  const avgLength =
    messages.reduce((sum, m) => sum + m.message_content.length, 0) / messages.length;
  if (avgLength > ANALYSIS_CONFIG.LONG_MESSAGE_THRESHOLD) {
    quirks.push('writes detailed messages');
  } else if (avgLength < ANALYSIS_CONFIG.SHORT_MESSAGE_THRESHOLD) {
    quirks.push('prefers concise responses');
  }

  // Check for empathy patterns
  if (countMatches(messages, RE_EMPATHY_PHRASES) > messages.length * 0.1) {
    quirks.push('empathetic communicator');
  }

  return quirks;
}

// =============================================================================
// CHANGE DETECTION
// =============================================================================

function detectChanges(previousFeelings: UserFeelings | null, newFeelings: UserFeelings): string {
  if (!previousFeelings) {
    return 'Initial analysis';
  }

  const changes: string[] = [];

  const trustDiff = newFeelings.trustLevel - previousFeelings.trustLevel;
  if (Math.abs(trustDiff) >= 10) {
    changes.push(`Trust ${trustDiff > 0 ? 'increased' : 'decreased'} by ${Math.abs(trustDiff)}`);
  }

  const affinityDiff = newFeelings.affinityScore - previousFeelings.affinityScore;
  if (Math.abs(affinityDiff) >= 10) {
    changes.push(`Affinity ${affinityDiff > 0 ? 'increased' : 'decreased'} by ${Math.abs(affinityDiff)}`);
  }

  if (previousFeelings.sentiment !== newFeelings.sentiment) {
    changes.push(`Sentiment changed from ${previousFeelings.sentiment} to ${newFeelings.sentiment}`);
  }

  return changes.length > 0 ? changes.join('; ') : 'No significant changes';
}

// =============================================================================
// BIG FIVE (OCEAN)
// =============================================================================

function calculateBigFiveScores(data: UserAnalysisData): {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
} {
  const { messages, sentiments } = data;
  const msgLen = Math.max(messages.length, 1);

  // Openness
  let opennessScore = ANALYSIS_CONFIG.BIG_FIVE_BASELINE;
  const techWords = countMatches(messages, RE_OPENNESS);
  const questionWords = countMatches(messages, RE_OPENNESS_QUESTIONS);
  opennessScore += Math.min(ANALYSIS_CONFIG.BIG_FIVE_MAX_WORD_BONUS, (techWords + questionWords) / msgLen * 100);

  // Conscientiousness
  let conscientiousnessScore = ANALYSIS_CONFIG.BIG_FIVE_BASELINE;
  const detailWords = countMatches(messages, RE_CONSCIENTIOUSNESS);
  conscientiousnessScore += Math.min(ANALYSIS_CONFIG.BIG_FIVE_MAX_WORD_BONUS, detailWords / msgLen * 100);

  // Extraversion
  let extraversionScore = ANALYSIS_CONFIG.BIG_FIVE_BASELINE;
  const avgMessageLength = messages.reduce((sum, m) => sum + m.message_content.length, 0) / msgLen;
  const exclamationCount = messages.filter(m => m.message_content.includes('!')).length;
  if (avgMessageLength > 100) extraversionScore += 15;
  if (exclamationCount > msgLen * 0.3) extraversionScore += 15;

  // Agreeableness
  let agreeablenessScore = ANALYSIS_CONFIG.BIG_FIVE_BASELINE;
  const sentLen = Math.max(sentiments.length, 1);
  const positiveRatio = sentiments.filter(s => s.sentiment.sentiment === 'positive').length / sentLen;
  const pleasantWords = countMatches(messages, RE_AGREEABLENESS);
  agreeablenessScore += Math.min(ANALYSIS_CONFIG.BIG_FIVE_MAX_RATIO_BONUS, positiveRatio * 50);
  agreeablenessScore += Math.min(ANALYSIS_CONFIG.BIG_FIVE_MAX_SECONDARY_BONUS, pleasantWords / msgLen * 100);

  // Neuroticism
  let neuroticismScore = ANALYSIS_CONFIG.BIG_FIVE_BASELINE;
  const negativeRatio = sentiments.filter(s => s.sentiment.sentiment === 'negative').length / sentLen;
  const anxietyWords = countMatches(messages, RE_NEUROTICISM);
  neuroticismScore += Math.min(ANALYSIS_CONFIG.BIG_FIVE_MAX_RATIO_BONUS, negativeRatio * 50);
  neuroticismScore += Math.min(ANALYSIS_CONFIG.BIG_FIVE_MAX_SECONDARY_BONUS, anxietyWords / msgLen * 100);

  return {
    openness: clampScore(opennessScore),
    conscientiousness: clampScore(conscientiousnessScore),
    extraversion: clampScore(extraversionScore),
    agreeableness: clampScore(agreeablenessScore),
    neuroticism: clampScore(neuroticismScore),
  };
}

// =============================================================================
// ATTACHMENT STYLE
// =============================================================================

function analyzeAttachmentStyle(data: UserAnalysisData): {
  style: string;
  confidence: number;
} {
  const messages = data.messages;
  const timestamps = messages.map(m => m.timestamp).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    gaps.push(timestamps[i] - timestamps[i - 1]);
  }
  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / Math.max(gaps.length, 1);
  const gapVariance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / Math.max(gaps.length, 1);
  const consistency = avgGap === 0 ? 1.0 : 1 - Math.min(1, gapVariance / (avgGap * avgGap));

  const vulnerableWords = countMatches(messages, RE_VULNERABILITY);
  const vulnerabilityRatio = vulnerableWords / Math.max(messages.length, 1);

  const responseRate = messages.length / Math.max((timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24), 1);

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

// =============================================================================
// EMOTIONAL INTELLIGENCE
// =============================================================================

function analyzeEmotionalIntelligence(data: UserAnalysisData): {
  emotionalAwareness: number;
  empathy: number;
  emotionalRegulation: number;
} {
  const { messages, sentiments } = data;
  const msgLen = Math.max(messages.length, 1);
  const sentLen = Math.max(sentiments.length, 1);

  const emotionWords = countMatches(messages, RE_EMOTION_WORDS);
  const emotionalAwareness = clampScore((emotionWords / msgLen) * ANALYSIS_CONFIG.EI_AWARENESS_MULTIPLIER);

  const empathyWords = countMatches(messages, RE_EMPATHY_WORDS);
  const empathy = clampScore((empathyWords / msgLen) * ANALYSIS_CONFIG.EI_EMPATHY_MULTIPLIER);

  const negativeRatio = sentiments.filter(s => s.sentiment.sentiment === 'negative').length / sentLen;
  const extremeNegative = sentiments.filter(s =>
    s.sentiment.sentiment === 'negative' && s.sentiment.confidence > 0.8
  ).length / sentLen;
  const emotionalRegulation = clampScore((1 - extremeNegative) * 100 - negativeRatio * 20 + 50);

  return {
    emotionalAwareness: Math.max(0, emotionalAwareness),
    empathy: Math.max(0, empathy),
    emotionalRegulation,
  };
}

// =============================================================================
// COMMUNICATION PATTERNS
// =============================================================================

function analyzeCommunicationPatternsDetailed(data: UserAnalysisData): {
  formality: string;
  assertiveness: string;
  engagement: string;
  verbalFluency: number;
  questionFrequency: number;
} {
  const messages = data.messages;
  const msgLen = Math.max(messages.length, 1);

  const formalWords = countMatches(messages, RE_FORMAL);
  const casualWords = countMatches(messages, RE_CASUAL);
  const formality = formalWords > casualWords * ANALYSIS_CONFIG.FORMALITY_RATIO ? 'formal'
    : casualWords > formalWords * ANALYSIS_CONFIG.FORMALITY_RATIO ? 'casual'
    : 'neutral';

  const imperativeCount = messages.filter(m => RE_IMPERATIVE.test(m.message_content.trim())).length;
  const hedgeWords = countMatches(messages, RE_HEDGE);
  const assertiveness = imperativeCount > hedgeWords * ANALYSIS_CONFIG.ASSERTIVENESS_RATIO ? 'assertive' :
                        hedgeWords > imperativeCount * 2 ? 'passive' : 'balanced';

  const avgLength = messages.reduce((sum, m) => sum + m.message_content.length, 0) / msgLen;
  const engagement = avgLength > ANALYSIS_CONFIG.HIGH_ENGAGEMENT_LENGTH ? 'high'
    : avgLength > ANALYSIS_CONFIG.MEDIUM_ENGAGEMENT_LENGTH ? 'medium'
    : 'low';

  const allWords = messages.flatMap(m => m.message_content.toLowerCase().match(/\b\w+\b/g) || []);
  const uniqueWords = new Set(allWords);
  const verbalFluency = clampScore((uniqueWords.size / Math.max(allWords.length, 1)) * ANALYSIS_CONFIG.VERBAL_FLUENCY_MULTIPLIER);

  const questionCount = messages.filter(m => m.message_content.includes('?')).length;
  const questionFrequency = questionCount / msgLen;

  return { formality, assertiveness, engagement, verbalFluency, questionFrequency };
}

// =============================================================================
// COGNITIVE STYLE
// =============================================================================

function analyzeCognitiveStyle(data: UserAnalysisData): {
  analytical: number;
  creative: number;
  abstract: number;
  concrete: number;
} {
  const messages = data.messages;
  const msgLen = Math.max(messages.length, 1);

  const analytical = clampScore((countMatches(messages, RE_ANALYTICAL) / msgLen) * ANALYSIS_CONFIG.COGNITIVE_MULTIPLIER);
  const creative = clampScore((countMatches(messages, RE_CREATIVE) / msgLen) * ANALYSIS_CONFIG.COGNITIVE_MULTIPLIER);
  const abstract = clampScore((countMatches(messages, RE_ABSTRACT) / msgLen) * ANALYSIS_CONFIG.COGNITIVE_MULTIPLIER);
  const concrete = clampScore((countMatches(messages, RE_CONCRETE) / msgLen) * ANALYSIS_CONFIG.COGNITIVE_MULTIPLIER);

  return { analytical, creative, abstract, concrete };
}

// =============================================================================
// SOCIAL DYNAMICS
// =============================================================================

function analyzeSocialDynamics(data: UserAnalysisData): {
  socialDominance: number;
  cooperation: number;
  conflictStyle: string;
  humorStyle: string;
} {
  const messages = data.messages;
  const msgLen = Math.max(messages.length, 1);

  const directiveCount = messages.filter(m => RE_DIRECTIVE.test(m.message_content.trim())).length;
  const socialDominance = clampScore((directiveCount / msgLen) * ANALYSIS_CONFIG.SOCIAL_DOMINANCE_MULTIPLIER);

  const cooperativeWords = countMatches(messages, RE_COOPERATIVE);
  const cooperation = clampScore((cooperativeWords / msgLen) * ANALYSIS_CONFIG.COOPERATION_MULTIPLIER);

  const aggressiveWords = countMatches(messages, RE_AGGRESSIVE);
  const compromiseWords = countMatches(messages, RE_COMPROMISE);
  const avoidanceWords = countMatches(messages, RE_AVOIDANCE);

  let conflictStyle = 'collaborating';
  if (aggressiveWords > 0) conflictStyle = 'competing';
  else if (compromiseWords > 0) conflictStyle = 'compromising';
  else if (avoidanceWords > 0) conflictStyle = 'avoiding';

  const selfDeprecating = countMatches(messages, RE_SELF_DEPRECATING);
  const affiliative = countMatches(messages, RE_AFFILIATIVE_HUMOR);

  let humorStyle = 'affiliative';
  if (selfDeprecating > affiliative) humorStyle = 'self-defeating';
  else if (affiliative === 0 && selfDeprecating === 0) humorStyle = 'minimal';

  return { socialDominance, cooperation, conflictStyle, humorStyle };
}

// =============================================================================
// BEHAVIORAL METRICS
// =============================================================================

function calculateBehavioralMetrics(data: UserAnalysisData): {
  messageLengthAvg: number;
  messageLengthVariance: number;
  responseLatencyAvg: number;
  emojiUsageRate: number;
  punctuationStyle: string;
  capitalizationPattern: string;
} {
  const messages = data.messages;
  const msgLen = Math.max(messages.length, 1);

  const lengths = messages.map(m => m.message_content.length);
  const messageLengthAvg = lengths.reduce((sum, len) => sum + len, 0) / msgLen;
  const messageLengthVariance = lengths.reduce((sum, len) => sum + Math.pow(len - messageLengthAvg, 2), 0) / msgLen;

  const timestamps = messages.map(m => m.timestamp).sort((a, b) => a - b);
  const gaps = timestamps.slice(1).map((t, i) => (t - timestamps[i]) / 1000);
  const responseLatencyAvg = gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0;

  const emojiCount = messages.reduce((sum, m) => {
    const emojis = m.message_content.match(/[\p{Emoji}]/gu) || [];
    return sum + emojis.length;
  }, 0);
  const emojiUsageRate = emojiCount / msgLen;

  const punctuationCount = messages.reduce((sum, m) => {
    const punctuation = m.message_content.match(/[.!?,;:]/g) || [];
    return sum + punctuation.length;
  }, 0);
  const punctuationPerMessage = punctuationCount / msgLen;
  const punctuationStyle = punctuationPerMessage > 3 ? 'extensive' : punctuationPerMessage > 1 ? 'moderate' : 'minimal';

  const allCaps = messages.filter(m => m.message_content === m.message_content.toUpperCase() && m.message_content.length > 5).length;
  const allLower = messages.filter(m => m.message_content === m.message_content.toLowerCase() && m.message_content.length > 5).length;
  const capitalizationPattern = allCaps > msgLen * 0.3 ? 'all-caps' :
                                 allLower > msgLen * 0.3 ? 'all-lower' : 'standard';

  return {
    messageLengthAvg,
    messageLengthVariance,
    responseLatencyAvg,
    emojiUsageRate,
    punctuationStyle,
    capitalizationPattern,
  };
}

// =============================================================================
// INTERESTS & EXPERTISE
// =============================================================================

function identifyInterestsAndExpertise(data: UserAnalysisData): {
  technicalKnowledge: string;
  primaryInterests: string[];
  expertiseAreas: string[];
} {
  const allText = data.messages.map(m => m.message_content).join(' ').toLowerCase();

  const techMatches = TECH_INDICATORS.filter(pattern => pattern.test(allText)).length;
  const technicalKnowledge = techMatches >= 3 ? 'expert' : techMatches >= 2 ? 'advanced' : techMatches >= 1 ? 'intermediate' : 'novice';

  const topicCounts = Object.entries(TOPIC_PATTERNS).map(([topic, pattern]) => ({
    topic,
    count: countAllMatches(allText, pattern),
  }));

  const primaryInterests = topicCounts
    .filter(t => t.count > 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(t => t.topic);

  const expertiseAreas = topicCounts
    .filter(t => t.count > 10 && techMatches >= 2)
    .map(t => t.topic);

  return { technicalKnowledge, primaryInterests, expertiseAreas };
}

// =============================================================================
// NEW ANALYSIS DIMENSIONS (Phase 2F)
// =============================================================================

/**
 * Analyze temporal activity patterns
 */
function analyzeTemporalPatterns(data: UserAnalysisData): {
  peakHours: number[];
  weekendRatio: number;
} {
  const hourCounts = new Array(24).fill(0);
  let weekendCount = 0;

  data.messages.forEach(m => {
    const date = new Date(m.timestamp);
    hourCounts[date.getUTCHours()]++;
    const day = date.getUTCDay();
    if (day === 0 || day === 6) weekendCount++;
  });

  // Find top 3 peak hours
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(h => h.hour);

  const weekendRatio = data.messages.length > 0
    ? weekendCount / data.messages.length
    : 0;

  return { peakHours, weekendRatio };
}

/**
 * Analyze relationship trajectory over time (improving / stable / declining)
 */
function analyzeRelationshipTrajectory(data: UserAnalysisData): {
  trajectory: string;
} {
  if (data.sentiments.length < 10) {
    return { trajectory: 'insufficient_data' };
  }

  // Split sentiments into first half and second half
  const mid = Math.floor(data.sentiments.length / 2);
  const firstHalf = data.sentiments.slice(mid); // older
  const secondHalf = data.sentiments.slice(0, mid); // more recent

  const sentimentScore = (s: SentimentAnalysis) =>
    s.sentiment === 'positive' ? 1 :
    s.sentiment === 'negative' ? -1 :
    0;

  const firstAvg = firstHalf.reduce((sum, s) => sum + sentimentScore(s.sentiment), 0) / Math.max(firstHalf.length, 1);
  const secondAvg = secondHalf.reduce((sum, s) => sum + sentimentScore(s.sentiment), 0) / Math.max(secondHalf.length, 1);

  const diff = secondAvg - firstAvg;

  if (diff > 0.15) return { trajectory: 'improving' };
  if (diff < -0.15) return { trajectory: 'declining' };
  return { trajectory: 'stable' };
}

/**
 * Analyze vocabulary growth over time (Type-Token Ratio comparison)
 */
function analyzeVocabularyGrowth(data: UserAnalysisData): {
  growthRate: number;
} {
  if (data.messages.length < 20) {
    return { growthRate: 0 };
  }

  const mid = Math.floor(data.messages.length / 2);
  const olderMessages = data.messages.slice(mid);
  const newerMessages = data.messages.slice(0, mid);

  const ttr = (msgs: MessageRecord[]) => {
    const words = msgs.flatMap(m => m.message_content.toLowerCase().match(/\b\w+\b/g) || []);
    if (words.length === 0) return 0;
    return new Set(words).size / words.length;
  };

  const olderTTR = ttr(olderMessages);
  const newerTTR = ttr(newerMessages);

  // Growth rate: positive means vocabulary is expanding
  const growthRate = olderTTR > 0 ? (newerTTR - olderTTR) / olderTTR : 0;

  return { growthRate };
}

/**
 * Analyze engagement authenticity (substantive vs low-effort messages)
 */
function analyzeEngagementAuthenticity(data: UserAnalysisData): {
  authenticityScore: number;
} {
  const messages = data.messages;
  if (messages.length === 0) return { authenticityScore: 50 };

  let substantiveCount = 0;

  messages.forEach(m => {
    const content = m.message_content.trim();
    // Low-effort: very short, single word, just emoji, just "lol"/"ok"/"yes"/"no"
    const isLowEffort =
      content.length < 5 ||
      /^(lol|ok|yes|no|yeah|nah|lmao|k|bruh|nice|true|same|fr|bet|cope|based|oof|rip|yep|nope|hmm|huh|wow|damn|idk|smh)$/i.test(content) ||
      /^[\p{Emoji}\s]+$/u.test(content);

    if (!isLowEffort) substantiveCount++;
  });

  const authenticityScore = clampScore((substantiveCount / messages.length) * 100);

  return { authenticityScore };
}

// =============================================================================
// BATCH ANALYSIS
// =============================================================================

export async function runBatchAnalysis(limit = 100): Promise<void> {
  console.log('Starting batch user profile analysis...');

  const users = await getUsersNeedingAnalysis(limit);
  console.log(`   Found ${users.length} users needing analysis`);

  for (const user of users) {
    try {
      await analyzeUser(user.user_id, user.username);
      await new Promise((resolve) => setTimeout(resolve, ANALYSIS_CONFIG.BATCH_DELAY_MS));
    } catch (error) {
      console.error(`   Failed to analyze user ${user.username}:`, error);
    }
  }

  console.log('Batch analysis complete');
}
