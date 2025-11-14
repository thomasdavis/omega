import { streamText } from 'ai';
import { getPersonality, getAIConfigForPersonality } from '../lib/ai';
import { editResponse, getUserId } from '../lib/discord';
import { truncateText } from '../utils/response';
import { formatErrorMessage } from '../utils/errors';
import type { DiscordInteraction } from '../types/discord';

/**
 * In-memory storage for user personalities
 * In production, use a database like Vercel KV, Redis, or PostgreSQL
 */
const userPersonalities = new Map<string, string>();

/**
 * Get user's personality preference
 */
export function getUserPersonality(userId: string): string {
  return userPersonalities.get(userId) || 'professional';
}

/**
 * Set user's personality preference
 */
export function setUserPersonality(userId: string, personality: string): void {
  userPersonalities.set(userId, personality);
}

/**
 * Handle /ask command
 * Generates AI response based on user prompt
 */
export async function handleAskCommand(
  interaction: DiscordInteraction
): Promise<void> {
  const appId = process.env.DISCORD_APP_ID!;
  const token = interaction.token;

  try {
    // Extract prompt from command options
    const prompt = interaction.data?.options?.find(
      (opt) => opt.name === 'prompt'
    )?.value as string;

    if (!prompt || prompt.trim().length === 0) {
      await editResponse(appId, token, '❌ Please provide a prompt for the AI.');
      return;
    }

    // Get user's personality preference
    const userId = getUserId(interaction);
    const personalityMode = getUserPersonality(userId);
    const personality = getPersonality(personalityMode);
    const aiConfig = getAIConfigForPersonality(personalityMode);

    console.log(`[ASK] User ${userId} (${personalityMode}): ${prompt.substring(0, 50)}...`);

    // Generate AI response
    const result = await streamText({
      model: aiConfig.model,
      maxTokens: aiConfig.maxTokens,
      temperature: personality.temperature || aiConfig.temperature,
      messages: [
        {
          role: 'system',
          content: personality.systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Get the complete response
    const response = await result.text;

    // Truncate if needed (Discord limit: 2000 chars)
    const truncated = truncateText(response, 2000);

    // Send response to Discord
    await editResponse(appId, token, truncated);

    console.log(`[ASK] Response sent (${response.length} chars)`);
  } catch (error) {
    console.error('[ASK] Error:', error);
    const errorMessage = formatErrorMessage(error);
    await editResponse(appId, token, errorMessage);
  }
}
