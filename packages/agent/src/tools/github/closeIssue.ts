/**
 * GitHub Close Issue Tool
 */

import { tool } from 'ai';
import { z } from 'zod';
import { closeAssociatedPRs } from './helpers.js';

export const githubCloseIssueTool = tool({
  description: 'Close a GitHub issue by issue number. Use this to cancel or close issues that were created accidentally or are no longer needed. Can optionally add a closing comment explaining why the issue is being closed.',
  inputSchema: z.object({
    issueNumber: z.number().describe('The issue number to close'),
    comment: z.string().optional().describe('Optional comment to add when closing the issue (e.g., "Closing as duplicate" or "Issue resolved")'),
  }),
  execute: async ({ issueNumber, comment }) => {
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

      // Add comment first if provided (before closing)
      if (comment) {
        const commentResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({
            body: comment,
          }),
        });

        if (!commentResponse.ok) {
          console.warn(`Failed to add comment to issue #${issueNumber}: ${commentResponse.status}`);
        } else {
          updates.push('added closing comment');
        }
      }

      // Close associated PRs and delete branches before closing the issue
      const { closedPRs, deletedBranches } = await closeAssociatedPRs(issueNumber, GITHUB_TOKEN, GITHUB_REPO);

      if (closedPRs.length > 0) {
        updates.push(`closed ${closedPRs.length} PR(s): ${closedPRs.map(n => `#${n}`).join(', ')}`);
      }
      if (deletedBranches.length > 0) {
        updates.push(`deleted ${deletedBranches.length} branch(es): ${deletedBranches.join(', ')}`);
      }

      // Close the issue
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          state: 'closed',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `GitHub API error: ${response.status} - ${error}`,
        };
      }

      updates.push('closed issue');

      const issueUrl = `https://github.com/${GITHUB_REPO}/issues/${issueNumber}`;

      return {
        success: true,
        issueNumber,
        issueUrl,
        message: `Successfully closed issue #${issueNumber}${comment ? ' with comment' : ''}. ${closedPRs.length > 0 ? `Closed ${closedPRs.length} PR(s) and deleted ${deletedBranches.length} branch(es).` : ''}`,
        updates: updates.join(', '),
        closedPRs,
        deletedBranches,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error closing issue',
      };
    }
  },
});
