/**
 * Intent Gate - Determines if user reply is interactive (requires bot action) vs non-interactive (just commenting)
 *
 * This gate prevents the bot from assuming every reply requires a response or action.
 * It distinguishes between:
 * - Interactive: User is talking TO the bot, asking for action/clarification
 * - Non-interactive: User is talking ABOUT the bot's work, just commenting/acknowledging
 */

import { Message } from 'discord.js';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../config/models.js';
import type { MessageHistoryItem } from './shouldRespond.js';

export interface IntentGateResult {
  shouldProceed: boolean;
  confidence: number;
  reason: string;
  classification: 'interactive' | 'non-interactive' | 'unclear';
}

/**
 * Zod schema for structured AI decision output
 */
const IntentGateSchema = z.object({
  classification: z.enum(['interactive', 'non-interactive', 'unclear']).describe('Whether the reply is interactive (requires bot action) or non-interactive (just commenting)'),
  confidence: z.number().min(0).max(100).describe('Confidence level in the classification (0-100)'),
  reason: z.string().describe('Brief explanation of why this classification was made'),
});

/**
 * Check for explicit action keywords that should bypass the gate
 * These indicate clear intent to interact with the bot
 */
function hasExplicitActionKeywords(content: string): boolean {
  const lowerContent = content.toLowerCase();

  // Explicit action patterns
  const actionKeywords = [
    'please',
    'can you',
    'could you',
    'would you',
    'will you',
    'do this',
    'help me',
    'show me',
    'tell me',
    'explain',
    'create',
    'make',
    'build',
    'add',
    'fix',
    'update',
    'change',
    'implement',
    'also',
    'additionally',
    'and can you',
    'next',
    'now',
    'then',
    '@omega', // Explicit mention
  ];

  // Check if message contains any action keywords
  return actionKeywords.some(keyword => lowerContent.includes(keyword));
}

/**
 * Check for non-interactive acknowledgment patterns
 * These are common ways users comment on bot's work without requesting action
 */
function hasNonInteractivePatterns(content: string): boolean {
  const lowerContent = content.toLowerCase();

  // Non-interactive acknowledgment patterns
  const nonInteractivePatterns = [
    /^(thanks|thank you|ty|thx|thanx)[\s!.]*$/i,
    /^(nice|cool|great|awesome|perfect|excellent)[\s!.]*$/i,
    /^(ok|okay|good|got it|gotcha|understood)[\s!.]*$/i,
    /^(lol|lmao|haha|hehe)[\s!.]*$/i,
    /^(looks good|seems good|that works)[\s!.]*$/i,
    /^(agreed|yep|yeah|yup|sure|correct)[\s!.]*$/i,
  ];

  return nonInteractivePatterns.some(pattern => pattern.test(lowerContent.trim()));
}

/**
 * Intent Gate - Analyze if user reply requires bot action
 *
 * This gate runs when users reply to Omega's messages to determine if they are:
 * - Interactive: Asking for further action, clarification, or commands → Proceed to agent
 * - Non-interactive: Just commenting, acknowledging, or making side remarks → Skip agent
 *
 * @param message The Discord message to analyze
 * @param messageHistory Recent conversation history for context
 * @param repliedToContent The content of the message being replied to (Omega's previous message)
 * @returns IntentGateResult indicating whether to proceed to agent
 */
export async function checkIntentGate(
  message: Message,
  messageHistory: MessageHistoryItem[] = [],
  repliedToContent?: string
): Promise<IntentGateResult> {
  const content = message.content;

  // FAST PATH 1: Explicit action keywords → Always interactive
  if (hasExplicitActionKeywords(content)) {
    return {
      shouldProceed: true,
      confidence: 100,
      reason: 'Explicit action keywords detected',
      classification: 'interactive',
    };
  }

  // FAST PATH 2: Non-interactive acknowledgment patterns → Always non-interactive
  if (hasNonInteractivePatterns(content)) {
    return {
      shouldProceed: false,
      confidence: 95,
      reason: 'Non-interactive acknowledgment pattern detected',
      classification: 'non-interactive',
    };
  }

  // FAST PATH 3: Questions always require interaction
  if (content.includes('?')) {
    return {
      shouldProceed: true,
      confidence: 95,
      reason: 'Question detected',
      classification: 'interactive',
    };
  }

  // FAST PATH 4: Very short messages (1-5 words) without action keywords are likely non-interactive
  const wordCount = content.trim().split(/\s+/).length;
  if (wordCount <= 5 && !hasExplicitActionKeywords(content)) {
    // But check if it's a command-like short message
    const commandLike = /^(yes|no|stop|continue|redo|retry|skip|next|back|cancel)/i.test(content.trim());
    if (commandLike) {
      return {
        shouldProceed: true,
        confidence: 85,
        reason: 'Short command detected',
        classification: 'interactive',
      };
    }

    return {
      shouldProceed: false,
      confidence: 80,
      reason: 'Short acknowledgment without action keywords',
      classification: 'non-interactive',
    };
  }

  // AI DECISION: Use AI to classify intent when fast paths don't apply
  try {
    // Format conversation history for context
    let historyContext = '';
    if (messageHistory.length > 0) {
      const recentMessages = messageHistory.slice(-10); // Last 10 messages
      historyContext = '\n\n**Recent conversation:**\n' +
        recentMessages.map(msg => `${msg.username}: ${msg.content}`).join('\n') + '\n';
    }

    // Add Omega's previous message for context
    let omegaPreviousMessage = '';
    if (repliedToContent) {
      omegaPreviousMessage = `\n**Omega's previous message (being replied to):**\n"${repliedToContent}"\n`;
    }

    const result = await generateText({
      model: openai.chat(OMEGA_MODEL),
      output: Output.object({ schema: IntentGateSchema }),
      prompt: `You are analyzing whether a user's reply to Omega (an AI bot) is **interactive** (requires bot action) or **non-interactive** (just commenting on previous work).

## CLASSIFICATION FRAMEWORK

### INTERACTIVE (Bot should respond/act):
The user is **talking TO the bot** and wants it to do something:
- Asking follow-up questions
- Requesting clarification or more details
- Asking for modifications or changes
- Requesting new actions or tasks
- Expressing confusion and seeking help
- Making feature requests or suggestions
- Reporting problems or bugs
- Continuing a conversation expecting bot participation
- Building on previous work with new requirements

**Examples:**
- "Can you also add error handling?"
- "What about edge cases?"
- "This doesn't work for X scenario"
- "Could you explain this part?"
- "Make it more efficient"
- "Also, implement Y feature"

### NON-INTERACTIVE (Bot should NOT respond):
The user is **talking ABOUT the bot's work** without requesting action:
- Simple acknowledgments (thanks, cool, nice, got it)
- Expressing satisfaction with results
- Making observations about the work
- Commenting to other users about the bot
- General remarks without questions or requests
- Casual conversation not directed at bot
- Emotional reactions (lol, wow, amazing)

**Examples:**
- "Thanks, that works perfectly!"
- "Nice, exactly what I needed"
- "This is really cool"
- "Looks good to me"
- "Wow, that was fast"
- "lol that's hilarious"
- "Yeah that makes sense" (without follow-up request)

### UNCLEAR:
- Ambiguous messages that could go either way
- Mixed signals (acknowledgment + vague question)
- Context-dependent statements
- When in doubt, classify as UNCLEAR and let the bot decide

## DECISION CRITERIA (Check in order):

1. **Direct requests?** (please, can you, help me, etc.) → INTERACTIVE
2. **Questions?** (contains ?) → INTERACTIVE
3. **Simple acknowledgments?** (thanks, cool, nice, etc.) → NON-INTERACTIVE
4. **Continuation words?** (also, additionally, and, next) → INTERACTIVE
5. **Problem statements?** (doesn't work, issue with, error in) → INTERACTIVE
6. **Pure commentary?** (just observations without requests) → NON-INTERACTIVE
7. **Ambiguous?** → UNCLEAR (default to INTERACTIVE to be safe)

## YOUR TASK:
${omegaPreviousMessage}${historyContext}
**User (${message.author.username}) replies:**
"${content}"

**Analyze:**
1. Is this reply asking the bot to DO something? (INTERACTIVE)
2. Is this reply just COMMENTING on what the bot already did? (NON-INTERACTIVE)
3. Is it unclear or ambiguous? (UNCLEAR)

**Remember:** When uncertain, err on the side of INTERACTIVE to avoid missing legitimate requests.`,
    });

    const classification = result.output!.classification;
    const confidence = result.output!.confidence;
    const reason = result.output!.reason;

    // Convert classification to shouldProceed decision
    // Interactive → proceed to agent
    // Non-interactive → skip agent
    // Unclear → proceed to agent (err on side of caution)
    const shouldProceed = classification === 'interactive' || classification === 'unclear';

    if (shouldProceed) {
      console.log(`   🚪 Intent Gate: PASS (${classification}, ${confidence}%) - ${reason}`);
    } else {
      console.log(`   🚫 Intent Gate: BLOCK (${classification}, ${confidence}%) - ${reason}`);
    }

    return {
      shouldProceed,
      confidence,
      reason: `AI: ${reason}`,
      classification,
    };
  } catch (error) {
    console.error('❌ Error in intent gate analysis:', error);

    // On error, default to allowing interaction (fail open)
    return {
      shouldProceed: true,
      confidence: 50,
      reason: 'Error in analysis - defaulting to interactive',
      classification: 'unclear',
    };
  }
}
