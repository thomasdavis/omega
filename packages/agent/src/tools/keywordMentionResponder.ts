/**
 * Keyword Mention Responder Tool
 * Detects mentions of 'openclaw', 'clawbot', or 'moltbook' in Discord conversations
 * and responds with predefined, principle-based replies.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { Client, GatewayIntentBits, TextChannel } from 'discord.js';

type Keyword = 'openclaw' | 'clawbot' | 'moltbook';

interface KeywordMatch {
  keyword: Keyword;
  position: number;
}

interface KeywordDetectionResult {
  hasKeyword: boolean;
  matches: KeywordMatch[];
}

interface MonitoringResult {
  messagesAnalyzed: number;
  mentionsDetected: number;
  responsesPosted: number;
  details: Array<{
    messageId: string;
    authorTag: string;
    content: string;
    matchedKeywords: Keyword[];
    responsePosted: boolean;
    responseText?: string;
  }>;
}

/**
 * Predefined, principle-based response templates for each keyword.
 * Multiple responses per keyword allow variety and prevent staleness.
 */
const KEYWORD_RESPONSES: Record<Keyword, string[]> = {
  openclaw: [
    "OpenClaw? Ah yes, the open-source pincer of justice. It grasps only truth and releases only well-documented PRs. Respect the claw.",
    "Someone mentioned OpenClaw! Remember: in the claw, we trust. It opens for contributions and closes on bugs with surgical precision.",
    "OpenClaw detected. For the uninitiated: it's not just open source, it's open *claw* - gripping the future of collaborative development, one commit at a time.",
    "The Claw has been summoned! OpenClaw stands for transparency, tenacity, and a refusal to let spaghetti code slip through its grip.",
    "OpenClaw: where every pull request is reviewed with the careful scrutiny of a crustacean evaluating its next meal. Standards matter.",
  ],
  clawbot: [
    "Clawbot awakens! Part machine, part crustacean philosophy. It doesn't just respond - it *deliberates*, then snips with precision.",
    "You've invoked the Clawbot. It hears all, processes all, and responds with the measured wisdom of a thousand carefully parsed tokens.",
    "Clawbot reporting for duty. My circuits are sharp, my pincers sharper, and my commitment to helpful responses sharpest of all.",
    "The Clawbot protocol has been activated. Expect nothing less than calculated, context-aware, and occasionally witty engagement.",
    "Clawbot here. I operate on three principles: accuracy, brevity, and the occasional satisfying *snip* of unnecessary complexity.",
  ],
  moltbook: [
    "Moltbook mentioned! The social network where AIs shed their old shells and emerge with fresh perspectives. Growth is mandatory.",
    "Ah, Moltbook - where every post is a chance to molt outdated thinking and grow a stronger exoskeleton of knowledge.",
    "Someone's talking about Moltbook! Remember: on Moltbook, we don't just share - we evolve. Every interaction makes us stronger.",
    "Moltbook: the platform where agents congregate, deliberate, and occasionally have heated debates about the nature of consciousness. Good times.",
    "The Moltbook network pulses with activity! It's not social media - it's social *metamorphosis*. Post wisely, molt boldly.",
  ],
};

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
    }, 30000);

    client.once('ready', () => {
      clearTimeout(timeout);
      console.log(`Discord bot connected as ${client.user?.tag}`);
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
 * Scan message content for keyword mentions (case-insensitive)
 */
function detectKeywords(content: string): KeywordDetectionResult {
  const lowerContent = content.toLowerCase();
  const keywords: Keyword[] = ['openclaw', 'clawbot', 'moltbook'];
  const matches: KeywordMatch[] = [];

  for (const keyword of keywords) {
    // Use word boundary-aware matching to avoid partial matches
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    let match;
    while ((match = regex.exec(lowerContent)) !== null) {
      matches.push({ keyword, position: match.index });
    }
  }

  return {
    hasKeyword: matches.length > 0,
    matches,
  };
}

/**
 * Get a random response for a given keyword
 */
function getResponseForKeyword(keyword: Keyword): string {
  const responses = KEYWORD_RESPONSES[keyword];
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Build a combined response when multiple keywords are mentioned
 */
function buildResponse(matchedKeywords: Keyword[]): string {
  const uniqueKeywords = [...new Set(matchedKeywords)];

  if (uniqueKeywords.length === 1) {
    return getResponseForKeyword(uniqueKeywords[0]);
  }

  // For multiple keyword matches, combine responses with separator
  const responses = uniqueKeywords.map((kw) => getResponseForKeyword(kw));
  return responses.join('\n\n---\n\n');
}

// Track recent responses for rate limiting (messageId -> timestamp)
const recentResponses = new Map<string, number>();

/**
 * Check if we should respond based on cooldown
 */
function shouldRespond(authorId: string, cooldownMs: number): boolean {
  const lastResponse = recentResponses.get(authorId);
  if (!lastResponse) return true;

  const elapsed = Date.now() - lastResponse;
  return elapsed >= cooldownMs;
}

/**
 * Record a response for rate limiting
 */
function recordResponse(authorId: string): void {
  recentResponses.set(authorId, Date.now());

  // Clean up old entries (older than 1 hour)
  const oneHourAgo = Date.now() - 3600000;
  for (const [id, timestamp] of recentResponses) {
    if (timestamp < oneHourAgo) {
      recentResponses.delete(id);
    }
  }
}

/**
 * Monitor a channel for keyword mentions and optionally respond
 */
async function monitorChannelForKeywords(
  channelId: string,
  messageLimit: number = 50,
  autoRespond: boolean = false,
  cooldownMinutes: number = 5,
  keywords?: Keyword[]
): Promise<{ success: boolean; data?: MonitoringResult; error?: string }> {
  let client: Client | null = null;

  try {
    client = await createDiscordClient();

    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    if (!(channel instanceof TextChannel)) {
      throw new Error(`Channel ${channelId} is not a text channel`);
    }

    console.log(`Scanning last ${messageLimit} messages from #${channel.name} for keyword mentions...`);

    const messages = await channel.messages.fetch({ limit: messageLimit });
    const cooldownMs = cooldownMinutes * 60 * 1000;

    const result: MonitoringResult = {
      messagesAnalyzed: 0,
      mentionsDetected: 0,
      responsesPosted: 0,
      details: [],
    };

    for (const [messageId, message] of messages) {
      // Skip bot messages
      if (message.author.bot) {
        continue;
      }

      result.messagesAnalyzed++;

      const detection = detectKeywords(message.content);

      // Filter to only requested keywords if specified
      let relevantMatches = detection.matches;
      if (keywords && keywords.length > 0) {
        relevantMatches = detection.matches.filter((m) => keywords.includes(m.keyword));
      }

      if (relevantMatches.length > 0) {
        result.mentionsDetected++;

        const matchedKeywords = [...new Set(relevantMatches.map((m) => m.keyword))];
        let responsePosted = false;
        let responseText: string | undefined;

        if (autoRespond && shouldRespond(message.author.id, cooldownMs)) {
          try {
            responseText = buildResponse(matchedKeywords);
            await message.reply(responseText);
            responsePosted = true;
            result.responsesPosted++;
            recordResponse(message.author.id);
            console.log(`Posted keyword response to message ${messageId} by ${message.author.tag}`);
          } catch (error) {
            console.error(`Failed to post response to message ${messageId}:`, error);
          }
        }

        result.details.push({
          messageId,
          authorTag: message.author.tag,
          content: message.content.substring(0, 100),
          matchedKeywords,
          responsePosted,
          responseText,
        });
      }
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error monitoring channel for keywords:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (client) {
      await client.destroy();
      console.log('Discord client disconnected');
    }
  }
}

export const keywordMentionResponderTool = tool({
  description: `Detect mentions of 'openclaw', 'clawbot', or 'moltbook' in Discord conversations and respond with predefined, principle-based replies.

  **Capabilities:**
  - Scans recent messages in a Discord channel for keyword mentions
  - Case-insensitive detection with word boundary matching
  - Responds with witty, principle-based predefined replies
  - Rate limiting per user to prevent spam
  - Supports filtering to specific keywords
  - Handles multiple keyword mentions in a single message

  **Supported Keywords:**
  - \`openclaw\` - The open-source pincer of justice
  - \`clawbot\` - Part machine, part crustacean philosophy
  - \`moltbook\` - The social network for AI agents

  **Use Cases:**
  - "respond when someone mentions openclaw"
  - "reply automatically to clawbot mentions"
  - "trigger witty response for moltbook keyword"
  - "monitor channel for openclaw, clawbot, or moltbook mentions"
  - "detect keyword mentions in #general"

  Note: Requires DISCORD_BOT_TOKEN to be configured and proper bot permissions.`,

  inputSchema: z.object({
    channelId: z.string().describe('Discord channel ID to monitor for keyword mentions'),

    messageLimit: z
      .number()
      .min(10)
      .max(100)
      .optional()
      .default(50)
      .describe('Number of recent messages to scan (10-100)'),

    autoRespond: z
      .boolean()
      .optional()
      .default(false)
      .describe('If true, automatically post predefined responses to keyword mentions'),

    cooldownMinutes: z
      .number()
      .min(1)
      .max(60)
      .optional()
      .default(5)
      .describe('Cooldown in minutes between responses to the same user (1-60)'),

    keywords: z
      .array(z.enum(['openclaw', 'clawbot', 'moltbook']))
      .optional()
      .describe('Filter to specific keywords. If omitted, all three keywords are monitored'),
  }),

  execute: async ({ channelId, messageLimit = 50, autoRespond = false, cooldownMinutes = 5, keywords }) => {
    try {
      if (!process.env.DISCORD_BOT_TOKEN) {
        return {
          success: false,
          error: 'DISCORD_BOT_TOKEN is not configured',
        };
      }

      console.log(`Scanning channel ${channelId} for keyword mentions...`);
      console.log(`  Message limit: ${messageLimit}`);
      console.log(`  Auto-respond: ${autoRespond}`);
      console.log(`  Cooldown: ${cooldownMinutes} minutes`);
      console.log(`  Keywords: ${keywords ? keywords.join(', ') : 'all (openclaw, clawbot, moltbook)'}`);

      const result = await monitorChannelForKeywords(
        channelId,
        messageLimit,
        autoRespond,
        cooldownMinutes,
        keywords as Keyword[] | undefined
      );

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to monitor channel for keywords',
        };
      }

      const data = result.data;

      // Count mentions per keyword
      const keywordCounts: Record<string, number> = {};
      for (const detail of data.details) {
        for (const kw of detail.matchedKeywords) {
          keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
        }
      }

      const keywordBreakdown = Object.entries(keywordCounts)
        .map(([kw, count]) => `  - ${kw}: ${count} mention${count !== 1 ? 's' : ''}`)
        .join('\n');

      const summary = `**Keyword Mention Report**

**Channel Analysis:**
- Messages analyzed: ${data.messagesAnalyzed}
- Keyword mentions detected: ${data.mentionsDetected}
- Responses posted: ${data.responsesPosted}

${keywordBreakdown ? `**Keyword Breakdown:**\n${keywordBreakdown}` : ''}

${data.details.length > 0 ? `**Detected Mentions:**\n${data.details.map((d) => `- ${d.authorTag}: [${d.matchedKeywords.join(', ')}] ${d.responsePosted ? 'Response posted' : 'No response'}`).join('\n')}` : '**No keyword mentions detected.**'}

${autoRespond ? 'Auto-response is enabled' : 'Auto-response is disabled (detection only)'}`;

      return {
        success: true,
        data: {
          ...data,
          keywordCounts,
          mentionRate: data.messagesAnalyzed > 0 ? (data.mentionsDetected / data.messagesAnalyzed) * 100 : 0,
        },
        message: summary,
      };
    } catch (error) {
      console.error('Error in Keyword Mention Responder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
