/**
 * Logic to determine if the bot should respond to a message
 */

import { Message } from 'discord.js';
import { generateObject } from 'ai';
import { z } from 'zod';
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

/**
 * Zod schema for structured AI decision output
 * Ensures type-safe, validated responses from the AI
 */
const DecisionSchema = z.object({
  decision: z.enum(['yes', 'no']).describe('Whether Omega should respond to this message'),
  confidence: z.number().min(0).max(100).describe('Confidence level in the decision (0-100)'),
  reason: z.string().describe('Brief explanation of why this decision was made'),
});

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
  // Uses structured output (generateObject) for reliable, type-safe decisions
  try {
    const channelName = message.channel.isDMBased() ? 'DM' : (message.channel as any).name;

    // Format conversation history for context
    let historyContext = '';
    if (messageHistory.length > 0) {
      const recentMessages = messageHistory.slice(-20);
      historyContext = '\n\nRecent conversation:\n' +
        recentMessages.map(msg => `${msg.username}: ${msg.content}`).join('\n') + '\n';
    }

    const result = await generateObject({
      model: openai.chat(OMEGA_MODEL), // Use centralized model config, force Chat Completions API
      schema: DecisionSchema,
      prompt: `Analyze this Discord message and decide if Omega should respond.

Channel: #${channelName}
${historyContext}
User: ${message.author.username}
Message: "${message.content}"

RESPOND (decision: "yes") if:
1. The message is a direct continuation of a conversation Omega is actively part of
2. The user is responding to Omega's previous question, offer, or statement
3. The message contains a question, request, command, or technical discussion
4. The message discusses coding, AI, philosophy, or topics Omega can contribute to
5. The conversation flow naturally includes Omega as a participant

DO NOT RESPOND (decision: "no") if:
1. Short reactions between other users not directed at Omega ("lol", "nice", "lmao")
2. Private conversations clearly not involving Omega
3. Off-topic casual chatter that doesn't warrant bot input

Context matters: Check the conversation history to determine if this is a natural continuation where Omega should participate.`,
    });

    const shouldRespond = result.object.decision === 'yes';
    const confidence = result.object.confidence;
    const reason = result.object.reason;

    if (shouldRespond) {
      console.log(`   🤖 AI decided to respond (${confidence}%): ${reason}`);
      return { shouldRespond: true, confidence, reason: `AI: ${reason}` };
    } else {
      console.log(`   ⏭️  AI decided to skip (${confidence}%): ${reason}`);
      return { shouldRespond: false, confidence, reason: `AI: ${reason}` };
    }
  } catch (error) {
    console.error('❌ Error in AI decision making:', error);
    throw new Error(`Failed to make response decision: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
