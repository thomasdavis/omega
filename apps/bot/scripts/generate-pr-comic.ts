/**
 * PR Comic Generation Script
 * Runs as a GitHub Action to generate comics for merged PRs
 */

import { Client, GatewayIntentBits } from 'discord.js';
import { Octokit } from '@octokit/rest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateComic, extractConversationContext } from '../src/services/geminiComicService.js';
import { postComicToDiscord } from '../src/services/discordComicPoster.js';
import { postComicToTwitter } from '../src/services/twitterComicPoster.js';
import { extractKeywords, searchDiscordMessages } from '../src/services/discordMessageSearch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ComicResult {
  success: boolean;
  imageSize?: number;
  discordMessageId?: string;
  twitterPostId?: string;
  twitterPostUrl?: string;
  comicPath?: string;
  error?: string;
}

async function main() {
  console.log('🎨 Starting PR Comic Generation...');

  // Validate environment variables
  const requiredEnvVars = [
    'GEMINI_API_KEY',
    'DISCORD_BOT_TOKEN',
    'GITHUB_TOKEN',
    'PR_NUMBER',
    'PR_TITLE',
    'PR_AUTHOR',
    'PR_URL',
    'DISCORD_CHANNEL_ID',
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    await writeResult({
      success: false,
      error: `Missing environment variables: ${missingVars.join(', ')}`,
    });
    process.exit(1);
  }

  const prNumber = parseInt(process.env.PR_NUMBER!, 10);
  const prTitle = process.env.PR_TITLE!;
  const prAuthor = process.env.PR_AUTHOR!;
  const prUrl = process.env.PR_URL!;
  const discordChannelId = process.env.DISCORD_CHANNEL_ID!;

  try {
    // Fetch PR data from GitHub
    console.log(`📥 Fetching PR #${prNumber} data from GitHub...`);
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const [owner, repo] = process.env.GITHUB_REPOSITORY?.split('/') || ['', ''];
    if (!owner || !repo) {
      throw new Error('GITHUB_REPOSITORY environment variable not set properly');
    }

    // Fetch PR details
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    // Fetch PR comments
    const { data: comments } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });

    // Fetch PR commits
    const { data: commits } = await octokit.pulls.listCommits({
      owner,
      repo,
      pull_number: prNumber,
    });

    // Initialize Discord client for message search
    console.log('🤖 Connecting to Discord for message search...');
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    // Wait for client to be ready
    await new Promise<void>((resolve, reject) => {
      client.once('ready', () => {
        console.log(`✅ Discord bot connected as ${client.user?.tag}`);
        resolve();
      });

      client.once('error', (error) => {
        reject(error);
      });

      client.login(process.env.DISCORD_BOT_TOKEN);
    });

    // Fetch last 20 messages before PR creation date
    let discordMessages: any[] = [];
    let discordUserIds: string[] = [];
    try {
      const prCreatedAt = new Date(pr.created_at);
      console.log(`📅 Fetching last 20 messages before PR created at ${prCreatedAt.toISOString()}`);

      // Get the channel
      const channel = await client.channels.fetch(discordChannelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error('Channel not found or not text-based');
      }

      // Fetch recent messages (around PR creation time)
      const messages = await channel.messages.fetch({
        limit: 100, // Fetch recent messages
      });

      // Convert Collection to array, sort by time, and take last 30
      const recentMessages = Array.from(messages.values())
        .filter(msg => !msg.author.bot) // Exclude bot messages
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .slice(-30); // Take last 30

      console.log(`   📊 Fetched ${recentMessages.length} recent messages (excluding bots)`);
      if (recentMessages.length > 0) {
        const oldest = new Date(recentMessages[0].createdTimestamp);
        const newest = new Date(recentMessages[recentMessages.length - 1].createdTimestamp);
        console.log(`   📅 Message range: ${oldest.toISOString()} to ${newest.toISOString()}`);
      }

      discordMessages = recentMessages.map(msg => ({
        username: msg.author.username,
        content: msg.content,
        channelName: (msg.channel as any).name || 'unknown',
        timestamp: msg.createdTimestamp,
      }));

      // Extract unique Discord user IDs for character appearance lookups (already filtered bots above)
      discordUserIds = [...new Set(recentMessages
        .map(msg => msg.author.id)
        .filter((userId): userId is string => Boolean(userId))
      )];

      console.log(`✅ Found ${discordMessages.length} recent Discord messages from ${discordUserIds.length} users`);
    } catch (error) {
      console.warn('⚠️ Error fetching Discord messages:', error);
      // Continue without Discord messages if fetch fails
    }

    // Build conversation context with Discord messages
    const conversationContext = extractConversationContext({
      title: pr.title,
      body: pr.body,
      comments: comments.map((c) => ({
        user: { login: c.user?.login || 'Unknown' },
        body: c.body,
      })),
      commits: commits.map((c) => ({
        message: c.commit.message,
      })),
      discordMessages: discordMessages,
    });

    console.log('📝 Conversation context extracted (including Discord messages)');

    // Extract issue number from PR body
    let issueNumber: number | undefined;
    if (pr.body) {
      const issueMatch = pr.body.match(/(?:fixes|closes|resolves)\s+#(\d+)/i);
      if (issueMatch) {
        issueNumber = parseInt(issueMatch[1], 10);
        console.log(`📌 Found linked issue: #${issueNumber}`);
      }
    }

    // Generate comic with character appearance data
    console.log('🎨 Generating comic with Gemini API...');
    console.log(`📸 Including appearance data for ${discordUserIds.length} Discord users`);
    const comicResult = await generateComic({
      conversationContext,
      prNumber,
      prTitle,
      prAuthor,
      issueNumber,
      userIds: discordUserIds, // Pass Discord user IDs for character appearance lookup
    });

    if (!comicResult.success || !comicResult.imageData) {
      throw new Error(comicResult.error || 'Failed to generate comic');
    }

    console.log('✅ Comic generated successfully');

    // Post comic to Discord (client already connected from search)
    console.log('📤 Posting comic to Discord...');
    const postResult = await postComicToDiscord(client, {
      channelId: discordChannelId,
      imageData: comicResult.imageData,
      prNumber,
      prTitle,
      prAuthor,
      prUrl,
      imagePath: comicResult.imagePath,
    });

    // Cleanup
    await client.destroy();

    if (!postResult.success) {
      throw new Error(postResult.error || 'Failed to post comic to Discord');
    }

    console.log('✅ Comic posted to Discord successfully');

    // Optional Twitter posting (won't fail workflow if Twitter fails)
    let twitterPostId: string | undefined;
    let twitterPostUrl: string | undefined;

    if (process.env.TWITTER_API_KEY && process.env.TWITTER_ACCESS_TOKEN) {
      console.log('📤 Posting comic to Twitter...');
      try {
        const twitterResult = await postComicToTwitter({
          imageData: comicResult.imageData,
          prNumber,
          prTitle,
          prUrl,
        });

        if (twitterResult.success) {
          console.log(`✅ Comic posted to Twitter: ${twitterResult.tweetUrl}`);
          twitterPostId = twitterResult.tweetId;
          twitterPostUrl = twitterResult.tweetUrl;
        } else {
          console.warn(`⚠️ Twitter posting failed: ${twitterResult.error}`);
          // Don't throw - continue with workflow
        }
      } catch (error) {
        console.warn('⚠️ Twitter posting error:', error);
        // Don't throw - continue with workflow
      }
    } else {
      console.log('ℹ️ Twitter credentials not configured, skipping Twitter post');
    }

    // Write success result
    await writeResult({
      success: true,
      imageSize: comicResult.imageData.length,
      discordMessageId: postResult.messageId,
      twitterPostId,
      twitterPostUrl,
      comicPath: comicResult.imagePath,
    });

    console.log('🎉 PR Comic Generation Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating PR comic:', error);

    await writeResult({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });

    process.exit(1);
  }
}

/**
 * Write result to file for GitHub Action to read
 */
async function writeResult(result: ComicResult): Promise<void> {
  const resultPath = path.join(__dirname, '../comic-result.json');
  await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
  console.log(`📝 Result written to ${resultPath}`);
}

// Run the script
main();
