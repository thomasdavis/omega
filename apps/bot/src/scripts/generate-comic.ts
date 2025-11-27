#!/usr/bin/env node
/**
 * Gemini Comic Generator
 *
 * Generates comic images from PR conversation context using Google's Gemini API.
 * This script is triggered by GitHub Actions after a PR is merged.
 *
 * Usage:
 *   tsx src/scripts/generate-comic.ts <pr-number> <issue-number> <pr-title>
 *
 * Environment Variables:
 *   GEMINI_API_KEY - Google AI API key for Gemini
 *   GITHUB_TOKEN - GitHub token for API access
 *   GITHUB_REPO - Repository in format "owner/repo"
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import mime from 'mime';

interface PRContext {
  number: number;
  title: string;
  body: string;
  comments: Array<{
    author: string;
    body: string;
    created_at: string;
  }>;
  commits: Array<{
    sha: string;
    message: string;
    author: string;
  }>;
  filesChanged: Array<{
    filename: string;
    additions: number;
    deletions: number;
  }>;
}

/**
 * Fetch PR context from GitHub API
 */
async function fetchPRContext(prNumber: number): Promise<PRContext> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'thomasdavis/omega';

  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
  };

  // Fetch PR details
  const prResponse = await fetch(`https://api.github.com/repos/${repo}/pulls/${prNumber}`, { headers });
  if (!prResponse.ok) {
    throw new Error(`Failed to fetch PR: ${prResponse.statusText}`);
  }
  const pr: any = await prResponse.json();

  // Fetch PR comments
  const commentsResponse = await fetch(`https://api.github.com/repos/${repo}/issues/${prNumber}/comments`, { headers });
  const commentsData: any = await commentsResponse.json();
  const comments = commentsData.map((c: any) => ({
    author: c.user.login,
    body: c.body,
    created_at: c.created_at,
  }));

  // Fetch PR commits
  const commitsResponse = await fetch(`https://api.github.com/repos/${repo}/pulls/${prNumber}/commits`, { headers });
  const commitsData: any = await commitsResponse.json();
  const commits = commitsData.map((c: any) => ({
    sha: c.sha.substring(0, 7),
    message: c.commit.message,
    author: c.commit.author.name,
  }));

  // Fetch PR files
  const filesResponse = await fetch(`https://api.github.com/repos/${repo}/pulls/${prNumber}/files`, { headers });
  const filesData: any = await filesResponse.json();
  const filesChanged = filesData.map((f: any) => ({
    filename: f.filename,
    additions: f.additions,
    deletions: f.deletions,
  }));

  return {
    number: pr.number,
    title: pr.title,
    body: pr.body || '',
    comments,
    commits,
    filesChanged,
  };
}

/**
 * Create a prompt for Gemini to generate a comic
 */
function createComicPrompt(context: PRContext): string {
  const commentsSummary = context.comments.length > 0
    ? context.comments.slice(0, 5).map(c => `${c.author}: ${c.body.substring(0, 200)}`).join('\n')
    : 'No comments';

  const commitsSummary = context.commits.slice(0, 5).map(c =>
    `${c.author}: ${c.message.split('\n')[0]}`
  ).join('\n');

  const filesSummary = context.filesChanged.slice(0, 10).map(f =>
    `${f.filename} (+${f.additions}/-${f.deletions})`
  ).join('\n');

  return `Create a humorous comic strip about this pull request. Make it lighthearted and fun!

PR Title: ${context.title}

PR Description:
${context.body.substring(0, 500)}

Recent Comments:
${commentsSummary}

Key Commits:
${commitsSummary}

Files Changed:
${filesSummary}

The comic should:
- Choose between 1-6 panels based on what best tells the story:
  * 1 panel: Simple, single joke or concept
  * 2 panels: Setup and punchline
  * 3 panels: Beginning, middle, end
  * 4 panels: Classic comic strip format (most common)
  * 6 panels: Complex story or multiple perspectives
- Arrange panels in a clear grid layout (e.g., 2x2 for 4 panels, 2x3 for 6 panels)
- Feature cartoon characters representing the developers
- Show the journey from problem to solution
- Include speech bubbles with witty dialogue
- Be colorful and visually appealing
- Capture the essence of the changes in a humorous way
- Each panel should have clear borders and good visual flow

Style: Modern web comic style, clean lines, vibrant colors, expressive characters.`;
}

/**
 * Generate comic using Gemini API
 */
async function generateComic(context: PRContext): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-pro-image-preview',
  });

  const prompt = createComicPrompt(context);

  console.log('🎨 Generating comic with Gemini...');
  console.log('Prompt:', prompt.substring(0, 200) + '...');

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: prompt }],
    }],
  });

  const response = result.response;

  // Extract image from response
  if (!response.candidates || response.candidates.length === 0) {
    throw new Error('No candidates in Gemini response');
  }

  const candidate = response.candidates[0];
  if (!candidate.content.parts || candidate.content.parts.length === 0) {
    throw new Error('No parts in Gemini response');
  }

  const imagePart = candidate.content.parts.find((part: any) => part.inlineData);
  if (!imagePart || !imagePart.inlineData) {
    throw new Error('No image data in Gemini response');
  }

  // Convert base64 to buffer
  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');

  console.log('✅ Comic generated successfully');
  console.log(`   Image size: ${imageBuffer.length} bytes`);
  console.log(`   MIME type: ${imagePart.inlineData.mimeType}`);

  return imageBuffer;
}

/**
 * Save comic to file system
 */
function saveComic(imageBuffer: Buffer, prNumber: number): string {
  const outputDir = join(process.cwd(), 'comics');
  mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `pr-${prNumber}-${timestamp}.png`;
  const filepath = join(outputDir, filename);

  writeFileSync(filepath, imageBuffer);

  console.log(`💾 Comic saved to: ${filepath}`);

  return filepath;
}

/**
 * Post comic to Discord
 */
async function postToDiscord(imageBuffer: Buffer, prNumber: number, prTitle: string, issueNumber?: number): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('⚠️  DISCORD_WEBHOOK_URL not set, skipping Discord post');
    return;
  }

  const repo = process.env.GITHUB_REPO || 'thomasdavis/omega';
  const prUrl = `https://github.com/${repo}/pull/${prNumber}`;

  // Create form data for Discord webhook
  const formData = new FormData();

  // Add the image file
  const blob = new Blob([imageBuffer], { type: 'image/png' });
  formData.append('file', blob, `pr-${prNumber}-comic.png`);

  // Add embed with PR info
  const embed = {
    title: '🎨 New Comic Generated!',
    description: `**PR #${prNumber}:** ${prTitle}${issueNumber ? `\n**Issue:** #${issueNumber}` : ''}`,
    url: prUrl,
    color: 0x5865F2, // Discord blurple
    footer: {
      text: 'Generated by Gemini AI',
    },
    timestamp: new Date().toISOString(),
  };

  formData.append('payload_json', JSON.stringify({
    embeds: [embed],
  }));

  const response = await fetch(webhookUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to post to Discord: ${response.statusText}`);
  }

  console.log('✅ Comic posted to Discord');
}

/**
 * Comment on GitHub issue
 */
async function commentOnIssue(issueNumber: number, prNumber: number, comicPath: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'thomasdavis/omega';

  if (!token) {
    console.warn('⚠️  GITHUB_TOKEN not set, skipping issue comment');
    return;
  }

  const commentBody = `@claude A comic has been generated for PR #${prNumber}!

The comic has been posted to the Discord channel and saved to: \`${comicPath}\`

This comic was automatically generated using the Gemini API based on the PR conversation context.`;

  const response = await fetch(
    `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: commentBody }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to comment on issue: ${response.statusText}`);
  }

  console.log(`✅ Commented on issue #${issueNumber}`);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: tsx src/scripts/generate-comic.ts <pr-number> [issue-number] [pr-title]');
    process.exit(1);
  }

  const prNumber = parseInt(args[0], 10);
  const issueNumber = args[1] ? parseInt(args[1], 10) : undefined;
  const prTitle = args[2] || 'Unknown PR';

  if (isNaN(prNumber)) {
    console.error('Error: PR number must be a valid integer');
    process.exit(1);
  }

  console.log('🚀 Starting comic generation...');
  console.log(`   PR: #${prNumber}`);
  if (issueNumber) {
    console.log(`   Issue: #${issueNumber}`);
  }

  try {
    // 1. Fetch PR context
    console.log('\n📥 Fetching PR context from GitHub...');
    const context = await fetchPRContext(prNumber);
    console.log(`   Found ${context.comments.length} comments, ${context.commits.length} commits, ${context.filesChanged.length} files`);

    // 2. Generate comic
    console.log('\n🎨 Generating comic with Gemini AI...');
    const imageBuffer = await generateComic(context);

    // 3. Save comic
    console.log('\n💾 Saving comic...');
    const comicPath = saveComic(imageBuffer, prNumber);

    // 4. Post to Discord
    console.log('\n📤 Posting to Discord...');
    await postToDiscord(imageBuffer, prNumber, context.title, issueNumber);

    // 5. Comment on issue
    if (issueNumber) {
      console.log('\n💬 Commenting on GitHub issue...');
      await commentOnIssue(issueNumber, prNumber, comicPath);
    }

    console.log('\n✅ Comic generation complete!');
    console.log(`   Comic saved to: ${comicPath}`);
  } catch (error) {
    console.error('❌ Error generating comic:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateComic, fetchPRContext, createComicPrompt };
