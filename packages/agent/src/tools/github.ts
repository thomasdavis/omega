/**
 * GitHub tools for creating and updating issues
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Helper function to find and close PRs associated with an issue
 */
async function closeAssociatedPRs(
  issueNumber: number,
  GITHUB_TOKEN: string,
  GITHUB_REPO: string
): Promise<{ closedPRs: number[]; deletedBranches: string[] }> {
  const closedPRs: number[] = [];
  const deletedBranches: string[] = [];

  try {
    // Search for PRs that reference this issue in the body
    // GitHub search API: https://docs.github.com/en/rest/search/search
    const searchQuery = `repo:${GITHUB_REPO} is:pr is:open ${issueNumber} in:body`;
    const searchResponse = await fetch(
      `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!searchResponse.ok) {
      console.warn(`Failed to search for PRs: ${searchResponse.status}`);
      return { closedPRs, deletedBranches };
    }

    const searchData: any = await searchResponse.json();
    const prs = searchData.items || [];

    // Also check for PRs from branches matching claude/issue-{issueNumber}-*
    const branchPattern = `claude/issue-${issueNumber}-`;
    const branchSearchResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/pulls?state=open&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (branchSearchResponse.ok) {
      const allPRs: any = await branchSearchResponse.json();
      const branchPRs = allPRs.filter((pr: any) =>
        pr.head.ref.startsWith(branchPattern)
      );

      // Merge with search results, avoiding duplicates
      for (const pr of branchPRs) {
        if (!prs.find((p: any) => p.number === pr.number)) {
          prs.push(pr);
        }
      }
    }

    // Close each PR and delete its branch
    for (const pr of prs) {
      try {
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
          console.log(`✅ Closed PR #${pr.number}`);

          // Delete the branch if it exists
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
            console.log(`✅ Deleted branch ${branchName}`);
          } else {
            console.warn(`Failed to delete branch ${branchName}: ${deleteResponse.status}`);
          }
        } else {
          console.warn(`Failed to close PR #${pr.number}: ${closeResponse.status}`);
        }
      } catch (prError) {
        console.error(`Error processing PR #${pr.number}:`, prError);
      }
    }
  } catch (error) {
    console.error('Error closing associated PRs:', error);
  }

  return { closedPRs, deletedBranches };
}

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

export const githubMergePRTool = tool({
  description: 'Merge a GitHub pull request by PR number. Use this when the user wants to merge a PR to deploy changes, complete a feature, or integrate approved code. Checks if the PR is mergeable before attempting to merge.',
  inputSchema: z.object({
    prNumber: z.number().describe('The pull request number to merge'),
    mergeMethod: z.enum(['merge', 'squash', 'rebase']).optional().describe('The merge method to use (default: merge). "merge" creates a merge commit, "squash" squashes all commits into one, "rebase" rebases and merges.'),
    commitTitle: z.string().optional().describe('Optional custom title for the merge commit'),
    commitMessage: z.string().optional().describe('Optional custom message for the merge commit'),
  }),
  execute: async ({ prNumber, mergeMethod = 'merge', commitTitle, commitMessage }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

    if (!GITHUB_TOKEN) {
      return {
        success: false,
        error: 'GitHub token not configured',
      };
    }

    try {
      // First, get the PR details to check if it's mergeable
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

      // Check PR state
      if (pr.state !== 'open') {
        return {
          success: false,
          error: `PR #${prNumber} is ${pr.state}, not open. Only open PRs can be merged.`,
        };
      }

      // Check if PR is mergeable
      if (pr.mergeable === false) {
        return {
          success: false,
          error: `PR #${prNumber} has merge conflicts and cannot be merged automatically. Please resolve conflicts first.`,
        };
      }

      // Check if PR is already merged
      if (pr.merged) {
        return {
          success: false,
          error: `PR #${prNumber} is already merged.`,
        };
      }

      // Prepare merge payload
      const mergePayload: any = {
        merge_method: mergeMethod,
      };

      if (commitTitle) {
        mergePayload.commit_title = commitTitle;
      }

      if (commitMessage) {
        mergePayload.commit_message = commitMessage;
      }

      // Attempt to merge the PR
      const mergeResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls/${prNumber}/merge`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify(mergePayload),
      });

      if (!mergeResponse.ok) {
        const error = await mergeResponse.text();
        return {
          success: false,
          error: `GitHub API error during merge: ${mergeResponse.status} - ${error}`,
        };
      }

      const mergeResult: any = await mergeResponse.json();

      const prUrl = pr.html_url;

      return {
        success: true,
        prNumber,
        prUrl,
        merged: true,
        sha: mergeResult.sha,
        message: `Successfully merged PR #${prNumber} using ${mergeMethod} method. The changes have been deployed to the base branch.`,
        commitSha: mergeResult.sha,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error merging PR',
      };
    }
  },
});
