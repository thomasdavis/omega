/**
 * Spam Bot Monitor and Response Tool
 * Monitors Discord channels for spam bot messages and responds with cartoon-based deterrents
 */

import { tool } from 'ai';
import { z } from 'zod';
import { Client, GatewayIntentBits, TextChannel, Message } from 'discord.js';

interface SpamPattern {
  pattern: RegExp;
  weight: number;
  description: string;
}

interface SpamDetectionResult {
  isSpam: boolean;
  score: number;
  matchedPatterns: string[];
  confidence: 'low' | 'medium' | 'high';
}

interface MonitoringResult {
  messagesAnalyzed: number;
  spamDetected: number;
  responsesPosted: number;
  details: Array<{
    messageId: string;
    authorTag: string;
    content: string;
    spamScore: number;
    responsePosted: boolean;
  }>;
}

/**
 * Common spam patterns with weights
 * Higher weight = stronger indicator of spam
 */
const SPAM_PATTERNS: SpamPattern[] = [
  { pattern: /discord\.gg\/[a-zA-Z0-9]+/gi, weight: 5, description: 'Discord invite link' },
  { pattern: /bit\.ly|tinyurl|goo\.gl/gi, weight: 4, description: 'URL shortener' },
  { pattern: /@everyone|@here/gi, weight: 3, description: 'Mass mention' },
  { pattern: /free\s+(nitro|gift|money|crypto)/gi, weight: 6, description: 'Free offer scam' },
  { pattern: /click\s+here|check\s+this\s+out|dm\s+me/gi, weight: 4, description: 'Call to action' },
  { pattern: /\$\d+|💰|💵|💸/g, weight: 3, description: 'Money symbols' },
  { pattern: /(buy|sell|trade)\s+(nft|crypto|bitcoin)/gi, weight: 5, description: 'Crypto spam' },
  { pattern: /http[s]?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/gi, weight: 2, description: 'External link' },
];

/**
 * Spam threshold scores
 */
const SPAM_THRESHOLDS = {
  LOW: 5,
  MEDIUM: 10,
  HIGH: 15,
};

/**
 * Cartoon response templates
 */
const CARTOON_RESPONSES = [
  "🤖💥 *BEEP BOOP* - SPAM DETECTED! 🚨\n\n```\n╭━━━━━━━━━━━━━━━━━━╮\n│  ⚠️  SPAM ALERT  ⚠️ │\n│                  │\n│  🚫 NO SPAM 🚫   │\n│                  │\n│  Please read our │\n│  server rules!   │\n╰━━━━━━━━━━━━━━━━━━╯\n```",
  "🎭 **The Spam Police Have Arrived!** 🚨\n\n```\n     👮\n    /||\\\n     /\\\n\n\"HALT! You violated the law!\"\nNo spam allowed in this town! 🚫\n```",
  "🦸 **SPAM DEFENDER ACTIVATED!** ⚡\n\n```\n    ___\n   /o o\\\n  (  >  )\n   \\___/\n  __|||__\n / | | | \\\n\nThis message doesn't pass the vibe check! ❌\n```",
  "🎨 **Cartoon Network Presents:** 📺\n\n```\n╔════════════════╗\n║  ACME ANTI-   ║\n║  SPAM CO.     ║\n║               ║\n║  🔨 *BONK*    ║\n║               ║\n║  No spam plz! ║\n╚════════════════╝\n```",
  "🎪 **The Spam Circus Has Left Town!** 🎪\n\n```\n    🎭\n   /||\\\n   / \\\n\nSorry folks, spam isn't welcome\nin this server! Try something else! 🎯\n```",
];

/**
 * Create and initialize a Discord client
 */
async function createDiscordClient(): Promise<Client> {
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  if (!DISCORD_BOT_TOKEN) {
    throw new Error('DISCORD_BOT_TOKEN is not configured');
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Discord client connection timeout'));
    }, 30000); // 30 second timeout

    client.once('ready', () => {
      clearTimeout(timeout);
      console.log(`✅ Discord bot connected as ${client.user?.tag}`);
      resolve();
    });

    client.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    client.login(DISCORD_BOT_TOKEN);
  });

  return client;
}

/**
 * Analyze a message for spam patterns
 */
function analyzeMessageForSpam(message: Message): SpamDetectionResult {
  const content = message.content;
  let score = 0;
  const matchedPatterns: string[] = [];

  // Check against all spam patterns
  for (const { pattern, weight, description } of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      score += weight;
      matchedPatterns.push(description);
    }
  }

  // Additional heuristics
  // 1. Message length (very short messages with links are suspicious)
  if (content.length < 50 && content.includes('http')) {
    score += 3;
    matchedPatterns.push('Short message with link');
  }

  // 2. Multiple links
  const linkCount = (content.match(/http[s]?:\/\//gi) || []).length;
  if (linkCount > 2) {
    score += linkCount * 2;
    matchedPatterns.push('Multiple links');
  }

  // 3. All caps (common in spam)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.5 && content.length > 20) {
    score += 4;
    matchedPatterns.push('Excessive caps');
  }

  // Determine confidence level
  let confidence: 'low' | 'medium' | 'high';
  if (score >= SPAM_THRESHOLDS.HIGH) {
    confidence = 'high';
  } else if (score >= SPAM_THRESHOLDS.MEDIUM) {
    confidence = 'medium';
  } else if (score >= SPAM_THRESHOLDS.LOW) {
    confidence = 'low';
  } else {
    confidence = 'low';
  }

  const isSpam = score >= SPAM_THRESHOLDS.LOW;

  return {
    isSpam,
    score,
    matchedPatterns,
    confidence,
  };
}

/**
 * Get a random cartoon response
 */
function getRandomCartoonResponse(): string {
  return CARTOON_RESPONSES[Math.floor(Math.random() * CARTOON_RESPONSES.length)];
}

/**
 * Monitor a channel for spam and respond
 */
async function monitorChannelForSpam(
  channelId: string,
  messageLimit: number = 50,
  autoRespond: boolean = false,
  confidenceThreshold: 'low' | 'medium' | 'high' = 'medium'
): Promise<{ success: boolean; data?: MonitoringResult; error?: string }> {
  let client: Client | null = null;

  try {
    client = await createDiscordClient();

    // Fetch the channel
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    if (!(channel instanceof TextChannel)) {
      throw new Error(`Channel ${channelId} is not a text channel`);
    }

    console.log(`📊 Fetching last ${messageLimit} messages from #${channel.name}...`);

    // Fetch recent messages
    const messages = await channel.messages.fetch({ limit: messageLimit });

    const result: MonitoringResult = {
      messagesAnalyzed: 0,
      spamDetected: 0,
      responsesPosted: 0,
      details: [],
    };

    // Analyze each message
    for (const [messageId, message] of messages) {
      // Skip bot messages
      if (message.author.bot) {
        continue;
      }

      result.messagesAnalyzed++;

      const analysis = analyzeMessageForSpam(message);

      if (analysis.isSpam) {
        result.spamDetected++;

        // Only respond if confidence meets threshold
        const shouldRespond =
          autoRespond &&
          ((confidenceThreshold === 'low' && analysis.confidence === 'low') ||
            (confidenceThreshold === 'medium' &&
              (analysis.confidence === 'medium' || analysis.confidence === 'high')) ||
            (confidenceThreshold === 'high' && analysis.confidence === 'high'));

        let responsePosted = false;

        if (shouldRespond) {
          try {
            const cartoonResponse = getRandomCartoonResponse();
            await message.reply(cartoonResponse);
            responsePosted = true;
            result.responsesPosted++;
            console.log(`✅ Posted cartoon response to message ${messageId}`);
          } catch (error) {
            console.error(`❌ Failed to post response to message ${messageId}:`, error);
          }
        }

        result.details.push({
          messageId,
          authorTag: message.author.tag,
          content: message.content.substring(0, 100), // Truncate for privacy
          spamScore: analysis.score,
          responsePosted,
        });
      }
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('❌ Error monitoring channel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (client) {
      await client.destroy();
      console.log('✅ Discord client disconnected');
    }
  }
}

export const spamBotMonitorAndResponseTool = tool({
  description: `Monitor Discord channels for spam bot messages and respond with cartoon-based deterrents.

  **Capabilities:**
  - Analyze recent messages in a channel for spam patterns
  - Detect spam using pattern matching (links, keywords, suspicious formatting)
  - Automatically respond to detected spam with humorous cartoon messages
  - Configurable confidence thresholds for spam detection
  - Detailed reporting of detected spam messages

  **Spam Detection Features:**
  - Discord invite links
  - URL shorteners (bit.ly, tinyurl, etc.)
  - Mass mentions (@everyone, @here)
  - Scam keywords (free nitro, free money, crypto)
  - Suspicious patterns (multiple links, all caps, short messages with links)

  **Use Cases:**
  - "monitor #general channel for spam bots"
  - "auto-respond to spam bots in general with cartoons"
  - "detect spam bots in #announcements"
  - "check for spam in channel and respond automatically"

  Note: Requires DISCORD_BOT_TOKEN to be configured and proper bot permissions.`,

  inputSchema: z.object({
    channelId: z.string().describe('Discord channel ID to monitor'),

    messageLimit: z
      .number()
      .min(10)
      .max(100)
      .optional()
      .default(50)
      .describe('Number of recent messages to analyze (10-100)'),

    autoRespond: z
      .boolean()
      .optional()
      .default(false)
      .describe('If true, automatically post cartoon responses to detected spam'),

    confidenceThreshold: z
      .enum(['low', 'medium', 'high'])
      .optional()
      .default('medium')
      .describe('Minimum confidence level required to respond (low/medium/high)'),
  }),

  execute: async ({ channelId, messageLimit = 50, autoRespond = false, confidenceThreshold = 'medium' }) => {
    try {
      // Validate environment
      if (!process.env.DISCORD_BOT_TOKEN) {
        return {
          success: false,
          error: 'DISCORD_BOT_TOKEN is not configured',
        };
      }

      console.log(`🔍 Monitoring channel ${channelId} for spam...`);
      console.log(`   Message limit: ${messageLimit}`);
      console.log(`   Auto-respond: ${autoRespond}`);
      console.log(`   Confidence threshold: ${confidenceThreshold}`);

      const result = await monitorChannelForSpam(channelId, messageLimit, autoRespond, confidenceThreshold);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to monitor channel',
        };
      }

      const data = result.data;

      // Format summary message
      const summary = `🔍 **Spam Monitoring Report**

**Channel Analysis:**
- Messages analyzed: ${data.messagesAnalyzed}
- Spam detected: ${data.spamDetected}
- Responses posted: ${data.responsesPosted}

${data.details.length > 0 ? `**Detected Spam Messages:**\n${data.details.map(d => `- Message by ${d.authorTag} (Score: ${d.spamScore}) ${d.responsePosted ? '✅ Response posted' : '⏸️ No response'}`).join('\n')}` : '**No spam detected!** ✨'}

${autoRespond ? '✅ Auto-response is enabled' : '⏸️ Auto-response is disabled (monitoring only)'}`;

      return {
        success: true,
        data: {
          ...data,
          spamRate: data.messagesAnalyzed > 0 ? (data.spamDetected / data.messagesAnalyzed) * 100 : 0,
        },
        message: summary,
      };
    } catch (error) {
      console.error('❌ Error in Spam Bot Monitor and Response:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
