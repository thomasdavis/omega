/**
 * Set Vibe Tool
 * Allows users to customize Omega's communication style/personality
 */

import { tool } from 'ai';
import { z } from 'zod';
import { setUserVibeMode, type VibeMode } from '../../utils/userPreferences.js';
import type { Message } from 'discord.js';

// Store the current Discord message context (set by messageHandler)
let currentMessageContext: Message | null = null;

/**
 * Set the current message context for the setVibe tool
 * This should be called from the message handler before running the agent
 */
export function setVibeMessageContext(message: Message) {
  currentMessageContext = message;
}

/**
 * Clear the message context after agent execution
 */
export function clearVibeMessageContext() {
  currentMessageContext = null;
}

export const setVibeTool = tool({
  description: 'Set the communication style/personality mode (vibe) for the current user. Use this when users want to change how Omega communicates. Available modes: "normal" (witty, conversational), "terse" (extremely concise).',
  parameters: z.object({
    mode: z.enum(['normal', 'terse']).describe('Communication mode: "normal" for standard witty personality, "terse" for extremely concise responses'),
  }),
  execute: async ({ mode }) => {
    if (!currentMessageContext) {
      return {
        success: false,
        error: 'No message context available',
        message: 'Unable to set vibe mode - message context not found.',
      };
    }

    const userId = currentMessageContext.author.id;
    const username = currentMessageContext.author.username;

    console.log(`🎭 Setting vibe mode for ${username} (${userId}) to: ${mode}`);

    try {
      const prefs = setUserVibeMode(userId, username, mode as VibeMode);

      const modeDescriptions: Record<VibeMode, string> = {
        normal: 'Standard Omega personality - witty, intelligent, and conversational',
        terse: 'Extremely concise mode - minimal words, maximum clarity',
      };

      return {
        success: true,
        mode: prefs.vibeMode,
        description: modeDescriptions[prefs.vibeMode],
        message: `Vibe mode set to **${mode}**. ${modeDescriptions[mode]} This setting will persist across all your future conversations.`,
      };
    } catch (error) {
      console.error('Error setting vibe mode:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to set vibe mode. Please try again.',
      };
    }
  },
});
