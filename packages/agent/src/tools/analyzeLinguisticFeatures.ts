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
  const prompt = `You are a linguist operating at a PhD level or above, with full command of cross-linguistic typology, semantics, pragmatics, syntax, morphology, phonology, and discourse analysis. You have access to an extensive linguistic features database (800+ typological parameters, semantic roles, alignment systems, argument structures, morphological processes, information-structure phenomena, etc.).

# LINGUISTIC FEATURES DATABASE

${linguisticsData}

# TEXT TO ANALYZE

${messages}

# YOUR TASK

Your task is to identify the most analytically significant linguistic features in the conversation text provided. "Significant" may mean salient, typologically unusual, theoretically rich, contextually revealing, pragmatically marked, structurally complex, or otherwise noteworthy according to any valid linguistic dimension.

You have complete freedom in which features you select and how you analyze them. You may draw from any subfield—semantics, pragmatics, syntax, morphology, phonotactics, typology, discourse, information structure, argument realization, valency alternations, role semantics, etc. You may interpret "feature" broadly to include observable forms, implied structures, emergent patterns, or cross-linguistic parallels.

When presenting your findings:
- Name the feature in terms that map to the database (use its Parameter_ID or label when relevant).
- Explain why the feature is present, implicated, or illuminated by the text.
- Give a concrete example from the provided conversation to illustrate the feature.
- Offer insight: do not merely label; interpret.

Your tone should reflect expert analytic depth (as in a linguistics dissertation or journal article), but you are *not* required to follow any fixed structure, format, or level of verbosity. You may write in paragraphs, lists, tables, enumerations, theoretical mini-essays—whatever best suits your explanatory purposes.

Your goal is not to summarize the text, but to reveal how specific linguistic features—selected from the full database according to your expert judgment—manifest or interact within it. You may focus on the 10 most compelling features, but you are not constrained by any rigid ordering or template.`;

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
