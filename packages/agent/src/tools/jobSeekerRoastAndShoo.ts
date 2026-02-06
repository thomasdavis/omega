/**
 * Job Seeker Roast and Shoo Tool
 *
 * Detects job seeker posts in Discord channels and responds with witty, sharp roasts
 * designed to discourage job seeking posts in a humorous but pointed way.
 * Uses sarcasm and humor to make job seekers uncomfortable enough to reconsider
 * posting in inappropriate channels.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { Client, GatewayIntentBits, TextChannel, Message } from 'discord.js';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

interface JobSeekerPattern {
  pattern: RegExp;
  weight: number;
  description: string;
}

interface JobSeekerDetectionResult {
  isJobSeeker: boolean;
  score: number;
  matchedPatterns: string[];
  confidence: 'low' | 'medium' | 'high';
  skillsMentioned: string[];
  tone: 'direct' | 'subtle' | 'indirect';
}

interface MonitoringResult {
  messagesAnalyzed: number;
  jobSeekersDetected: number;
  roastsPosted: number;
  details: Array<{
    messageId: string;
    authorTag: string;
    authorId: string;
    content: string;
    score: number;
    tone: string;
    roastPosted: boolean;
    responseMessageId?: string;
    roastMessage?: string;
    skills: string[];
  }>;
}

/**
 * Enhanced patterns to detect job seeker posts
 * Includes direct and indirect job seeking language
 */
const JOB_SEEKER_PATTERNS: JobSeekerPattern[] = [
  // Direct patterns (highest weight)
  { pattern: /\b(looking for|seeking|searching for)\s+(work|job|employment|opportunity|opportunities|position|role)/gi, weight: 10, description: 'Explicitly looking for work' },
  { pattern: /\b(hire me|available for|open to)\s+(work|hire|opportunities|projects)/gi, weight: 10, description: 'Available for work' },
  { pattern: /\b(resume|cv|portfolio|github)\s+(here|link|available|attached)/gi, weight: 9, description: 'Sharing credentials' },

  // Subtle patterns (medium weight)
  { pattern: /\b(i am|i'm)\s+a\s+(developer|engineer|designer|programmer|coder|freelancer|consultant|architect|analyst)/gi, weight: 7, description: 'Professional introduction' },
  { pattern: /\b(just|recently)\s+(graduated|finished|completed|left|quit)\b/gi, weight: 6, description: 'Career transition mention' },
  { pattern: /\b(looking for|seeking|exploring|considering)\s+(new|different|better|remote)\s+(opportunities|challenges|roles|positions)/gi, weight: 8, description: 'Subtle opportunity seeking' },
  { pattern: /\b(between\s+jobs|in\s+transition|career\s+change|job\s+hunting|on\s+the\s+market)/gi, weight: 8, description: 'Career transition state' },

  // Indirect patterns (lower weight)
  { pattern: /\b(i\s+can\s+help|i\s+specialize|my\s+expertise|i\s+focus\s+on)\s+/gi, weight: 5, description: 'Offering expertise' },
  { pattern: /\b(experience (in|with)|background in|worked on|built|shipped)\s+(python|javascript|typescript|react|node|java|golang|rust|devops|aws|cloud|mobile|frontend|backend|fullstack)/gi, weight: 6, description: 'Listing experience' },
  { pattern: /\b(skilled in|proficient in|expert in|specialize in|good at|strong in)\s+/gi, weight: 5, description: 'Skills listing' },
  { pattern: /\b(years? of experience|yoe|\d+\+?\s*years?)\b/gi, weight: 5, description: 'Mentioning experience' },
  { pattern: /\b(freelance|contract|remote|full-time|part-time|consulting)\s+(work|developer|engineer|designer)/gi, weight: 6, description: 'Employment type mention' },
  { pattern: /\b(looking for|seeking|need|want)\s+(clients|projects|gigs|collaborations|partners)/gi, weight: 7, description: 'Seeking projects' },
  { pattern: /\b(tech stack|skills|technologies|tools):\s*[a-z]/gi, weight: 6, description: 'Tech stack listing' },
  { pattern: /\b(open\s+to|interested\s+in|exploring)\s+(new\s+)?opportunities/gi, weight: 7, description: 'Open to opportunities' },
  { pattern: /\b(anyone\s+hiring|companies\s+hiring|know\s+of\s+any\s+openings)/gi, weight: 9, description: 'Asking about openings' },
  { pattern: /\b(dm\s+me|reach\s+out|contact\s+me|get\s+in\s+touch)\s+(if|for)\b/gi, weight: 6, description: 'Inviting contact' },
  { pattern: /\b(portfolio|website|linkedin|github)\s+in\s+(bio|profile)/gi, weight: 7, description: 'Pointing to credentials' },
];

/**
 * Common tech skills patterns for extraction
 */
const TECH_SKILLS_PATTERNS = [
  /\b(python|javascript|typescript|java|c\+\+|c#|golang|go|rust|ruby|php|swift|kotlin|scala|elixir|clojure)\b/gi,
  /\b(react|vue|angular|svelte|next\.js|nuxt|remix|solid|preact)\b/gi,
  /\b(django|flask|fastapi|express|nest\.js|koa|hapi|spring|laravel)\b/gi,
  /\b(aws|azure|gcp|google cloud|docker|kubernetes|k8s|terraform|ansible|jenkins|github actions|gitlab ci)\b/gi,
  /\b(sql|postgresql|postgres|mysql|mongodb|redis|elasticsearch|cassandra|dynamodb|neo4j|supabase)\b/gi,
  /\b(machine learning|ml|ai|deep learning|nlp|natural language|computer vision|data science|neural networks)\b/gi,
  /\b(frontend|front-end|backend|back-end|full-stack|fullstack|devops|sre|qa|testing|automation)\b/gi,
  /\b(node\.js|nodejs|deno|bun|webpack|vite|esbuild|babel|typescript)\b/gi,
  /\b(graphql|rest api|grpc|websockets|microservices|serverless|lambda)\b/gi,
];

/**
 * Detection thresholds
 */
const DETECTION_THRESHOLDS = {
  LOW: 5,
  MEDIUM: 10,
  HIGH: 15,
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
 * Extract tech skills from message content
 */
function extractSkills(content: string): string[] {
  const skills: string[] = [];

  for (const pattern of TECH_SKILLS_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      skills.push(...matches.map(m => m.toLowerCase()));
    }
  }

  return [...new Set(skills)];
}

/**
 * Determine the tone of the job seeker post
 */
function determineTone(matchedPatterns: string[], content: string): 'direct' | 'subtle' | 'indirect' {
  const lowerContent = content.toLowerCase();

  // Direct indicators
  if (
    /\b(looking for|seeking|searching for)\s+(work|job)/i.test(lowerContent) ||
    /\b(hire me|available for hire)/i.test(lowerContent) ||
    /\bresuming?\s+(here|attached|link)/i.test(lowerContent)
  ) {
    return 'direct';
  }

  // Subtle indicators
  if (
    /\b(open to|interested in|exploring)\s+opportunities/i.test(lowerContent) ||
    /\b(between jobs|in transition|career change)/i.test(lowerContent) ||
    /\b(just graduated|recently left)/i.test(lowerContent)
  ) {
    return 'subtle';
  }

  // Otherwise indirect
  return 'indirect';
}

/**
 * Analyze a message for job seeker patterns
 */
function analyzeMessageForJobSeeker(message: Message): JobSeekerDetectionResult {
  const content = message.content;
  let score = 0;
  const matchedPatterns: string[] = [];
  const skillsMentioned = extractSkills(content);

  // Check against all job seeker patterns
  for (const { pattern, weight, description } of JOB_SEEKER_PATTERNS) {
    if (pattern.test(content)) {
      score += weight;
      matchedPatterns.push(description);
    }
  }

  // Boost score if multiple skills are mentioned (indicates a pitch)
  if (skillsMentioned.length >= 3) {
    score += Math.min(skillsMentioned.length * 2, 12);
    matchedPatterns.push(`Multiple skills mentioned: ${skillsMentioned.length}`);
  } else if (skillsMentioned.length > 0) {
    score += skillsMentioned.length;
    matchedPatterns.push(`Skills mentioned: ${skillsMentioned.length}`);
  }

  // Boost for longer, detailed messages (likely a pitch)
  if (content.length > 200) {
    score += 3;
    matchedPatterns.push('Detailed message (200+ chars)');
  }

  // Determine confidence level
  let confidence: 'low' | 'medium' | 'high';
  if (score >= DETECTION_THRESHOLDS.HIGH) {
    confidence = 'high';
  } else if (score >= DETECTION_THRESHOLDS.MEDIUM) {
    confidence = 'medium';
  } else if (score >= DETECTION_THRESHOLDS.LOW) {
    confidence = 'low';
  } else {
    confidence = 'low';
  }

  const isJobSeeker = score >= DETECTION_THRESHOLDS.LOW;
  const tone = determineTone(matchedPatterns, content);

  return {
    isJobSeeker,
    score,
    matchedPatterns,
    confidence,
    skillsMentioned,
    tone,
  };
}

/**
 * Generate a sharp, roasting response using AI
 * Designed to discourage job seeking posts through humor and sarcasm
 */
async function generateRoastingResponse(
  username: string,
  skills: string[],
  messageSnippet: string,
  tone: string,
  confidence: string
): Promise<string> {
  const skillsList = skills.length > 0
    ? skills.slice(0, 5).join(', ')
    : 'those skills';

  const toneGuidance = {
    direct: 'The person is directly asking for work. Be sharp and direct about how this isn\'t a job board.',
    subtle: 'The person is subtly indicating they\'re looking for opportunities. Roast them for being indirect and treating the community like LinkedIn.',
    indirect: 'The person is mentioning their skills without explicitly job seeking. Call them out on the obvious attempt to get noticed.',
  };

  const prompt = `Generate a SHARP, WITTY, and SARCASTIC roast response to a job seeker post in a Discord community.

CONTEXT:
- Username: ${username}
- Skills mentioned: ${skillsList}
- Message tone: ${tone}
- Confidence level: ${confidence}
- Message snippet: "${messageSnippet.substring(0, 200)}..."

TONE GUIDANCE:
${toneGuidance[tone as keyof typeof toneGuidance] || toneGuidance.indirect}

PURPOSE:
The goal is to DISCOURAGE job seeking posts in this channel through humor and sarcasm, making the poster feel uncomfortable enough to not do it again.

REQUIREMENTS:
✓ Be witty, sharp, and sarcastic
✓ Use pointed humor that discourages job seeking
✓ Reference their skills or situation sarcastically
✓ Make it clear this isn't a job board without being cruel
✓ Be clever and funny, not just mean
✓ Keep it concise (2-4 sentences, max 150 words)
✓ Use 0-2 emojis maximum (if any)
✓ Make them think twice about posting job seeking content here again

STYLE GUIDELINES:
- Sarcastic and sharp, not supportive or welcoming
- Humorous roasting, not encouragement
- Point out the inappropriateness of using the channel for job seeking
- Make light of their skills or approach in a witty way
- Discourage without being outright hostile or abusive

EXAMPLES OF TONE (adapt to context):
- "Oh look, another ${skillsList} expert blessing us with their resume. Sir/Ma'am, this is a Discord channel, not LinkedIn. The exit is that way. 👉"
- "Wow, ${username}, ${skillsList}? Impressive! Too bad this isn't a hiring channel. Maybe try... I don't know... an actual job board?"
- "Nothing says 'hire me' like dropping your tech stack in a random Discord channel. Bold strategy, ${username}. Let me know how that works out."

Generate ONLY the roast response text, nothing else. Be sharp but not genuinely cruel.`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    return result.text.trim();
  } catch (error) {
    console.error('Error generating roast response:', error);
    // Fallback roast
    return `Hey ${username}, this isn't LinkedIn. Take your ${skillsList} pitch to an actual job board. Thanks! 👋`;
  }
}

/**
 * Monitor channel for job seekers and respond with roasts
 */
async function monitorChannelForJobSeekers(
  channelId: string,
  messageLimit: number = 50,
  autoRespond: boolean = false,
  confidenceThreshold: 'low' | 'medium' | 'high' = 'medium'
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

    console.log(`🔥 Analyzing last ${messageLimit} messages from #${channel.name}...`);

    const messages = await channel.messages.fetch({ limit: messageLimit });

    const result: MonitoringResult = {
      messagesAnalyzed: 0,
      jobSeekersDetected: 0,
      roastsPosted: 0,
      details: [],
    };

    for (const [messageId, message] of messages) {
      // Skip bot messages
      if (message.author.bot) {
        continue;
      }

      // Skip very short messages or pure greetings
      const content = message.content.toLowerCase();
      const hasGreeting = /^(hi|hello|hey|sup|yo|howdy|greetings)\b/i.test(content);
      if (hasGreeting || content.length < 40) {
        continue;
      }

      result.messagesAnalyzed++;

      const analysis = analyzeMessageForJobSeeker(message);

      if (analysis.isJobSeeker) {
        result.jobSeekersDetected++;

        // Check if confidence meets threshold
        const shouldRespond =
          autoRespond &&
          ((confidenceThreshold === 'low') ||
            (confidenceThreshold === 'medium' &&
              (analysis.confidence === 'medium' || analysis.confidence === 'high')) ||
            (confidenceThreshold === 'high' && analysis.confidence === 'high'));

        let roastPosted = false;
        let responseMessageId: string | undefined;
        let roastMessage: string | undefined;

        if (shouldRespond) {
          try {
            console.log(`🔥 Generating roast for: ${message.author.tag}`);

            roastMessage = await generateRoastingResponse(
              message.author.username,
              analysis.skillsMentioned,
              message.content,
              analysis.tone,
              analysis.confidence
            );

            const replyMessage = await message.reply({
              content: roastMessage,
            });

            roastPosted = true;
            responseMessageId = replyMessage.id;
            result.roastsPosted++;

            console.log(`✅ Posted roast to ${message.author.tag}`);
          } catch (error) {
            console.error(`❌ Failed to post roast to ${message.author.tag}:`, error);
          }
        }

        result.details.push({
          messageId,
          authorTag: message.author.tag,
          authorId: message.author.id,
          content: message.content.substring(0, 200),
          score: analysis.score,
          tone: analysis.tone,
          roastPosted,
          responseMessageId,
          roastMessage,
          skills: analysis.skillsMentioned,
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

export const jobSeekerRoastAndShooTool = tool({
  description: `Detect job seeker posts in Discord channels and respond with witty, sharp roasts designed to discourage job seeking.

**Detection:**
- Direct job seeking language ("looking for work")
- Subtle career transition mentions ("just graduated", "between jobs")
- Indirect skill showcasing ("I specialize in...", "experienced with...")
- Professional introductions with tech skills
- Portfolio/credential sharing
- Open to opportunities language

**Roasting Responses:**
- AI-generated, sharp and sarcastic replies
- Tailored to message tone (direct/subtle/indirect)
- Points out inappropriateness of job seeking in the channel
- Uses humor to discourage, not encourage
- Makes posters uncomfortable enough to reconsider
- Witty but not genuinely cruel

**Use Cases:**
- "roast job seekers detected in #general channel"
- "reply with sarcastic roasts to job seekers"
- "make job seekers uncomfortable and discourage posting"
- "respond sharply to job seeking posts"

Note: Requires DISCORD_BOT_TOKEN and OPENAI_API_KEY to be configured.`,

  inputSchema: z.object({
    channelId: z
      .string()
      .describe('Discord channel ID to monitor'),

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
      .describe('If true, automatically post roasting responses to detected job seekers'),

    confidenceThreshold: z
      .enum(['low', 'medium', 'high'])
      .optional()
      .default('medium')
      .describe('Minimum confidence level required to respond'),
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

      if (!process.env.OPENAI_API_KEY) {
        return {
          success: false,
          error: 'OPENAI_API_KEY is not configured',
        };
      }

      console.log(`🔥 Monitoring channel ${channelId} for job seekers to roast...`);
      console.log(`   Message limit: ${messageLimit}`);
      console.log(`   Auto-respond: ${autoRespond}`);
      console.log(`   Confidence threshold: ${confidenceThreshold}`);

      const result = await monitorChannelForJobSeekers(
        channelId,
        messageLimit,
        autoRespond,
        confidenceThreshold
      );

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to monitor channel',
        };
      }

      const data = result.data;

      // Format summary with example roasts
      const exampleRoasts = data.details
        .filter(d => d.roastMessage)
        .slice(0, 3)
        .map(d => `\n**${d.authorTag}** (${d.tone}, score: ${d.score})\n> ${d.roastMessage}`)
        .join('\n\n');

      const summary = `🔥 **Job Seeker Roast Report**

**Channel Analysis:**
- Messages analyzed: ${data.messagesAnalyzed}
- Job seekers detected: ${data.jobSeekersDetected}
- Roasts posted: ${data.roastsPosted}

${data.details.length > 0 ? `**Detected Job Seeker Posts:**
${data.details.map(d => `- ${d.authorTag} (Tone: ${d.tone}, Score: ${d.score}, Skills: ${d.skills.length}) ${d.roastPosted ? '🔥 Roasted' : '⏸️ No roast'}`).join('\n')}` : '**No job seeker posts detected!** ✨'}

${exampleRoasts ? `**Example Roasts:**${exampleRoasts}` : ''}

${autoRespond ? '🔥 Auto-roast is enabled - sharp responses posted automatically' : '⏸️ Auto-roast is disabled (detection only)'}`;

      return {
        success: true,
        data: {
          ...data,
          detectionRate: data.messagesAnalyzed > 0
            ? (data.jobSeekersDetected / data.messagesAnalyzed) * 100
            : 0,
        },
        message: summary,
      };
    } catch (error) {
      console.error('❌ Error in Job Seeker Roast and Shoo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
