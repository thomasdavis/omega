/**
 * Tell a Joke Tool - Generates jokes dynamically using AI
 *
 * Features:
 * - AI-generated jokes tailored to various categories
 * - Context-aware and original humor
 * - Fresh, varied jokes every time
 * - Supports multiple joke styles (tech, classic, puns, dad jokes, programming, one-liners)
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../../config/models.js';

// Available joke categories
const JOKE_CATEGORIES = [
  'tech',
  'classic',
  'puns',
  'dad',
  'programming',
  'oneliners',
] as const;

type JokeCategory = typeof JOKE_CATEGORIES[number];

/**
 * Generate a joke using AI based on category
 */
async function generateJoke(category?: string): Promise<{
  setup: string;
  punchline: string;
  category: string;
}> {
  // Select category
  const selectedCategory =
    category && JOKE_CATEGORIES.includes(category as JokeCategory)
      ? category
      : JOKE_CATEGORIES[Math.floor(Math.random() * JOKE_CATEGORIES.length)];

  // Build category-specific guidance
  const categoryGuidance: Record<string, string> = {
    tech: 'Create a joke about technology, computers, software, hardware, or tech culture. Keep it clever and relevant to modern tech.',
    classic: 'Create a classic-style joke with universal appeal. Think timeless, family-friendly humor with a clear setup and punchline.',
    puns: 'Create a pun-based joke. Use wordplay, double meanings, or clever linguistic twists. Make it groan-worthy in the best way.',
    dad: 'Create a dad joke - wholesome, punny, and delightfully corny. The kind that makes people roll their eyes while smiling.',
    programming: 'Create a programming joke. Reference coding concepts, languages, algorithms, or developer culture. Make it clever for programmers.',
    oneliners: 'Create a witty one-liner or observational joke. No setup needed - just a clever, punchy statement. Can be tech-related.',
  };

  const prompt = `Generate a ${selectedCategory} joke following these guidelines:

${categoryGuidance[selectedCategory]}

Requirements:
- Be original and creative (avoid overused jokes)
- Keep it appropriate and inclusive
- Make it genuinely funny, not forced
- For setup-punchline jokes: create clear separation
- For one-liners: make it punchy and self-contained
- Length: setup should be 5-20 words, punchline 5-15 words (or empty for one-liners)

Respond in JSON format:
{
  "setup": "The joke setup or the complete one-liner",
  "punchline": "The punchline, or empty string for one-liners"
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      setup: parsed.setup,
      punchline: parsed.punchline || '',
      category: selectedCategory,
    };
  } catch (error) {
    console.error('Error generating joke:', error);
    // Fallback joke in case of error
    return {
      setup: "Why did the AI refuse to tell a joke?",
      punchline: "It was afraid of getting a bad response!",
      category: selectedCategory,
    };
  }
}

/**
 * Format joke for display
 */
function formatJoke(setup: string, punchline: string): string {
  if (!punchline) {
    // One-liner format
    return setup;
  }
  return `${setup}\n\n${punchline}`;
}

export const tellJokeTool = tool({
  description: 'Generate and tell an AI-powered joke from various categories (tech, classic, puns, dad, programming, oneliners). Each joke is uniquely generated for fresh, original humor. Use this when users want to hear a joke or need some lighthearted fun.',
  inputSchema: z.object({
    category: z.string().optional().describe('Optional category: tech, classic, puns, dad, programming, or oneliners. If not specified, a random category will be chosen.'),
  }),
  execute: async ({ category }) => {
    try {
      console.log('😄 Tell Joke: Generating an AI-powered joke...');

      const jokeData = await generateJoke(category);
      const formattedJoke = formatJoke(jokeData.setup, jokeData.punchline);

      console.log(`   📂 Category: ${jokeData.category}`);
      console.log(`   ✨ Generated: ${jokeData.setup}`);

      return {
        joke: formattedJoke,
        category: jokeData.category,
        setup: jokeData.setup,
        punchline: jokeData.punchline || null,
        availableCategories: Array.from(JOKE_CATEGORIES),
        success: true,
      };
    } catch (error) {
      console.error('Error generating joke:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to generate joke',
        success: false,
      };
    }
  },
});
