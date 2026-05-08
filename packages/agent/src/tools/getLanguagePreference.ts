/**
 * Get Language Preference Tool
 * Allows users to check their current language preference
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getUserLanguagePreference } from '../lib/spanishLanguage.js';

export const getLanguagePreferenceTool = tool({
  description: 'Check the user\'s current language preference. Returns whether Omega is set to respond in English or Spanish.',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      // Note: In a real implementation, you'd pass the userId
      // For now, this returns the default preference
      const language = getUserLanguagePreference('default');

      return {
        success: true,
        language,
        languageName: language === 'es' ? 'Spanish' : 'English',
        message: language === 'es'
          ? 'Tu preferencia de idioma actual es español.'
          : 'Your current language preference is English.',
      };
    } catch (error) {
      console.error('Error getting language preference:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to get language preference',
        success: false,
      };
    }
  },
});