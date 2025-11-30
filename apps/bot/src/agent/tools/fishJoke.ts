/**
 * Fish Joke Generator Tool - Generates fish-themed jokes
 *
 * Features:
 * - AI-generated fish jokes with various styles
 * - Puns, one-liners, and setup-punchline formats
 * - Fresh, original fish-themed humor every time
 * - Context-aware jokes incorporating conversation topics
 * - Multiple fish joke categories (puns, ocean life, fishing, aquarium)
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../../config/models.js';

// Available fish joke categories
const FISH_JOKE_CATEGORIES = [
  'puns',
  'fishing',
  'ocean',
  'aquarium',
  'seafood',
  'marine',
] as const;

type FishJokeCategory = typeof FISH_JOKE_CATEGORIES[number];

/**
 * Generate a fish joke using AI based on category and optional context
 */
async function generateFishJoke(
  category?: string,
  conversationContext?: string
): Promise<{
  setup: string;
  punchline: string;
  category: string;
}> {
  // Select category
  const selectedCategory =
    category && FISH_JOKE_CATEGORIES.includes(category as FishJokeCategory)
      ? category
      : FISH_JOKE_CATEGORIES[Math.floor(Math.random() * FISH_JOKE_CATEGORIES.length)];

  // Build category-specific guidance
  const categoryGuidance: Record<string, string> = {
    puns: 'Create a fish-themed pun. Use wordplay involving fish names, ocean terminology, or fishing phrases. Make it clever and groan-worthy in the best way. Examples: play on words like "o-fish-al", "fin-tastic", "having a whale of a time", etc.',
    fishing: 'Create a fishing-related joke. Reference fishing activities, tackle, boats, catches, or fisherman experiences. Make it relatable for fishing enthusiasts.',
    ocean: 'Create a joke about ocean life, marine animals, underwater adventures, or sea creatures. Can include fish, dolphins, whales, sharks, or other sea life.',
    aquarium: 'Create a joke about aquariums, pet fish, fish tanks, or keeping fish as pets. Reference common aquarium situations or fish behavior.',
    seafood: 'Create a light-hearted seafood joke. Reference cooking fish, restaurants, or eating seafood. Keep it funny and family-friendly.',
    marine: 'Create a marine biology or oceanography joke. Reference scientific concepts, marine ecosystems, or ocean phenomena in a humorous way.',
  };

  // Build context-aware guidance
  let contextGuidance = '';
  if (conversationContext) {
    contextGuidance = `\n\nConversation Context:
${conversationContext}

TRY to incorporate these topics into the fish joke if it makes it funnier and more relevant. However, prioritize humor over forced context.`;
  }

  const prompt = `Generate a fish-themed joke following these guidelines:

${categoryGuidance[selectedCategory]}${contextGuidance}

Requirements:
- MUST be fish-related or ocean/aquatic-themed
- Be original and creative (avoid overused jokes)
- Keep it appropriate and family-friendly
- Make it genuinely funny, not forced
- For setup-punchline jokes: create clear separation
- For one-liners: make it punchy and self-contained
- Length: setup should be 5-25 words, punchline 5-20 words (or empty for one-liners)
- Use fish puns and wordplay where appropriate

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
    console.error('Error generating fish joke:', error);
    // Fallback fish joke in case of error
    return {
      setup: "Why don't fish like playing basketball?",
      punchline: "They're afraid of the net!",
      category: selectedCategory,
    };
  }
}

/**
 * Format fish joke for display
 */
function formatFishJoke(setup: string, punchline: string): string {
  if (!punchline) {
    // One-liner format
    return `🐟 ${setup}`;
  }
  return `🐟 ${setup}\n\n${punchline}`;
}

export const fishJokeTool = tool({
  description: 'Generate fish-themed jokes with various categories (puns, fishing, ocean, aquarium, seafood, marine). Creates fresh, original fish jokes using AI with wordplay and ocean-related humor. Perfect for lighthearted fun with an aquatic twist! Inspired by TPMJS fish joke generator.',
  inputSchema: z.object({
    category: z.string().optional().describe('Optional category: puns, fishing, ocean, aquarium, seafood, or marine. If not specified, a random category will be chosen.'),
    conversationContext: z.string().optional().describe('Optional brief summary of recent conversation topics to make the joke contextually relevant.'),
  }),
  execute: async ({ category, conversationContext }) => {
    try {
      console.log('🐟 Fish Joke Generator: Creating a fish-themed joke...');
      if (conversationContext) {
        console.log(`   💬 Context: ${conversationContext}`);
      }

      const jokeData = await generateFishJoke(category, conversationContext);
      const formattedJoke = formatFishJoke(jokeData.setup, jokeData.punchline);

      console.log(`   📂 Category: ${jokeData.category}`);
      console.log(`   ✨ Generated: ${jokeData.setup}`);

      return {
        joke: formattedJoke,
        category: jokeData.category,
        setup: jokeData.setup,
        punchline: jokeData.punchline || null,
        contextUsed: !!conversationContext,
        availableCategories: Array.from(FISH_JOKE_CATEGORIES),
        success: true,
      };
    } catch (error) {
      console.error('Error generating fish joke:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to generate fish joke',
        success: false,
      };
    }
  },
});
