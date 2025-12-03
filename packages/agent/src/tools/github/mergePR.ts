/**
 * GitHub Merge PR Tool
 */

import { tool } from 'ai';
import { z } from 'zod';

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
