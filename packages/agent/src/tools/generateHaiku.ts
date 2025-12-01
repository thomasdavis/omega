/**
 * Generate Haiku Tool - Creates traditional Japanese haikus
 *
 * Features:
 * - AI-generated haikus following 5-7-5 syllable structure
 * - Support for optional themes or topics
 * - Context-aware poetry based on conversation
 * - Fresh, original poetry on demand
 * - Multiple seasonal and thematic styles
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

// Available haiku themes
const HAIKU_THEMES = [
  'nature',
  'seasons',
  'technology',
  'emotions',
  'urban',
  'zen',
  'everyday',
  'custom',
] as const;

type HaikuTheme = typeof HAIKU_THEMES[number];

// Traditional Japanese seasons (kigo) for haiku
const SEASONS = [
  'spring',
  'summer',
  'autumn',
  'winter',
  'any',
] as const;

type Season = typeof SEASONS[number];

/**
 * Generate a haiku using AI based on theme and context
 */
async function generateHaiku(
  theme: HaikuTheme,
  season?: Season,
  conversationContext?: string,
  customTopic?: string
): Promise<{
  haiku: string;
  theme: string;
  season?: string;
  analysis: string;
}> {
  // Build theme-specific guidance
  const themeGuidance: Record<HaikuTheme, string> = {
    nature: `Nature-focused haiku:
- Observe natural phenomena (plants, animals, weather, landscapes)
- Capture a moment in nature with vivid sensory details
- Show the relationship between nature and human experience
- Use concrete imagery from the natural world
- Create a sense of awe, beauty, or quiet observation`,

    seasons: `Seasonal haiku (kigo):
- Include a seasonal reference word (kigo) appropriate to the season
- Capture the essence and feeling of the season
- Use traditional seasonal imagery (cherry blossoms for spring, snow for winter, etc.)
- Reflect seasonal changes and their emotional resonance
- Honor the Japanese tradition of seasonal awareness`,

    technology: `Technology-themed haiku:
- Explore modern technology and digital life
- Find poetry in contemporary experiences (coding, devices, internet)
- Contrast technological and natural/human elements
- Use precise technical imagery
- Create fresh metaphors for our digital age`,

    emotions: `Emotion-focused haiku:
- Capture a specific emotional moment or feeling
- Use sensory details to evoke emotion rather than stating it directly
- Show the emotion through imagery and juxtaposition
- Create an emotional resonance or "aha" moment
- Be subtle and suggestive rather than explicit`,

    urban: `Urban life haiku:
- Observe city scenes and modern life
- Find beauty or meaning in urban environments
- Capture everyday moments in cityscapes
- Use contemporary imagery (buildings, traffic, crowds)
- Show the human experience in urban settings`,

    zen: `Zen/contemplative haiku:
- Express spiritual insight or moment of awareness
- Use simple, direct language
- Create a sense of stillness or clarity
- Suggest deeper meaning through simple observation
- Embrace paradox, emptiness, or sudden insight`,

    everyday: `Everyday life haiku:
- Capture ordinary moments with fresh eyes
- Find poetry in mundane activities
- Show universal human experiences
- Use familiar imagery in new ways
- Celebrate the beauty in simplicity`,

    custom: `Custom haiku:
- Follow the traditional 5-7-5 syllable structure
- Create vivid imagery through concrete details
- Use a "cutting" or juxtaposition between images
- Capture a single moment in time
- Leave room for the reader's interpretation`,
  };

  // Build seasonal guidance if provided
  let seasonalGuidance = '';
  if (season && season !== 'any') {
    const seasonalImages: Record<Exclude<Season, 'any'>, string> = {
      spring: 'cherry blossoms, new growth, warming weather, birds returning, fresh rain, budding flowers, gentle breeze',
      summer: 'heat, cicadas, fireflies, lush greenery, thunderstorms, long days, bright sun, swimming',
      autumn: 'falling leaves, harvest moon, cooling air, migrating birds, chrysanthemums, shorter days, mist',
      winter: 'snow, bare branches, cold wind, frost, ice, hibernation, short days, stillness',
    };

    seasonalGuidance = `\n\nSeasonal Focus: ${season}
- Include imagery associated with ${season}: ${seasonalImages[season]}
- Capture the feeling and atmosphere of ${season}
- Use a traditional seasonal reference (kigo) if appropriate`;
  }

  // Build context analysis
  let contextGuidance = '';
  if (conversationContext) {
    contextGuidance = `\n\nConversation Context to Inspire the Haiku:
${conversationContext}

Based on this context:
- Extract key themes, images, or emotions discussed
- Create a haiku that reflects or comments on the conversation
- Make poetic connections to the topics mentioned
- The haiku should feel relevant while being artistically independent`;
  }

  // Add custom topic guidance
  let topicGuidance = '';
  if (customTopic) {
    topicGuidance = `\n\nSpecific Topic: ${customTopic}
- Center the haiku around this topic
- Find fresh imagery and perspective
- Make it specific and concrete rather than abstract`;
  }

  const prompt = `Generate a haiku following these guidelines:

Traditional Haiku Structure:
- Line 1: 5 syllables
- Line 2: 7 syllables
- Line 3: 5 syllables
- Total: 17 syllables in a 5-7-5 pattern

Core Haiku Principles:
- Focus on a single moment or observation
- Use concrete, sensory imagery (what you see, hear, smell, touch, taste)
- Create juxtaposition or "cutting" between two images
- Avoid abstract language and metaphysical concepts
- Show, don't tell - let the images speak
- Leave room for the reader's interpretation
- Capture the essence of a fleeting moment
- Use present tense to create immediacy

${themeGuidance[theme]}${seasonalGuidance}${contextGuidance}${topicGuidance}

Requirements:
- STRICT 5-7-5 syllable count (verify each line carefully)
- Use vivid, concrete imagery
- Create a moment of insight or awareness
- Avoid clichés and tired imagery
- Make it fresh and original
- Ensure proper syllable counting (this is critical!)

Respond in JSON format:
{
  "haiku": "The complete haiku with line breaks (use \\n between lines)",
  "analysis": "A brief 1-2 sentence explanation of the imagery and moment captured in the haiku"
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      haiku: parsed.haiku,
      theme,
      season,
      analysis: parsed.analysis,
    };
  } catch (error) {
    console.error('Error generating haiku:', error);
    // Fallback haiku in case of error
    return {
      haiku: `Code compiles at last\nGreen tests light up the console\nPeace fills the server`,
      theme,
      season,
      analysis: "A moment of satisfaction when code finally works, capturing the zen of successful programming.",
    };
  }
}

export const generateHaikuTool = tool({
  description: 'Generate traditional Japanese haikus following the 5-7-5 syllable structure. Creates fresh, original poetry on demand with support for various themes (nature, seasons, technology, emotions, urban, zen, everyday life). Can incorporate conversation context or specific topics. Perfect for poetic expression, creative writing, and capturing moments in verse.',
  inputSchema: z.object({
    theme: z.enum(['nature', 'seasons', 'technology', 'emotions', 'urban', 'zen', 'everyday', 'custom']).optional().describe('Haiku theme (default: nature). Determines the style and imagery focus of the haiku.'),
    season: z.enum(['spring', 'summer', 'autumn', 'winter', 'any']).optional().describe('Seasonal focus for the haiku (default: any). Includes traditional Japanese seasonal references (kigo) when specified.'),
    conversationContext: z.string().optional().describe('Recent conversation context or topics to inspire the haiku. Include relevant messages, themes, or topics discussed. The AI will create a contextually relevant haiku.'),
    customTopic: z.string().optional().describe('Specific topic or subject for the haiku (e.g., "morning coffee", "city lights", "first snow"). If not provided, will be creative or derived from conversation context.'),
  }),
  execute: async ({ theme = 'nature', season = 'any', conversationContext, customTopic }) => {
    try {
      console.log(`🌸 Generate Haiku: Creating a ${theme} haiku...`);
      if (season && season !== 'any') {
        console.log(`   🍂 Season: ${season}`);
      }
      if (conversationContext) {
        console.log(`   💬 Using conversation context (${conversationContext.length} chars)`);
      }
      if (customTopic) {
        console.log(`   🎯 Topic: ${customTopic}`);
      }

      const haikuData = await generateHaiku(
        theme,
        season,
        conversationContext,
        customTopic
      );

      console.log(`   ✨ Generated haiku successfully`);

      return {
        success: true,
        haiku: haikuData.haiku,
        theme: haikuData.theme,
        season: haikuData.season || 'any',
        analysis: haikuData.analysis,
        contextUsed: !!conversationContext,
        topicUsed: customTopic || 'thematic',
        availableThemes: Array.from(HAIKU_THEMES),
        availableSeasons: Array.from(SEASONS),
        formattedOutput: `${haikuData.haiku}\n\n*${haikuData.analysis}*\n\n—\n*Theme: ${theme}${season && season !== 'any' ? ` | Season: ${season}` : ''}*`,
      };
    } catch (error) {
      console.error('Error generating haiku:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate haiku',
      };
    }
  },
});
