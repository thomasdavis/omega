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

Default to YES when in doubt - be helpful and engaged!

Respond in this exact JSON format:
{
  "decision": "yes" or "no",
  "confidence": <number 0-100>,
  "reason": "<brief explanation>"
}`,
      maxTokens: 100,
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

  // Fallback: increased random chance (15% - up from 5%)
  const randomChance = Math.random() < 0.15;
  if (randomChance) {
    console.log('   🎲 Random engagement triggered');
    return { shouldRespond: true, confidence: 15, reason: 'Random engagement (15% chance)' };
  }

  return { shouldRespond: false, confidence: 95, reason: 'Not relevant enough' };
}
