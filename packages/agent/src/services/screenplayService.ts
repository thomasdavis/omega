/**
 * Screenplay Generation Service
 * Generates text-based screenplays for comics to ensure proper character attribution
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

interface ScreenplayOptions {
  conversationContext: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  characterProfiles: string; // JSON string of character profiles
}

interface ScreenplayResult {
  success: boolean;
  screenplay?: string;
  error?: string;
}

/**
 * Generate a screenplay for a comic to ensure proper character attribution
 */
export async function generateScreenplay(options: ScreenplayOptions): Promise<ScreenplayResult> {
  const { conversationContext, prNumber, prTitle, prAuthor, characterProfiles } = options;

  try {
    console.log(`📝 Generating screenplay for PR #${prNumber}: ${prTitle}`);

    const prompt = buildScreenplayPrompt(
      conversationContext,
      prNumber,
      prTitle,
      prAuthor,
      characterProfiles
    );

    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
      temperature: 0.8,
      maxTokens: 2000,
    });

    const screenplay = result.text;

    console.log('\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📜 GENERATED SCREENPLAY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(screenplay);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n');

    return {
      success: true,
      screenplay,
    };
  } catch (error) {
    console.error('❌ Error generating screenplay:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Build the prompt for screenplay generation
 */
function buildScreenplayPrompt(
  conversationContext: string,
  prNumber: number,
  prTitle: string,
  prAuthor: string,
  characterProfiles: string
): string {
  return `You are a screenplay writer preparing a script for a comic strip about a GitHub pull request conversation.

**Pull Request Information:**
- PR #${prNumber}: ${prTitle}
- Author: ${prAuthor}

**Conversation Context:**
${conversationContext}

**Character Profiles (JSON):**
${characterProfiles}

**Instructions:**

Write a SHORT screenplay (3-7 scenes) that will be used to generate a comic strip. The screenplay must:

1. **CAST LIST**: Start with a cast list of ALL characters who will appear
   - Include character names and brief descriptions from the profiles
   - Include Omega (the AI assistant) if relevant to the conversation
   - EXCLUDE "thomasdavis" (repo owner who appears in git commits but not a character)
   - Focus on Discord community members involved in the conversation

2. **CLEAR ATTRIBUTION**: Every line of dialogue must be explicitly tagged with the speaker
   - Format: CHARACTER_NAME: "dialogue here"
   - Never use ambiguous pronouns - always use character names

3. **STAGE DIRECTIONS**: Include brief stage directions for visual context
   - [ACTION] Character does something
   - [EXPRESSION] Character's facial expression or emotion
   - [SETTING] Where the scene takes place

4. **ACCURACY**: Base dialogue on actual conversation content
   - Use each character's communication style from their profile
   - Incorporate their personality traits (archetype, humor style)
   - Stay true to what was actually discussed in the PR

5. **COMIC FORMAT**: Keep it brief and visual
   - 3-7 scenes total (based on conversation complexity)
   - Each scene should fit in one comic panel
   - Focus on key moments and punchlines
   - Build to a comedic conclusion

6. **CONSISTENCY**: Maintain character consistency throughout
   - Reference physical descriptions from profiles
   - Keep personality traits consistent
   - Use their actual communication patterns

**Example Format:**

CAST:
- OMEGA: Sophisticated AI assistant with scarred face, intimidating presence
- ALICE: Discord user, software engineer, sarcastic humor style
- BOB: Discord user, designer, enthusiastic communicator

---

SCENE 1
[SETTING: GitHub pull request page on a laptop screen]
[Omega appears on screen, examining code with a critical eye]

OMEGA: "Another merge conflict. How delightful."

---

SCENE 2
[Alice's message pops up in chat]

ALICE: "Did you seriously break the build again?"

---

SCENE 3
[Bob joins the conversation, gesturing excitedly]

BOB: "Wait, I have an idea! What if we just..."

[Omega's expression turns skeptical]

---

Now write the screenplay for PR #${prNumber}. Keep it concise, accurate, and funny!`;
}
