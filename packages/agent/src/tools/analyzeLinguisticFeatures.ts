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
 * Analyze messages for linguistic features - produces rich markdown analysis
 */
async function analyzeLinguisticFeatures(
  messages: string,
  analysisType: string = 'general'
): Promise<string> {
  const analysisFrameworks: Record<string, string> = {
    general: `Provide a comprehensive linguistic analysis covering multiple frameworks. Include:
- **Semantic roles** (Agent, Patient, Instrument, Experiencer, etc.)
- **Syntactic patterns** (clause structure, word order, embedded clauses)
- **Morphological features** (derivation, inflection, compounding)
- **Pragmatic elements** (speech acts, implicature, presupposition)
- **Discourse features** (cohesion, topic management, register)

Use tables where appropriate to show patterns. Quote specific examples from the text.`,

    semantic_roles: `Perform a detailed **semantic role analysis** including:
- Identify all **Agents** (doers), **Patients** (undergoers), **Instruments** (tools/means)
- Note **Experiencers**, **Recipients**, **Beneficiaries**, **Locations**, **Goals**
- Highlight **inanimate actors** - non-sentient entities functioning as agents
- Show **actor-instrument alternations** where instruments are promoted to subject position
- Create a predicate-by-predicate table showing: Predicate | Actor | Patient | Instrument | Notes

This is especially interesting for technical/software discourse where tools often become grammatical agents.`,

    syntactic: `Perform a detailed **syntactic analysis** including:
- Clause types (main, subordinate, relative, complement)
- Phrase structure (NP, VP, PP patterns)
- Word order variations and information structure
- Coordination and subordination patterns
- Ellipsis and pro-forms
- Movement and displacement`,

    pragmatic: `Perform a detailed **pragmatic analysis** including:
- Speech act classification (assertives, directives, commissives, expressives, declarations)
- Implicature (conversational and conventional)
- Presupposition triggers
- Deixis (person, place, time, discourse, social)
- Politeness strategies
- Turn-taking and conversation structure`,

    morphological: `Perform a detailed **morphological analysis** including:
- Derivational processes (prefixation, suffixation, conversion)
- Inflectional patterns
- Compounding and blending
- Nominalization and verbalization
- Productive vs. lexicalized forms
- Technical jargon formation`,

    sociolinguistic: `Perform a detailed **sociolinguistic analysis** including:
- Register and style (formal/informal, technical/casual)
- Code-switching or style-shifting
- In-group markers and jargon
- Power dynamics in language choices
- Identity construction through language
- Community of practice markers`,
  };

  const frameworkPrompt = analysisFrameworks[analysisType] || analysisFrameworks.general;

  const prompt = `You are an expert linguist performing deep, scholarly analysis of natural language. Your analysis should be insightful, precise, and use proper linguistic terminology.

# TEXT TO ANALYZE

${messages}

# LINGUISTIC FEATURES REFERENCE DATABASE (for inspiration, not exhaustive)

${linguisticsData.slice(0, 8000)}

# YOUR TASK

${frameworkPrompt}

# OUTPUT FORMAT

Write your analysis in **rich Markdown format**. Use:
- Clear section headers with emoji markers (e.g., "# 🔵 Semantic Roles")
- **Bold** for key terms and linguistic labels
- *Italics* for examples and quoted text
- \`code formatting\` for specific morphemes or technical terms
- Tables for systematic comparisons
- Blockquotes (>) for extended examples from the text
- Bullet points for lists of instances

Be thorough, analytical, and specific. Quote directly from the text to support your analysis. Explain WHY patterns are linguistically interesting, not just WHAT they are.

At the end, offer 2-3 alternative analysis frameworks the user could request (e.g., "I can also provide: Dowty Proto-Agent/Proto-Patient analysis, Construction Grammar analysis, Systemic Functional Grammar analysis").

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
  description: `Perform deep linguistic analysis of conversation text. Produces scholarly, detailed analysis using proper linguistic frameworks and terminology. Can analyze semantic roles (agents, patients, instruments), syntactic structures, morphological patterns, pragmatics, and sociolinguistic features. Outputs rich markdown with tables, examples, and theoretical grounding. Use when someone asks to "analyze linguistic features" or wants to understand language patterns in a conversation.`,

  inputSchema: z.object({
    messages: z
      .string()
      .describe(
        'The conversation messages to analyze. Can be a summary or the actual message content from the conversation.'
      ),
    analysisType: z
      .enum(['general', 'semantic_roles', 'syntactic', 'pragmatic', 'morphological', 'sociolinguistic'])
      .default('general')
      .optional()
      .describe(
        'Type of linguistic analysis to perform: "general" (comprehensive), "semantic_roles" (agents, patients, instruments, inanimate actors), "syntactic" (clause structure, phrase patterns), "pragmatic" (speech acts, implicature), "morphological" (word formation), "sociolinguistic" (register, identity, jargon)'
      ),
    includeAutomatedMessages: z
      .boolean()
      .default(false)
      .optional()
      .describe(
        'Whether to include automated bot messages like tool calls, URLs, and reports. Default is false (only analyze natural human/AI conversation).'
      ),
  }),

  execute: async ({ messages, analysisType = 'general', includeAutomatedMessages = false }) => {
    try {
      console.log('🔤 Linguistic Analysis: Analyzing conversation...');
      console.log(`   📄 Raw input length: ${messages.length} characters`);
      console.log(`   🎯 Analysis type: ${analysisType}`);

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

      const analysis = await analyzeLinguisticFeatures(filteredMessages, analysisType);

      console.log(`   ✅ Analysis complete`);
      console.log(`   📊 Output length: ${analysis.length} characters`);

      return {
        success: true,
        analysisType,
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
