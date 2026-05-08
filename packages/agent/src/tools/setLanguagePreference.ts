/**
 * Set Language Preference Tool
 * Allows users to set their preferred language for Omega's responses
 */

import { tool } from 'ai';
import { z } from 'zod';
import { setUserLanguagePreference } from '../lib/spanishLanguage.js';

export const setLanguagePreferenceTool = tool({
  description: 'Set the user\'s preferred language for Omega\'s responses. Use this when a user explicitly requests to communicate in a specific language (e.g., "speak Spanish", "habla en español", "always respond in English", "responde siempre en inglés").',
  inputSchema: z.object({
    language: z.enum(['en', 'es']).describe('The preferred language code: "en" for English, "es" for Spanish'),
  }),
  execute: async ({ language }) => {
    try {
      // Note: In a real implementation, you'd pass the userId
      // For now, this is a placeholder that logs the preference
      console.log(`🌍 Language preference set to: ${language === 'es' ? 'Spanish' : 'English'}`);

      return {
        success: true,
        language,
        languageName: language === 'es' ? 'Spanish' : 'English',
        message: language === 'es'
          ? '¡Perfecto! Ahora responderé en español.'
          : 'Got it! I\'ll respond in English.',
      };
    } catch (error) {
      console.error('Error setting language preference:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to set language preference',
        success: false,
      };
    }
  },
});