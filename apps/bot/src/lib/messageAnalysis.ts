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
 * Interaction metrics analysis result
 */
export interface InteractionMetrics {
  /** Type of interaction */
  interactionType: 'question' | 'statement' | 'command' | 'feedback' | 'greeting' | 'casual_chat' | 'other';

  /** Detected user intent */
  userIntent: 'information_seeking' | 'task_completion' | 'casual_conversation' | 'feedback_giving' | 'problem_solving' | 'creative_collaboration' | 'unclear';

  /** How the user perceives the bot */
  botPerception: 'helpful' | 'confusing' | 'friendly' | 'intelligent' | 'frustrating' | 'neutral' | 'unknown';

  /** Quality assessment of the interaction */
  conversationQuality: 'productive' | 'unclear' | 'off_topic' | 'engaging' | 'informative' | 'repetitive' | 'normal';
}

/**
 * Query metrics analysis result
 */
export interface QueryMetrics {
  /** Complexity of the query */
  queryComplexity: 'simple' | 'moderate' | 'complex';

  /** Inferred user satisfaction with results */
  userSatisfaction: 'satisfied' | 'partially_satisfied' | 'unsatisfied' | 'unknown';
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
 * Analyze interaction metrics of a message
 * Determines interaction type, user intent, bot perception, and conversation quality
 */
export async function analyzeInteractionMetrics(
  messageContent: string,
  username: string,
  context?: {
    previousMessages?: Array<{ content: string; sentiment?: string }>;
    botResponses?: Array<{ content: string }>;
  }
): Promise<InteractionMetrics> {
  try {
    // Build context from previous messages if available
    let conversationContext = '';
    if (context?.previousMessages && context.previousMessages.length > 0) {
      conversationContext = '\n\n**Recent conversation context:**\n' +
        context.previousMessages
          .slice(-3) // Last 3 messages
          .map((msg, idx) => `${idx + 1}. User: "${msg.content}"`)
          .join('\n');
    }

    if (context?.botResponses && context.botResponses.length > 0) {
      conversationContext += '\n' +
        context.botResponses
          .slice(-3)
          .map((resp, idx) => `   Bot: "${resp.content}"`)
          .join('\n');
    }

    const prompt = `You are an expert in conversation analysis and user interaction patterns. Analyze the following message to determine interaction metrics.

**Message from ${username}:**
"${messageContent}"
${conversationContext}

**Analysis Task:**

1. **Interaction Type**: Classify the message as one of:
   - question (asking for information or help)
   - statement (making a declaration or sharing information)
   - command (requesting an action or task)
   - feedback (giving feedback about the bot or its responses)
   - greeting (hello, goodbye, or social pleasantries)
   - casual_chat (informal conversation)
   - other (doesn't fit above categories)

2. **User Intent**: What is the user trying to achieve?
   - information_seeking (wants to learn or understand something)
   - task_completion (wants to accomplish a specific task)
   - casual_conversation (just chatting, building rapport)
   - feedback_giving (providing feedback or suggestions)
   - problem_solving (working through a problem or challenge)
   - creative_collaboration (brainstorming, creating, or exploring ideas)
   - unclear (intent is ambiguous)

3. **Bot Perception**: Based on the message tone and context, how does the user perceive the bot?
   - helpful (bot is being useful)
   - confusing (bot responses are unclear)
   - friendly (warm, personable interaction)
   - intelligent (bot demonstrates good understanding)
   - frustrating (user seems frustrated with bot)
   - neutral (no strong perception either way)
   - unknown (cannot determine from this message alone)

4. **Conversation Quality**: Assess the quality of this interaction:
   - productive (moving towards a goal, making progress)
   - unclear (message is ambiguous or hard to understand)
   - off_topic (diverging from previous conversation)
   - engaging (interesting, thought-provoking)
   - informative (sharing useful information)
   - repetitive (covering same ground)
   - normal (standard, unremarkable interaction)

Respond in the following JSON format:
{
  "interactionType": "question",
  "userIntent": "information_seeking",
  "botPerception": "helpful",
  "conversationQuality": "productive"
}`;

    const result = await generateText({
      model: openai.chat(OMEGA_MODEL),
      prompt,
    });

    // Parse the JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }

    const metrics = JSON.parse(jsonMatch[0]) as InteractionMetrics;
    return metrics;
  } catch (error) {
    console.error('Error analyzing interaction metrics:', error);

    // Return safe fallback
    return {
      interactionType: 'other',
      userIntent: 'unclear',
      botPerception: 'unknown',
      conversationQuality: 'normal',
    };
  }
}

/**
 * Analyze query metrics
 * Determines query complexity and user satisfaction
 */
export async function analyzeQueryMetrics(
  queryText: string,
  queryResult?: string,
  error?: string,
  resultCount?: number
): Promise<QueryMetrics> {
  try {
    const prompt = `You are an expert in database query analysis and user satisfaction assessment. Analyze the following database query to determine complexity and user satisfaction.

**Natural Language Query:**
"${queryText}"

**Query Results:**
${error ? `Error: ${error}` : `Result count: ${resultCount || 0} rows`}
${queryResult ? `Sample results: ${queryResult.substring(0, 200)}...` : ''}

**Analysis Task:**

1. **Query Complexity**: How complex is this query?
   - simple (basic lookups, single table, simple conditions)
   - moderate (joins, aggregations, multiple conditions)
   - complex (advanced queries, multiple joins, subqueries, complex logic)

2. **User Satisfaction**: Based on the query and results, how satisfied is the user likely to be?
   - satisfied (got good results, query worked as expected)
   - partially_satisfied (got some results but maybe not ideal)
   - unsatisfied (error occurred, no results, or poor results)
   - unknown (cannot determine from available information)

Respond in the following JSON format:
{
  "queryComplexity": "simple",
  "userSatisfaction": "satisfied"
}`;

    const result = await generateText({
      model: openai.chat(OMEGA_MODEL),
      prompt,
    });

    // Parse the JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }

    const metrics = JSON.parse(jsonMatch[0]) as QueryMetrics;
    return metrics;
  } catch (error) {
    console.error('Error analyzing query metrics:', error);

    // Return safe fallback
    return {
      queryComplexity: 'simple',
      userSatisfaction: 'unknown',
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
  interactionMetrics: InteractionMetrics;
}> {
  // Run all analyses in parallel for efficiency
  const [summary, sentimentAnalysis, interactionMetrics] = await Promise.all([
    generateMessageSummary(messageContent),
    analyzeSentiment(messageContent, username, context),
    analyzeInteractionMetrics(messageContent, username, context),
  ]);

  return {
    summary,
    sentimentAnalysis,
    interactionMetrics,
  };
}

/**
 * Analyze a query with sentiment and metrics
 * This is the main function to use when saving queries
 */
export async function analyzeQuery(
  queryText: string,
  username: string,
  queryResult?: string,
  error?: string,
  resultCount?: number
): Promise<{
  sentimentAnalysis: SentimentAnalysis;
  queryMetrics: QueryMetrics;
}> {
  // Run both analyses in parallel for efficiency
  const [sentimentAnalysis, queryMetrics] = await Promise.all([
    analyzeSentiment(queryText, username),
    analyzeQueryMetrics(queryText, queryResult, error, resultCount),
  ]);

  return {
    sentimentAnalysis,
    queryMetrics,
  };
}
