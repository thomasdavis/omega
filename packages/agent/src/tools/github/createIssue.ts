/**
 * GitHub Create Issue Tool
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@repo/database';

export const githubCreateIssueTool = tool({
  description: 'Create a new issue in the GitHub repository for feature requests, bugs, or improvements. IMPORTANT: When creating issues about API integrations or external services, include any relevant URLs, documentation links, API references, curl commands, or code examples from the conversation context to provide complete information for developers.',
  inputSchema: z.object({
    title: z.string().describe('The title of the issue'),
    body: z.string().describe('The detailed description of the issue, with context and requirements'),
    labels: z.array(z.string()).optional().describe('Labels to apply (e.g., ["enhancement", "bug", "documentation"])'),
    conversationContext: z.string().optional().describe('Optional: The past 20 Discord messages (unfiltered) to provide full conversation context for the issue'),
    requesterUserId: z.string().optional().describe('Discord user ID of the person requesting the feature (for notification purposes)'),
    requesterUsername: z.string().optional().describe('Discord username of the person requesting the feature'),
  }),
  execute: async ({ title, body, labels, conversationContext, requesterUserId, requesterUsername }) => {
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

      // Track feature request in database if requester info is provided
      if (requesterUserId && requesterUsername) {
        try {
          await prisma.featureRequest.create({
            data: {
              githubIssueNumber: issue.number,
              requesterUserId,
              requesterUsername,
              title,
              description: body,
              status: 'open',
              requestedAt: BigInt(Math.floor(Date.now() / 1000)),
              metadata: {
                labels: labels || [],
                issueUrl: issue.html_url,
              },
            },
          });
          console.log(`✅ Tracked feature request for issue #${issue.number} by ${requesterUsername}`);
        } catch (dbError) {
          console.warn(`Failed to track feature request in database:`, dbError);
          // Don't fail the whole operation if DB tracking fails
        }
      }

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
            body: `@claude please implement this request. Take your time and follow these guidelines:

**Research & Understanding:**
- Thoroughly explore the codebase to understand existing patterns and architecture
- Read relevant files completely before making changes
- Identify similar implementations and follow their patterns
- Use the Explore agent if you need to understand how something works

**Implementation:**
- Follow the project's coding standards and conventions (check CLAUDE.md for guidance)
- Ensure type safety - all code must pass TypeScript checks
- Write clean, maintainable code with clear variable names
- Add comments only where logic isn't self-evident
- Keep changes focused on the requirements - avoid over-engineering
- Don't add unnecessary features, abstractions, or "improvements" beyond what was asked

**Testing & Validation:**
- Run \`pnpm type-check\` to ensure no TypeScript errors
- Run \`pnpm build\` to verify everything compiles
- Test the implementation locally if possible
- Ensure no breaking changes to existing functionality

**Before Submitting:**
- Review all changes carefully
- Make sure the PR description clearly explains what was implemented and why
- Verify that your implementation matches the acceptance criteria
- Ensure all CI checks will pass

**Quality Standards:**
- Prioritize correctness over speed
- If requirements are unclear, ask questions before implementing
- Follow existing file structure and naming conventions
- Ensure proper error handling at system boundaries (user input, external APIs)
- Trust internal code and framework guarantees

Take as long as you need to do this properly. Quality over speed.`,
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
