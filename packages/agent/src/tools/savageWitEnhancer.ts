/**
 * Savage Wit Enhancer Tool - Rewrites text with sharp, biting humor
 *
 * Features:
 * - AI-powered savage wit and sarcasm injection
 * - Multiple intensity levels (mild to nuclear)
 * - Multiple comedy styles (Jimmy Carr, roast, sarcastic, deadpan, self-deprecating)
 * - Context-aware humor that maintains the original message's meaning
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
    jimmyCarr: 'Channel Jimmy Carr\'s comedy style: razor-sharp one-liners, perfectly timed wordplay, dark humor delivered with a cheeky grin, and punchlines that hit like a freight train. Use that signature confidence and unapologetic delivery.',
    roast: 'Write like a Comedy Central roast: targeted, personal but playful burns that walk the line between savage and affectionate. Think Jeff Ross meets a thesaurus. Make it sting but leave them laughing.',
    sarcastic: 'Deploy weapons-grade sarcasm: say the opposite of what you mean with such conviction that the irony could cut glass. Layer it thick, make it drip with contempt disguised as sincerity.',
    deadpan: 'Deliver with bone-dry deadpan humor: state absurd things as matter-of-fact observations. No winking at the audience, no emotional inflection. The humor comes from the stark contrast between delivery and content.',
    selfDeprecating: 'Use self-deprecating wit: turn the savagery inward while making broader observations. Acknowledge your own flaws while subtly pointing out everyone else\'s. Think British self-deprecation meets stand-up comedy.',
  };
  return guidance[style];
}

/**
 * Build intensity-specific guidance
 */
function getIntensityGuidance(intensity: IntensityLevel): string {
  const guidance: Record<IntensityLevel, string> = {
    mild: 'Keep it light and witty - clever observations with a gentle edge. Think dinner party humor: sharp enough to get a laugh but not enough to make anyone uncomfortable.',
    medium: 'Turn up the heat - pointed humor that makes people do a double-take. Witty enough to sting, clever enough to earn respect. No holding back on the sarcasm.',
    savage: 'Full savage mode - brutally honest, razor-sharp wit that pulls no punches. Every line should land like a perfectly aimed verbal haymaker. Be ruthlessly funny.',
    nuclear: 'Maximum devastation - the kind of wit that makes people gasp before they laugh. Absolutely merciless, viciously clever, and entertainingly ruthless. Hold nothing back.',
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
  let contextGuidance = '';
  if (context) {
    contextGuidance = `\n\nConversation context for more targeted humor: ${context}`;
  }

  const prompt = `You are a world-class comedy writer specializing in savage wit and sharp humor. Your task is to rewrite the following text with biting humor while preserving the core message.

Original text: "${text}"${contextGuidance}

Style: ${getStyleGuidance(style)}

Intensity: ${getIntensityGuidance(intensity)}

Requirements:
- Preserve the original meaning and intent of the text
- Add sharp, clever humor that enhances rather than obscures the message
- Be entertainingly ruthless but never cruel or discriminatory
- Avoid punching down - wit should punch up or sideways
- Make it genuinely funny, not just mean
- Include wordplay, callbacks, or unexpected twists where appropriate
- Keep it intelligent - the humor should reward clever readers

Respond in JSON format:
{
  "enhanced": "The rewritten text with savage wit injected",
  "wittyObservation": "A brief, cutting meta-observation about the original text itself (one sharp line)",
  "savageryRating": 1-10
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
    // Fallback response
    return {
      enhanced: `${text} (I tried to make this savage, but even my wit has its limits. Consider that my most cutting observation yet.)`,
      wittyObservation: "The AI refused to roast this. That's either a compliment or an insult - you decide.",
      savageryRating: 1,
    };
  }
}

export const savageWitEnhancerTool = tool({
  description: 'Rewrite text with savage wit, sarcasm, and biting humor inspired by Jimmy Carr\'s comedy style. Supports multiple intensity levels (mild, medium, savage, nuclear) and comedy styles (jimmyCarr, roast, sarcastic, deadpan, selfDeprecating). Use this when users want their messages made more cutting, sarcastic, or entertainingly ruthless while keeping the core meaning intact.',
  inputSchema: z.object({
    text: z.string().describe('The text to enhance with savage wit'),
    intensity: z.enum(INTENSITY_LEVELS).optional().describe('Intensity level: mild, medium, savage, or nuclear. Defaults to savage.'),
    style: z.enum(COMEDY_STYLES).optional().describe('Comedy style: jimmyCarr, roast, sarcastic, deadpan, or selfDeprecating. Defaults to jimmyCarr.'),
    context: z.string().optional().describe('Optional conversation context for more targeted humor'),
  }),
  execute: async ({ text, intensity, style, context }) => {
    try {
      const selectedIntensity = intensity || 'savage';
      const selectedStyle = style || 'jimmyCarr';

      console.log('🔥 Savage Wit Enhancer: Sharpening the verbal knives...');
      console.log(`   📝 Input: "${text}"`);
      console.log(`   💀 Intensity: ${selectedIntensity}`);
      console.log(`   🎭 Style: ${selectedStyle}`);

      const result = await enhanceWithWit(text, selectedIntensity, selectedStyle, context);

      console.log(`   ✅ Enhancement complete`);
      console.log(`   📊 Savagery Rating: ${result.savageryRating}/10`);

      return {
        original: text,
        enhanced: result.enhanced,
        wittyObservation: result.wittyObservation,
        savageryRating: result.savageryRating,
        style: selectedStyle,
        intensity: selectedIntensity,
        availableIntensities: Array.from(INTENSITY_LEVELS),
        availableStyles: Array.from(COMEDY_STYLES),
        success: true,
      };
    } catch (error) {
      console.error('Error in savage wit enhancer tool:', error);
      return {
        original: text,
        error: error instanceof Error ? error.message : 'Failed to enhance wit',
        success: false,
      };
    }
  },
});
