/**
 * Logic to determine if the bot should respond to a message
 */

import { Message } from 'discord.js';

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

  // Random chance to respond (10% of the time for organic engagement)
  // You can adjust this or use AI to decide
  const randomChance = Math.random() < 0.1;
  if (randomChance) {
    console.log('   🎲 Random engagement triggered');
    return true;
  }

  // TODO: Add more sophisticated logic here:
  // - Check if message is interesting/engaging (use AI)
  // - Check for keywords or patterns
  // - Check conversation context
  // - Rate limiting per channel/user

  return false;
}
