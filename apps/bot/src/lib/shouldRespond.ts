/**
 * Logic to determine if the bot should respond to a message
 */

import { Message } from 'discord.js';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { buildSystemPrompt } from './systemPrompt.js';
import { OMEGA_MODEL } from '../config/models.js';

export interface ShouldRespondResult {
  shouldRespond: boolean;
  confidence: number;
  reason: string;
}

export interface MessageHistoryItem {
  username: string;
  content: string;
}

export async function shouldRespond(
  message: Message,
  messageHistory: MessageHistoryItem[] = []
): Promise<ShouldRespondResult> {
  // Always respond to DMs
  if (message.channel.isDMBased()) {
    return { shouldRespond: true, confidence: 100, reason: 'Direct message' };
  }

  // Check if bot was mentioned - respond in ANY channel when directly tagged
  const botMentioned = message.mentions.users.has(message.client.user!.id);
  if (botMentioned) {
    return { shouldRespond: true, confidence: 100, reason: 'Direct mention' };
  }

  // For non-mentions, only respond in #omega channel
  const channelName = (message.channel as any).name;
  if (channelName !== 'omega') {
    console.log(`   ⏭️  Ignoring message from #${channelName} (only responding in #omega unless mentioned)`);
    return { shouldRespond: false, confidence: 100, reason: `Wrong channel (#${channelName})` };
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

    // Format conversation history for context
    let historyContext = '';
    if (messageHistory.length > 0) {
      const recentMessages = messageHistory.slice(-5); // Last 5 messages for context
      historyContext = '\n\nRecent conversation:\n' +
        recentMessages.map(msg => `${msg.username}: ${msg.content}`).join('\n') + '\n';
    }

    const decision = await generateText({
      model: openai.chat(OMEGA_MODEL), // Use centralized model config, force Chat Completions API
      system: buildSystemPrompt(message.author.username),
      prompt: `**DECISION TASK**: Decide if you should respond to the current message below.

Channel: #${channelName}
Current user: ${message.author.username}
Current message: "${message.content}"${historyContext}

CRITICAL RULES FOR CONVERSATIONAL CONTEXT:
1. **If Omega (you) just asked a question or offered to do something, and the user is clearly responding to YOU, ALWAYS respond.**
   - Examples: "Would you like me to...?" → user says "yes", "sure", "do it", etc.
   - This is a direct continuation of YOUR conversation

2. **Natural conversation flow matters:**
   - Look at the recent conversation context
   - If the current message is a reply/response to something Omega said, respond
   - Users don't need to say "omega" every time in an ongoing conversation

3. **Be conversational, not robotic:**
   - Users should talk to you like a human, not a command-line tool
   - "implement painting skills" = respond (clear intent, even without "omega")
   - "yes do it" after you asked = respond (continuation)
   - "lmao" in isolation = maybe skip (unless it's reacting to you)

ALWAYS respond to:
- Responses to YOUR questions or offers (check conversation history!)
- Any message mentioning "omega" or "you" when referring to the bot
- Direct questions or requests (even casual ones like "do this" or "make that")
- Technical discussions, coding, features, tools
- Natural conversation that includes you
- Commands/requests even without explicit bot mention

Only SKIP:
- Very short reactions ("lol", "nice") between OTHER users (not about you)
- Clear private conversations NOT involving you
- Obvious spam or complete nonsense

**Think like a participant in the conversation, not a keyword detector.**

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
