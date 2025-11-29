/**
 * User Profile Analysis Service
 * Analyzes user interactions to generate Omega's feelings and personality assessments
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../config/models.js';
import { queryMessages, getMessageCount } from '../database/messageService.js';
import {
  getUserProfile,
  updateUserProfile,
  getUsersNeedingAnalysis,
  saveAnalysisHistory,
  getOrCreateUserProfile,
} from '../database/userProfileService.js';
import type { MessageRecord } from '../database/schema.js';

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

  // Generate feelings
  const feelings = await generateFeelings(data);

  // Generate personality facets
  const personality = await generatePersonalityFacets(data);

  // Get previous feelings for comparison
  const existingProfile = await getUserProfile(userId);
  const previousFeelings = existingProfile?.feelings_json
    ? JSON.parse(existingProfile.feelings_json)
    : null;

  // Detect changes
  const changesSummary = detectChanges(previousFeelings, feelings);

  // Update profile
  await updateUserProfile(userId, {
    username,
    feelings_json: JSON.stringify(feelings),
    personality_facets: JSON.stringify(personality),
    last_analyzed_at: Math.floor(Date.now() / 1000),
    message_count: data.messageCount,
  });

  // Save history snapshot
  await saveAnalysisHistory(
    userId,
    JSON.stringify(feelings),
    JSON.stringify(personality),
    data.messageCount,
    changesSummary
  );

  console.log(`✅ Analysis complete for ${username}:`, {
    sentiment: feelings.sentiment,
    affinity: feelings.affinityScore,
    trust: feelings.trustLevel,
    thoughts: feelings.thoughts.substring(0, 100) + '...',
  });
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
