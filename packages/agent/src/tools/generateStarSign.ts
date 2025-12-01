/**
 * Generate Star Sign Tool - Determines star signs based on profile data
 *
 * Features:
 * - AI-powered astrological inference from user behavior and profile
 * - Uses personality traits, communication style, and interaction patterns
 * - No birthday required - purely based on behavioral analysis
 * - Provides entertaining astrological readings
 * - Includes star sign characteristics and "reading" for the user
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';
import { getUserProfile } from '@repo/database';// OLD:userProfileService.js';

// All zodiac signs with their traditional date ranges
const ZODIAC_SIGNS = [
  { sign: 'Aries', dates: 'March 21 - April 19', element: 'Fire', quality: 'Cardinal' },
  { sign: 'Taurus', dates: 'April 20 - May 20', element: 'Earth', quality: 'Fixed' },
  { sign: 'Gemini', dates: 'May 21 - June 20', element: 'Air', quality: 'Mutable' },
  { sign: 'Cancer', dates: 'June 21 - July 22', element: 'Water', quality: 'Cardinal' },
  { sign: 'Leo', dates: 'July 23 - August 22', element: 'Fire', quality: 'Fixed' },
  { sign: 'Virgo', dates: 'August 23 - September 22', element: 'Earth', quality: 'Mutable' },
  { sign: 'Libra', dates: 'September 23 - October 22', element: 'Air', quality: 'Cardinal' },
  { sign: 'Scorpio', dates: 'October 23 - November 21', element: 'Water', quality: 'Fixed' },
  { sign: 'Sagittarius', dates: 'November 22 - December 21', element: 'Fire', quality: 'Mutable' },
  { sign: 'Capricorn', dates: 'December 22 - January 19', element: 'Earth', quality: 'Cardinal' },
  { sign: 'Aquarius', dates: 'January 20 - February 18', element: 'Air', quality: 'Fixed' },
  { sign: 'Pisces', dates: 'February 19 - March 20', element: 'Water', quality: 'Mutable' },
] as const;

/**
 * Generate a star sign prediction based on user profile data
 */
async function inferStarSign(
  username: string,
  profileData: any
): Promise<{
  predictedSign: string;
  confidence: string;
  element: string;
  quality: string;
  reading: string;
  reasoning: string;
}> {
  // Extract key profile characteristics
  const personality = profileData.personality_facets
    ? JSON.parse(profileData.personality_facets)
    : null;
  const feelings = profileData.feelings_json
    ? JSON.parse(profileData.feelings_json)
    : null;

  // Build profile summary for analysis
  const profileSummary = `
User: ${username}

Personality Profile:
- Dominant Archetype: ${profileData.dominant_archetype || 'unknown'}
- Big Five Scores:
  * Openness: ${profileData.openness_score || 'N/A'}
  * Conscientiousness: ${profileData.conscientiousness_score || 'N/A'}
  * Extraversion: ${profileData.extraversion_score || 'N/A'}
  * Agreeableness: ${profileData.agreeableness_score || 'N/A'}
  * Neuroticism: ${profileData.neuroticism_score || 'N/A'}

Communication Style:
- Formality: ${profileData.communication_formality || 'unknown'}
- Assertiveness: ${profileData.communication_assertiveness || 'unknown'}
- Engagement: ${profileData.communication_engagement || 'unknown'}

Behavior Patterns:
- Message Count: ${profileData.message_count || 0}
- Overall Sentiment: ${profileData.overall_sentiment || 'neutral'}
- Attachment Style: ${profileData.attachment_style || 'unknown'}

${personality ? `
Additional Personality Facets:
- Dominant Archetypes: ${personality.dominantArchetypes?.join(', ') || 'none'}
- Traits: ${personality.traits?.join(', ') || 'none'}
` : ''}

${feelings ? `
Relationship Dynamics:
- Affinity Score: ${feelings.affinityScore || 'N/A'}
- Trust Level: ${feelings.trustLevel || 'N/A'}
- Emotional Bond: ${feelings.emotionalBond || 'unknown'}
` : ''}
`.trim();

  const prompt = `You are an expert astrologist analyzing behavioral and personality data to infer someone's zodiac sign.

IMPORTANT CONTEXT:
- This is a FUN, ENTERTAINING tool - not serious astrology
- We don't have the user's actual birthday
- Your job is to make an EDUCATED, PLAYFUL guess based on their personality and behavior
- Be creative and make connections between their traits and typical zodiac characteristics
- This should feel like a personalized horoscope reading

Here is the user's behavioral profile:

${profileSummary}

Available Zodiac Signs:
${ZODIAC_SIGNS.map(z => `${z.sign} (${z.dates}) - ${z.element} ${z.quality}`).join('\n')}

Based on this profile, predict which zodiac sign this person is most likely to be.

Consider:
1. Traditional astrological associations (Fire signs are energetic, Water signs emotional, etc.)
2. Personality traits that match classic zodiac characteristics
3. Communication style and how it aligns with different signs
4. Behavioral patterns and their astrological correlates
5. Make it fun and engaging - find creative connections!

Your analysis should:
- Select the most fitting zodiac sign based on personality/behavior
- Provide a confidence level (e.g., "Quite confident", "Strong indicators", "Moderate guess")
- Write a personalized astrological reading (2-3 paragraphs) that:
  * Explains why their profile matches this sign
  * Describes typical characteristics of the sign
  * Provides a fun, uplifting message or insight
  * References specific traits from their profile
- Explain your reasoning for choosing this sign

Respond in JSON format:
{
  "predictedSign": "One of the zodiac sign names (e.g., Aries, Taurus, etc.)",
  "confidence": "Your confidence level as a string (e.g., 'Quite confident', 'Strong indicators')",
  "reading": "A personalized 2-3 paragraph astrological reading for this user",
  "reasoning": "A brief technical explanation of why you chose this sign based on their profile data"
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    // Find the zodiac info for the predicted sign
    const zodiacInfo = ZODIAC_SIGNS.find(z => z.sign === parsed.predictedSign) || ZODIAC_SIGNS[0];

    return {
      predictedSign: zodiacInfo.sign,
      confidence: parsed.confidence,
      element: zodiacInfo.element,
      quality: zodiacInfo.quality,
      reading: parsed.reading,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error('Error inferring star sign:', error);
    // Fallback to a random sign with a generic message
    const randomSign = ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)];
    return {
      predictedSign: randomSign.sign,
      confidence: 'Wild guess',
      element: randomSign.element,
      quality: randomSign.quality,
      reading: `Based on your profile, you might be a ${randomSign.sign}! ${randomSign.sign} is a ${randomSign.element} sign known for their unique qualities. The stars suggest you have an interesting personality that defies easy categorization.`,
      reasoning: 'Unable to perform detailed analysis - using random assignment.',
    };
  }
}

export const generateStarSignTool = tool({
  description: `Determine a user's likely star sign (zodiac sign) based on their behavioral profile and personality data - NO BIRTHDAY REQUIRED! This is a fun, AI-powered astrological tool that analyzes personality traits, communication style, and interaction patterns to make an educated (and entertaining) guess about someone's zodiac sign. Perfect for when users want to know their star sign without sharing their birthday, or just want a fun personality-based astrological reading.

Use this when:
- User asks "what's my star sign?" or "what zodiac sign am I?"
- User wants astrological insights without providing their birthday
- User is curious about astrology-based personality analysis
- For fun personality readings and entertainment`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID'),
    username: z.string().describe('Discord username'),
  }),

  execute: async ({ userId, username }) => {
    try {
      console.log(`✨ Generate Star Sign: Analyzing profile for ${username} (${userId})`);

      // Get user profile data
      const profile = await getUserProfile(userId);

      if (!profile) {
        return {
          success: false,
          error: 'No profile found',
          message: `Sorry, I don't have enough data about ${username} yet. I need at least some conversation history to analyze personality and infer a star sign. Try chatting more first!`,
        };
      }

      // Check if we have enough data
      if (profile.message_count < 5) {
        return {
          success: false,
          error: 'Insufficient data',
          message: `I need more conversation data to make an accurate star sign prediction for ${username}. Current messages: ${profile.message_count}. I'd recommend at least 5-10 messages for a fun reading!`,
        };
      }

      console.log(`   📊 Profile data retrieved: ${profile.message_count} messages`);
      console.log(`   🔮 Inferring star sign from personality and behavior...`);

      const starSignData = await inferStarSign(username, profile);

      console.log(`   🌟 Predicted Sign: ${starSignData.predictedSign}`);
      console.log(`   📈 Confidence: ${starSignData.confidence}`);

      // Format the output
      const formattedOutput = `# 🌟 Your Star Sign Reading

**${username}, based on your profile analysis:**

## ♈️ Predicted Sign: ${starSignData.predictedSign}
**${ZODIAC_SIGNS.find(z => z.sign === starSignData.predictedSign)?.dates}**
**Element:** ${starSignData.element} | **Quality:** ${starSignData.quality}

---

## 🔮 Your Personalized Reading

${starSignData.reading}

---

## 🧠 Technical Analysis
${starSignData.reasoning}

**Confidence Level:** ${starSignData.confidence}
**Based on:** ${profile.message_count} messages analyzed

---

*✨ Remember: This is a fun, AI-powered prediction based on your behavioral profile, not your actual birth date! Take it as entertainment and insight into how your personality aligns with astrological archetypes.*`;

      return {
        success: true,
        predictedSign: starSignData.predictedSign,
        element: starSignData.element,
        quality: starSignData.quality,
        dates: ZODIAC_SIGNS.find(z => z.sign === starSignData.predictedSign)?.dates,
        confidence: starSignData.confidence,
        reading: starSignData.reading,
        reasoning: starSignData.reasoning,
        messagesAnalyzed: profile.message_count,
        formattedOutput,
        disclaimer: 'This is a fun, AI-powered prediction based on behavioral profile data, not actual birth date.',
      };
    } catch (error) {
      console.error('Error generating star sign:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate star sign',
        message: 'Sorry, I encountered an error while analyzing your star sign. Please try again!',
      };
    }
  },
});
