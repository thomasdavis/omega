/**
 * Screenplay Generation Service
 *
 * Generates text-based screenplays for comic generation to improve speaker attribution.
 * This ensures that dialogue is properly attributed to the correct characters before
 * the visual comic is generated.
 */

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { UserCharacter } from '../lib/userAppearance.js';

export interface ScreenplayOptions {
  scenario: string;
  characters: UserCharacter[];
  includeOmega?: boolean;
}

export interface ScreenplayResult {
  success: boolean;
  screenplay?: string;
  cast?: string[];
  error?: string;
}

/**
 * Generate a screenplay with cast and dialogue attribution
 */
export async function generateScreenplay(options: ScreenplayOptions): Promise<ScreenplayResult> {
  const { scenario, characters, includeOmega = true } = options;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return {
      success: false,
      error: 'OPENAI_API_KEY is not configured',
    };
  }

  try {
    // Build cast list
    const cast: string[] = [];
    let characterDescriptions = '';

    if (includeOmega) {
      cast.push('OMEGA (AI Assistant)');
      characterDescriptions += 'OMEGA: An AI assistant with a robotic, philosophical demeanor\n';
    }

    for (const char of characters) {
      cast.push(char.username);
      characterDescriptions += `${char.username.toUpperCase()}: ${char.description || 'Discord community member'}`;

      // Add personality traits if available
      if (char.dominantArchetype) {
        characterDescriptions += ` (${char.dominantArchetype})`;
      }
      if (char.communicationStyle) {
        characterDescriptions += `, ${char.communicationStyle}`;
      }
      characterDescriptions += '\n';
    }

    // Create the screenplay generation prompt
    const prompt = `You are a screenplay writer for a comic strip. Write a short, humorous screenplay based on the scenario below.

**SCENARIO:**
${scenario}

**CAST OF CHARACTERS:**
${characterDescriptions}

**INSTRUCTIONS:**
1. Write a screenplay in standard screenplay format with clear speaker attributions
2. Keep it brief (3-7 scenes/beats appropriate for a comic strip)
3. Make the dialogue punchy, witty, and character-appropriate
4. Ensure EVERY line of dialogue is clearly attributed to a specific character
5. Include stage directions in parentheses for visual actions/expressions
6. Make it funny and engaging
7. Focus on the key moments from the scenario
8. Use each character's personality and communication style from their description

**FORMAT:**
CAST:
- CHARACTER NAME (brief description)

SCENE 1:
CHARACTER NAME: (stage direction) "Dialogue here"

OUTPUT THE SCREENPLAY NOW:`;

    // Generate screenplay using gpt-4.1-mini
    const openai = createOpenAI({
      apiKey: OPENAI_API_KEY,
    });

    const result = await generateText({
      model: openai('gpt-4.1-mini'),
      prompt,
      temperature: 0.8,
      maxTokens: 1500,
    });

    const screenplay = result.text;

    console.log('✅ Generated screenplay:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(screenplay);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      success: true,
      screenplay,
      cast,
    };
  } catch (error) {
    console.error('❌ Error generating screenplay:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format screenplay for comic generation prompt
 */
export function formatScreenplayForComic(screenplay: string, cast: string[]): string {
  return `**PRE-SCRIPTED SCREENPLAY:**

This comic is based on the following screenplay with clearly attributed dialogue.
FOLLOW THIS SCREENPLAY EXACTLY for speaker attribution.

CAST:
${cast.map(c => `- ${c}`).join('\n')}

SCREENPLAY:
${screenplay}

**IMPORTANT:** Use this screenplay as the definitive source for who says what.
Each line of dialogue in the screenplay is attributed to a specific character.
Maintain this attribution in the comic panels.`;
}
