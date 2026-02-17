/**
 * Savage Wit Enhancer Tool - Rewrites text with sharp, savage wit and sarcasm
 *
 * Features:
 * - AI-powered rewriting with biting humor inspired by Jimmy Carr's style
 * - Multiple intensity levels from mild to nuclear
 * - Various comedy styles (Jimmy Carr, roast, sarcastic, deadpan, self-deprecating)
 * - Context-aware humor that maintains the original message's intent
 * - Keeps intelligence and respect while being entertainingly ruthless
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

const WIT_INTENSITIES = ['mild', 'medium', 'savage', 'nuclear'] as const;
const COMEDY_STYLES = ['jimmyCarr', 'roast', 'sarcastic', 'deadpan', 'selfDeprecating'] as const;

type WitIntensity = typeof WIT_INTENSITIES[number];
type ComedyStyle = typeof COMEDY_STYLES[number];

/**
 * Build style-specific guidance for the AI
 */
function getStyleGuidance(style: ComedyStyle): string {
  const guidance: Record<ComedyStyle, string> = {
    jimmyCarr: `Channel Jimmy Carr's signature style:
- Sharp, quick-witted one-liners with unexpected punchlines
- Dark humor that walks the line but never crosses into cruelty
- Confident, almost smug delivery that makes the audience laugh despite themselves
- Clever wordplay and double meanings
- That signature "Ha ha ha HAAA" energy in written form
- Observations that are uncomfortably accurate`,

    roast: `Channel classic comedy roast energy:
- Direct, personal jabs that are clearly in good fun
- Exaggerated insults that are so over-the-top they're obviously jokes
- Callback humor referencing what was just said
- "I kid, I kid" energy - brutal but lovable
- The kind of burns that make even the target laugh`,

    sarcastic: `Channel peak sarcasm:
- Say the opposite of what you mean with devastating precision
- Dry delivery that makes people question if you're serious
- Eye-roll-inducing observations stated as if they're profound truths
- Master of the backhanded compliment
- "Oh, how delightful" energy when things are clearly not delightful`,

    deadpan: `Channel deadpan comedy delivery:
- Deliver absurd statements with complete sincerity
- Zero emotional inflection - let the words do all the work
- Understated reactions to outrageous situations
- Mitch Hedberg meets Steven Wright energy
- The humor comes from the gap between delivery and content`,

    selfDeprecating: `Channel self-deprecating wit:
- Turn the savage wit inward before directing it outward
- Acknowledge your own absurdity while pointing out others'
- "I'm a mess, but at least I know it" energy
- Humble enough to be relatable, sharp enough to be funny
- Self-awareness as a weapon of comedy`,
  };

  return guidance[style];
}

/**
 * Build intensity-specific guidance
 */
function getIntensityGuidance(intensity: WitIntensity): string {
  const guidance: Record<WitIntensity, string> = {
    mild: `Intensity: MILD
- Light teasing, gentle ribbing
- PG-rated humor, suitable for all audiences
- More playful than cutting
- Think: friendly banter at a dinner party`,

    medium: `Intensity: MEDIUM
- Noticeable edge to the humor
- Witty observations that sting a little
- Clever enough to earn a grudging laugh
- Think: sharp-tongued friend who tells it like it is`,

    savage: `Intensity: SAVAGE
- Properly cutting remarks with surgical precision
- The kind of humor that makes people say "oh NO they didn't"
- Vulgar enough to be edgy, clever enough to be art
- Think: Jimmy Carr on a good night at a live show`,

    nuclear: `Intensity: NUCLEAR
- Absolutely devastating, no-holds-barred wit
- The verbal equivalent of a controlled demolition
- So brutal it circles back around to being impressive
- Vulgar, sharp, and unrelenting - but still fundamentally clever
- Think: Jimmy Carr after three drinks doing an uncensored special`,
  };

  return guidance[intensity];
}

/**
 * Enhance text with savage wit using AI
 */
async function enhanceWithWit(
  text: string,
  intensity: WitIntensity,
  style: ComedyStyle,
  context?: string
): Promise<{
  enhanced: string;
  wittyObservation: string;
  savageryRating: number;
  style: string;
  intensity: string;
}> {
  const styleGuidance = getStyleGuidance(style);
  const intensityGuidance = getIntensityGuidance(intensity);

  let contextSection = '';
  if (context) {
    contextSection = `\n\nConversational Context: ${context}
Use this context to make the enhanced version more relevant and targeted.`;
  }

  const prompt = `You are a world-class comedy writer specializing in savage wit and sharp humor. Your job is to take the given text and rewrite it with devastating comedic flair.

${styleGuidance}

${intensityGuidance}

RULES:
- Maintain the CORE MESSAGE and intent of the original text
- Add savage wit, sarcasm, and biting humor
- Be clever, not just vulgar - wit requires intelligence
- Never cross into genuine hate speech, racism, sexism, or targeted harassment
- The enhanced version should be funnier and more entertaining while still communicating the same point
- Keep it concise - brevity is the soul of wit
- If the original text is a question, keep it as a question but make it devastatingly funnier
- If the original text is a statement, make it a statement that could kill at a comedy club

Original text to enhance: "${text}"${contextSection}

Respond in JSON format:
{
  "enhanced": "The rewritten text with savage wit applied",
  "wittyObservation": "A brief meta-observation about the original text that's itself funny (1-2 sentences)",
  "savageryRating": <number 1-10 rating how savage the result is>
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
      style,
      intensity,
    };
  } catch (error) {
    console.error('Error enhancing with wit:', error);
    return {
      enhanced: `${text} (I tried to make this savage, but even my wit has its limits. The original was already painful enough.)`,
      wittyObservation: "My comedy circuits briefly short-circuited. Even AI has bad days at the comedy club.",
      savageryRating: 3,
      style,
      intensity,
    };
  }
}

export const savageWitEnhancerTool = tool({
  description: 'Enhance text with savage wit, sarcasm, and biting humor inspired by Jimmy Carr\'s comedy style. Rewrites messages to be sharper, more cutting, and entertainingly ruthless while maintaining the core message. Supports multiple intensity levels (mild to nuclear) and comedy styles (Jimmy Carr, roast, sarcastic, deadpan, self-deprecating). Use when users want their messages to be more savage, witty, or sarcastic.',
  inputSchema: z.object({
    text: z.string().describe('The text to enhance with savage wit and sarcasm'),
    intensity: z.enum(['mild', 'medium', 'savage', 'nuclear']).optional().describe('Level of savagery: mild (light teasing), medium (noticeable edge), savage (properly cutting), nuclear (devastatingly brutal). Defaults to savage.'),
    style: z.enum(['jimmyCarr', 'roast', 'sarcastic', 'deadpan', 'selfDeprecating']).optional().describe('Comedy style: jimmyCarr (sharp one-liners), roast (direct jabs), sarcastic (dry opposite-meaning), deadpan (absurd sincerity), selfDeprecating (self-aware humor). Defaults to jimmyCarr.'),
    context: z.string().optional().describe('Optional context about the conversation or situation for more targeted humor'),
  }),
  execute: async ({ text, intensity, style, context }) => {
    try {
      const selectedIntensity = intensity || 'savage';
      const selectedStyle = style || 'jimmyCarr';

      console.log('🔥 Savage Wit Enhancer: Sharpening text with devastating humor...');
      console.log(`   📝 Original: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
      console.log(`   💀 Intensity: ${selectedIntensity}`);
      console.log(`   🎭 Style: ${selectedStyle}`);

      const result = await enhanceWithWit(text, selectedIntensity, selectedStyle, context);

      console.log(`   ✅ Enhanced with savagery rating: ${result.savageryRating}/10`);

      return {
        original: text,
        enhanced: result.enhanced,
        wittyObservation: result.wittyObservation,
        savageryRating: result.savageryRating,
        style: result.style,
        intensity: result.intensity,
        availableIntensities: Array.from(WIT_INTENSITIES),
        availableStyles: Array.from(COMEDY_STYLES),
        success: true,
      };
    } catch (error) {
      console.error('Error in savage wit enhancer:', error);
      return {
        original: text,
        error: error instanceof Error ? error.message : 'Failed to enhance with savage wit. Even comedy has its off days.',
        success: false,
      };
    }
  },
});
