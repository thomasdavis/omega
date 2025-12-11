/**
 * Analyze Linguistic Features Tool
 * Analyzes conversation messages to identify interesting linguistic features
 * Uses the linguistics database to find patterns in the discussion
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';
import linguisticsData from '../linguistics.js';

/**
 * Analyze messages for linguistic features
 */
async function analyzeLinguisticFeatures(
  messages: string,
  featureCount: number = 10
): Promise<{
  features: Array<{
    rank: number;
    featureName: string;
    category: string;
    explanation: string;
    example: string;
  }>;
  summary: string;
}> {
  const prompt = `You are a linguistics expert analyzing a conversation for interesting linguistic features.

CONVERSATION TO ANALYZE:
${messages}

AVAILABLE LINGUISTIC FEATURES DATABASE (CSV format):
${linguisticsData}

YOUR TASK:
Analyze the conversation above and identify the ${featureCount} most interesting linguistic features that appear in it. For each feature:

1. Look at what linguistic phenomena occur in the conversation (e.g., phonological patterns if discussing pronunciation, morphological features like case or tense usage, syntactic structures, discourse patterns, etc.)

2. Map these to relevant features from the linguistics database OR identify general linguistic features that would be interesting to note

3. Explain WHY each feature is interesting in the context of THIS specific conversation

Categories to consider:
- Phonological (sound patterns, pronunciation discussions)
- Morphological (word formation, affixes, case systems)
- Syntactic (sentence structure, word order, clause types)
- Semantic (meaning, ambiguity, metaphor)
- Pragmatic (context, implicature, speech acts)
- Discourse (conversation flow, topic management, cohesion)
- Sociolinguistic (register, formality, code-switching)

Respond in JSON format:
{
  "features": [
    {
      "rank": 1,
      "featureName": "Name of the linguistic feature",
      "category": "Category (Phonological/Morphological/Syntactic/Semantic/Pragmatic/Discourse/Sociolinguistic)",
      "explanation": "Why this feature is interesting in this conversation",
      "example": "A specific quote or example from the conversation demonstrating this feature"
    }
  ],
  "summary": "A brief 2-3 sentence summary of the most notable linguistic aspects of this conversation"
}

Be specific, insightful, and relate features directly to what's happening in the conversation.`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    // Clean up potential markdown code blocks
    let cleanedText = result.text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.slice(7);
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(0, -3);
    }

    const parsed = JSON.parse(cleanedText.trim());

    return {
      features: parsed.features || [],
      summary: parsed.summary || '',
    };
  } catch (error) {
    console.error('Error analyzing linguistic features:', error);
    return {
      features: [],
      summary: 'Analysis failed due to technical difficulties. Please try again.',
    };
  }
}

/**
 * Format the analysis results for display
 */
function formatAnalysis(analysis: {
  features: Array<{
    rank: number;
    featureName: string;
    category: string;
    explanation: string;
    example: string;
  }>;
  summary: string;
}): string {
  let output = `**Linguistic Analysis Summary**\n${analysis.summary}\n\n`;
  output += `**Top ${analysis.features.length} Linguistic Features Found:**\n\n`;

  for (const feature of analysis.features) {
    output += `**${feature.rank}. ${feature.featureName}** _(${feature.category})_\n`;
    output += `${feature.explanation}\n`;
    output += `> "${feature.example}"\n\n`;
  }

  return output;
}

export const analyzeLinguisticFeaturesTool = tool({
  description: `Analyze the conversation for interesting linguistic features. This tool examines messages from the current conversation and identifies the most notable linguistic phenomena, including phonological patterns, morphological structures, syntactic features, semantic elements, pragmatic aspects, and discourse patterns. Perfect for understanding how language is being used in a discussion. Use when someone asks to "analyze linguistic features" or wants to understand the language patterns in a conversation.`,

  inputSchema: z.object({
    messages: z
      .string()
      .describe(
        'The conversation messages to analyze. Can be a summary or the actual message content from the conversation.'
      ),
    featureCount: z
      .number()
      .min(1)
      .max(20)
      .default(10)
      .optional()
      .describe('Number of linguistic features to identify (default: 10, max: 20)'),
  }),

  execute: async ({ messages, featureCount = 10 }) => {
    try {
      console.log('🔤 Linguistic Analysis: Analyzing conversation...');
      console.log(`   📄 Input length: ${messages.length} characters`);
      console.log(`   🎯 Finding top ${featureCount} features`);

      const analysis = await analyzeLinguisticFeatures(messages, featureCount);
      const formattedOutput = formatAnalysis(analysis);

      console.log(`   ✅ Analysis complete`);
      console.log(`   📊 Found ${analysis.features.length} features`);

      return {
        success: true,
        featureCount: analysis.features.length,
        features: analysis.features,
        summary: analysis.summary,
        formattedOutput,
      };
    } catch (error) {
      console.error('Error in linguistic analysis tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze linguistic features',
        features: [],
        summary: '',
        formattedOutput: '',
      };
    }
  },
});
