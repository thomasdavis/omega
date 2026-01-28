/**
 * Humorous Job Seeker Response Comic Poster Tool
 *
 * Scans Discord channels for job seeker posts and responds with personalized,
 * humorous comic responses to engage and lighten the mood.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { Client, GatewayIntentBits, TextChannel, Message } from 'discord.js';
import { generateImageWithGemini } from '../services/geminiImageService.js';
import { postToDiscordChannel } from '../services/discordWebhookService.js';
import { getDatabase, saveGeneratedImage } from '@repo/database';

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
}

interface MonitoringResult {
  messagesAnalyzed: number;
  jobSeekersDetected: number;
  comicsPosted: number;
  details: Array<{
    messageId: string;
    authorTag: string;
    authorId: string;
    content: string;
    score: number;
    comicPosted: boolean;
    comicMessageId?: string;
    skills: string[];
  }>;
}

/**
 * Patterns to detect job seeker posts
 * Higher weight = stronger indicator
 */
const JOB_SEEKER_PATTERNS: JobSeekerPattern[] = [
  { pattern: /\b(looking for|seeking|searching for)\s+(work|job|employment|opportunity|opportunities|position|role)/gi, weight: 10, description: 'Explicitly looking for work' },
  { pattern: /\b(hire me|available for|open to)\s+(work|hire|opportunities|projects)/gi, weight: 10, description: 'Available for work' },
  { pattern: /\b(i am|i'm)\s+a\s+(developer|engineer|designer|programmer|coder|freelancer|consultant)/gi, weight: 6, description: 'Professional introduction' },
  { pattern: /\bexperience (in|with)\s+(python|javascript|typescript|react|node|java|golang|rust|devops|aws|cloud)/gi, weight: 5, description: 'Listing experience' },
  { pattern: /\b(skilled in|proficient in|expert in|specialize in)\s+/gi, weight: 5, description: 'Skills listing' },
  { pattern: /\b(resume|cv|portfolio|github)\s+(here|link|available)/gi, weight: 8, description: 'Sharing credentials' },
  { pattern: /\b(years? of experience|yoe)\b/gi, weight: 4, description: 'Mentioning experience' },
  { pattern: /\b(freelance|contract|remote|full-time|part-time)\s+(work|developer|engineer|designer)/gi, weight: 6, description: 'Employment type mention' },
  { pattern: /\b(looking for|seeking|need)\s+(clients|projects|gigs)/gi, weight: 7, description: 'Seeking projects' },
  { pattern: /\b(tech stack|skills|technologies):\s*[a-z]/gi, weight: 5, description: 'Tech stack listing' },
];

/**
 * Common tech skills to extract
 */
const TECH_SKILLS_PATTERNS = [
  /\b(python|javascript|typescript|java|c\+\+|c#|golang|go|rust|ruby|php|swift|kotlin|scala)\b/gi,
  /\b(react|vue|angular|svelte|next\.js|nuxt|django|flask|fastapi|express|nest\.js)\b/gi,
  /\b(aws|azure|gcp|docker|kubernetes|k8s|terraform|ansible|jenkins|github actions)\b/gi,
  /\b(sql|postgresql|mysql|mongodb|redis|elasticsearch|cassandra|dynamodb)\b/gi,
  /\b(machine learning|ml|ai|deep learning|nlp|computer vision|data science)\b/gi,
  /\b(frontend|backend|full-stack|fullstack|devops|sre|qa|testing)\b/gi,
];

/**
 * Detection thresholds
 */
const JOB_SEEKER_THRESHOLDS = {
  LOW: 4,
  MEDIUM: 8,
  HIGH: 12,
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

  // Remove duplicates
  return [...new Set(skills)];
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

  // Boost score if skills are mentioned
  if (skillsMentioned.length > 0) {
    score += Math.min(skillsMentioned.length * 2, 10);
    matchedPatterns.push(`Skills mentioned: ${skillsMentioned.length}`);
  }

  // Determine confidence level
  let confidence: 'low' | 'medium' | 'high';
  if (score >= JOB_SEEKER_THRESHOLDS.HIGH) {
    confidence = 'high';
  } else if (score >= JOB_SEEKER_THRESHOLDS.MEDIUM) {
    confidence = 'medium';
  } else if (score >= JOB_SEEKER_THRESHOLDS.LOW) {
    confidence = 'low';
  } else {
    confidence = 'low';
  }

  const isJobSeeker = score >= JOB_SEEKER_THRESHOLDS.LOW;

  return {
    isJobSeeker,
    score,
    matchedPatterns,
    confidence,
    skillsMentioned,
  };
}

/**
 * Generate a humorous comic prompt for a job seeker
 */
function generateComicPrompt(
  username: string,
  skills: string[],
  messageSnippet: string
): string {
  const skillsList = skills.length > 0
    ? skills.slice(0, 5).join(', ')
    : 'amazing talents';

  return `CREATE A HUMOROUS, WELCOMING 3-PANEL COMIC STRIP

SCENARIO:
A job seeker named "${username}" has just posted their skills and availability in a Discord channel.
Their skills include: ${skillsList}
Message snippet: "${messageSnippet.substring(0, 150)}..."

COMIC REQUIREMENTS:
✓ 3 horizontal panels
✓ Friendly, encouraging, and humorous tone
✓ Show support for the job seeker while being lighthearted
✓ Include relatable tech job hunting humor
✓ Vibrant, colorful cartoon style
✓ Speech bubbles with encouraging dialogue
✓ Expressive, friendly cartoon characters

PANEL STRUCTURE:
Panel 1: Character sees the job seeker post and gets excited
- Character: "Oh! A talented ${skills[0] || 'developer'} appears! Welcome ${username}!"
- Visual: Excited cartoon character with computer/phone

Panel 2: Character acknowledges the struggle
- Character: "Job hunting is tough! But with skills like ${skillsList}, you're gonna do great!"
- Visual: Character giving thumbs up, supportive pose

Panel 3: Humorous encouragement with community welcome
- Character: "Remember: Every 'No' brings you closer to 'Yes'! And hey, at least you're not debugging legacy PHP at 3 AM... yet! 😄"
- Visual: Character winking, welcoming gesture, tech symbols in background

VISUAL STYLE:
- Bright, vibrant colors (blues, greens, oranges)
- Friendly cartoon characters (not stick figures - actual characters!)
- Clean comic panel borders
- Professional but fun aesthetic
- Tech-themed background elements (computers, code symbols, etc.)
- Warm, welcoming atmosphere

TONE:
- Encouraging and supportive
- Genuinely funny but not mocking
- Community-oriented
- Relatable to developers/tech workers
- Optimistic about their job search

Make it feel like a warm community welcome with a touch of tech industry humor!`;
}

/**
 * Monitor channel for job seekers and respond with comics
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
      jobSeekersDetected: 0,
      comicsPosted: 0,
      details: [],
    };

    // Analyze each message
    for (const [messageId, message] of messages) {
      // Skip bot messages and messages with greetings (we only want bona fide job posts)
      if (message.author.bot) {
        continue;
      }

      // Skip very short messages or messages that look like greetings
      const content = message.content.toLowerCase();
      const hasGreeting = /^(hi|hello|hey|sup|yo|howdy|greetings)\b/i.test(content);
      if (hasGreeting || content.length < 50) {
        continue;
      }

      result.messagesAnalyzed++;

      const analysis = analyzeMessageForJobSeeker(message);

      if (analysis.isJobSeeker) {
        result.jobSeekersDetected++;

        // Only respond if confidence meets threshold
        const shouldRespond =
          autoRespond &&
          ((confidenceThreshold === 'low') ||
            (confidenceThreshold === 'medium' &&
              (analysis.confidence === 'medium' || analysis.confidence === 'high')) ||
            (confidenceThreshold === 'high' && analysis.confidence === 'high'));

        let comicPosted = false;
        let comicMessageId: string | undefined;

        if (shouldRespond) {
          try {
            console.log(`🎨 Generating comic for job seeker: ${message.author.tag}`);

            // Generate comic prompt
            const comicPrompt = generateComicPrompt(
              message.author.username,
              analysis.skillsMentioned,
              message.content
            );

            // Generate comic image
            const imageResult = await generateImageWithGemini({
              prompt: comicPrompt,
            });

            if (imageResult.success && imageResult.imageBuffer) {
              // Reply to the message with the comic
              const replyMessage = await message.reply({
                content: `Hey ${message.author.username}! 👋 Welcome to the community! Here's a little something to brighten your job search! 🎨`,
                files: [{
                  attachment: imageResult.imageBuffer,
                  name: `welcome-comic-${message.author.id}-${Date.now()}.png`,
                }],
              });

              comicPosted = true;
              comicMessageId = replyMessage.id;
              result.comicsPosted++;

              // Save to database
              try {
                await saveGeneratedImage({
                  userId: message.author.id,
                  username: message.author.username,
                  toolName: 'humorousJobSeekerResponseComicPoster',
                  prompt: comicPrompt,
                  model: 'gemini-3-pro-image-preview',
                  storageUrl: imageResult.imagePath || '',
                  storageProvider: 'omega',
                  mimeType: 'image/png',
                  bytes: imageResult.imageBuffer?.length,
                  status: 'success',
                  metadata: {
                    originalMessageId: messageId,
                    skills: analysis.skillsMentioned,
                    score: analysis.score,
                    timestamp: new Date().toISOString(),
                  },
                  messageId: comicMessageId,
                  imageData: imageResult.imageBuffer,
                });
                console.log(`💾 Saved comic to database`);
              } catch (dbError) {
                console.error(`⚠️ Failed to save comic to database:`, dbError);
              }

              console.log(`✅ Posted comic response to ${message.author.tag}`);
            } else {
              console.error(`❌ Failed to generate comic:`, imageResult.error);
            }
          } catch (error) {
            console.error(`❌ Failed to post comic to ${message.author.tag}:`, error);
          }
        }

        result.details.push({
          messageId,
          authorTag: message.author.tag,
          authorId: message.author.id,
          content: message.content.substring(0, 200), // Truncate for privacy
          score: analysis.score,
          comicPosted,
          comicMessageId,
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

export const humorousJobSeekerResponseComicPosterTool = tool({
  description: `Scan Discord channels for job seeker posts and reply with personalized, humorous comic responses.

  **What it does:**
  - Automatically detects posts from users seeking jobs or offering their skills
  - Identifies mentioned tech skills and experience
  - Generates personalized, encouraging comic strips with humor
  - Posts comics as replies to welcome job seekers to the community

  **Detection Patterns:**
  - "Looking for work/job/opportunities"
  - "Available for hire/projects"
  - Professional introductions with skills
  - Resume/portfolio/GitHub links
  - Tech stack listings
  - Experience mentions

  **Comic Style:**
  - 3-panel friendly cartoon format
  - Vibrant, colorful, welcoming
  - Tech job hunting humor
  - Encouraging and supportive tone
  - Community-oriented

  **Use Cases:**
  - "find job seeker posts and reply with comics"
  - "respond to job seekers in #general with humorous comics"
  - "auto-post welcome comics to new job seekers"
  - "monitor general channel for job posts and respond"

  Note: Requires DISCORD_BOT_TOKEN and GEMINI_API_KEY to be configured.`,

  inputSchema: z.object({
    channelId: z
      .string()
      .describe('Discord channel ID to monitor (typically #general)'),

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
      .describe('If true, automatically post comic responses to detected job seekers'),

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

      if (!process.env.GEMINI_API_KEY) {
        return {
          success: false,
          error: 'GEMINI_API_KEY is not configured',
        };
      }

      console.log(`🔍 Monitoring channel ${channelId} for job seekers...`);
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

      // Format summary message
      const summary = `🎨 **Job Seeker Comic Poster Report**

**Channel Analysis:**
- Messages analyzed: ${data.messagesAnalyzed}
- Job seekers detected: ${data.jobSeekersDetected}
- Comics posted: ${data.comicsPosted}

${data.details.length > 0 ? `**Detected Job Seeker Posts:**
${data.details.map(d => `- ${d.authorTag} (Score: ${d.score}, Skills: ${d.skills.length}) ${d.comicPosted ? '✅ Comic posted' : '⏸️ No comic'}`).join('\n')}` : '**No job seeker posts detected!** ✨'}

${autoRespond ? '✅ Auto-response is enabled - comics posted automatically' : '⏸️ Auto-response is disabled (monitoring only)'}`;

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
      console.error('❌ Error in Humorous Job Seeker Response Comic Poster:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
