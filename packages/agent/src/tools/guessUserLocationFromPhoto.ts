/**
 * Guess User Location From Photo Tool
 * Analyzes user profile photos to infer their geographic location using AI-powered image recognition
 * Provides geographic insights based on landmarks, environment, clothing, and visual cues
 */

import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { OMEGA_MODEL } from '@repo/shared';
import { getUserProfile, saveGeoGuess, getLatestGeoGuess } from '@repo/database';

/**
 * Geographic guess result interface
 */
interface GeographicGuess {
  location: string;
  confidence: number;
  reasoning: string;
  landmarks: string[];
  environmentalClues: string[];
  culturalIndicators: string[];
  climaticIndicators: string[];
}

/**
 * Analyze image description to infer geographic location
 * Uses AI to interpret visual clues from the user's appearance and context
 */
async function analyzeLocationFromAppearance(
  appearanceDescription: string,
  photoUrl: string | null
): Promise<GeographicGuess> {
  try {
    const prompt = `You are a geographic location analyst that infers likely locations based on visual clues from photos.

Given this person's appearance description:
"${appearanceDescription}"

Your task: Analyze the description for geographic clues and make an educated guess about where this person might be located.

Consider:
1. **Environmental clues**: Background elements, weather indicators, vegetation, architecture
2. **Clothing style**: Cultural fashion, climate-appropriate attire, regional trends
3. **Physical features**: If description includes background details like buildings, landscapes, signs
4. **Cultural indicators**: Style choices that might indicate regional preferences

Return ONLY valid JSON matching this exact structure:

{
  "location": "City, Region/Country (or 'Unable to determine' if not enough clues)",
  "confidence": 0.0-1.0 (likelihood of accuracy),
  "reasoning": "Brief explanation of why this location was guessed",
  "landmarks": ["array", "of", "identifiable", "landmarks", "if", "any"],
  "environmentalClues": ["array", "of", "environmental", "indicators"],
  "culturalIndicators": ["array", "of", "cultural", "style", "indicators"],
  "climaticIndicators": ["array", "of", "climate", "related", "clues"]
}

Guidelines:
- Be honest about confidence - if there aren't clear geographic indicators, confidence should be low (0.1-0.3)
- Look for specific details in the background, clothing, or context
- Consider climate indicators from clothing choices
- If the description is purely about facial features with no context, confidence should be very low
- Never make assumptions based on ethnicity or physical features alone
- Focus on environmental and cultural context clues
- Return ONLY the JSON object, no other text`;

    const analysisResult = await generateText({
      model: openai(OMEGA_MODEL),
      prompt: prompt,
    });

    const jsonText = analysisResult.text.trim();

    // Extract JSON from response
    let cleanJsonText = jsonText;
    if (jsonText.includes('```json')) {
      const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        cleanJsonText = jsonMatch[1];
      }
    } else if (jsonText.includes('```')) {
      const jsonMatch = jsonText.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        cleanJsonText = jsonMatch[1];
      }
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJsonText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', cleanJsonText.substring(0, 200));
      throw new Error(`AI returned invalid JSON. Response: "${cleanJsonText.substring(0, 100)}..."`);
    }

    // Validate required fields
    if (!parsed.location || parsed.confidence === undefined) {
      throw new Error('AI response missing required fields (location, confidence)');
    }

    const guess: GeographicGuess = {
      location: parsed.location,
      confidence: Math.max(0, Math.min(1, parsed.confidence)), // Clamp to 0-1
      reasoning: parsed.reasoning || 'No reasoning provided',
      landmarks: parsed.landmarks || [],
      environmentalClues: parsed.environmentalClues || [],
      culturalIndicators: parsed.culturalIndicators || [],
      climaticIndicators: parsed.climaticIndicators || [],
    };

    return guess;
  } catch (error) {
    console.error('Failed to analyze location from appearance:', error);
    throw error;
  }
}

/**
 * Format geographic guess for display
 */
function formatGeographicGuess(guess: GeographicGuess): string {
  const confidencePercent = Math.round(guess.confidence * 100);
  const confidenceEmoji = 
    guess.confidence > 0.7 ? '🎯' :
    guess.confidence > 0.4 ? '🤔' : '❓';

  let message = `${confidenceEmoji} **Geographic Guess:** ${guess.location}\n`;
  message += `📊 **Confidence:** ${confidencePercent}%\n\n`;
  message += `💭 **Reasoning:** ${guess.reasoning}\n`;

  if (guess.landmarks.length > 0) {
    message += `\n🏛️ **Landmarks Identified:**\n${guess.landmarks.map(l => `  • ${l}`).join('\n')}\n`;
  }

  if (guess.environmentalClues.length > 0) {
    message += `\n🌍 **Environmental Clues:**\n${guess.environmentalClues.map(c => `  • ${c}`).join('\n')}\n`;
  }

  if (guess.culturalIndicators.length > 0) {
    message += `\n🎨 **Cultural Indicators:**\n${guess.culturalIndicators.map(i => `  • ${i}`).join('\n')}\n`;
  }

  if (guess.climaticIndicators.length > 0) {
    message += `\n🌡️ **Climatic Indicators:**\n${guess.climaticIndicators.map(i => `  • ${i}`).join('\n')}\n`;
  }

  if (guess.confidence < 0.3) {
    message += `\n⚠️ **Note:** This is a low-confidence guess. The photo doesn't contain enough geographic context for accurate location detection.`;
  }

  return message;
}

/**
 * Guess User Location From Photo Tool
 */
export const guessUserLocationFromPhotoTool = tool({
  description: `Analyze a user's profile photo to infer their geographic location based on visual clues.

**Call this tool when:**
- User asks "where am I from my photo?", "guess my location", "where do I live?"
- User wants geographic insights from their profile picture
- Playing location guessing games or providing social context
- User is curious about what location clues their photo reveals

**What it does:**
- Analyzes the user's uploaded profile photo (if available)
- Uses AI to identify landmarks, environmental features, clothing style, and cultural indicators
- Infers likely geographic location based on visual context
- Provides confidence score and detailed reasoning
- Stores the guess in the database for tracking and analytics

**Requirements:**
- User must have uploaded a profile photo using the uploadMyPhoto tool
- Works best with photos that include background context (landmarks, architecture, nature)
- Less accurate with close-up selfies that lack environmental context

**Privacy Note:**
- Only analyzes photos the user has voluntarily uploaded
- Does not make assumptions based on physical features or ethnicity
- Focuses on environmental and cultural context clues`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID'),
    username: z.string().describe('Discord username'),
  }),

  execute: async ({ userId, username }) => {
    console.log(`🌍 Guessing location for ${username} (${userId})`);

    try {
      // 1. Get user profile to check if they have a photo
      const profile = await getUserProfile(userId);

      if (!profile) {
        return {
          success: false,
          error: 'No profile found',
          message: `${username} doesn't have a profile yet. They need to interact with me first before I can analyze their photo.`,
        };
      }

      // 2. Check if user has uploaded a photo
      if (!profile.uploaded_photo_url && !profile.ai_appearance_description) {
        return {
          success: false,
          error: 'No photo uploaded',
          message: `${username} hasn't uploaded a profile photo yet. They can use the "uploadMyPhoto" tool to upload one, then I can guess their location!`,
        };
      }

      // 3. Use appearance description for analysis
      const appearanceDescription = profile.ai_appearance_description || '';
      
      if (!appearanceDescription) {
        return {
          success: false,
          error: 'No appearance data',
          message: `I don't have enough appearance information for ${username} to make a geographic guess.`,
        };
      }

      console.log('   📸 Photo URL:', profile.uploaded_photo_url);
      console.log('   📝 Analyzing appearance description...');

      // 4. Analyze location from appearance
      const guess = await analyzeLocationFromAppearance(
        appearanceDescription,
        profile.uploaded_photo_url
      );

      console.log(`   🎯 Guessed location: ${guess.location} (${Math.round(guess.confidence * 100)}% confidence)`);

      // 5. Save the guess to database
      await saveGeoGuess({
        userId,
        photoUrl: profile.uploaded_photo_url,
        guessedLocation: guess.location,
        confidenceScore: guess.confidence,
      });

      console.log('   ✅ Geographic guess saved to database');

      // 6. Format and return the result
      const formattedMessage = formatGeographicGuess(guess);

      return {
        success: true,
        location: guess.location,
        confidence: guess.confidence,
        reasoning: guess.reasoning,
        landmarks: guess.landmarks,
        environmentalClues: guess.environmentalClues,
        culturalIndicators: guess.culturalIndicators,
        climaticIndicators: guess.climaticIndicators,
        message: formattedMessage,
      };
    } catch (error) {
      console.error('Failed to guess location:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to analyze photo for geographic location. Please try again.',
      };
    }
  },
});
