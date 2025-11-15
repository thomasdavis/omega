/**
 * Mood Uplifter Tool - Detects low-energy language and provides uplifting responses
 *
 * Features:
 * - Sentiment analysis to detect low-energy/negative language
 * - Personalized uplifting message generation
 * - Context-aware encouragement based on the user's specific situation
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

/**
 * Analyze message sentiment and energy level
 */
async function analyzeSentiment(message: string): Promise<{
  energyLevel: 'high' | 'medium' | 'low';
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  indicators: string[];
}> {
  try {
    const analysis = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `Analyze the following message for energy level and sentiment.

Message: "${message}"

Consider:
- Words indicating tiredness, exhaustion, burnout
- Defeatist language ("I can't", "I give up", "it's hopeless")
- Lack of motivation or enthusiasm
- Negative self-talk or self-deprecation
- Expressions of frustration, sadness, or discouragement
- Overall tone and mood

Respond in JSON format:
{
  "energyLevel": "high" | "medium" | "low",
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": <number 0-100>,
  "indicators": ["<specific phrases or patterns detected>"]
}`,
    });

    const result = JSON.parse(analysis.text.trim());
    return result;
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    // Fallback to neutral analysis
    return {
      energyLevel: 'medium',
      sentiment: 'neutral',
      confidence: 0,
      indicators: ['Analysis failed'],
    };
  }
}

/**
 * Generate uplifting response based on context
 */
async function generateUpliftingMessage(
  originalMessage: string,
  analysis: {
    energyLevel: string;
    sentiment: string;
    indicators: string[];
  },
  username: string
): Promise<string> {
  const prompt = `You are a supportive and encouraging friend. A user named ${username} has shared a message that indicates they might be feeling low on energy or motivation.

Original message: "${originalMessage}"

Energy level detected: ${analysis.energyLevel}
Sentiment: ${analysis.sentiment}
Specific indicators: ${analysis.indicators.join(', ')}

Generate a genuine, personalized uplifting response that:
1. Acknowledges their feelings without dismissing them
2. Provides specific, actionable encouragement relevant to their situation
3. Is warm but not overly enthusiastic or fake
4. Offers perspective or reframing when appropriate
5. Keeps it concise (under 300 characters)
6. Sounds natural and conversational, not like a self-help book
7. May include a relevant metaphor or gentle wisdom if it fits naturally

IMPORTANT:
- Be authentic and genuine, not robotic or formulaic
- Don't use excessive emojis or exclamation marks
- Focus on empowerment and perspective, not empty platitudes
- Match the user's communication style

Your uplifting message:`;

  try {
    const response = await generateText({
      model: openai('gpt-4o'),
      prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error('Error generating uplifting message:', error);
    return "I see you might be going through something tough. Remember, even the darkest nights end with sunrise. You've got this.";
  }
}

export const moodUplifterTool = tool({
  description: 'Detect low-energy or negative language and provide personalized uplifting messages. Use this when a user seems discouraged, tired, or in need of encouragement.',
  inputSchema: z.object({
    message: z.string().describe('The message to analyze for energy level and sentiment'),
    username: z.string().optional().describe('The username of the person who sent the message'),
    autoDetect: z.boolean().optional().describe('If true, only respond if low energy is detected. If false, always provide encouragement.'),
  }),
  execute: async ({ message, username = 'friend', autoDetect = true }) => {
    try {
      console.log('🌟 Mood Uplifter: Analyzing message...');

      // Analyze sentiment and energy
      const analysis = await analyzeSentiment(message);

      console.log(`   Energy: ${analysis.energyLevel}, Sentiment: ${analysis.sentiment}, Confidence: ${analysis.confidence}%`);

      // If auto-detect is enabled, only proceed if low energy is detected
      if (autoDetect && analysis.energyLevel !== 'low' && analysis.sentiment !== 'negative') {
        return {
          triggered: false,
          reason: 'Message does not indicate low energy or negative sentiment',
          analysis,
        };
      }

      // Generate uplifting message
      const upliftingMessage = await generateUpliftingMessage(
        message,
        analysis,
        username
      );

      console.log('   ✨ Generated uplifting message');

      return {
        triggered: true,
        analysis: {
          energyLevel: analysis.energyLevel,
          sentiment: analysis.sentiment,
          confidence: analysis.confidence,
          indicators: analysis.indicators,
        },
        upliftingMessage,
        success: true,
      };
    } catch (error) {
      console.error('Error in mood uplifter:', error);
      return {
        triggered: false,
        error: error instanceof Error ? error.message : 'Failed to analyze message',
        success: false,
      };
    }
  },
});
