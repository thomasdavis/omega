/**
 * Savage Wit Enhancer Tool - Rewrites text with sharp, biting humor
 *
 * Features:
 * - AI-powered text rewriting with savage wit and sarcasm
 * - Multiple intensity levels (mild, medium, savage, nuclear)
 * - Multiple comedy styles (jimmyCarr, roast, sarcastic, deadpan, selfDeprecating)
 * - Context-aware humor that maintains the original message's meaning
 * - Witty observations about the original text
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

// Available intensity levels
const INTENSITY_LEVELS = ['mild', 'medium', 'savage', 'nuclear'] as const;
type IntensityLevel = (typeof INTENSITY_LEVELS)[number];

// Available comedy styles
const COMEDY_STYLES = [
  'jimmyCarr',
  'roast',
  'sarcastic',
  'deadpan',
  'selfDeprecating',
] as const;
type ComedyStyle = (typeof COMEDY_STYLES)[number];

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
    mild: 'Keep it light and playful. Gentle teasing with a wink. Think witty banter at a dinner party - clever wordplay and mild sarcasm that makes people chuckle.',
    medium:
      'Turn up the heat. Sharp observations and pointed humor. Think a comedian warming up the crowd - confident, cutting, but still charming.',
    savage:
      'Full savage mode. Brutally honest, razor-sharp wit that cuts deep but stays clever. Think Jimmy Carr at his peak - shocking but undeniably funny. No mercy, but no malice.',
    nuclear:
      'Absolute devastation with style. The kind of response that makes the whole room go "OOOH." Scorched earth humor that somehow remains brilliant. Think the most savage roast you\'ve ever seen, but delivered with impeccable timing.',
  };

  const styleGuidance: Record<ComedyStyle, string> = {
    jimmyCarr:
      'Channel Jimmy Carr: rapid-fire one-liners, dark humor with perfect timing, the signature "Ha ha ha HAAA" energy. Setup-punchline structure with shocking twists. Slightly vulgar, always clever.',
    roast:
      'Full roast battle mode. Direct, personal, devastating comebacks. Think Comedy Central Roast - every line is a targeted strike. Use comparisons, exaggerations, and brutal honesty.',
    sarcastic:
      'Dripping with sarcasm. Say the opposite of what you mean with absolute conviction. The kind of response where every word is technically polite but the subtext is devastating.',
    deadpan:
      'Completely flat delivery. State the most absurd or cutting observations as if they were mundane facts. No emotion, no inflection - that IS the joke. Think Steven Wright or Mitch Hedberg.',
    selfDeprecating:
      'Turn the savagery inward while making a point. Agree with the text in the most hilariously pathetic way possible. Self-aware humor that somehow roasts everyone involved.',
  };

  let contextSection = '';
  if (context) {
    contextSection = `\n\nConversation context for targeted humor: ${context}`;
  }

  const prompt = `You are a world-class comedy writer specializing in savage wit and sharp humor. Rewrite the following text with biting humor and savage wit.

Original text: "${text}"${contextSection}

Intensity level: ${intensity}
${intensityGuidance[intensity]}

Comedy style: ${style}
${styleGuidance[style]}

Requirements:
- Maintain the core meaning/message of the original text
- Make it genuinely funny, not just mean
- Be clever and intelligent - cheap shots are lazy
- The humor should feel natural, not forced
- Keep roughly the same length (can be slightly longer for setup)
- Include wordplay or clever callbacks where possible
- The enhanced version should work as a standalone message

Respond in JSON format:
{
  "enhanced": "The rewritten text with savage wit applied",
  "wittyObservation": "A brief, cutting one-liner observation about the original text itself (meta-humor about what was written)",
  "savageryRating": 1-10 number rating how savage the rewrite is
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      enhanced: parsed.enhanced || text,
      wittyObservation:
        parsed.wittyObservation || 'Even I struggle to make this interesting.',
      savageryRating: Math.min(
        10,
        Math.max(1, parsed.savageryRating || 5)
      ),
    };
  } catch (error) {
    console.error('Error enhancing with wit:', error);
    return {
      enhanced:
        "I tried to make this savage, but the original was already a crime against language. Some things are beyond even my help.",
      wittyObservation:
        'My wit generator crashed - probably from the sheer audacity of the input.',
      savageryRating: 3,
    };
  }
}

export const savageWitEnhancerTool = tool({
  description:
    'Rewrite text with savage wit, sarcasm, and biting humor inspired by Jimmy Carr\'s comedy style. Supports multiple intensity levels (mild, medium, savage, nuclear) and comedy styles (jimmyCarr, roast, sarcastic, deadpan, selfDeprecating). Use when users want their messages to be more cutting, funny, or entertainingly ruthless.',
  inputSchema: z.object({
    text: z.string().describe('The text to enhance with savage wit'),
    intensity: z
      .enum(['mild', 'medium', 'savage', 'nuclear'])
      .optional()
      .describe(
        'How savage the rewrite should be. Options: mild, medium, savage, nuclear. Defaults to savage.'
      ),
    style: z
      .enum([
        'jimmyCarr',
        'roast',
        'sarcastic',
        'deadpan',
        'selfDeprecating',
      ])
      .optional()
      .describe(
        'Comedy style to apply. Options: jimmyCarr, roast, sarcastic, deadpan, selfDeprecating. Defaults to jimmyCarr.'
      ),
    context: z
      .string()
      .optional()
      .describe(
        'Optional conversation context for more targeted, relevant humor'
      ),
  }),
  execute: async ({ text, intensity, style, context }) => {
    try {
      const selectedIntensity = intensity || 'savage';
      const selectedStyle = style || 'jimmyCarr';

      console.log('🔥 Savage Wit Enhancer: Rewriting with savage wit...');
      console.log(`   📝 Original: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
      console.log(`   💀 Intensity: ${selectedIntensity}`);
      console.log(`   🎭 Style: ${selectedStyle}`);

      const result = await enhanceWithWit(
        text,
        selectedIntensity,
        selectedStyle,
        context
      );

      console.log(`   ✅ Enhanced with savagery rating: ${result.savageryRating}/10`);

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
        error:
          error instanceof Error
            ? error.message
            : 'Failed to enhance with savage wit',
      };
    }
  },
});
