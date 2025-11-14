import { editResponse, getUserId } from '../lib/discord.js';
import { setUserPersonality } from './ask.js';
import type { DiscordInteraction } from '../types/discord.js';
import { formatErrorMessage } from '../utils/errors.js';
import { personalityPrompts } from '../lib/ai.js';

/**
 * Handle /vibe command
 * Allows users to change the AI's personality
 */
export async function handleVibeCommand(
  interaction: DiscordInteraction
): Promise<void> {
  const appId = process.env.DISCORD_APP_ID!;
  const token = interaction.token;

  try {
    // Extract mode from command options
    const mode = interaction.data?.options?.find(
      (opt) => opt.name === 'mode'
    )?.value as string;

    if (!mode) {
      await editResponse(appId, token, '❌ Please select a personality mode.');
      return;
    }

    // Validate mode
    if (!personalityPrompts[mode]) {
      await editResponse(
        appId,
        token,
        `❌ Invalid mode: ${mode}. Available modes: professional, chaotic, zen`
      );
      return;
    }

    // Get user ID and save preference
    const userId = getUserId(interaction);
    setUserPersonality(userId, mode);

    console.log(`[VIBE] User ${userId} set personality to: ${mode}`);

    // Send confirmation with personality description
    let description = '';
    switch (mode) {
      case 'professional':
        description = 'Clear, concise, and formal. Perfect for serious questions!';
        break;
      case 'chaotic':
        description = 'Fun, creative, and unpredictable! Let\'s have some fun! 🎉';
        break;
      case 'zen':
        description = 'Calm, mindful, and peaceful. Find your inner balance. 🧘';
        break;
    }

    const message = `
✅ **Personality Updated!**

Your AI is now in **${mode}** mode.
${description}

Try asking me something with \`/ask\` to see the difference!
    `.trim();

    await editResponse(appId, token, message);
  } catch (error) {
    console.error('[VIBE] Error:', error);
    const errorMessage = formatErrorMessage(error);
    await editResponse(appId, token, errorMessage);
  }
}
