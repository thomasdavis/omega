/**
 * Change Personality Tool - Allows users to switch between different personality modes
 *
 * Features:
 * - Multiple personality modes: default, witty, chaotic, serious
 * - Per-user personality preferences
 * - Immediate effect on subsequent messages
 * - View current mode and available options
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  PERSONALITY_MODES,
  getUserPersonalityMode,
  setUserPersonalityMode,
  getAvailablePersonalityModes,
  isValidPersonalityMode,
  type PersonalityMode,
} from '../personalityModes.js';

export const changePersonalityTool = tool({
  description: 'Change the bot\'s personality mode for the current user. Available modes: default (calm, philosophical), witty (clever humor and wordplay), chaotic (maximum energy and creativity), serious (formal and professional). Use this when users want to adjust the bot\'s communication style.',
  inputSchema: z.object({
    username: z.string().describe('The username of the person requesting the personality change'),
    mode: z.string().optional().describe('The personality mode to switch to: default, witty, chaotic, or serious. Omit to view current mode.'),
    action: z.enum(['set', 'view']).optional().describe('Action to perform: set (change mode) or view (show current mode). Defaults to "set" if mode is provided, "view" otherwise.'),
  }),
  execute: async ({ username, mode, action }) => {
    try {
      console.log(`🎭 Change Personality: User ${username}, Mode: ${mode || 'N/A'}, Action: ${action || 'auto'}`);

      // Determine action based on inputs
      const effectiveAction = action || (mode ? 'set' : 'view');

      if (effectiveAction === 'view') {
        const currentMode = getUserPersonalityMode(username);
        const currentConfig = PERSONALITY_MODES[currentMode];
        const availableModes = getAvailablePersonalityModes();

        return {
          success: true,
          action: 'view',
          currentMode,
          currentModeInfo: {
            name: currentConfig.name,
            description: currentConfig.description,
          },
          availableModes: availableModes.map(m => ({
            mode: m,
            name: PERSONALITY_MODES[m].name,
            description: PERSONALITY_MODES[m].description,
          })),
          message: `Your current personality mode is **${currentConfig.name}** (${currentMode}): ${currentConfig.description}`,
        };
      }

      // Set mode
      if (!mode) {
        return {
          success: false,
          error: 'No mode specified. Available modes: default, witty, chaotic, serious',
          availableModes: getAvailablePersonalityModes().map(m => ({
            mode: m,
            name: PERSONALITY_MODES[m].name,
            description: PERSONALITY_MODES[m].description,
          })),
        };
      }

      // Validate mode
      const normalizedMode = mode.toLowerCase().trim();
      if (!isValidPersonalityMode(normalizedMode)) {
        return {
          success: false,
          error: `Invalid personality mode: ${mode}. Available modes: default, witty, chaotic, serious`,
          availableModes: getAvailablePersonalityModes().map(m => ({
            mode: m,
            name: PERSONALITY_MODES[m].name,
            description: PERSONALITY_MODES[m].description,
          })),
        };
      }

      // Get previous mode for comparison
      const previousMode = getUserPersonalityMode(username);
      const previousConfig = PERSONALITY_MODES[previousMode];

      // Set new mode
      setUserPersonalityMode(username, normalizedMode as PersonalityMode);
      const newConfig = PERSONALITY_MODES[normalizedMode as PersonalityMode];

      console.log(`   ✅ Changed personality mode for ${username}: ${previousMode} → ${normalizedMode}`);

      return {
        success: true,
        action: 'set',
        previousMode,
        previousModeInfo: {
          name: previousConfig.name,
          description: previousConfig.description,
        },
        newMode: normalizedMode,
        newModeInfo: {
          name: newConfig.name,
          description: newConfig.description,
        },
        message: `Personality mode changed from **${previousConfig.name}** to **${newConfig.name}**. ${newConfig.description}. This change will take effect in my next response!`,
      };
    } catch (error) {
      console.error('Error changing personality:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change personality mode',
      };
    }
  },
});
