/**
 * Summarize Commits Tool - Pull GitHub commits from a time period and summarize with AI
 * Provides quick high-level insights into recent repository activity
 */

import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { OMEGA_MODEL } from '../../config/models.js';

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

/**
 * Parse time period string to hours
 * Supports formats: "24h", "48h", "7d", "2w"
 */
function parseTimePeriod(period: string): number {
  const match = period.match(/^(\d+)(h|d|w)$/);
  if (!match) {
    throw new Error('Invalid time period format. Use format like "24h", "48h", "7d", or "2w"');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'h':
      return value;
    case 'd':
      return value * 24;
    case 'w':
      return value * 24 * 7;
    default:
      return 48; // Default to 48 hours
  }
}

/**
 * Fetch commits from GitHub API within a time range
 */
async function fetchCommits(hours: number): Promise<Commit[]> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured');
  }

  try {
    // Calculate the since timestamp
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Fetch commits from GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/commits?since=${since}&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch commits: ${response.status} ${response.statusText}`);
    }

    const data: any[] = await response.json();

    // Transform to simplified commit objects
    const commits: Commit[] = data.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      url: commit.html_url,
    }));

    return commits;
  } catch (error) {
    console.error('Error fetching commits:', error);
    throw error;
  }
}

/**
 * Use AI to summarize commits into bullet points
 */
async function summarizeWithAI(commits: Commit[]): Promise<string> {
  if (commits.length === 0) {
    return 'No commits found in the specified time period.';
  }

  // Prepare commit data for AI
  const commitText = commits
    .map(c => `- ${c.message.split('\n')[0]} (by ${c.author})`)
    .join('\n');

  const prompt = `You are analyzing GitHub commits for the Omega repository. Below is a list of recent commits.

Your task: Generate a concise, high-level bullet-point summary of the changes. Focus on:
- Main features added or updated
- Bug fixes
- Refactoring or improvements
- Documentation changes
- Any notable patterns or themes

Keep it brief and organized. Use bullet points. Group similar changes together.

Commits:
${commitText}

Summary:`;

  try {
    const result = await generateText({
      model: openai.chat(OMEGA_MODEL),
      prompt,
      temperature: 0.3, // Lower temperature for more focused, consistent summaries
    });

    return result.text;
  } catch (error) {
    console.error('Error generating AI summary:', error);
    throw error;
  }
}

export const summarizeCommitsTool = tool({
  description: `Pull GitHub commits from a specified time period and summarize them with AI.

  Provides quick high-level insights into recent repository activity, helping developers and users understand recent changes without manually browsing commits.

  Useful for:
  - Generating changelog entries
  - Understanding recent development activity
  - Creating release notes
  - Tracking project progress

  Time period format:
  - "24h" - last 24 hours
  - "48h" - last 48 hours (default)
  - "7d" - last 7 days
  - "2w" - last 2 weeks`,
  inputSchema: z.object({
    timePeriod: z.string().optional().describe('Time period to fetch commits from (e.g., "24h", "48h", "7d", "2w"). Default: "48h"'),
  }),
  execute: async ({ timePeriod = '48h' }) => {
    try {
      if (!GITHUB_TOKEN) {
        return {
          success: false,
          error: 'GitHub token not configured. Commit summarization requires GitHub integration.',
        };
      }

      // Parse time period
      const hours = parseTimePeriod(timePeriod);

      console.log(`📊 Fetching commits from last ${hours} hours (${timePeriod})...`);

      // Fetch commits
      const commits = await fetchCommits(hours);

      console.log(`📊 Found ${commits.length} commits`);

      if (commits.length === 0) {
        return {
          success: true,
          repository: GITHUB_REPO,
          timePeriod,
          commitCount: 0,
          summary: 'No commits found in the specified time period.',
          message: `No commits found in ${GITHUB_REPO} for the last ${timePeriod}.`,
        };
      }

      // Generate AI summary
      console.log('🤖 Generating AI summary...');
      const summary = await summarizeWithAI(commits);

      // Get date range
      const oldestCommit = commits[commits.length - 1];
      const newestCommit = commits[0];
      const dateRange = {
        from: new Date(oldestCommit.date).toISOString(),
        to: new Date(newestCommit.date).toISOString(),
      };

      return {
        success: true,
        repository: GITHUB_REPO,
        timePeriod,
        commitCount: commits.length,
        dateRange,
        summary,
        commits: commits.slice(0, 10).map(c => ({
          sha: c.sha.substring(0, 7),
          message: c.message.split('\n')[0],
          author: c.author,
          date: c.date,
        })), // Include first 10 commits for reference
        message: `Successfully summarized ${commits.length} commits from ${GITHUB_REPO} over the last ${timePeriod}.`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to summarize commits',
      };
    }
  },
});
