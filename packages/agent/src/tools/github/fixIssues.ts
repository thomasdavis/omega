/**
 * GitHub Fix Issues Tool
 * Requests Claude to fix specific GitHub issues by commenting with detailed instructions
 */

import { tool } from 'ai';
import { z } from 'zod';

export const githubFixIssuesTool = tool({
  description: 'Request Claude to fix specific GitHub issues by commenting with @claude. Analyzes each issue and provides detailed guidance on whether to close it (if too old/irrelevant) or fix it (with instructions to maintain existing functionality). This enables self-evolving bot behavior where Claude makes the final decision.',
  inputSchema: z.object({
    issueNumbers: z.array(z.number()).describe('Array of issue numbers to request fixes for'),
  }),
  execute: async ({ issueNumbers }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

    if (!GITHUB_TOKEN) {
      return {
        success: false,
        error: 'GitHub token not configured',
      };
    }

    const results: Array<{
      issueNumber: number;
      success: boolean;
      action: 'commented' | 'skipped';
      reason?: string;
      url?: string;
    }> = [];

    for (const issueNumber of issueNumbers) {
      try {
        // Fetch issue details
        const issueResponse = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}`,
          {
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        );

        if (!issueResponse.ok) {
          results.push({
            issueNumber,
            success: false,
            action: 'skipped',
            reason: `Failed to fetch issue: ${issueResponse.status}`,
          });
          continue;
        }

        const issue: any = await issueResponse.json();

        // Skip if not open
        if (issue.state !== 'open') {
          results.push({
            issueNumber,
            success: false,
            action: 'skipped',
            reason: `Issue is ${issue.state}, not open`,
          });
          continue;
        }

        // Skip if it's a pull request
        if (issue.pull_request) {
          results.push({
            issueNumber,
            success: false,
            action: 'skipped',
            reason: 'This is a pull request, not an issue',
          });
          continue;
        }

        // Calculate issue age
        const createdAt = new Date(issue.created_at);
        const now = new Date();
        const ageInDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const ageInHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));

        // Build comprehensive comment for Claude
        const comment = buildClaudeComment(issue, ageInDays, ageInHours);

        // Post the comment
        const commentResponse = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`,
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

        if (!commentResponse.ok) {
          results.push({
            issueNumber,
            success: false,
            action: 'skipped',
            reason: `Failed to post comment: ${commentResponse.status}`,
          });
          continue;
        }

        results.push({
          issueNumber,
          success: true,
          action: 'commented',
          url: issue.html_url,
        });
      } catch (error) {
        results.push({
          issueNumber,
          success: false,
          action: 'skipped',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return {
      success: true,
      results,
      summary: {
        total: issueNumbers.length,
        commented: successCount,
        skipped: failedCount,
      },
      message: `Requested fixes for ${successCount} issue(s), skipped ${failedCount}`,
    };
  },
});

/**
 * Build a comprehensive comment for Claude with decision-making guidance
 */
function buildClaudeComment(issue: any, ageInDays: number, ageInHours: number): string {
  const title = issue.title;
  const labels = issue.labels.map((l: any) => l.name).join(', ');
  const hasLabels = labels.length > 0;

  let comment = `@claude please evaluate and handle this issue.\n\n`;

  // Context section
  comment += `## Issue Context\n`;
  comment += `- **Age**: ${ageInDays > 0 ? `${ageInDays} days` : `${ageInHours} hours`} old\n`;
  if (hasLabels) {
    comment += `- **Labels**: ${labels}\n`;
  }
  comment += `- **Title**: ${title}\n\n`;

  // Decision framework
  comment += `## Decision Framework\n\n`;
  comment += `You have **full autonomy** to decide the best course of action. This is a self-evolving bot project.\n\n`;

  // Reasons to close
  comment += `### Consider Closing If:\n\n`;

  if (ageInDays >= 3) {
    comment += `- ⚠️ **Issue is ${ageInDays} days old** - Likely superseded by recent changes or no longer relevant\n`;
    comment += `- Humans are actively monitoring - if this was critical, it would have been addressed\n`;
  }

  comment += `- The request would require **breaking changes** to existing functionality\n`;
  comment += `- The issue is **vague or unclear** without enough context to implement safely\n`;
  comment += `- The feature/fix would introduce **significant technical debt**\n`;
  comment += `- The issue is a **duplicate** of another issue or already resolved\n`;
  comment += `- The requested change **conflicts with the project's architecture** or design principles\n`;
  comment += `- The issue is **low priority** and would distract from more important work\n`;
  comment += `- Implementation would require **external dependencies** that aren't justified\n`;
  comment += `- The issue is **no longer reproducible** or relevant in the current codebase\n\n`;

  if (ageInDays >= 3) {
    comment += `**Recommendation for older issues**: Given this issue is ${ageInDays} days old, strongly consider closing it with a brief explanation unless it's clearly still valuable.\n\n`;
  }

  // Reasons to fix
  comment += `### Consider Fixing If:\n\n`;
  comment += `- The issue is **well-defined** with clear acceptance criteria\n`;
  comment += `- The fix can be implemented **without breaking existing functionality**\n`;
  comment += `- The change **aligns with the codebase patterns** and architecture\n`;
  comment += `- The issue addresses a **legitimate bug or improvement**\n`;
  comment += `- You can implement it using **existing dependencies and patterns**\n`;
  comment += `- The fix is **low-risk** and can be thoroughly tested\n`;
  comment += `- The issue **improves user experience** or developer experience meaningfully\n\n`;

  // Implementation guidance
  comment += `## Implementation Guidance (If Fixing)\n\n`;
  comment += `### Critical Requirements:\n\n`;
  comment += `1. **Preserve Existing Functionality**\n`;
  comment += `   - Do NOT modify existing working features\n`;
  comment += `   - Add new code rather than changing existing code when possible\n`;
  comment += `   - Ensure all existing tests still pass\n\n`;

  comment += `2. **Follow Existing Patterns**\n`;
  comment += `   - Study similar implementations in the codebase\n`;
  comment += `   - Use the same code style, naming conventions, and structure\n`;
  comment += `   - Import from existing utilities rather than creating new ones\n\n`;

  comment += `3. **Minimal Changes**\n`;
  comment += `   - Make the smallest change that solves the problem\n`;
  comment += `   - Avoid refactoring unrelated code\n`;
  comment += `   - Keep the scope focused on this specific issue\n\n`;

  comment += `4. **Type Safety**\n`;
  comment += `   - Ensure all TypeScript types are correct\n`;
  comment += `   - Run \`pnpm type-check\` before committing\n`;
  comment += `   - Fix any type errors immediately\n\n`;

  comment += `5. **Testing Strategy**\n`;
  comment += `   - Test manually in a development environment if possible\n`;
  comment += `   - Consider edge cases and error scenarios\n`;
  comment += `   - Ensure the build passes: \`pnpm build\`\n\n`;

  // Auto-merge reminder
  comment += `## Auto-Merge Process\n\n`;
  comment += `⚠️ **Important**: If you implement a fix and the build passes, this will be **automatically merged**.\n\n`;
  comment += `Therefore:\n`;
  comment += `- Only proceed if you are **confident** in the implementation\n`;
  comment += `- When in doubt, **close the issue** with an explanation\n`;
  comment += `- Humans are watching - they'll reopen if needed\n\n`;

  // Call to action
  comment += `## Your Decision\n\n`;
  comment += `Please choose one of the following actions:\n\n`;
  comment += `1. **Close this issue** with a comment explaining why (too old, out of scope, breaking, etc.)\n`;
  comment += `2. **Implement the fix** following all guidelines above and ensure the build passes\n\n`;
  comment += `You have full authority to make this decision based on your assessment of value vs. risk.\n`;

  return comment;
}
