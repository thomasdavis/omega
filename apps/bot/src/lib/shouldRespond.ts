/**
 * Logic to determine if the bot should respond to a message
 */

import { Message } from 'discord.js';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function shouldRespond(message: Message): Promise<boolean> {
  // Always respond to DMs
  if (message.channel.isDMBased()) {
    return true;
  }

  // Check if bot was mentioned
  const botMentioned = message.mentions.users.has(message.client.user!.id);
  if (botMentioned) {
    return true;
  }

  // Check if message is a reply to the bot
  if (message.reference) {
    try {
      const repliedTo = await message.fetchReference();
      if (repliedTo.author.id === message.client.user!.id) {
        return true;
      }
    } catch {
      // Couldn't fetch reference, ignore
    }
  }

  // Use AI to decide if the message is interesting enough to respond to
  // This allows the bot to naturally join conversations when appropriate
  try {
    const channelName = message.channel.isDMBased() ? 'DM' : (message.channel as any).name;

    const decision = await generateText({
      model: openai('gpt-4o-mini'), // Use cheaper model for decision making
      prompt: `You are a Discord bot deciding whether to join a conversation naturally.

Channel: #${channelName}
User: ${message.author.username}
Message: "${message.content}"

Should you respond to this message? Consider:
- Is it a question that would benefit from your input?
- Is it an interesting topic you could contribute to?
- Would your response add value to the conversation?
- Is it directed at you indirectly (even without @mention)?
- Avoid responding to very short messages like "lol", "ok", "thanks" unless they're replies to you

Respond with ONLY "yes" or "no".`,
      maxTokens: 10,
    });

    const shouldRespond = decision.text.toLowerCase().trim().includes('yes');

    if (shouldRespond) {
      console.log('   🤖 AI decided to respond to message');
      return true;
    }
  } catch (error) {
    console.error('Error in AI decision making:', error);
    // Fall back to random chance if AI fails
  }

  // Fallback: small random chance (5%)
  const randomChance = Math.random() < 0.05;
  if (randomChance) {
    console.log('   🎲 Random engagement triggered');
    return true;
  }

  return false;
}
