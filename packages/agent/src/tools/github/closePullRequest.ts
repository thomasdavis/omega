/**
 * GitHub Close Pull Request Tool
 */

import { tool } from 'ai';
import { z } from 'zod';

export const githubClosePullRequestTool = tool({
  description: 'Close a GitHub pull request by PR number without merging. Use this to reject or cancel a PR. Optionally deletes the branch and adds a closing comment.',
  inputSchema: z.object({
    prNumber: z.number().describe('The pull request number to close'),
    comment: z.string().optional().describe('Optional comment to add when closing the PR'),
    deleteBranch: z.boolean().optional().default(true).describe('Whether to delete the branch after closing (default: true)'),
  }),
  execute: async ({ prNumber, comment, deleteBranch = true }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

    if (!GITHUB_TOKEN) {
      return {
        success: false,
        error: 'GitHub token not configured',
      };
    }

    try {
      const updates: string[] = [];

      // Add comment if provided
      if (comment) {
        const commentResponse = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/issues/${prNumber}/comments`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
            body: JSON.stringify({ body: comment }),
          }
        );

        if (commentResponse.ok) {
          updates.push('added comment');
        }
      }

      // Get PR details first to get branch name
      const prResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls/${prNumber}`, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!prResponse.ok) {
        const error = await prResponse.text();
        return {
          success: false,
          error: `Failed to fetch PR details: ${prResponse.status} - ${error}`,
        };
      }

      const pr: any = await prResponse.json();
      const branchName = pr.head.ref;

      // Close the PR
      const closeResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/pulls/${prNumber}`,
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

      if (!closeResponse.ok) {
        const error = await closeResponse.text();
        return {
          success: false,
          error: `GitHub API error: ${closeResponse.status} - ${error}`,
        };
      }

      updates.push('closed PR');

      // Delete branch if requested
      if (deleteBranch) {
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
          updates.push(`deleted branch ${branchName}`);
        }
      }

      const prUrl = pr.html_url;

      return {
        success: true,
        prNumber,
        prUrl,
        branchName,
        message: `Successfully closed PR #${prNumber}. ${updates.join(', ')}`,
        updates: updates.join(', '),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error closing pull request',
      };
    }
  },
});
