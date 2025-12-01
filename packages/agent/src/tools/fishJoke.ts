/**
 * Fish Joke Tool
 * Generates hilarious fish-themed jokes using the fish-joke-generator package
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getRandomFishJoke, type JokeCategory } from 'fish-joke-generator';

export const fishJokeTool = tool({
  description: 'Generate a hilarious fish-themed joke. Perfect for adding humor to conversations!',
  inputSchema: z.object({
    category: z
      .enum(['pun', 'dad', 'ocean', 'random'])
      .optional()
      .describe('The category of fish joke to generate'),
    rating: z
      .enum(['family-friendly', 'groan-worthy', 'fin-tastic'])
      .optional()
      .describe('The rating/style of the joke'),
  }),
  execute: async ({ category, rating }) => {
    try {
      const joke = getRandomFishJoke(category as JokeCategory);

      return {
        setup: joke.setup,
        punchline: joke.punchline,
        category: joke.category,
        rating: joke.rating || 'family-friendly',
        success: true,
      };
    } catch (error) {
      return {
        setup: 'What do you call a fish with no eyes?',
        punchline: 'A fsh!',
        category: 'pun' as const,
        rating: 'family-friendly' as const,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
