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
import { extractKeywords, searchDiscordMessages } from '../src/services/discordMessageSearch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ComicResult {
  success: boolean;
  imageSize?: number;
  discordMessageId?: string;
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

    // Extract keywords from PR title and body
    const keywords = extractKeywords(pr.title, pr.body || '');
    console.log(`🔍 Extracted keywords: ${keywords.join(', ')}`);

    // Search Discord for relevant messages
    let discordMessages: any[] = [];
    let discordUserIds: string[] = [];
    if (keywords.length > 0) {
      try {
        const searchResults = await searchDiscordMessages(client, keywords, {
          channelIds: discordChannelId ? [discordChannelId] : undefined,
          maxMessages: 200, // Search more messages to find relevant ones
          daysBack: 30,
        });

        discordMessages = searchResults.map(result => ({
          username: result.username,
          content: result.content,
          channelName: result.channelName,
          timestamp: result.timestamp,
        }));

        // Extract unique Discord user IDs for character appearance lookups
        discordUserIds = [...new Set(searchResults
          .map(result => result.userId)
          .filter((userId): userId is string => Boolean(userId))
        )];

        console.log(`✅ Found ${discordMessages.length} relevant Discord messages from ${discordUserIds.length} users`);
      } catch (error) {
        console.warn('⚠️ Error searching Discord messages:', error);
        // Continue without Discord messages if search fails
      }
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

    // Write success result
    await writeResult({
      success: true,
      imageSize: comicResult.imageData.length,
      discordMessageId: postResult.messageId,
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
