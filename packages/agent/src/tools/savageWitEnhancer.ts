/**
 * Savage Wit Enhancer Tool - Rewrites text with sharp, biting humor
 *
 * Features:
 * - AI-powered text enhancement with savage wit and sarcasm
 * - Multiple intensity levels (mild, medium, savage, nuclear)
 * - Multiple comedy styles (jimmyCarr, roast, sarcastic, deadpan, selfDeprecating)
 * - Context-aware humor that maintains the core message
 * - Entertaining and edgy while avoiding genuine disrespect
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

const INTENSITY_LEVELS = ['mild', 'medium', 'savage', 'nuclear'] as const;
const COMEDY_STYLES = [
  'jimmyCarr',
  'roast',
  'sarcastic',
  'deadpan',
  'selfDeprecating',
] as const;

type IntensityLevel = (typeof INTENSITY_LEVELS)[number];
type ComedyStyle = (typeof COMEDY_STYLES)[number];

/**
 * Get style-specific prompt guidance
 */
function getStyleGuidance(style: ComedyStyle): string {
  const guidance: Record<ComedyStyle, string> = {
    jimmyCarr:
      'Channel Jimmy Carr\'s comedy style: razor-sharp one-liners, perfectly timed delivery, dark humor with a cheeky grin, and that signature "ha ha ha" energy. Mix in clever wordplay and observations that are simultaneously shocking and hilarious.',
    roast:
      'Write in the style of a comedy roast. Be brutally honest, target weaknesses with surgical precision, and make every line land like a punchline at a celebrity roast. Think Jeff Ross meets a Shakespearean insult generator.',
    sarcastic:
      'Drip with pure, undiluted sarcasm. Every sentence should sound like it\'s wearing invisible air quotes. Be the human equivalent of an eye-roll, where genuine compliments sound like insults and insults sound like awards.',
    deadpan:
      'Deliver with bone-dry, deadpan wit. No exclamation marks, no enthusiasm — just devastatingly funny observations stated as matter-of-fact truths. Think Steven Wright or Mitch Hedberg: absurd logic presented with a straight face.',
    selfDeprecating:
      'Turn the wit inward while still making the point. Be self-aware and humble in the most hilariously brutal way possible. Make fun of yourself while simultaneously roasting the topic. Think Bo Burnham or John Mulaney.',
  };
  return guidance[style];
}

/**
 * Get intensity-specific prompt modifiers
 */
function getIntensityModifier(intensity: IntensityLevel): string {
  const modifiers: Record<IntensityLevel, string> = {
    mild: 'Keep it light and playful — more cheeky than cutting. Think witty dinner party banter. Suitable for polite company.',
    medium:
      'Turn up the heat. Be noticeably sarcastic and sharp, but still in good fun. Think pub banter with clever friends.',
    savage:
      'Go hard. Be brutally witty, cutting, and entertainingly ruthless. No sacred cows. The kind of humor that makes people gasp-laugh.',
    nuclear:
      'Maximum savagery. Hold absolutely nothing back. Every sentence should be a verbal war crime wrapped in comedy gold. This is the comedy equivalent of a controlled demolition — beautiful destruction.',
  };
  return modifiers[intensity];
}

/**
 * Enhance text with savage wit using AI
 */
async function enhanceWithWit(
  text: string,
  intensity: IntensityLevel,
  style: ComedyStyle,
  context?: string
): Promise<{
  enhanced: string;
  wittyObservation: string;
  savageryRating: number;
}> {
  const styleGuidance = getStyleGuidance(style);
  const intensityModifier = getIntensityModifier(intensity);

  let contextSection = '';
  if (context) {
    contextSection = `\n\nConversation context for more targeted humor: ${context}`;
  }

  const prompt = `You are a world-class comedy writer specializing in savage wit and sharp humor. Your job is to take the given text and rewrite it with biting humor, clever sarcasm, and entertaining ruthlessness.

Style: ${styleGuidance}

Intensity: ${intensityModifier}

Original text to enhance: "${text}"${contextSection}

Requirements:
- Preserve the core meaning/message of the original text
- Make it genuinely funny, not just mean
- Use clever wordplay, unexpected turns, and sharp observations
- Be entertaining and edgy without crossing into genuine cruelty or bigotry
- The enhanced version should be roughly the same length as the original (give or take 50%)
- Add a separate witty observation about the original text itself
- Rate the savagery on a scale of 1-10

Respond in JSON format:
{
  "enhanced": "The rewritten text with savage wit applied",
  "wittyObservation": "A separate meta-observation or quip about the original text",
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
      wittyObservation: parsed.wittyObservation,
      savageryRating: Math.min(10, Math.max(1, parsed.savageryRating || 5)),
    };
  } catch (error) {
    console.error('Error enhancing text with wit:', error);
    return {
      enhanced:
        "I tried to make this savage, but even my sarcasm generator threw an exception. That's how unremarkable the input was.",
      wittyObservation:
        'The fact that my AI crashed trying to roast this text is, ironically, the funniest thing about this whole exchange.',
      savageryRating: 5,
    };
  }
}

export const savageWitEnhancerTool = tool({
  description:
    'Rewrite text with savage wit, sharp sarcasm, and biting humor. Supports multiple intensity levels (mild, medium, savage, nuclear) and comedy styles (jimmyCarr, roast, sarcastic, deadpan, selfDeprecating). Use when users want their message enhanced with cutting humor, want a savage rewrite, or ask for more sarcasm and wit in responses.',
  inputSchema: z.object({
    text: z.string().describe('The text to enhance with savage wit'),
    intensity: z
      .enum(INTENSITY_LEVELS)
      .optional()
      .default('savage')
      .describe(
        'How savage the wit should be: mild (playful), medium (sharp), savage (brutal), nuclear (maximum devastation)'
      ),
    style: z
      .enum(COMEDY_STYLES)
      .optional()
      .default('jimmyCarr')
      .describe(
        'Comedy style: jimmyCarr (sharp one-liners), roast (brutal honesty), sarcastic (dripping irony), deadpan (dry wit), selfDeprecating (humble brutality)'
      ),
    context: z
      .string()
      .optional()
      .describe(
        'Optional conversation context for more targeted and relevant humor'
      ),
  }),
  execute: async ({ text, intensity, style, context }) => {
    try {
      console.log('🔥 Savage Wit Enhancer: Processing text...');
      console.log(`   🎭 Style: ${style}`);
      console.log(`   💀 Intensity: ${intensity}`);

      const result = await enhanceWithWit(
        text,
        intensity || 'savage',
        style || 'jimmyCarr',
        context
      );

      console.log(`   ✅ Enhancement complete`);
      console.log(`   📊 Savagery Rating: ${result.savageryRating}/10`);

      return {
        success: true,
        original: text,
        enhanced: result.enhanced,
        wittyObservation: result.wittyObservation,
        savageryRating: result.savageryRating,
        style: style || 'jimmyCarr',
        intensity: intensity || 'savage',
        availableIntensities: Array.from(INTENSITY_LEVELS),
        availableStyles: Array.from(COMEDY_STYLES),
      };
    } catch (error) {
      console.error('Error in savage wit enhancer:', error);
      return {
        success: false,
        original: text,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to enhance text with savage wit',
      };
    }
  },
});
