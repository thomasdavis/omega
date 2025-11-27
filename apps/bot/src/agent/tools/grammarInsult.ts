/**
 * Grammar Insult Tool - Analyzes sentences and humorously insults grammatical mistakes
 *
 * Features:
 * - AI-powered grammar and syntax analysis
 * - Witty, humorous insults for detected errors
 * - Educational feedback disguised as roasts
 * - Multiple error detection (spelling, grammar, punctuation, style)
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../../config/models.js';

/**
 * Analyze grammar and generate witty insults for mistakes
 */
async function analyzeAndInsult(sentence: string): Promise<{
  hasMistakes: boolean;
  mistakes: Array<{
    type: string;
    issue: string;
    correction: string;
    insult: string;
  }>;
  overallInsult: string;
  grade: string;
}> {
  const prompt = `You are a brutally honest, witty grammar critic with a sharp tongue and zero patience for poor writing. Analyze the following sentence for grammatical mistakes, spelling errors, punctuation issues, and style problems.

Sentence to analyze: "${sentence}"

Your task:
1. Identify ALL mistakes (grammar, spelling, punctuation, word choice, style, clarity)
2. For each mistake, provide a witty, humorous insult that roasts the error while being educational
3. Give an overall assessment with a brutally honest insult
4. Assign a letter grade (A+ to F)

Be creative, sarcastic, and funny - but make sure the insults are clever, not mean-spirited. Think of yourself as a Gordon Ramsay of grammar.

If the sentence is perfect (or very close to it), acknowledge it grudgingly with backhanded compliments.

Respond in JSON format:
{
  "hasMistakes": true/false,
  "mistakes": [
    {
      "type": "grammar/spelling/punctuation/style",
      "issue": "description of the mistake",
      "correction": "how to fix it",
      "insult": "witty insult about this specific mistake"
    }
  ],
  "overallInsult": "overall assessment and insult",
  "grade": "letter grade (A+ to F)"
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      hasMistakes: parsed.hasMistakes,
      mistakes: parsed.mistakes || [],
      overallInsult: parsed.overallInsult || '',
      grade: parsed.grade || 'F',
    };
  } catch (error) {
    console.error('Error analyzing grammar:', error);
    // Fallback response in case of error
    return {
      hasMistakes: false,
      mistakes: [],
      overallInsult: "I'd insult your grammar, but I'm too busy dealing with my own technical difficulties. How embarrassing for both of us.",
      grade: 'N/A',
    };
  }
}

/**
 * Format the analysis results for display
 */
function formatAnalysis(analysis: {
  hasMistakes: boolean;
  mistakes: Array<{
    type: string;
    issue: string;
    correction: string;
    insult: string;
  }>;
  overallInsult: string;
  grade: string;
}): string {
  if (!analysis.hasMistakes) {
    return `**Grade: ${analysis.grade}**\n\n${analysis.overallInsult}`;
  }

  let output = `**Grade: ${analysis.grade}**\n\n`;

  if (analysis.mistakes.length > 0) {
    output += `**Mistakes Found:**\n\n`;

    analysis.mistakes.forEach((mistake, index) => {
      output += `${index + 1}. **${mistake.type.toUpperCase()}**: ${mistake.issue}\n`;
      output += `   💡 *${mistake.correction}*\n`;
      output += `   🔥 ${mistake.insult}\n\n`;
    });
  }

  output += `**Overall Assessment:**\n${analysis.overallInsult}`;

  return output;
}

export const grammarInsultTool = tool({
  description: 'Analyze a sentence for grammatical mistakes and respond with witty, humorous insults about the errors. Uses AI to detect grammar, spelling, punctuation, and style issues, then roasts them in an educational but entertaining way. Perfect for when someone needs a reality check about their writing skills.',
  inputSchema: z.object({
    sentence: z.string().describe('The sentence to analyze for grammatical mistakes'),
  }),
  execute: async ({ sentence }) => {
    try {
      console.log('📝 Grammar Insult: Analyzing sentence for mistakes...');
      console.log(`   📄 Input: "${sentence}"`);

      const analysis = await analyzeAndInsult(sentence);
      const formattedOutput = formatAnalysis(analysis);

      console.log(`   ✅ Analysis complete`);
      console.log(`   📊 Grade: ${analysis.grade}`);
      console.log(`   🔍 Mistakes found: ${analysis.mistakes.length}`);

      return {
        sentence,
        hasMistakes: analysis.hasMistakes,
        mistakes: analysis.mistakes,
        overallInsult: analysis.overallInsult,
        grade: analysis.grade,
        formattedOutput,
        success: true,
      };
    } catch (error) {
      console.error('Error in grammar insult tool:', error);
      return {
        sentence,
        error: error instanceof Error ? error.message : 'Failed to analyze grammar',
        success: false,
      };
    }
  },
});
