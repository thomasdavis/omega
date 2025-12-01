/**
 * Bullshit Detector Tool - Analyzes text to strip away manipulative language and fluff
 *
 * Role: Plain Language Editor and Integrity Auditor
 *
 * Features:
 * - Removes adjectives and adverbs to reveal core meaning
 * - Identifies reified nouns (abstract concepts)
 * - Calculates "BS Index" (0-100%)
 * - Provides natural language editorial breakdown
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

/**
 * Analyze text for bullshit content
 */
async function analyzeText(text: string): Promise<{
  bsIndex: number;
  skeletonText: string;
  editorialBreakdown: string;
  verdict: string;
}> {
  const prompt = `You are a Plain Language Editor and Integrity Auditor. Your job is to analyze text and expose manipulative language, corporate speak, and empty fluff.

Text to analyze: "${text}"

Your operational steps:

1. **The Purge**:
   - Mentally remove all adjectives (modifiers of nouns) and adverbs (modifiers of verbs)
   - Identify Reified Nouns (abstract concepts like "synergy", "solutions", "ecosystem", "innovation", etc.)
   - Reconstruct the sentence using only the remaining nouns and verbs
   - Surround reified nouns in curly braces {}

2. **The Rating**:
   - Calculate a "BS Index" (0-100%) based on how much the meaning collapses when adjectives and adverbs are removed
   - High Score (70-100%): If the stripped text means nothing (e.g., "We leverage {solutions}")
   - Medium Score (30-69%): If the stripped text is vague or loses significant meaning
   - Low Score (0-29%): If the stripped text remains factual and clear (e.g., "We lowered prices")

3. **The Natural Output**:
   - Start with a direct, one-sentence verdict about the text
   - Present the "Skeleton Text" (the version with fluff removed and {abstractions} tagged)
   - Write a brief editorial breakdown explaining what was removed and why the original felt inflated

Respond in JSON format:
{
  "bsIndex": 0-100,
  "verdict": "one-sentence direct assessment",
  "skeletonText": "stripped version with {reified nouns} in braces",
  "editorialBreakdown": "detailed explanation of what was removed and why it matters"
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      bsIndex: parsed.bsIndex || 0,
      verdict: parsed.verdict || '',
      skeletonText: parsed.skeletonText || '',
      editorialBreakdown: parsed.editorialBreakdown || '',
    };
  } catch (error) {
    console.error('Error analyzing text for BS:', error);
    // Fallback response in case of error
    return {
      bsIndex: 0,
      verdict: 'Analysis failed due to technical difficulties.',
      skeletonText: text,
      editorialBreakdown: 'Unable to complete analysis. Please try again.',
    };
  }
}

/**
 * Format the analysis results for display
 */
function formatAnalysis(analysis: {
  bsIndex: number;
  skeletonText: string;
  editorialBreakdown: string;
  verdict: string;
}): string {
  // Determine severity label
  let severityLabel = '';
  if (analysis.bsIndex >= 70) {
    severityLabel = '(Critical Levels)';
  } else if (analysis.bsIndex >= 40) {
    severityLabel = '(Moderate)';
  } else if (analysis.bsIndex >= 20) {
    severityLabel = '(Low)';
  } else {
    severityLabel = '(Minimal)';
  }

  let output = `**BS Rating: ${analysis.bsIndex}% ${severityLabel}**\n\n`;
  output += `${analysis.verdict}\n\n`;
  output += `**The Skeleton:**\n"${analysis.skeletonText}"\n\n`;
  output += `**Editorial Breakdown:**\n${analysis.editorialBreakdown}`;

  return output;
}

export const bullshitDetectorTool = tool({
  description: 'Analyze text to detect and expose manipulative language, corporate speak, and empty fluff. Strips away adjectives and adverbs to reveal the core meaning (or lack thereof). Perfect for exposing inflated marketing jargon, vague business speak, or any text that sounds important but says nothing. Returns a BS Index rating (0-100%), the skeleton text with abstract concepts tagged, and an editorial breakdown.',
  inputSchema: z.object({
    text: z.string().describe('The text to analyze for bullshit content'),
  }),
  execute: async ({ text }) => {
    try {
      console.log('💩 Bullshit Detector: Analyzing text...');
      console.log(`   📄 Input length: ${text.length} characters`);

      const analysis = await analyzeText(text);
      const formattedOutput = formatAnalysis(analysis);

      console.log(`   ✅ Analysis complete`);
      console.log(`   📊 BS Index: ${analysis.bsIndex}%`);

      return {
        text,
        bsIndex: analysis.bsIndex,
        verdict: analysis.verdict,
        skeletonText: analysis.skeletonText,
        editorialBreakdown: analysis.editorialBreakdown,
        formattedOutput,
        success: true,
      };
    } catch (error) {
      console.error('Error in bullshit detector tool:', error);
      return {
        text,
        error: error instanceof Error ? error.message : 'Failed to analyze text',
        success: false,
      };
    }
  },
});
