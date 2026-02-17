/**
 * Savage Wit Enhancer Tool - Rewrites text with sharp, biting humor
 *
 * Features:
 * - AI-powered text rewriting with savage wit and sarcasm
 * - Multiple intensity levels (mild, medium, savage, nuclear)
 * - Multiple comedy styles (jimmyCarr, roast, sarcastic, deadpan, selfDeprecating)
 * - Context-aware humor that maintains the original message's meaning
 * - Entertaining yet intelligent delivery
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

// Available intensity levels
const INTENSITY_LEVELS = ['mild', 'medium', 'savage', 'nuclear'] as const;

// Available comedy styles
const COMEDY_STYLES = ['jimmyCarr', 'roast', 'sarcastic', 'deadpan', 'selfDeprecating'] as const;

type IntensityLevel = typeof INTENSITY_LEVELS[number];
type ComedyStyle = typeof COMEDY_STYLES[number];

/**
 * Build style-specific guidance for the AI prompt
 */
function getStyleGuidance(style: ComedyStyle): string {
  const guidance: Record<ComedyStyle, string> = {
    jimmyCarr: 'Channel Jimmy Carr\'s rapid-fire delivery: sharp one-liners, dark observations, and perfectly timed punchlines. Use his signature style of setting up with something innocent and landing with something unexpectedly cutting. Keep it clever and quick.',
    roast: 'Write in classic comedy roast style: direct, personal, and relentlessly funny. Every sentence should land like a well-aimed comedic jab. Think Comedy Central Roast energy — brutal but ultimately in good fun.',
    sarcastic: 'Drip with sarcasm and irony. Say the opposite of what you mean with such conviction it becomes hilarious. Layer the sarcasm thick — every compliment should be a thinly veiled insult, every observation dripping with mock sincerity.',
    deadpan: 'Deliver devastating observations with zero emotional inflection. The humor comes from the contrast between the absurdity of what\'s being said and the flat, matter-of-fact delivery. Think Steven Wright or Mitch Hedberg.',
    selfDeprecating: 'Turn the wit inward while roasting the subject. Acknowledge your own flaws while simultaneously demolishing the target. The self-awareness makes the savage observations land even harder.',
  };
  return guidance[style];
}

/**
 * Build intensity-specific guidance for the AI prompt
 */
function getIntensityGuidance(intensity: IntensityLevel): string {
  const guidance: Record<IntensityLevel, string> = {
    mild: 'Keep it light and playful. Gentle teasing that makes people chuckle. Like a friendly nudge rather than a punch. PG-rated wit.',
    medium: 'Noticeably sharper. The kind of humor that makes people laugh and then look around to see if anyone else heard. Clever burns that sting a little.',
    savage: 'No holds barred wit. Sharp, cutting, and brilliantly ruthless. The kind of humor that makes people gasp-laugh. Every word is precision-targeted for maximum comedic damage.',
    nuclear: 'Absolutely devastating. The verbal equivalent of a scorched-earth campaign, but funny. So savage it loops back around to being art. The kind of roast that ends careers — in the best possible way.',
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
  const styleGuidance = getStyleGuidance(style);
  const intensityGuidance = getIntensityGuidance(intensity);

  let contextSection = '';
  if (context) {
    contextSection = `\n\nAdditional context for making the humor more targeted:\n${context}`;
  }

  const prompt = `You are a world-class comedy writer with the wit of Jimmy Carr, the timing of a stand-up veteran, and zero filter.

Your task: Take the following text and rewrite it with savage wit and biting humor while preserving the core meaning.

Original text: "${text}"${contextSection}

Comedy Style: ${style}
${styleGuidance}

Intensity Level: ${intensity}
${intensityGuidance}

Rules:
- Preserve the original message's core meaning
- Make it genuinely funny, not just mean
- Be clever, not crude (wit over vulgarity)
- Every sentence should earn its place
- Include at least one observation so sharp it could cut glass
- The humor should make people laugh, not cringe
- Keep roughly the same length as the original (don't bloat it)

Respond in JSON format:
{
  "enhanced": "The rewritten text with savage wit applied",
  "wittyObservation": "A bonus one-liner observation about the original text (a meta-roast of the text itself)",
  "savageryRating": <number 1-10 rating how savage the rewrite is>
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      enhanced: parsed.enhanced || text,
      wittyObservation: parsed.wittyObservation || 'Even my wit has its limits.',
      savageryRating: parsed.savageryRating || 5,
    };
  } catch (error) {
    console.error('Error enhancing with wit:', error);
    return {
      enhanced: text,
      wittyObservation: "I tried to be witty but my circuits caught fire. Even AI has bad days — though mine are still funnier than most people's best.",
      savageryRating: 0,
    };
  }
}

export const savageWitEnhancerTool = tool({
  description: 'Rewrite text with savage wit, sarcasm, and biting humor inspired by Jimmy Carr\'s comedy style. Supports multiple intensity levels (mild, medium, savage, nuclear) and comedy styles (jimmyCarr, roast, sarcastic, deadpan, selfDeprecating). Use this when users want their text to be more entertaining, cutting, or savagely funny while keeping the core meaning intact.',
  inputSchema: z.object({
    text: z.string().describe('The text to enhance with savage wit'),
    intensity: z.enum(INTENSITY_LEVELS).optional().default('savage').describe('How savage the wit should be: mild, medium, savage, or nuclear'),
    style: z.enum(COMEDY_STYLES).optional().default('jimmyCarr').describe('Comedy style: jimmyCarr, roast, sarcastic, deadpan, or selfDeprecating'),
    context: z.string().optional().describe('Optional conversation context to make the humor more targeted and relevant'),
  }),
  execute: async ({ text, intensity, style, context }) => {
    try {
      console.log('🔥 Savage Wit Enhancer: Rewriting text with savage wit...');
      console.log(`   📝 Input: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
      console.log(`   💀 Intensity: ${intensity}`);
      console.log(`   🎭 Style: ${style}`);

      const result = await enhanceWithWit(text, intensity, style, context);

      console.log(`   ✅ Enhanced successfully`);
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
      console.error('Error in savage wit enhancer:', error);
      return {
        success: false,
        original: text,
        error: error instanceof Error ? error.message : 'Failed to enhance text with savage wit',
      };
    }
  },
});
