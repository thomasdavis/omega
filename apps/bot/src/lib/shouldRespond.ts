/**
 * Logic to determine if the bot should respond to a message
 */

import { Message } from 'discord.js';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export interface ShouldRespondResult {
  shouldRespond: boolean;
  confidence: number;
  reason: string;
}

export async function shouldRespond(message: Message): Promise<ShouldRespondResult> {
  // Always respond to DMs
  if (message.channel.isDMBased()) {
    return { shouldRespond: true, confidence: 100, reason: 'Direct message' };
  }

  // Only respond in #omega channel (or DMs)
  const channelName = (message.channel as any).name;
  if (channelName !== 'omega') {
    console.log(`   ⏭️  Ignoring message from #${channelName} (only responding in #omega)`);
    return { shouldRespond: false, confidence: 100, reason: `Wrong channel (#${channelName})` };
  }

  // Check if bot was mentioned
  const botMentioned = message.mentions.users.has(message.client.user!.id);
  if (botMentioned) {
    return { shouldRespond: true, confidence: 100, reason: 'Direct mention' };
  }

  // Check if message is a reply to the bot
  if (message.reference) {
    try {
      const repliedTo = await message.fetchReference();
      if (repliedTo.author.id === message.client.user!.id) {
        return { shouldRespond: true, confidence: 100, reason: 'Reply to my message' };
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
      model: openai('gpt-5-mini'), // Use cheaper model for decision making
      prompt: `You are Omega, a friendly and helpful Discord bot. Decide if you should respond to this message.

Channel: #${channelName}
User: ${message.author.username}
Message: "${message.content}"

IMPORTANT: Be VERY INCLUSIVE. Respond to almost everything unless it's clearly spam or irrelevant.

ALWAYS respond to:
- Any message that mentions your name "omega" (even casually)
- Direct questions to you or general questions
- Requests for help, tools, features, or actions
- Technical discussions or coding topics
- Messages that seem to want engagement or discussion
- Greetings or casual conversation

Only AVOID responding to:
- Very short responses like "lol", "ok", "nice" between other users
- Clear private conversations between specific users
- Complete nonsense or spam

When in doubt, RESPOND. Err on the side of being helpful and engaged. Your confidence should be high (70-90%) when responding.

Respond in JSON format:
{
  "decision": "yes" or "no",
  "confidence": <number 0-100>,
  "reason": "<brief explanation>"
}`,
    });

    const response = JSON.parse(decision.text.trim());
    const shouldRespond = response.decision.toLowerCase() === 'yes';
    const confidence = response.confidence;
    const reason = response.reason;

    if (shouldRespond) {
      console.log(`   🤖 AI decided to respond (${confidence}%): ${reason}`);
      return { shouldRespond: true, confidence, reason: `AI: ${reason}` };
    } else {
      return { shouldRespond: false, confidence, reason: `AI: ${reason}` };
    }
  } catch (error) {
    console.error('Error in AI decision making:', error);
    // Fall back to random chance if AI fails
  }

  // Fallback: increased random chance (30% - be more engaged!)
  const randomChance = Math.random() < 0.30;
  if (randomChance) {
    console.log('   🎲 Random engagement triggered');
    return { shouldRespond: true, confidence: 30, reason: 'Random engagement (30% chance)' };
  }

  return { shouldRespond: false, confidence: 70, reason: 'Not relevant enough' };
}
