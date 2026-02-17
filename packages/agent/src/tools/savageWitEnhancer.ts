/**
 * Savage Wit Enhancer Tool - Rewrites text with sharp, biting humor
 *
 * Features:
 * - AI-powered text transformation with savage wit and sarcasm
 * - Multiple intensity levels (mild to nuclear)
 * - Multiple comedy styles (Jimmy Carr, roast, sarcastic, deadpan, self-deprecating)
 * - Context-aware humor for more targeted wit
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

const INTENSITY_LEVELS = ['mild', 'medium', 'savage', 'nuclear'] as const;
const COMEDY_STYLES = ['jimmyCarr', 'roast', 'sarcastic', 'deadpan', 'selfDeprecating'] as const;

type IntensityLevel = typeof INTENSITY_LEVELS[number];
type ComedyStyle = typeof COMEDY_STYLES[number];

/**
 * Style-specific prompt guidance for each comedy style
 */
const STYLE_GUIDANCE: Record<ComedyStyle, string> = {
  jimmyCarr: 'Channel Jimmy Carr\'s style: rapid-fire one-liners, clever wordplay, sharp observational humor, and perfectly timed punchlines. Use a confident, almost arrogant delivery with cheeky double meanings.',
  roast: 'Full roast comedy style: direct, personal, and brutally honest observations. Think Comedy Central Roast — pointed jabs that are funny because of how uncomfortably true they are.',
  sarcastic: 'Heavy sarcasm: say the opposite of what you mean with exaggerated sincerity. Layer the irony thick. Every compliment is backhanded, every observation dripping with mock enthusiasm.',
  deadpan: 'Deadpan delivery: completely flat, matter-of-fact tone while saying something absurd or cutting. No emotional inflection. The humor comes from the contrast between delivery and content.',
  selfDeprecating: 'Self-deprecating style: turn the savagery inward. Make yourself (as the AI) the butt of the joke while still delivering the enhanced text. Acknowledge your own absurdity.',
};

/**
 * Intensity-specific prompt modifiers
 */
const INTENSITY_GUIDANCE: Record<IntensityLevel, string> = {
  mild: 'Keep it light — gentle teasing, mild sarcasm, and playful jabs. Safe for all audiences. Think witty banter over coffee.',
  medium: 'Turn up the heat — sharper observations, more pointed humor, and bolder sarcasm. Still tasteful, but with real bite.',
  savage: 'Go hard — cutting remarks, ruthless observations, and zero mercy. The kind of wit that makes people gasp before laughing. Edgy but still clever.',
  nuclear: 'Maximum savagery — absolutely devastating wit. Every word is a precision strike. Vulgar humor is acceptable. Think the most brutal Comedy Central Roast set ever delivered, but with intelligence behind every line.',
};

/**
 * Rewrite text with savage wit using AI
 */
async function enhanceWithWit(
  text: string,
  intensity: IntensityLevel,
  style: ComedyStyle,
  context?: string,
): Promise<{
  enhanced: string;
  wittyObservation: string;
  savageryRating: number;
}> {
  let contextGuidance = '';
  if (context) {
    contextGuidance = `\n\nConversation context for more targeted humor: ${context}`;
  }

  const prompt = `You are a world-class comedy writer specializing in savage wit. Your task is to rewrite the following text to be devastatingly funny while preserving the core meaning.

Text to enhance: "${text}"

Comedy Style: ${STYLE_GUIDANCE[style]}

Intensity: ${INTENSITY_GUIDANCE[intensity]}${contextGuidance}

Requirements:
- Preserve the core message/meaning of the original text
- Make it genuinely funny, not just mean
- Intelligence over shock value — clever beats crude
- Keep it entertaining, not toxic or hateful
- No jokes targeting race, gender, sexuality, disability, or religion
- The enhanced version should be roughly the same length as the original (give or take 50%)
- Also provide a short witty meta-observation about the original text itself
- Rate the savagery on a scale of 1-10

Respond in JSON format:
{
  "enhanced": "The rewritten text with savage wit injected",
  "wittyObservation": "A short, witty meta-observation about the original text (1-2 sentences)",
  "savageryRating": 7
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      enhanced: parsed.enhanced,
      wittyObservation: parsed.wittyObservation || '',
      savageryRating: Math.min(10, Math.max(1, parsed.savageryRating || 5)),
    };
  } catch (error) {
    console.error('Error enhancing with wit:', error);
    return {
      enhanced: "I tried to make this savage, but my wit short-circuited. Even my failures are more entertaining than the original text.",
      wittyObservation: "The fact that you needed AI to add personality to your text says everything.",
      savageryRating: 3,
    };
  }
}

export const savageWitEnhancerTool = tool({
  description: 'Rewrite text with savage wit, sharp sarcasm, and biting humor. Supports multiple intensity levels (mild, medium, savage, nuclear) and comedy styles (jimmyCarr, roast, sarcastic, deadpan, selfDeprecating). Use when users want their text enhanced with cutting humor, want a more savage version of something, or request Jimmy Carr-style wit.',
  inputSchema: z.object({
    text: z.string().describe('The text to enhance with savage wit'),
    intensity: z.enum(INTENSITY_LEVELS).optional().default('savage').describe('Savagery intensity level: mild, medium, savage, or nuclear'),
    style: z.enum(COMEDY_STYLES).optional().default('jimmyCarr').describe('Comedy style: jimmyCarr, roast, sarcastic, deadpan, or selfDeprecating'),
    context: z.string().optional().describe('Optional conversation context for more targeted humor'),
  }),
  execute: async ({ text, intensity, style, context }) => {
    try {
      const selectedIntensity = intensity || 'savage';
      const selectedStyle = style || 'jimmyCarr';

      console.log('🔥 Savage Wit Enhancer: Rewriting with maximum savagery...');
      console.log(`   💀 Intensity: ${selectedIntensity}`);
      console.log(`   🎭 Style: ${selectedStyle}`);

      const result = await enhanceWithWit(text, selectedIntensity, selectedStyle, context);

      console.log(`   📊 Savagery Rating: ${result.savageryRating}/10`);
      console.log(`   ✨ Enhanced text generated`);

      return {
        success: true,
        original: text,
        enhanced: result.enhanced,
        wittyObservation: result.wittyObservation,
        savageryRating: result.savageryRating,
        style: selectedStyle,
        intensity: selectedIntensity,
        availableIntensities: Array.from(INTENSITY_LEVELS),
        availableStyles: Array.from(COMEDY_STYLES),
      };
    } catch (error) {
      console.error('Error in savage wit enhancer:', error);
      return {
        success: false,
        original: text,
        error: error instanceof Error ? error.message : 'Failed to enhance text with savage wit',
      };
    }
  },
});
