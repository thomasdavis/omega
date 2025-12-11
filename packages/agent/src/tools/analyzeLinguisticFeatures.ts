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
  const prompt = `You are an expert linguist performing deep, scholarly analysis. You have access to a comprehensive database of 800+ linguistic features covering phonology, morphology, syntax, semantics, and discourse.

# LINGUISTIC FEATURES DATABASE

This database catalogs linguistic parameters across multiple domains. Use these as your analytical framework:

${linguisticsData}

# TEXT TO ANALYZE

${messages}

# YOUR TASK

Analyze the conversation text through the lens of the linguistic features database above. Your goal is to find the **10 most interesting and relevant linguistic phenomena** in the conversation that connect to features in the database.

For each phenomenon you identify:

1. **Name the feature** using proper linguistic terminology (reference the database parameter IDs where relevant)
2. **Categorize it** (Phonological, Morphological, Syntactic, Semantic, Pragmatic, Discourse, Sociolinguistic)
3. **Explain the phenomenon** - what's happening linguistically and WHY it's interesting
4. **Quote examples** directly from the conversation
5. **Connect to theory** - relate it to the database features or broader linguistic concepts

# OUTPUT FORMAT

Write your analysis in **rich Markdown format**:

Start with a brief **Summary** paragraph (2-3 sentences) characterizing the linguistic profile of this conversation.

Then organize findings into thematic sections with emoji headers like:
- 🔵 **Semantic & Argument Structure** (agents, patients, instruments, thematic roles)
- 🟣 **Morphological Patterns** (word formation, affixation, compounding)
- 🟢 **Syntactic Features** (clause structure, word order, embedding)
- 🟡 **Pragmatic & Discourse** (speech acts, deixis, cohesion, register)
- 🔴 **Notable Alternations** (voice, valency, promotion/demotion)

Use:
- **Bold** for linguistic terms and feature names
- *Italics* for quoted examples
- \`code formatting\` for morphemes, phonemes, or specific forms
- Tables where systematic comparison helps (e.g., predicate-by-predicate analysis)
- > Blockquotes for longer examples
- Bullet points for lists of instances

Be thorough, analytical, and deeply engaged with the linguistic data. Don't just list features—explain their significance and interrelationships.

End with a brief note offering to explore specific aspects deeper (e.g., "I can provide deeper analysis of the inanimate actor constructions, or examine the nominalization patterns in more detail.").

# YOUR ANALYSIS`;

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
