/**
 * GitHub Close All Issues Tool
 */

import { tool } from 'ai';
import { z } from 'zod';
import { closeAssociatedPRs } from './helpers.js';

export const githubCloseAllIssuesTool = tool({
  description: 'Close ALL open issues in the repository. WARNING: This is a destructive operation that will close every open issue. Use with extreme caution. Typically used for cleanup or repository archival.',
  inputSchema: z.object({
    confirm: z.literal(true).describe('Must be explicitly set to true to confirm closing all issues'),
    comment: z.string().optional().describe('Optional comment to add to each issue when closing'),
  }),
  execute: async ({ confirm, comment }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

    if (!GITHUB_TOKEN) {
      return {
        success: false,
        error: 'GitHub token not configured',
      };
    }

    if (confirm !== true) {
      return {
        success: false,
        error: 'Must confirm by setting confirm=true to close all issues',
      };
    }

    try {
      // Fetch all open issues
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/issues?state=open&per_page=100`,
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

      const issues: any[] = await response.json();

      // Filter out pull requests
      const actualIssues = issues.filter(issue => !issue.pull_request);

      if (actualIssues.length === 0) {
        return {
          success: true,
          closedCount: 0,
          message: 'No open issues to close',
        };
      }

      const closedIssues: number[] = [];
      const errors: string[] = [];

      // Close each issue
      for (const issue of actualIssues) {
        try {
          // Add comment if provided
          if (comment) {
            await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${issue.number}/comments`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28',
              },
              body: JSON.stringify({ body: comment }),
            });
          }

          // Close associated PRs and delete branches
          await closeAssociatedPRs(issue.number, GITHUB_TOKEN, GITHUB_REPO);

          // Close the issue
          const closeResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/issues/${issue.number}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28',
              },
              body: JSON.stringify({ state: 'closed' }),
            }
          );

          if (closeResponse.ok) {
            closedIssues.push(issue.number);
          } else {
            errors.push(`Failed to close issue #${issue.number}`);
          }
        } catch (err) {
          errors.push(`Error closing issue #${issue.number}: ${err}`);
        }
      }

      return {
        success: true,
        closedCount: closedIssues.length,
        closedIssues,
        errors: errors.length > 0 ? errors : undefined,
        message: `Closed ${closedIssues.length} of ${actualIssues.length} open issue(s)${errors.length > 0 ? ` (${errors.length} errors)` : ''}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error closing all issues',
      };
    }
  },
});
