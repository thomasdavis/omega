/**
 * Command Registration Endpoint
 *
 * This endpoint registers slash commands with Discord.
 * Call this once after deployment to register your commands.
 *
 * Usage: curl https://your-app.vercel.app/api/register-commands
 *
 * Endpoint: /api/register-commands
 */

import { registerGlobalCommands } from '../src/lib/discord';
import {
  ApplicationCommandOptionType,
  type DiscordApplicationCommand,
} from '../src/types/discord';

/**
 * Define all bot commands
 */
const commands: DiscordApplicationCommand[] = [
  {
    name: 'ask',
    description: 'Ask the AI anything',
    options: [
      {
        type: ApplicationCommandOptionType.STRING,
        name: 'prompt',
        description: 'Your question or prompt for the AI',
        required: true,
        min_length: 1,
        max_length: 2000,
      },
    ],
  },
  {
    name: 'help',
    description: 'Show available commands and usage instructions',
  },
  {
    name: 'vibe',
    description: 'Change the AI personality mode',
    options: [
      {
        type: ApplicationCommandOptionType.STRING,
        name: 'mode',
        description: 'Select a personality mode',
        required: true,
        choices: [
          {
            name: 'Professional - Clear and formal',
            value: 'professional',
          },
          {
            name: 'Chaotic - Fun and creative 🎉',
            value: 'chaotic',
          },
          {
            name: 'Zen - Calm and mindful 🧘',
            value: 'zen',
          },
        ],
      },
    ],
  },
];

/**
 * Handler function
 */
export default async function handler(req: Request): Promise<Response> {
  try {
    console.log('[REGISTER] Registering commands...');

    // Validate environment variables
    if (!process.env.DISCORD_APP_ID || !process.env.DISCORD_BOT_TOKEN) {
      return Response.json(
        {
          success: false,
          error: 'Missing required environment variables: DISCORD_APP_ID or DISCORD_BOT_TOKEN',
        },
        { status: 500 }
      );
    }

    // Register commands globally
    const result = await registerGlobalCommands(commands);

    console.log('[REGISTER] Commands registered successfully:', result);

    return Response.json({
      success: true,
      message: 'Commands registered successfully!',
      commands: result,
      note: 'Global commands may take up to 1 hour to appear in Discord due to caching.',
    });
  } catch (error) {
    console.error('[REGISTER] Error registering commands:', error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details:
          'Make sure DISCORD_APP_ID and DISCORD_BOT_TOKEN are set correctly.',
      },
      { status: 500 }
    );
  }
}
