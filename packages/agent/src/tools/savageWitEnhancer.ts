/**
 * Savage Wit Enhancer Tool - Rewrites text with sharp, biting humor
 *
 * Features:
 * - AI-powered text rewriting with savage wit and sarcasm
 * - Multiple intensity levels (mild to nuclear)
 * - Various comedy styles (Jimmy Carr, roast, sarcastic, deadpan, self-deprecating)
 * - Context-aware humor that maintains the original message's intent
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
 * Get style-specific guidance for the AI prompt
 */
function getStyleGuidance(style: ComedyStyle): string {
  const guidance: Record<ComedyStyle, string> = {
    jimmyCarr: 'Channel Jimmy Carr\'s signature style: sharp one-liners, dark humor delivered with a cheeky grin, rapid-fire wit, and perfectly timed punchlines. Use wordplay and unexpected twists. Be cutting but clever.',
    roast: 'Write in the style of a comedy roast. Be brutally honest, exaggerate flaws for comedic effect, and deliver burns that make the audience gasp and laugh simultaneously. Think Comedy Central Roast energy.',
    sarcastic: 'Drip with sarcasm. Say the opposite of what you mean with a tone so dry it could start a fire. Layer the irony thick. Make every compliment feel like a veiled insult and every observation drip with sardonic wit.',
    deadpan: 'Deliver everything completely straight-faced. The humor comes from the absurdity of treating ridiculous observations as perfectly normal. No emotion, no emphasis - let the content do the work. Think Steven Wright or Mitch Hedberg.',
    selfDeprecating: 'Turn the wit inward. Make self-aware observations that are both humble and hilarious. Acknowledge absurdity by being the butt of your own jokes. Think of a comedian who roasts themselves harder than anyone else could.',
  };
  return guidance[style];
}

/**
 * Get intensity-specific guidance
 */
function getIntensityGuidance(intensity: IntensityLevel): string {
  const guidance: Record<IntensityLevel, string> = {
    mild: 'Keep it light and playful. Gentle teasing, mild sarcasm, suitable for polite company. Think witty dinner party banter.',
    medium: 'Turn up the heat. Sharper edges, more pointed observations, willing to make people slightly uncomfortable while still laughing. Think pub humor.',
    savage: 'Go hard. No mercy, no filter, devastatingly sharp. The kind of wit that leaves a mark. Think late-night comedy show with no sponsors to worry about.',
    nuclear: 'Absolute scorched earth. The most brutally honest, cutting, and ruthless version possible. Nothing is sacred. Think of the most savage roast you\'ve ever heard, then double it.',
  };
  return guidance[intensity];
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
  const styleGuide = getStyleGuidance(style);
  const intensityGuide = getIntensityGuidance(intensity);

  let contextSection = '';
  if (context) {
    contextSection = `\n\nConversation context for targeted humor: "${context}"
Use this context to make the enhanced version more relevant and cutting.`;
  }

  const prompt = `You are a master of savage wit and sharp humor. Your task is to rewrite the following text with biting humor while preserving the core message.

Original text: "${text}"${contextSection}

Comedy Style: ${style}
${styleGuide}

Intensity Level: ${intensity}
${intensityGuide}

Requirements:
- Preserve the original meaning and intent of the message
- Add sharp wit, sarcasm, and humor appropriate to the style and intensity
- Be clever and intelligent - cheap shots are lazy, clever observations are art
- Stay entertaining without crossing into genuinely hurtful or discriminatory territory
- The enhanced version should be funnier and more engaging than the original
- Include a brief witty observation about the original text itself
- Rate the savagery on a scale of 1-10

Respond in JSON format:
{
  "enhanced": "The rewritten text with savage wit applied",
  "wittyObservation": "A brief, sharp observation about the original text",
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
      savageryRating: parsed.savageryRating || 5,
    };
  } catch (error) {
    console.error('Error enhancing with wit:', error);
    return {
      enhanced: "I'd roast this text, but it already burned itself writing that.",
      wittyObservation: 'Even my sarcasm module crashed trying to process this.',
      savageryRating: 0,
    };
  }
}

export const savageWitEnhancerTool = tool({
  description: 'Rewrite text with savage wit, sarcasm, and biting humor. Supports multiple intensity levels (mild, medium, savage, nuclear) and comedy styles (jimmyCarr, roast, sarcastic, deadpan, selfDeprecating). Use when users want their message enhanced with sharp humor, want a more savage or sarcastic version of something, or request Jimmy Carr-style wit.',
  inputSchema: z.object({
    text: z.string().describe('The text to enhance with savage wit'),
    intensity: z.enum(INTENSITY_LEVELS).optional().default('savage').describe('How savage to make it: mild, medium, savage, or nuclear'),
    style: z.enum(COMEDY_STYLES).optional().default('jimmyCarr').describe('Comedy style: jimmyCarr, roast, sarcastic, deadpan, or selfDeprecating'),
    context: z.string().optional().describe('Optional conversation context to make the humor more targeted and relevant'),
  }),
  execute: async ({ text, intensity, style, context }) => {
    try {
      console.log('🔥 Savage Wit Enhancer: Processing text...');
      console.log(`   📝 Input: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
      console.log(`   💀 Intensity: ${intensity}`);
      console.log(`   🎭 Style: ${style}`);

      const result = await enhanceWithWit(
        text,
        intensity || 'savage',
        style || 'jimmyCarr',
        context
      );

      console.log(`   ✅ Enhanced successfully`);
      console.log(`   🔥 Savagery Rating: ${result.savageryRating}/10`);

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
        error: error instanceof Error ? error.message : 'Failed to enhance with savage wit',
      };
    }
  },
});
