/**
 * Translate to Leetspeak Tool - Converts text to l33tspeak
 *
 * Features:
 * - Translates normal text into leetspeak (1337speak)
 * - Supports multiple complexity levels (basic, medium, advanced)
 * - Preserves spacing and punctuation
 * - Follows common leetspeak conventions
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Leetspeak character mappings by complexity level
 */
const LEETSPEAK_MAPS = {
  basic: {
    'a': '4',
    'e': '3',
    'i': '1',
    'o': '0',
    't': '7',
    's': '5',
    'l': '1',
  },
  medium: {
    'a': '4',
    'b': '8',
    'e': '3',
    'g': '9',
    'i': '1',
    'o': '0',
    't': '7',
    's': '5',
    'l': '1',
    'z': '2',
  },
  advanced: {
    'a': ['4', '@', '/\\'],
    'b': ['8', '|3', '13'],
    'c': ['(', '{', '<'],
    'd': ['|)', '|>', 'cl'],
    'e': ['3', '&', '€'],
    'f': ['|=', 'ph'],
    'g': ['9', '6', '&'],
    'h': ['#', '|-|', '}{'],
    'i': ['1', '!', '|'],
    'j': ['_|', '_/', ']'],
    'k': ['|<', '|{', '/<'],
    'l': ['1', '|', '|_'],
    'm': ['|v|', '/\\/\\', '|\\/|'],
    'n': ['|\\|', '/\\/', '^/'],
    'o': ['0', '()', '[]'],
    'p': ['|*', '|>', '|°'],
    'q': ['9', '0_', '()_'],
    'r': ['|2', '|?', '/2'],
    's': ['5', '$', 'z'],
    't': ['7', '+', '†'],
    'u': ['|_|', '(_)', 'µ'],
    'v': ['\\/', '|/', '\\_/'],
    'w': ['\\/\\/', 'vv', '\\^/'],
    'x': ['><', '}{', ')('],
    'y': ['`/', '¥', 'j'],
    'z': ['2', '7_', '%'],
  },
};

type LeetLevel = 'basic' | 'medium' | 'advanced';

/**
 * Convert text to leetspeak
 */
function convertToLeetspeak(text: string, level: LeetLevel): string {
  const map = LEETSPEAK_MAPS[level];
  let result = '';

  for (const char of text) {
    const lowerChar = char.toLowerCase();

    // Check if character has a leetspeak mapping
    if (lowerChar in map) {
      const replacement = map[lowerChar as keyof typeof map];

      if (Array.isArray(replacement)) {
        // For advanced level, randomly pick one of the variations
        const randomIndex = Math.floor(Math.random() * replacement.length);
        result += replacement[randomIndex];
      } else {
        // For basic/medium, use the single replacement
        result += replacement;
      }
    } else {
      // Keep original character (numbers, spaces, punctuation, etc.)
      result += char;
    }
  }

  return result;
}

export const translateToLeetspeakTool = tool({
  description: 'Translate normal text into l33tspeak (leetspeak/1337speak). Supports different complexity levels: basic (simple number substitutions), medium (more character replacements), and advanced (complex multi-character substitutions). Use this when users want to convert text to leetspeak, create playful messages, or generate 1337 text.',
  inputSchema: z.object({
    text: z.string().describe('The text to translate to leetspeak. Can include letters, numbers, spaces, and punctuation.'),
    level: z.enum(['basic', 'medium', 'advanced']).default('medium').describe('Complexity level: "basic" for simple substitutions (a=4, e=3, etc.), "medium" for more replacements, "advanced" for complex multi-character substitutions.'),
  }),
  execute: async ({ text, level }) => {
    try {
      console.log('🔤 Translate to Leetspeak: Processing translation...');
      console.log(`   📝 Text length: ${text.length} characters`);
      console.log(`   ⚙️  Level: ${level}`);

      const leetspeakText = convertToLeetspeak(text, level);

      console.log(`   ✨ Translation completed`);

      return {
        originalText: text,
        leetspeakText,
        level,
        success: true,
      };
    } catch (error) {
      console.error('Error in translateToLeetspeak tool:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to translate to leetspeak',
        success: false,
      };
    }
  },
});
