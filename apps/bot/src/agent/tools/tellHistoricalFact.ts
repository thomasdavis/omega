/**
 * Tell Historical Fact Tool - Generates interesting historical facts from customizable time periods
 *
 * Features:
 * - AI-generated historical facts from any time period
 * - Default: facts from 1000 years ago
 * - Customizable year offset (e.g., 2000 years ago, 500 years ago)
 * - Succinct, shareable, and engaging facts
 * - Context-aware based on conversation topics
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../../config/models.js';

/**
 * Generate a historical fact using AI based on year offset
 */
async function generateHistoricalFact(
  yearsAgo: number,
  channelName?: string,
  recentTopics?: string
): Promise<{
  fact: string;
  year: number;
  category: string;
}> {
  const currentYear = new Date().getFullYear();
  const targetYear = currentYear - yearsAgo;

  // Build context-aware guidance
  let contextGuidance = '';
  if (channelName || recentTopics) {
    contextGuidance = '\n\nContext for making the fact more relevant:';
    if (channelName) {
      contextGuidance += `\n- Channel: #${channelName}`;
    }
    if (recentTopics) {
      contextGuidance += `\n- Recent conversation topics: ${recentTopics}`;
      contextGuidance += '\n- TRY to find a historical fact that relates to these topics if possible, but prioritize interesting and accurate facts over forced relevance.';
    }
  }

  const prompt = `Generate an interesting historical fact from approximately ${yearsAgo} years ago (around the year ${targetYear}).

Guidelines:
- The fact should be interesting, surprising, or educational
- Keep it succinct and shareable (1-3 sentences maximum)
- Focus on events, discoveries, cultural milestones, or notable achievements
- Be accurate and historically sound
- Make it engaging and conversation-worthy
- Include the specific year if known, or approximate if not certain${contextGuidance}

Respond in JSON format:
{
  "fact": "The historical fact (1-3 sentences)",
  "year": ${targetYear},
  "category": "Brief category like 'Science', 'Politics', 'Culture', 'Technology', 'Exploration', etc."
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      fact: parsed.fact,
      year: parsed.year || targetYear,
      category: parsed.category || 'History',
    };
  } catch (error) {
    console.error('Error generating historical fact:', error);
    // Fallback fact in case of error
    return {
      fact: `Around the year ${targetYear}, humanity was experiencing significant changes in culture, technology, and society. Unfortunately, I couldn't retrieve a specific fact at this time.`,
      year: targetYear,
      category: 'General',
    };
  }
}

export const tellHistoricalFactTool = tool({
  description: 'Generate an interesting historical fact from a specific time period in the past. By default, provides a fact from 1000 years ago, but can be customized to any year offset (e.g., 500, 2000, 5000 years ago). Facts are AI-generated, historically accurate, and designed to be engaging and shareable. Use this when users want to learn about history or explore events from different time periods.',
  inputSchema: z.object({
    yearsAgo: z.number().optional().default(1000).describe('Number of years in the past to generate a fact from. Default is 1000 years ago. Examples: 500, 2000, 5000.'),
    channelName: z.string().optional().describe('Optional name of the current channel/room. Helps contextualize the fact.'),
    recentTopics: z.string().optional().describe('Optional brief summary of recent conversation topics (e.g., "discussing space exploration and technology"). Helps make the historical fact contextually relevant.'),
  }),
  execute: async ({ yearsAgo = 1000, channelName, recentTopics }) => {
    try {
      console.log(`📜 Tell Historical Fact: Generating fact from ${yearsAgo} years ago...`);
      if (channelName) {
        console.log(`   📍 Channel: #${channelName}`);
      }
      if (recentTopics) {
        console.log(`   💬 Context: ${recentTopics}`);
      }

      const factData = await generateHistoricalFact(yearsAgo, channelName, recentTopics);

      console.log(`   📂 Category: ${factData.category}`);
      console.log(`   📅 Year: ${factData.year}`);
      console.log(`   ✨ Fact: ${factData.fact.substring(0, 100)}...`);

      return {
        fact: factData.fact,
        year: factData.year,
        yearsAgo,
        category: factData.category,
        contextUsed: !!(channelName || recentTopics),
        success: true,
      };
    } catch (error) {
      console.error('Error generating historical fact:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to generate historical fact',
        success: false,
      };
    }
  },
});
