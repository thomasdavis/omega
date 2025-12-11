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
 * Filter out automated/bot messages and keep only natural human conversation
 * Removes: tool calls, automated reports, raw URLs, JSON data, etc.
 */
function filterToNaturalConversation(messages: string): string {
  const lines = messages.split('\n');
  const filteredLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Skip lines that are just URLs
    if (/^https?:\/\/\S+$/.test(trimmed)) continue;

    // Skip tool call indicators
    if (/^🔧|^✅ Success|^❌|^Tool:|^Loading|^Loaded/.test(trimmed)) continue;

    // Skip JSON-like content
    if (/^\{.*\}$/.test(trimmed) || /^\[.*\]$/.test(trimmed)) continue;

    // Skip automated report headers with counts/stats
    if (/^\d+\s+(occurrences?|times?|results?)/.test(trimmed)) continue;
    if (/^-\s*"?\w+"?\s*\(\d+/.test(trimmed)) continue; // "- word (count)" patterns

    // Skip lines that are mostly technical metadata
    if (/^(id|timestamp|sender_type|channel_id|guild_id):/i.test(trimmed)) continue;

    // Skip GitHub issue/PR automated messages
    if (/^I've created issue #\d+|^Created PR|^Merged PR|^Closed issue/.test(trimmed)) continue;

    // Skip code blocks
    if (/^```/.test(trimmed)) continue;

    // Skip lines that are primarily URLs with minimal text
    const urlCount = (trimmed.match(/https?:\/\/\S+/g) || []).length;
    const wordCount = trimmed.split(/\s+/).length;
    if (urlCount > 0 && wordCount < urlCount * 3) continue;

    filteredLines.push(line);
  }

  return filteredLines.join('\n').trim();
}

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
    includeAutomatedMessages: z
      .boolean()
      .default(false)
      .optional()
      .describe('Whether to include automated bot messages like tool calls, URLs, and reports. Default is false (only analyze natural human/AI conversation).'),
  }),

  execute: async ({ messages, featureCount = 10, includeAutomatedMessages = false }) => {
    try {
      console.log('🔤 Linguistic Analysis: Analyzing conversation...');
      console.log(`   📄 Raw input length: ${messages.length} characters`);

      // Filter to natural conversation unless explicitly requested otherwise
      const filteredMessages = includeAutomatedMessages
        ? messages
        : filterToNaturalConversation(messages);

      console.log(`   📝 Filtered length: ${filteredMessages.length} characters`);
      console.log(`   🎯 Finding top ${featureCount} features`);

      if (!filteredMessages || filteredMessages.length < 50) {
        return {
          success: false,
          error: 'Not enough natural conversation content to analyze after filtering out automated messages.',
          features: [],
          summary: '',
          formattedOutput: '',
        };
      }

      const analysis = await analyzeLinguisticFeatures(filteredMessages, featureCount);
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
