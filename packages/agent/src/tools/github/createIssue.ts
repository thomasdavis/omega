/**
 * GitHub Create Issue Tool
 */

import { tool } from 'ai';
import { z } from 'zod';

export const githubCreateIssueTool = tool({
  description: 'Create a new issue in the GitHub repository for feature requests, bugs, or improvements. IMPORTANT: When creating issues about API integrations or external services, include any relevant URLs, documentation links, API references, curl commands, or code examples from the conversation context to provide complete information for developers.',
  inputSchema: z.object({
    title: z.string().describe('The title of the issue'),
    body: z.string().describe('The detailed description of the issue, with context and requirements'),
    labels: z.array(z.string()).optional().describe('Labels to apply (e.g., ["enhancement", "bug", "documentation"])'),
    conversationContext: z.string().optional().describe('Optional: The past 20 Discord messages (unfiltered) to provide full conversation context for the issue'),
  }),
  execute: async ({ title, body, labels, conversationContext }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega'; // owner/repo format

    if (!GITHUB_TOKEN) {
      return {
        success: false,
        error: 'GitHub token not configured',
      };
    }

    // Combine body and conversation context for extraction
    const fullContext = conversationContext ? `${body}\n\n${conversationContext}` : body;

    // Extract URLs from the full context
    const urlRegex = /(https?:\/\/[^\s<>]+)/gi;
    const links = fullContext.match(urlRegex) || [];
    const uniqueLinks = [...new Set(links)];

    // Extract curl commands from the full context
    // Match curl commands that span multiple lines (with \ continuation or in code blocks)
    const curlRegex = /```(?:bash|sh|shell)?\s*(curl\s+[\s\S]*?)```|(?:^|\n)(curl\s+(?:[^\n\\]|\\[\s\S])*?)(?=\n|$)/gim;
    const curlMatches = fullContext.matchAll(curlRegex);
    const curlCommands: string[] = [];

    for (const match of curlMatches) {
      // match[1] is from code block, match[2] is from inline
      const curlCmd = (match[1] || match[2] || '').trim();
      if (curlCmd && curlCmd.startsWith('curl')) {
        curlCommands.push(curlCmd);
      }
    }
    const uniqueCurlCommands = [...new Set(curlCommands)];

    // Extract code blocks (excluding curl commands already extracted)
    const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
    const codeMatches = fullContext.matchAll(codeBlockRegex);
    const codeSnippets: Array<{ language: string; code: string }> = [];

    for (const match of codeMatches) {
      const language = match[1] || 'text';
      const code = match[2].trim();

      // Skip if this is a curl command we already extracted
      if (code.startsWith('curl') && uniqueCurlCommands.some(cmd => cmd.includes(code.substring(0, 50)))) {
        continue;
      }

      // Only include meaningful code snippets (not empty or too short)
      if (code.length > 10) {
        codeSnippets.push({ language, code });
      }
    }

    // Format issue body with structured format
    let formattedBody = `## Request
${body}

## Context
Created from Discord #omega channel`;

    // Add Discord conversation context section if provided
    if (conversationContext) {
      formattedBody += `\n\n## Discord Conversation Context (Past 20 Messages)
\`\`\`
${conversationContext}
\`\`\`
_Unfiltered conversation history for full context._`;
    }

    // Add links section if any links were found
    if (uniqueLinks.length > 0) {
      formattedBody += `\n\n## Links\n${uniqueLinks.map(link => `- ${link}`).join('\n')}`;
    }

    // Add curl commands section if any were found
    if (uniqueCurlCommands.length > 0) {
      formattedBody += `\n\n## Example curl commands\n`;
      uniqueCurlCommands.forEach((cmd, idx) => {
        formattedBody += `\n### Example ${idx + 1}\n\`\`\`bash\n${cmd}\n\`\`\`\n`;
      });
    }

    // Add code snippets section if any were found
    if (codeSnippets.length > 0) {
      formattedBody += `\n\n## Code Examples\n`;
      codeSnippets.forEach((snippet, idx) => {
        formattedBody += `\n### Example ${idx + 1} (${snippet.language})\n\`\`\`${snippet.language}\n${snippet.code}\n\`\`\`\n`;
      });
    }

    formattedBody += `\n\n## Acceptance Criteria
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
            body: `@claude please implement this request following the project's coding standards.`,
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
