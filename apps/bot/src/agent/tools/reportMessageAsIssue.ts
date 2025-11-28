/**
 * Report Message As Issue - Allows users to easily convert Discord messages
 * or statements into GitHub issues for tracking feature requests, bugs, feedback, or concerns
 */

import { tool } from 'ai';
import { z } from 'zod';

export const reportMessageAsIssueTool = tool({
  description: 'Create a GitHub issue from a Discord message or user statement. Use this when users want to formally report something, create a feature request from a conversation, or track feedback/concerns. This makes it easy for users to convert casual Discord conversations into actionable GitHub issues.',
  inputSchema: z.object({
    messageOrStatement: z.string().describe('The message or statement to report (e.g., user feedback, feature request, bug report, or concern)'),
    category: z.enum(['feature-request', 'bug', 'feedback', 'concern', 'enhancement', 'documentation', 'question', 'other']).describe('The category/type of the report'),
    title: z.string().describe('A clear, concise title for the GitHub issue'),
    additionalContext: z.string().optional().describe('Optional: Additional context, background, or related information'),
    reportedByUsername: z.string().optional().describe('Optional: Discord username of the person who made the statement'),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Optional: Priority level of the issue'),
    conversationContext: z.string().optional().describe('Optional: Recent conversation messages for additional context'),
  }),
  execute: async ({
    messageOrStatement,
    category,
    title,
    additionalContext,
    reportedByUsername,
    priority,
    conversationContext
  }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

    if (!GITHUB_TOKEN) {
      return {
        success: false,
        error: 'GitHub token not configured',
      };
    }

    // Format issue body with comprehensive context
    let issueBody = `## Request
${messageOrStatement}`;

    if (reportedByUsername) {
      issueBody += `\n\n**Reported by:** @${reportedByUsername} (Discord)`;
    }

    if (additionalContext) {
      issueBody += `\n\n## Additional Context
${additionalContext}`;
    }

    if (conversationContext) {
      issueBody += `\n\n## Conversation Context
${conversationContext}`;
    }

    issueBody += `\n\n## Category
${category}`;

    if (priority) {
      issueBody += `\n\n## Priority
${priority}`;
    }

    issueBody += `\n\n## Acceptance Criteria
- [ ] Implementation matches the request
- [ ] Code follows existing patterns in the codebase
- [ ] No breaking changes
- [ ] Ready for deployment`;

    try {
      // Determine labels based on category and priority
      const labels = ['user-report', category];
      if (priority) {
        labels.push(`priority-${priority}`);
      }

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
          body: issueBody,
          labels,
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

      return {
        success: true,
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        message: `Created issue #${issue.number}: ${title}`,
        category,
        priority: priority || 'not specified',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating issue',
      };
    }
  },
});
