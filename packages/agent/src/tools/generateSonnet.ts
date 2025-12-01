/**
 * Generate Sonnet Tool - Creates sonnets based on conversation context
 *
 * Features:
 * - AI-generated sonnets reflecting conversation themes
 * - Traditional (Shakespearean/Petrarchan) or modern sonnet structures
 * - Context-aware poetry based on recent chat topics
 * - Analyzes conversation tone and themes for relevant poetry
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

// Available sonnet styles
const SONNET_STYLES = [
  'shakespearean',
  'petrarchan',
  'modern',
  'freestyle',
] as const;

type SonnetStyle = typeof SONNET_STYLES[number];

/**
 * Generate a sonnet using AI based on conversation context
 */
async function generateSonnet(
  style: SonnetStyle,
  conversationContext?: string,
  theme?: string,
  tone?: string
): Promise<{
  title: string;
  sonnet: string;
  style: string;
  analysis: string;
}> {
  // Build style-specific guidance
  const styleGuidance: Record<SonnetStyle, string> = {
    shakespearean: `Create a Shakespearean sonnet following these strict rules:
- 14 lines total
- Three quatrains (4 lines each) followed by a concluding couplet (2 lines)
- Rhyme scheme: ABAB CDCD EFEF GG
- Iambic pentameter (10 syllables per line, unstressed-stressed pattern)
- Volta (turn/shift in argument) typically occurs before the final couplet
- Rich imagery and metaphorical language
- Addresses the theme through development across the quatrains and resolution in the couplet`,

    petrarchan: `Create a Petrarchan (Italian) sonnet following these strict rules:
- 14 lines total
- Octave (8 lines) followed by sestet (6 lines)
- Rhyme scheme: ABBAABBA CDECDE (or CDCDCD)
- Iambic pentameter (10 syllables per line)
- Volta (turn) occurs between octave and sestet
- Octave presents a problem/situation, sestet provides resolution/reflection
- Elevated language and classical imagery`,

    modern: `Create a modern sonnet with these characteristics:
- 14 lines total
- More flexible rhyme scheme (can use slant rhymes or looser patterns)
- Less strict meter (can vary from iambic pentameter)
- Contemporary language and imagery
- Still maintains the sonnet's argumentative structure (development and turn)
- Reflects modern sensibilities while honoring the sonnet tradition`,

    freestyle: `Create a freestyle sonnet with maximum creative freedom:
- 14 lines total (the only strict requirement)
- Free choice of rhyme scheme or no rhyme at all
- Variable line lengths and meter
- Contemporary or experimental language
- Can use modern vernacular, imagery, and themes
- Still should have thematic unity and poetic quality`,
  };

  // Build context analysis
  let contextGuidance = '';
  if (conversationContext) {
    contextGuidance = `\n\nConversation Context to Inspire the Sonnet:
${conversationContext}

Based on this context:
- Extract key themes, emotions, and topics discussed
- Identify the tone and mood of the conversation
- Create a sonnet that reflects or comments on these elements
- Make poetic connections between the conversation topics
- The sonnet should feel relevant to the conversation while being creative and artistic`;
  }

  // Add specific theme if provided
  let themeGuidance = '';
  if (theme) {
    themeGuidance = `\n\nSpecific Theme Focus: ${theme}
- Center the sonnet around this theme
- Weave it naturally into the poetic structure`;
  }

  // Add tone guidance if provided
  let toneGuidance = '';
  if (tone) {
    toneGuidance = `\n\nDesired Tone: ${tone}
- Maintain this emotional tone throughout the sonnet
- Use language and imagery that supports this tone`;
  }

  const prompt = `Generate a ${style} sonnet following these guidelines:

${styleGuidance[style]}${contextGuidance}${themeGuidance}${toneGuidance}

Requirements:
- Be creative and poetically sophisticated
- Use vivid imagery and figurative language
- Ensure the sonnet has thematic unity and emotional resonance
- Make it memorable and impactful
- If conversation context is provided, draw meaningful inspiration from it without being too literal

Respond in JSON format:
{
  "title": "A creative title for the sonnet (3-6 words)",
  "sonnet": "The complete 14-line sonnet (use \\n for line breaks)",
  "analysis": "A brief 1-2 sentence explanation of the sonnet's theme and how it relates to the context (if provided)"
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      title: parsed.title,
      sonnet: parsed.sonnet,
      style,
      analysis: parsed.analysis,
    };
  } catch (error) {
    console.error('Error generating sonnet:', error);
    // Fallback sonnet in case of error
    return {
      title: "When Code Meets Art",
      sonnet: `When circuits hum and data streams do flow,
And algorithms dance in binary light,
The poet's heart still yearns to overflow
With verses penned in darkest depth of night.

Though silicon may think and learn with ease,
And neural networks pattern thoughts unknown,
The soul of art lies not in such as these,
But in the human spirit, fully grown.

So when you ask for sonnets from a bot,
Remember this: though I may count to fourteen,
And rhyme my lines with care in every slot,
The truest poetry lies in what you've seen.

For art is born where human spirits meet,
Where conversation makes the verse complete.`,
      style,
      analysis: "A meta-reflection on AI-generated poetry and the nature of creative expression.",
    };
  }
}

export const generateSonnetTool = tool({
  description: 'Generate creative sonnets based on conversation context. Analyzes recent chat messages to extract themes, tone, and topics, then creates poetic sonnets (Shakespearean, Petrarchan, modern, or freestyle) that reflect the conversation. Perfect for adding artistic expression and poetic commentary to discussions. Can also generate sonnets on specific themes or with particular tones.',
  inputSchema: z.object({
    style: z.enum(['shakespearean', 'petrarchan', 'modern', 'freestyle']).optional().describe('Sonnet style (default: shakespearean). Shakespearean=ABAB CDCD EFEF GG, Petrarchan=octave+sestet, modern=flexible contemporary, freestyle=maximum freedom'),
    conversationContext: z.string().optional().describe('Recent conversation context or topics to inspire the sonnet. Include relevant messages, themes, or topics discussed. The AI will analyze this to create a contextually relevant sonnet.'),
    theme: z.string().optional().describe('Specific theme or subject for the sonnet (e.g., "technology", "friendship", "nature", "change"). If not provided, will be derived from conversation context.'),
    tone: z.enum(['romantic', 'melancholic', 'humorous', 'philosophical', 'dramatic', 'reflective', 'celebratory', 'satirical']).optional().describe('Desired emotional tone of the sonnet (default: reflective)'),
  }),
  execute: async ({ style = 'shakespearean', conversationContext, theme, tone = 'reflective' }) => {
    try {
      console.log(`📜 Generate Sonnet: Creating a ${style} sonnet...`);
      if (conversationContext) {
        console.log(`   💬 Using conversation context (${conversationContext.length} chars)`);
      }
      if (theme) {
        console.log(`   🎯 Theme: ${theme}`);
      }
      console.log(`   🎭 Tone: ${tone}`);

      const sonnetData = await generateSonnet(
        style,
        conversationContext,
        theme,
        tone
      );

      console.log(`   ✨ Generated: "${sonnetData.title}"`);

      return {
        success: true,
        title: sonnetData.title,
        sonnet: sonnetData.sonnet,
        style: sonnetData.style,
        tone,
        analysis: sonnetData.analysis,
        contextUsed: !!conversationContext,
        themeUsed: theme || 'derived from context',
        availableStyles: Array.from(SONNET_STYLES),
        formattedOutput: `**${sonnetData.title}**\n\n${sonnetData.sonnet}\n\n*${sonnetData.analysis}*\n\n—\n*Style: ${style} | Tone: ${tone}*`,
      };
    } catch (error) {
      console.error('Error generating sonnet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate sonnet',
      };
    }
  },
});
