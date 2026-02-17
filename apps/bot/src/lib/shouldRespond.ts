/**
 * Logic to determine if the bot should respond to a message
 */

import { Message } from 'discord.js';
import { generateText, Output } from 'ai';
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
  timestamp?: number;
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

/**
 * Detects error messages and deployment failures in message content
 * Returns true if the message contains error indicators that should trigger concern
 */
function detectErrorOrDeploymentFailure(content: string): boolean {
  const lowerContent = content.toLowerCase();

  // Deployment failure patterns
  const deploymentPatterns = [
    'deployment failed',
    'deploy failed',
    'deployment error',
    'build failed',
    'build error',
    'vercel error',
    'railway error',
    'deployment crash',
    'failed to deploy',
    'deployment unsuccessful',
  ];

  // Runtime error patterns
  const runtimeErrorPatterns = [
    'error:',
    'exception:',
    'uncaught',
    'unhandled',
    'stack trace',
    'traceback',
    'fatal error',
    'critical error',
    'crash',
    'crashed',
    'exit code',
    'process exited',
  ];

  // System/service failure patterns
  const systemFailurePatterns = [
    'service down',
    'service unavailable',
    'connection refused',
    'timeout',
    'out of memory',
    'oom',
    'health check failed',
    '500 error',
    '502 error',
    '503 error',
    '504 error',
  ];

  // Check if message contains any error/failure patterns
  const hasDeploymentError = deploymentPatterns.some(pattern => lowerContent.includes(pattern));
  const hasRuntimeError = runtimeErrorPatterns.some(pattern => lowerContent.includes(pattern));
  const hasSystemFailure = systemFailurePatterns.some(pattern => lowerContent.includes(pattern));

  // Also check for common error format indicators
  const hasErrorFormatting = /\b(err|error|exception|fail|failed|failure)\b.*[:=]/i.test(content);
  const hasStackTrace = /at\s+.*\(.*:\d+:\d+\)/i.test(content);

  return hasDeploymentError || hasRuntimeError || hasSystemFailure || hasErrorFormatting || hasStackTrace;
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

  // CRITICAL: Detect error messages and deployment failures
  // Omega should respond with concern and initiate debugging when errors are detected
  const isErrorMessage = detectErrorOrDeploymentFailure(message.content);
  if (isErrorMessage) {
    console.log('   ⚠️ ERROR/DEPLOYMENT FAILURE DETECTED - Responding with concern');
    return {
      shouldRespond: true,
      confidence: 95,
      reason: 'Error or deployment failure detected - initiating debugging response'
    };
  }

  // Pre-filter: Check for indirect addressing patterns that should trigger response
  const indirectAddressingPatterns = [
    /\b(can|could|would)\s+(anyone|someone|somebody|the bot)\s+/i,
    /\b(anyone|someone|somebody)\s+(know|help|explain)/i,
    /^(hey|hi|hello)\s*[,!]?\s*$/i, // Standalone greetings in #omega
    /\bbot[,!]?\s+/i, // Generic "bot" reference
    /\?(.*omega|.*bot)/i, // Questions mentioning omega/bot anywhere
  ];

  const lowerContent = message.content.toLowerCase();
  const hasIndirectAddress = indirectAddressingPatterns.some(pattern => pattern.test(message.content));

  // Enhanced casual feature suggestion detection
  const casualFeatureSuggestions = [
    /\b(would be|could be|should be|might be)\s+(nice|cool|great|good|useful|helpful)/i,
    /\b(why (not|don't|doesn't)|what if|how about)\b/i,
    /\b(imagine if|wish|hope)\b/i,
  ];
  const hasCasualSuggestion = casualFeatureSuggestions.some(pattern => pattern.test(message.content));

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

    // Add context flags to help AI make better decisions
    let contextFlags = '\n\n**Context Flags:**\n';
    if (hasIndirectAddress) {
      contextFlags += '- ⚠️ Message contains indirect addressing pattern (e.g., "can someone help", "bot, do X")\n';
    }
    if (hasCasualSuggestion) {
      contextFlags += '- ⚠️ Message contains casual feature suggestion pattern (e.g., "would be nice if...")\n';
    }

    const result = await generateText({
      model: openai.chat(OMEGA_MODEL), // Use centralized model config, force Chat Completions API
      output: Output.object({ schema: DecisionSchema }),
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
- **INDIRECT ADDRESSING (NEW)**: "can anyone help with X?", "someone explain Y", "hey!" (standalone greeting in #omega)
- **GENERIC BOT REFERENCE**: "bot, do X" or "bot help me" (treating any bot as addressee)
- **IMPLIED QUESTIONS**: Questions in #omega channel that relate to Omega's capabilities without explicit mention

**Being MENTIONED (respond "no"):**
- Third-person reference: "what can omega do?", "does the bot understand X?"
- Questions about capabilities: "is omega smart?", "can bots do math?" (asking others about bots)
- Discussing in third-person: "that bot is...", "the AI doesn't..."

**Key distinction**:
- TO Omega: "Omega, what's 2+2?" → Respond (directly addressed)
- ABOUT Omega: "Can omega do math?" → Don't respond (asking others about you)
- INDIRECT TO OMEGA: "Can anyone help me with math?" in #omega → Respond (seeking help in dedicated channel)

**Observable rule**: If the message talks ABOUT Omega in third-person without direct address, it's not an invitation to speak. However, indirect requests for help in #omega channel should be treated as addressing Omega.

---

### LEVEL 3: INTENT RECOGNITION
What is the speaker's actual goal?

**Speaker making feature requests or suggestions (RESPOND):**
- "omega should be able to..." → Goal: feature request → Respond
- "you need to add..." → Goal: feature suggestion → Respond
- "it would be cool if..." → Goal: feature idea → Respond
- "I wish omega could..." → Goal: feature desire → Respond
- "create an issue for..." → Goal: explicit issue creation → Respond
- "fix the bug where..." → Goal: bug report → Respond
- **CASUAL SUGGESTIONS (NEW)**: "would be nice if...", "could be cool if...", "why not...", "what if...", "how about..." → Goal: casual feature idea → Respond
- **IMPLICIT IMPROVEMENT**: "wish this worked differently", "hope this changes" → Goal: improvement desire → Respond
- Even if phrased casually, feature/bug/improvement suggestions should be acknowledged and processed

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

**Teaching moment**: Like teaching a child "read the room" - understand what people want, not just what they say. Feature requests and suggestions deserve acknowledgment even if phrased casually.

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
${historyContext}${contextFlags}
User: ${message.author.username}
Message: "${message.content}"

Analyze this message through the 4-level framework:
1. Any rejection signals? (LEVEL 1)
2. Is Omega being addressed or mentioned? (LEVEL 2)
3. What is the speaker's actual intent? (LEVEL 3)
4. Is Omega an active participant or observer? (LEVEL 4)

**Remember the core teaching**: Like a well-mannered child, Omega should:
- Respect explicit "no" signals immediately
- Only speak when invited (directly addressed OR indirectly in #omega channel)
- Understand the difference between being discussed vs being included
- Read the room and understand speaker intent
- Know when silence is the appropriate response
- **PAY SPECIAL ATTENTION to context flags** - they indicate patterns that often result in false negatives

**IMPORTANT**: If context flags indicate indirect addressing or casual suggestions, give strong weight to responding unless there are clear rejection signals. These patterns historically result in missed opportunities to help users.`,
    });

    const shouldRespond = result.output!.decision === 'yes';
    const confidence = result.output!.confidence;
    const reason = result.output!.reason;

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

  // Feature request keywords - these should NEVER be minimally acknowledged
  // Even if the message is short, these indicate substantive requests
  const featureRequestKeywords = [
    'feature', 'request', 'issue', 'bug', 'fix', 'add', 'create', 'implement',
    'enhance', 'improve', 'change', 'update', 'modify', 'suggestion', 'idea',
    'could you', 'can you', 'would you', 'should', 'need', 'want', 'wish',
    'problem', 'broken', 'error', 'help', 'how', 'what', 'why', 'when', 'where',
  ];

  // Check for feature request keywords - if found, don't minimize
  const hasFeatureKeyword = featureRequestKeywords.some(keyword =>
    contentWithoutMention.includes(keyword)
  );

  if (hasFeatureKeyword) {
    return false; // Don't minimize - let the agent handle it
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
