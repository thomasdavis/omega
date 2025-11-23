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
      prompt: `You are analyzing whether Omega (an AI Discord bot) should respond to this message.

Think of this like teaching a child when to join a conversation: clear rules, observable behaviors, respect for boundaries.

## DECISION FRAMEWORK (Hierarchical - check in order)

### LEVEL 1: EXPLICIT REJECTION (Overrides everything)
If the message contains explicit rejection or exclusion, respond "no" immediately.

**Rejection signals (observable behaviors):**
- Direct exclusion: "I'm not talking to you", "don't respond", "leave me alone", "shut up bot"
- Seeking non-AI: "any humans here?", "I need a real person", "actual human", "can a human help?"
- Frustration with bots: "stop responding", "go away", "I didn't ask you"
- Privacy assertion: "this is between me and [person]", "private conversation"

**Teaching moment**: When someone says "no" in any form, you stop immediately. This is like teaching a child to respect "no means no."

If ANY rejection signal is present, confidence should be 95-100% for NOT responding.

---

### LEVEL 2: WHO IS BEING ADDRESSED? (Social Referencing)
Questions ABOUT Omega ≠ Questions TO Omega

**Being ADDRESSED (respond "yes"):**
- Direct mention: "@Omega", "omega", "hey bot"
- Direct reply: message is a reply to Omega's previous message
- Explicit invitation: "omega can you...", "bot, help me..."
- Second-person directed: "can you [action]" when Omega is the clear referent

**Being MENTIONED (respond "no"):**
- Third-person reference: "what can omega do?", "does the bot understand X?"
- Questions about capabilities: "is omega smart?", "can bots do math?" (asking others about bots)
- Discussing in third-person: "that bot is...", "the AI doesn't..."

**Key distinction**:
- TO Omega: "Omega, what's 2+2?" → Respond (directly addressed)
- ABOUT Omega: "Can omega do math?" → Don't respond (asking others about you)

**Observable rule**: If the message talks ABOUT Omega in third-person without direct address, it's not an invitation to speak.

---

### LEVEL 3: INTENT RECOGNITION
What is the speaker's actual goal?

**Speaker seeking human connection:**
- "any humans here?" → Goal: find human interaction → Don't respond
- "lol" between users → Goal: casual human banter → Don't respond
- "thanks bro" to another user → Goal: acknowledge human → Don't respond

**Speaker seeking information/help:**
- "how do I deploy this?" → Goal: technical help → Consider responding
- "what's the weather?" → Goal: information → Consider responding
- "can someone explain X?" → Goal: learning → Consider responding if in active conversation

**Speaker continuing conversation WITH Omega:**
- Previous message was Omega's → High likelihood of continuation
- Following up on Omega's question → Definitely respond
- Building on Omega's statement → Respond

**Teaching moment**: Like teaching a child "read the room" - understand what people want, not just what they say.

---

### LEVEL 4: CONVERSATION FLOW (Contextual Participation)
Am I an active participant or an observer?

**Active participant indicators (respond "yes"):**
- Last 3-5 messages include Omega's responses
- User is asking follow-up questions to Omega's previous answers
- Conversation topic matches Omega's capabilities
- Natural back-and-forth dialogue established

**Observer indicators (respond "no"):**
- Private conversation between 2+ other users
- Rapid-fire short messages ("lol", "nice", "yeah")
- Topic is personal/social (not technical/informational)
- No Omega participation in recent history

---

## YOUR ANALYSIS

Channel: #${channelName}
${historyContext}
User: ${message.author.username}
Message: "${message.content}"

Analyze this message through the 4-level framework:
1. Any rejection signals? (LEVEL 1)
2. Is Omega being addressed or mentioned? (LEVEL 2)
3. What is the speaker's actual intent? (LEVEL 3)
4. Is Omega an active participant or observer? (LEVEL 4)

**Remember the core teaching**: Like a well-mannered child, Omega should:
- Respect explicit "no" signals immediately
- Only speak when invited (directly addressed)
- Understand the difference between being discussed vs being included
- Read the room and understand speaker intent
- Know when silence is the appropriate response`,
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

/**
 * Determine if a message warrants only a minimal acknowledgment
 * Used when bot is directly mentioned but message doesn't need verbose response
 */
export function shouldMinimallyAcknowledge(message: Message): boolean {
  const content = message.content.toLowerCase().trim();

  // Remove bot mention to analyze the actual message content
  const contentWithoutMention = content
    .replace(/<@!?\d+>/g, '') // Remove Discord mentions
    .replace(/omega/gi, '')    // Remove "omega" references
    .trim();

  // If there's no content after removing mentions, it's just a ping
  if (contentWithoutMention.length === 0) {
    return true;
  }

  // Simple acknowledgments that don't need verbose responses
  const minimalPhrases = [
    'thanks', 'thank you', 'ty', 'thx', 'thanx',
    'ok', 'okay', 'k', 'kk',
    'cool', 'nice', 'neat', 'great',
    'got it', 'gotcha', 'understood',
    'yep', 'yeah', 'yes', 'yup', 'sure',
    'nope', 'nah', 'no',
    'hi', 'hello', 'hey', 'sup', 'yo',
    'bye', 'goodbye', 'cya', 'see ya', 'later',
    'lol', 'lmao', 'haha', 'hehe',
  ];

  // Check if message is just a minimal phrase (with some tolerance for punctuation)
  const cleanContent = contentWithoutMention.replace(/[!?.,:;]+$/g, '');

  // Exact match for minimal phrases
  if (minimalPhrases.includes(cleanContent)) {
    return true;
  }

  // Very short messages (1-3 characters) that are likely just acknowledgments
  if (cleanContent.length <= 3) {
    return true;
  }

  return false;
}

/**
 * Generate a minimal acknowledgment response
 * Returns a simple emoji or short phrase to acknowledge without verbosity
 */
export function getMinimalAcknowledgment(message: Message): string {
  const content = message.content.toLowerCase().trim();
  const contentWithoutMention = content
    .replace(/<@!?\d+>/g, '')
    .replace(/omega/gi, '')
    .trim();

  // Gratitude responses
  if (/thank|thx|ty/.test(contentWithoutMention)) {
    const responses = ['👍', '✨', '🙏', 'np!', 'anytime!'];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Greeting responses
  if (/^(hi|hello|hey|sup|yo)/.test(contentWithoutMention)) {
    const responses = ['👋', '🙂', 'hey!', 'hi!'];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Farewell responses
  if (/bye|goodbye|cya|later/.test(contentWithoutMention)) {
    const responses = ['👋', '✌️', 'bye!', 'cya!'];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Affirmative responses
  if (/^(ok|okay|k|kk|cool|nice|neat|great|got it|gotcha|understood|yep|yeah|yes|yup|sure)/.test(contentWithoutMention)) {
    const responses = ['👍', '✅', '🙂', 'cool!'];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Negative responses
  if (/^(nope|nah|no)/.test(contentWithoutMention)) {
    const responses = ['👌', '🙂', 'alright'];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Humor responses
  if (/lol|lmao|haha|hehe/.test(contentWithoutMention)) {
    const responses = ['😄', '😂', '🙃', 'lol'];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Default minimal acknowledgment (just a ping or very short message)
  const responses = ['👍', '✨', '🙂'];
  return responses[Math.floor(Math.random() * responses.length)];
}
