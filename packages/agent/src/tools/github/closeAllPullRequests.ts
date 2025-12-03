/**
 * GitHub Close All Pull Requests Tool
 */

import { tool } from 'ai';
import { z } from 'zod';

export const githubCloseAllPullRequestsTool = tool({
  description: 'Close ALL open pull requests in the repository without merging. WARNING: This is a destructive operation that will close every open PR. Use with extreme caution. Typically used for cleanup or repository archival.',
  inputSchema: z.object({
    confirm: z.literal(true).describe('Must be explicitly set to true to confirm closing all PRs'),
    comment: z.string().optional().describe('Optional comment to add to each PR when closing'),
    deleteBranches: z.boolean().optional().default(true).describe('Whether to delete branches after closing (default: true)'),
  }),
  execute: async ({ confirm, comment, deleteBranches = true }) => {
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
        error: 'Must confirm by setting confirm=true to close all pull requests',
      };
    }

    try {
      // Fetch all open PRs
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/pulls?state=open&per_page=100`,
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

      const prs: any[] = await response.json();

      if (prs.length === 0) {
        return {
          success: true,
          closedCount: 0,
          message: 'No open pull requests to close',
        };
      }

      const closedPRs: number[] = [];
      const deletedBranches: string[] = [];
      const errors: string[] = [];

      // Close each PR
      for (const pr of prs) {
        try {
          // Add comment if provided
          if (comment) {
            await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${pr.number}/comments`, {
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

          // Close the PR
          const closeResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/pulls/${pr.number}`,
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
            closedPRs.push(pr.number);

            // Delete branch if requested
            if (deleteBranches) {
              const branchName = pr.head.ref;
              const deleteResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/${branchName}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                  },
                }
              );

              if (deleteResponse.ok || deleteResponse.status === 404) {
                deletedBranches.push(branchName);
              }
            }
          } else {
            errors.push(`Failed to close PR #${pr.number}`);
          }
        } catch (err) {
          errors.push(`Error closing PR #${pr.number}: ${err}`);
        }
      }

      return {
        success: true,
        closedCount: closedPRs.length,
        closedPRs,
        deletedBranches: deleteBranches ? deletedBranches : undefined,
        errors: errors.length > 0 ? errors : undefined,
        message: `Closed ${closedPRs.length} of ${prs.length} open PR(s)${deleteBranches ? `, deleted ${deletedBranches.length} branch(es)` : ''}${errors.length > 0 ? ` (${errors.length} errors)` : ''}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error closing all pull requests',
      };
    }
  },
});
