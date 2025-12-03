/**
 * GitHub List Pull Requests Tool
 */

import { tool } from 'ai';
import { z } from 'zod';

export const githubListPullRequestsTool = tool({
  description: 'List GitHub pull requests from the repository. Can filter by state (open, closed, or all). Returns PR numbers, titles, states, and URLs.',
  inputSchema: z.object({
    state: z.enum(['open', 'closed', 'all']).optional().default('open').describe('Filter by PR state (default: open)'),
    limit: z.number().optional().default(30).describe('Maximum number of PRs to return (default: 30, max: 100)'),
  }),
  execute: async ({ state = 'open', limit = 30 }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

    if (!GITHUB_TOKEN) {
      return {
        success: false,
        error: 'GitHub token not configured',
      };
    }

    try {
      const perPage = Math.min(limit, 100);
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/pulls?state=${state}&per_page=${perPage}`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `GitHub API error: ${response.status} - ${error}`,
        };
      }

      const prs = await response.json() as any[];

      const formattedPRs = prs.map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        url: pr.html_url,
        branch: pr.head.ref,
        baseBranch: pr.base.ref,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        merged: pr.merged_at ? true : false,
      }));

      return {
        success: true,
        count: formattedPRs.length,
        pullRequests: formattedPRs,
        message: `Found ${formattedPRs.length} ${state} pull request(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error listing pull requests',
      };
    }
  },
});
