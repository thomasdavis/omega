/**
 * GitHub tools for managing issues
 */

import { tool } from 'ai';
import { z } from 'zod';

export const githubCreateIssueTool = tool({
  description: 'Create a new issue in the GitHub repository for feature requests, bugs, or improvements',
  parameters: z.object({
    title: z.string().describe('The title of the issue'),
    body: z.string().describe('The detailed description of the issue, with context and requirements'),
    labels: z.array(z.string()).optional().describe('Labels to apply (e.g., ["enhancement", "bug", "documentation"])'),
  }),
  execute: async ({ title, body, labels }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega'; // owner/repo format

    if (!GITHUB_TOKEN) {
      return {
        success: false,
        error: 'GitHub token not configured',
      };
    }

    // Format issue body with structured format
    const formattedBody = `## Request
${body}

## Context
Created from Discord #omega channel

## Acceptance Criteria
- [ ] Implementation matches the request
- [ ] Code follows existing patterns in the codebase
- [ ] No breaking changes
- [ ] Ready for deployment`;

    try {
      // Create the issue
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title,
          body: formattedBody,
          labels: labels || [],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `GitHub API error: ${response.status} - ${error}`,
        };
      }

      const issue: any = await response.json();

      // Add a comment with @claude to trigger the workflow
      const commentResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${issue.number}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          body: '@claude please implement this request following the project\'s coding standards.',
        }),
      });

      if (!commentResponse.ok) {
        console.warn('Failed to add @claude comment, but issue was created successfully');
      }

      return {
        success: true,
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        message: `Created issue #${issue.number}: ${title}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating issue',
      };
    }
  },
});

export const githubUpdateIssueTool = tool({
  description: 'Update an existing GitHub issue (title, description, labels, or state)',
  parameters: z.object({
    issueNumber: z.number().describe('The issue number to update'),
    title: z.string().optional().describe('New title for the issue'),
    body: z.string().optional().describe('New description/body for the issue'),
    labels: z.array(z.string()).optional().describe('Labels to apply (replaces existing labels)'),
    state: z.enum(['open', 'closed']).optional().describe('State of the issue (open or closed)'),
  }),
  execute: async ({ issueNumber, title, body, labels, state }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega'; // owner/repo format

    if (!GITHUB_TOKEN) {
      return {
        success: false,
        error: 'GitHub token not configured',
      };
    }

    // Validate that at least one field is being updated
    if (!title && !body && !labels && !state) {
      return {
        success: false,
        error: 'At least one field (title, body, labels, or state) must be provided to update',
      };
    }

    try {
      // Build the update payload with only provided fields
      const updatePayload: any = {};
      if (title) updatePayload.title = title;
      if (body) updatePayload.body = body;
      if (labels) updatePayload.labels = labels;
      if (state) updatePayload.state = state;

      // Update the issue
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

      const issue: any = await response.json();

      const updatedFields = Object.keys(updatePayload).join(', ');

      return {
        success: true,
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        updatedFields,
        message: `Updated issue #${issue.number} (${updatedFields})`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error updating issue',
      };
    }
  },
});
