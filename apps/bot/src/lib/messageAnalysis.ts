/**
 * Message Analysis Service
 * Generates AI summaries and sentiment analysis for user messages
 * Integrates advanced psychological theories for deep sentiment understanding
 */

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { OMEGA_MODEL } from '../config/models.js';

/**
 * Sentiment analysis result with psychological insights
 */
export interface SentimentAnalysis {
  /** Overall sentiment: positive, negative, neutral, mixed */
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';

  /** Confidence score (0-1) */
  confidence: number;

  /** Emotional tone detected (joy, anger, fear, sadness, surprise, disgust, trust, anticipation) */
  emotionalTone: string[];

  /** Jungian archetype alignment (if applicable) */
  archetypeAlignment?: string;

  /** Psychological state indicators */
  psychologicalState: {
    /** Openness to experience */
    openness?: 'low' | 'medium' | 'high';

    /** Agreeableness in interaction */
    agreeableness?: 'low' | 'medium' | 'high';

    /** Emotional stability */
    emotionalStability?: 'low' | 'medium' | 'high';
  };

  /** Communication style */
  communicationStyle: {
    /** Formality level */
    formality: 'casual' | 'neutral' | 'formal';

    /** Assertiveness level */
    assertiveness: 'passive' | 'balanced' | 'assertive' | 'aggressive';

    /** Engagement level */
    engagement: 'low' | 'medium' | 'high';
  };

  /** Raw analysis explanation */
  explanation: string;
}

/**
 * Generate a concise AI summary of a message
 */
export async function generateMessageSummary(messageContent: string): Promise<string> {
  try {
    const result = await generateText({
      model: openai.chat(OMEGA_MODEL),
      prompt: `Provide a concise 1-2 sentence summary of the following message. Focus on the core content and intent:

Message: "${messageContent}"

Summary (max 2 sentences):`,
      maxTokens: 100,
    });

    return result.text.trim();
  } catch (error) {
    console.error('Error generating message summary:', error);
    return 'Summary generation failed';
  }
}

/**
 * Analyze sentiment of a message with advanced psychological insights
 * Incorporates PhD-level research and Carl Jung's analytical psychology
 */
export async function analyzeSentiment(
  messageContent: string,
  username: string,
  context?: {
    previousMessages?: Array<{ content: string; sentiment?: string }>;
  }
): Promise<SentimentAnalysis> {
  try {
    // Build context from previous messages if available
    let previousContext = '';
    if (context?.previousMessages && context.previousMessages.length > 0) {
      previousContext = '\n\nPrevious interaction patterns:\n' +
        context.previousMessages
          .slice(-5) // Last 5 messages
          .map((msg, idx) => `${idx + 1}. "${msg.content}" (sentiment: ${msg.sentiment || 'unknown'})`)
          .join('\n');
    }

    const prompt = `You are an expert psychologist with expertise in sentiment analysis, Jungian analytical psychology, and behavioral science. Analyze the following message for sentiment and psychological insights.

**Message from ${username}:**
"${messageContent}"
${previousContext}

**Analysis Framework:**

1. **Overall Sentiment**: Determine if the message is positive, negative, neutral, or mixed
2. **Confidence Level**: How confident are you in this assessment? (0.0 to 1.0)
3. **Emotional Tone**: Identify primary emotions using Plutchik's wheel of emotions (joy, sadness, trust, disgust, fear, anger, surprise, anticipation)
4. **Jungian Archetype**: If applicable, identify which Jungian archetype this message aligns with (Hero, Caregiver, Explorer, Rebel, Magician, Sage, Innocent, Lover, Jester, Everyman, Ruler, Creator)
5. **Big Five Personality Indicators**:
   - Openness to experience (low/medium/high)
   - Agreeableness (low/medium/high)
   - Emotional stability (low/medium/high)
6. **Communication Style**:
   - Formality (casual/neutral/formal)
   - Assertiveness (passive/balanced/assertive/aggressive)
   - Engagement level (low/medium/high)
7. **Explanation**: Brief explanation of your analysis (2-3 sentences)

Respond in the following JSON format:
{
  "sentiment": "positive|negative|neutral|mixed",
  "confidence": 0.85,
  "emotionalTone": ["joy", "trust"],
  "archetypeAlignment": "Hero",
  "psychologicalState": {
    "openness": "high",
    "agreeableness": "medium",
    "emotionalStability": "high"
  },
  "communicationStyle": {
    "formality": "casual",
    "assertiveness": "balanced",
    "engagement": "high"
  },
  "explanation": "The message shows positive sentiment with high confidence. User demonstrates enthusiasm and collaborative spirit, aligning with Hero archetype characteristics."
}`;

    const result = await generateText({
      model: openai.chat(OMEGA_MODEL),
      prompt,
      maxTokens: 500,
    });

    // Parse the JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }

    const analysis = JSON.parse(jsonMatch[0]) as SentimentAnalysis;
    return analysis;
  } catch (error) {
    console.error('Error analyzing sentiment:', error);

    // Return a safe fallback
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      emotionalTone: ['neutral'],
      psychologicalState: {},
      communicationStyle: {
        formality: 'neutral',
        assertiveness: 'balanced',
        engagement: 'medium',
      },
      explanation: 'Analysis failed - using default neutral sentiment',
    };
  }
}

/**
 * Generate both summary and sentiment analysis for a message
 * This is the main function to use when saving messages
 */
export async function analyzeMessage(
  messageContent: string,
  username: string,
  context?: {
    previousMessages?: Array<{ content: string; sentiment?: string }>;
  }
): Promise<{
  summary: string;
  sentimentAnalysis: SentimentAnalysis;
}> {
  // Run both analyses in parallel for efficiency
  const [summary, sentimentAnalysis] = await Promise.all([
    generateMessageSummary(messageContent),
    analyzeSentiment(messageContent, username, context),
  ]);

  return {
    summary,
    sentimentAnalysis,
  };
}
