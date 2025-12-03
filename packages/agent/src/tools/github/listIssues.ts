/**
 * GitHub List Issues Tool
 */

import { tool } from 'ai';
import { z } from 'zod';

export const githubListIssuesTool = tool({
  description: 'List GitHub issues from the repository. Can filter by state (open, closed, or all). Returns issue numbers, titles, states, labels, and URLs.',
  inputSchema: z.object({
    state: z.enum(['open', 'closed', 'all']).optional().default('open').describe('Filter by issue state (default: open)'),
    limit: z.number().optional().default(30).describe('Maximum number of issues to return (default: 30, max: 100)'),
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
        `https://api.github.com/repos/${GITHUB_REPO}/issues?state=${state}&per_page=${perPage}`,
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

      const issues = await response.json() as any[];

      // Filter out pull requests (GitHub API returns PRs as issues)
      const actualIssues = issues.filter(issue => !issue.pull_request);

      const formattedIssues = actualIssues.map(issue => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        labels: issue.labels.map((label: any) => label.name),
        url: issue.html_url,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
      }));

      return {
        success: true,
        count: formattedIssues.length,
        issues: formattedIssues,
        message: `Found ${formattedIssues.length} ${state} issue(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error listing issues',
      };
    }
  },
});
