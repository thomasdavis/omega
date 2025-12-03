/**
 * GitHub Update Issue Tool
 */

import { tool } from 'ai';
import { z } from 'zod';
import { closeAssociatedPRs } from './helpers.js';

export const githubUpdateIssueTool = tool({
  description: 'Update an existing GitHub issue by issue number. Can update the title, body, state (open/closed), labels, or add comments. Requires issue number and at least one field to update.',
  inputSchema: z.object({
    issueNumber: z.number().describe('The issue number to update'),
    title: z.string().optional().describe('New title for the issue'),
    body: z.string().optional().describe('New body/description for the issue'),
    state: z.enum(['open', 'closed']).optional().describe('State to set (open or closed)'),
    labels: z.array(z.string()).optional().describe('Labels to set (replaces existing labels)'),
    addLabels: z.array(z.string()).optional().describe('Labels to add (preserves existing labels)'),
    removeLabels: z.array(z.string()).optional().describe('Labels to remove'),
    comment: z.string().optional().describe('Add a comment to the issue'),
  }),
  execute: async ({ issueNumber, title, body, state, labels, addLabels, removeLabels, comment }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

    if (!GITHUB_TOKEN) {
      return {
        success: false,
        error: 'GitHub token not configured',
      };
    }

    // Validate that at least one update field is provided
    if (!title && !body && !state && !labels && !addLabels && !removeLabels && !comment) {
      return {
        success: false,
        error: 'At least one field must be provided to update (title, body, state, labels, addLabels, removeLabels, or comment)',
      };
    }

    try {
      const updates: string[] = [];
      let closedPRs: number[] = [];
      let deletedBranches: string[] = [];

      // If closing the issue, first close associated PRs and delete branches
      if (state === 'closed') {
        const result = await closeAssociatedPRs(issueNumber, GITHUB_TOKEN, GITHUB_REPO);
        closedPRs = result.closedPRs;
        deletedBranches = result.deletedBranches;

        if (closedPRs.length > 0) {
          updates.push(`closed ${closedPRs.length} PR(s): ${closedPRs.map(n => `#${n}`).join(', ')}`);
        }
        if (deletedBranches.length > 0) {
          updates.push(`deleted ${deletedBranches.length} branch(es)`);
        }
      }

      // Update issue fields (title, body, state, labels)
      if (title || body || state || labels) {
        const updatePayload: any = {};
        if (title) updatePayload.title = title;
        if (body) updatePayload.body = body;
        if (state) updatePayload.state = state;
        if (labels) updatePayload.labels = labels;

        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          const error = await response.text();
          return {
            success: false,
            error: `GitHub API error: ${response.status} - ${error}`,
          };
        }

        if (title) updates.push('title');
        if (body) updates.push('body');
        if (state) updates.push(`state to ${state}`);
        if (labels) updates.push('labels');
      }

      // Add labels (preserves existing)
      if (addLabels && addLabels.length > 0) {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}/labels`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({
            labels: addLabels,
          }),
        });

        if (!response.ok) {
          console.warn(`Failed to add labels to issue #${issueNumber}: ${response.status}`);
        } else {
          updates.push(`added labels: ${addLabels.join(', ')}`);
        }
      }

      // Remove labels
      if (removeLabels && removeLabels.length > 0) {
        for (const label of removeLabels) {
          const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          });

          if (!response.ok) {
            console.warn(`Failed to remove label "${label}" from issue #${issueNumber}: ${response.status}`);
          }
        }
        updates.push(`removed labels: ${removeLabels.join(', ')}`);
      }

      // Add comment
      if (comment) {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`, {
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

        if (!response.ok) {
          console.warn(`Failed to add comment to issue #${issueNumber}: ${response.status}`);
        } else {
          updates.push('added comment');
        }
      }

      const issueUrl = `https://github.com/${GITHUB_REPO}/issues/${issueNumber}`;

      return {
        success: true,
        issueNumber,
        issueUrl,
        updates: updates.join(', '),
        message: `Updated issue #${issueNumber}: ${updates.join(', ')}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error updating issue',
      };
    }
  },
});
