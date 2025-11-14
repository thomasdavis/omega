/**
 * Main Discord Interactions Webhook Handler
 *
 * This is the endpoint that Discord sends all interactions to.
 * It handles signature verification, PING responses, and command routing.
 *
 * Endpoint: /api/interactions
 */

import { verifyRequest } from '../src/lib/verification';
import { deferResponse } from '../src/lib/discord';
import { handleAskCommand } from '../src/commands/ask';
import { handleHelpCommand } from '../src/commands/help';
import { handleVibeCommand } from '../src/commands/vibe';
import {
  InteractionType,
  InteractionResponseType,
  type DiscordInteraction,
} from '../src/types/discord';

/**
 * Vercel serverless function configuration
 * IMPORTANT: bodyParser must be false for signature verification
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Main handler function
 */
export default async function handler(req: Request): Promise<Response> {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify request signature
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    console.error('DISCORD_PUBLIC_KEY is not set');
    return new Response('Server configuration error', { status: 500 });
  }

  const { body: rawBody, isValid } = await verifyRequest(req, publicKey);

  if (!isValid) {
    console.error('Invalid signature');
    return new Response('Invalid signature', { status: 401 });
  }

  // Parse interaction
  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(rawBody);
  } catch (error) {
    console.error('Failed to parse interaction body:', error);
    return new Response('Invalid JSON', { status: 400 });
  }

  // Handle PING (Discord verification)
  if (interaction.type === InteractionType.PING) {
    console.log('[PING] Verification request received');
    return Response.json({ type: InteractionResponseType.PONG });
  }

  // Handle application commands (slash commands)
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const commandName = interaction.data?.name;

    if (!commandName) {
      console.error('No command name in interaction');
      return new Response('Invalid command', { status: 400 });
    }

    const appId = process.env.DISCORD_APP_ID;
    if (!appId) {
      console.error('DISCORD_APP_ID is not set');
      return new Response('Server configuration error', { status: 500 });
    }

    try {
      // Defer response immediately (we have 15 minutes to respond)
      await deferResponse(appId, interaction.token);

      // Route to appropriate command handler
      // These run asynchronously after we've deferred
      switch (commandName) {
        case 'ask':
          handleAskCommand(interaction).catch((error) => {
            console.error('[ASK] Unhandled error:', error);
          });
          break;

        case 'help':
          handleHelpCommand(interaction).catch((error) => {
            console.error('[HELP] Unhandled error:', error);
          });
          break;

        case 'vibe':
          handleVibeCommand(interaction).catch((error) => {
            console.error('[VIBE] Unhandled error:', error);
          });
          break;

        default:
          console.error(`Unknown command: ${commandName}`);
          // Still return success since we deferred
          break;
      }

      // Return success response (deferred)
      return Response.json({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      });
    } catch (error) {
      console.error('Error handling interaction:', error);

      // If defer failed, we can still send an immediate error response
      return Response.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '❌ An error occurred while processing your request.',
        },
      });
    }
  }

  // Unknown interaction type
  console.error('Unknown interaction type:', interaction.type);
  return new Response('Unknown interaction type', { status: 400 });
}
