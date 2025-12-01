/**
 * Translate to Spanish Tool - AI-powered translation service
 *
 * Features:
 * - Translates text from any language to Spanish
 * - Context-aware translations that preserve meaning and tone
 * - Supports various text types (casual, formal, technical, creative)
 * - Handles idioms and cultural expressions appropriately
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

/**
 * Translate text to Spanish using AI
 */
async function translateText(
  text: string,
  context?: string
): Promise<{
  originalText: string;
  translatedText: string;
  detectedLanguage?: string;
}> {
  const contextGuidance = context
    ? `\n\nAdditional context about the text: ${context}`
    : '';

  const prompt = `Translate the following text to Spanish. Provide a natural, contextually appropriate translation that preserves the original meaning, tone, and intent.

TEXT TO TRANSLATE:
${text}${contextGuidance}

TRANSLATION GUIDELINES:
1. Preserve the original tone (formal, casual, technical, etc.)
2. Handle idioms and expressions appropriately - translate the meaning, not word-for-word
3. Maintain any special formatting (line breaks, emphasis, etc.)
4. For technical terms, use standard Spanish technical vocabulary
5. Ensure the translation sounds natural to native Spanish speakers
6. If translating names or proper nouns, keep them as-is unless there's a standard Spanish equivalent

Respond in JSON format:
{
  "translatedText": "The Spanish translation",
  "detectedLanguage": "The detected source language (e.g., 'English', 'French', etc.)"
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
      temperature: 0.3, // Lower temperature for more consistent translations
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      originalText: text,
      translatedText: parsed.translatedText,
      detectedLanguage: parsed.detectedLanguage || 'Unknown',
    };
  } catch (error) {
    console.error('Error translating text:', error);
    throw new Error('Failed to translate text to Spanish');
  }
}

export const translateToSpanishTool = tool({
  description: 'Translate text from any language into Spanish using AI. Provides natural, context-aware translations that preserve meaning and tone. Handles casual conversation, formal text, technical content, idioms, and cultural expressions. Use this when users need Spanish translations of English or other language text.',
  inputSchema: z.object({
    text: z.string().describe('The text to translate to Spanish. Can be in any language.'),
    context: z.string().optional().describe('Optional context about the text (e.g., "technical documentation", "casual message", "formal letter") to help improve translation accuracy.'),
  }),
  execute: async ({ text, context }) => {
    try {
      console.log('🌍 Translate to Spanish: Processing translation...');
      console.log(`   📝 Text length: ${text.length} characters`);
      if (context) {
        console.log(`   📋 Context: ${context}`);
      }

      const result = await translateText(text, context);

      console.log(`   ✅ Detected language: ${result.detectedLanguage}`);
      console.log(`   ✨ Translation completed`);

      return {
        originalText: result.originalText,
        translatedText: result.translatedText,
        detectedLanguage: result.detectedLanguage,
        success: true,
      };
    } catch (error) {
      console.error('Error in translateToSpanish tool:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to translate text',
        success: false,
      };
    }
  },
});
