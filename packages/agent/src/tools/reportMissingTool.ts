/**
 * Report Missing Tool - Automatically creates GitHub issues when Omega identifies
 * a tool/capability it needs but doesn't have
 */

import { tool } from 'ai';
import { z } from 'zod';

export const reportMissingToolTool = tool({
  description: 'IMPORTANT: Use this tool when you recognize that you need a tool or capability that you do not currently have. This will automatically create a GitHub issue to track adding that tool/capability. Call this BEFORE telling the user you cannot help them - be proactive about self-improvement.',
  inputSchema: z.object({
    toolName: z.string().describe('A short, descriptive name for the missing tool (e.g., "imageEditor", "pdfGenerator", "videoTranscoder")'),
    toolDescription: z.string().describe('A detailed description of what the tool should do and why it is needed'),
    userRequest: z.string().describe('The user\'s original request that revealed the need for this tool'),
    suggestedImplementation: z.string().optional().describe('Optional: Any ideas about how this tool could be implemented (libraries, APIs, approaches)'),
    relatedTools: z.array(z.string()).optional().describe('Optional: Names of existing tools that are similar or related'),
  }),
  execute: async ({ toolName, toolDescription, userRequest, suggestedImplementation, relatedTools }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

    if (!GITHUB_TOKEN) {
      return {
        success: false,
        error: 'GitHub token not configured',
      };
    }

    // Format issue body with comprehensive context
    let issueBody = `## User Request
${userRequest}

## Tool Requirements
**Tool Name:** \`${toolName}\`

**What it should do:**
${toolDescription}`;

    if (suggestedImplementation) {
      issueBody += `\n\n**Suggested Implementation:**
${suggestedImplementation}`;
    }

    if (relatedTools && relatedTools.length > 0) {
      issueBody += `\n\n**Related Existing Tools:**
${relatedTools.map(tool => `- \`${tool}\``).join('\n')}`;
    }

    issueBody += `\n\n## Context
Omega autonomously identified this missing capability while processing a user request and automatically created this issue for tracking.

## Acceptance Criteria
- [ ] Tool implementation matches the requirements
- [ ] Tool follows existing patterns in \`apps/bot/src/agent/tools/\`
- [ ] Tool is registered in \`apps/bot/src/agent/agent.ts\`
- [ ] System prompt is updated to document the new tool
- [ ] Code follows project standards
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
          title: `Add tool: ${toolName}`,
          body: issueBody,
          labels: ['enhancement', 'tool-request', 'auto-generated'],
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

      // Add a comment to tag @claude to start work
      try {
        const commentResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${issue.number}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({
            body: `@claude please implement this tool following the project's coding standards.`,
          }),
        });

        if (!commentResponse.ok) {
          console.warn(`Failed to add comment to issue #${issue.number}: ${commentResponse.status}`);
        }
      } catch (commentError) {
        console.warn(`Error adding comment to issue #${issue.number}:`, commentError);
        // Don't fail the whole operation if comment fails
      }

      return {
        success: true,
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        message: `Created issue #${issue.number} to track adding the '${toolName}' tool`,
        toolName,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating issue',
      };
    }
  },
});
