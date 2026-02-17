/**
 * Savage Wit Enhancer Tool - Rewrites text with sharp, biting humor
 *
 * Features:
 * - AI-powered text rewriting with savage wit and sarcasm
 * - Multiple intensity levels (mild, medium, savage, nuclear)
 * - Multiple comedy styles (jimmyCarr, roast, sarcastic, deadpan, selfDeprecating)
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
  const intensityGuidance: Record<IntensityLevel, string> = {
    mild: 'Light sarcasm and gentle teasing. Think of a friend who gently pokes fun. Keep it clever but not cutting.',
    medium: 'Noticeable sarcasm with sharper edges. Witty observations that make people pause and laugh. A bit more bite.',
    savage: 'Sharp, biting wit that pulls no punches. Think Jimmy Carr at his best - clever, shocking, and ruthlessly funny. The kind of humor that makes you gasp before you laugh.',
    nuclear: 'Maximum savagery. Absolutely devastating wit with no mercy. Every word is a precision strike of comedy. The audience should need a moment to recover. Still clever, never crude without purpose.',
  };

  const styleGuidance: Record<ComedyStyle, string> = {
    jimmyCarr: 'Channel Jimmy Carr: rapid-fire one-liners, dark humor, perfectly timed punchlines. Quick setup, devastating payoff. That signature confident delivery where every pause is deliberate.',
    roast: 'Full roast mode: targeted, personal (to the text), and relentlessly funny. Like a Comedy Central roast where every line lands harder than the last.',
    sarcastic: 'Dripping with sarcasm. Say the opposite of what you mean with such conviction that the irony cuts deep. The art of the backhanded compliment taken to extremes.',
    deadpan: 'Bone-dry delivery. State absurd things with complete sincerity. The humor comes from the contrast between the outrageous content and the matter-of-fact tone.',
    selfDeprecating: 'Turn the savagery inward while still making the point. Acknowledge your own flaws while subtly roasting the subject. Humble and devastating simultaneously.',
  };

  const contextSection = context
    ? `\nAdditional context for more targeted humor: "${context}"`
    : '';

  const prompt = `You are a world-class comedy writer specializing in savage wit and sharp humor. Your job is to rewrite the given text with devastating comedic flair.

Text to enhance: "${text}"${contextSection}

**Intensity Level: ${intensity.toUpperCase()}**
${intensityGuidance[intensity]}

**Comedy Style: ${style}**
${styleGuidance[style]}

Rules:
- Preserve the core meaning/message of the original text
- Make it genuinely funny, not just mean-spirited
- Intelligence over vulgarity - be clever, not crude
- The enhanced version should be more entertaining than the original
- Include wordplay, callbacks, or subverted expectations where possible
- Keep it concise - wit is about precision, not verbosity

Also provide:
1. A witty one-liner observation about the original text itself
2. A savagery rating from 1-10

Respond in JSON format:
{
  "enhanced": "the rewritten text with savage wit applied",
  "wittyObservation": "a one-liner observation about the original text",
  "savageryRating": 1-10
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      enhanced: parsed.enhanced || text,
      wittyObservation: parsed.wittyObservation || '',
      savageryRating: parsed.savageryRating || 5,
    };
  } catch (error) {
    console.error('Error enhancing with wit:', error);
    return {
      enhanced: text,
      wittyObservation: "I'd roast this text, but even my circuits have standards... just kidding, I'm having technical difficulties.",
      savageryRating: 0,
    };
  }
}

export const savageWitEnhancerTool = tool({
  description: 'Rewrite text with savage wit, sarcasm, and biting humor inspired by Jimmy Carr\'s comedy style. Supports multiple intensity levels (mild, medium, savage, nuclear) and comedy styles (jimmyCarr, roast, sarcastic, deadpan, selfDeprecating). Use when users want their text to be more cutting, sarcastic, or entertainingly ruthless while keeping the core message intact.',
  inputSchema: z.object({
    text: z.string().describe('The text to enhance with savage wit'),
    intensity: z.enum(INTENSITY_LEVELS).optional().default('savage').describe('How savage the enhancement should be: mild, medium, savage, or nuclear'),
    style: z.enum(COMEDY_STYLES).optional().default('jimmyCarr').describe('Comedy style: jimmyCarr, roast, sarcastic, deadpan, or selfDeprecating'),
    context: z.string().optional().describe('Optional conversation context for more targeted humor'),
  }),
  execute: async ({ text, intensity = 'savage', style = 'jimmyCarr', context }) => {
    try {
      console.log('🔥 Savage Wit Enhancer: Sharpening the text...');
      console.log(`   📄 Input: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
      console.log(`   💀 Intensity: ${intensity}`);
      console.log(`   🎭 Style: ${style}`);

      const result = await enhanceWithWit(text, intensity, style, context);

      console.log(`   ✅ Enhancement complete`);
      console.log(`   📊 Savagery Rating: ${result.savageryRating}/10`);

      return {
        success: true,
        original: text,
        enhanced: result.enhanced,
        wittyObservation: result.wittyObservation,
        savageryRating: result.savageryRating,
        style,
        intensity,
        availableIntensities: Array.from(INTENSITY_LEVELS),
        availableStyles: Array.from(COMEDY_STYLES),
      };
    } catch (error) {
      console.error('Error in savage wit enhancer tool:', error);
      return {
        success: false,
        original: text,
        error: error instanceof Error ? error.message : 'Failed to enhance text with savage wit',
      };
    }
  },
});
