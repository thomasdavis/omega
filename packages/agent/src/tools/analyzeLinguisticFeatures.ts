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
 * Analyze messages for linguistic features using the comprehensive linguistics database
 */
async function analyzeLinguisticFeatures(messages: string): Promise<string> {
  const prompt = `You are an expert linguist. You have a database of linguistic features below.

# LINGUISTIC FEATURES DATABASE

${linguisticsData}

# TEXT TO ANALYZE

${messages}

# YOUR TASK

Find the **10 most interesting linguistic features** from the database above that appear in or relate to this conversation.

For each one:
- Name the feature (reference the Parameter_ID from the database)
- Explain what's interesting about how it appears in this conversation
- Give a specific example from the text

Write in rich markdown. Be deep, analytical, and specific. Use tables if helpful.`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    return result.text.trim();
  } catch (error) {
    console.error('Error analyzing linguistic features:', error);
    return 'Analysis failed due to technical difficulties. Please try again.';
  }
}

export const analyzeLinguisticFeaturesTool = tool({
  description: `Perform deep linguistic analysis of conversation text using a comprehensive database of 800+ linguistic features. Analyzes semantic roles (agents, patients, instruments, inanimate actors), syntactic structures, morphological patterns, pragmatics, and discourse features. Outputs rich scholarly markdown with tables, quoted examples, and theoretical grounding. Use when someone asks to "analyze linguistic features" or wants to understand language patterns in a conversation.`,

  inputSchema: z.object({
    messages: z
      .string()
      .describe(
        'The conversation messages to analyze. Should be the actual message content from the conversation.'
      ),
    includeAutomatedMessages: z
      .boolean()
      .default(false)
      .optional()
      .describe(
        'Whether to include automated bot messages like tool calls, URLs, and reports. Default is false (only analyze natural human/AI conversation).'
      ),
  }),

  execute: async ({ messages, includeAutomatedMessages = false }) => {
    try {
      console.log('🔤 Linguistic Analysis: Analyzing conversation...');
      console.log(`   📄 Raw input length: ${messages.length} characters`);

      // Filter to natural conversation unless explicitly requested otherwise
      const filteredMessages = includeAutomatedMessages
        ? messages
        : filterToNaturalConversation(messages);

      console.log(`   📝 Filtered length: ${filteredMessages.length} characters`);

      if (!filteredMessages || filteredMessages.length < 50) {
        return {
          success: false,
          error:
            'Not enough natural conversation content to analyze after filtering out automated messages.',
          analysis: '',
        };
      }

      const analysis = await analyzeLinguisticFeatures(filteredMessages);

      console.log(`   ✅ Analysis complete`);
      console.log(`   📊 Output length: ${analysis.length} characters`);

      return {
        success: true,
        analysis,
      };
    } catch (error) {
      console.error('Error in linguistic analysis tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze linguistic features',
        analysis: '',
      };
    }
  },
});
