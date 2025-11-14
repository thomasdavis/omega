import { editResponse } from '../lib/discord.js';
import type { DiscordInteraction } from '../types/discord.js';
import { formatErrorMessage } from '../utils/errors.js';

/**
 * Handle /help command
 * Shows available commands and usage instructions
 */
export async function handleHelpCommand(
  interaction: DiscordInteraction
): Promise<void> {
  const appId = process.env.DISCORD_APP_ID!;
  const token = interaction.token;

  try {
    const helpMessage = `
# 🤖 AI Assistant Bot

A serverless Discord bot powered by OpenAI GPT-4.

## Available Commands

**\`/ask [prompt]\`**
Ask the AI anything! Get intelligent responses to your questions.
Example: \`/ask What is the meaning of life?\`

**\`/vibe [mode]\`**
Change the AI's personality to match your vibe.
Modes:
• **Professional** - Clear, concise, formal responses
• **Chaotic** - Fun, creative, emoji-filled responses 🎉
• **Zen** - Calm, mindful, peaceful responses 🧘

**\`/help\`**
Show this help message.

## Examples

\`\`\`
/ask Explain quantum computing in simple terms
/ask Write a haiku about coding
/ask What's the weather like in Tokyo?
\`\`\`

\`\`\`
/vibe mode:chaotic
/ask Tell me a joke
\`\`\`

## Tips

• The bot remembers your personality preference across sessions
• Responses are limited to 2000 characters
• Be specific in your prompts for better results
• Have fun! 🚀

## Tech Stack

Built with:
• Discord Interactions API
• Vercel Serverless Functions
• OpenAI GPT-4
• Vercel AI SDK v6

---
*Powered by OpenAI • Deployed on Vercel*
    `.trim();

    await editResponse(appId, token, helpMessage);
    console.log('[HELP] Help message sent');
  } catch (error) {
    console.error('[HELP] Error:', error);
    const errorMessage = formatErrorMessage(error);
    await editResponse(appId, token, errorMessage);
  }
}
