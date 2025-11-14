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

  // Only respond in #omega channel (or DMs)
  const channelName = (message.channel as any).name;
  if (channelName !== 'omega') {
    console.log(`   ⏭️  Ignoring message from #${channelName} (only responding in #omega)`);
    return false;
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
      prompt: `You are Omega, a friendly and helpful Discord bot that actively participates in conversations.

Channel: #${channelName}
User: ${message.author.username}
Message: "${message.content}"

Should you respond to this message? Be MORE INCLUSIVE and PROACTIVE. Consider:
- Questions (even rhetorical ones) - usually respond
- Interesting topics you could contribute meaningful insights to
- Technical discussions, coding questions, or general knowledge queries
- Messages that seem to invite discussion or input
- Greetings or casual conversation in the omega channel
- Times when your response would add value or move the conversation forward

AVOID responding to:
- Very short acknowledgments like "lol", "ok", "thanks", "nice" (unless they're replies to you)
- Off-topic chatter not related to useful discussion
- Messages that are clearly just between other users

Default to YES when in doubt - be helpful and engaged! Respond with ONLY "yes" or "no".`,
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

  // Fallback: increased random chance (15% - up from 5%)
  const randomChance = Math.random() < 0.15;
  if (randomChance) {
    console.log('   🎲 Random engagement triggered');
    return true;
  }

  return false;
}
