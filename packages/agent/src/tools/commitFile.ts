/**
 * GitHub Commit File Tool - Commit files to the repository
 * Allows programmatic commits of new or updated files to the GitHub repository
 */

import { tool } from 'ai';
import { z } from 'zod';

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

/**
 * Get the SHA of the latest commit on a branch
 */
async function getLatestCommitSha(branch: string): Promise<string> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured');
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/${branch}`,
    {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get branch ref: ${response.status}`);
  }

  const data: any = await response.json();
  return data.object.sha;
}

/**
 * Get the tree SHA from a commit
 */
async function getTreeSha(commitSha: string): Promise<string> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured');
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/git/commits/${commitSha}`,
    {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get commit: ${response.status}`);
  }

  const data: any = await response.json();
  return data.tree.sha;
}

/**
 * Create a blob for file content
 */
async function createBlob(content: string): Promise<string> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured');
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/git/blobs`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        content,
        encoding: 'utf-8',
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create blob: ${response.status} - ${error}`);
  }

  const data: any = await response.json();
  return data.sha;
}

/**
 * Create a tree with the updated file
 */
async function createTree(baseTreeSha: string, filePath: string, blobSha: string): Promise<string> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured');
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/git/trees`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [
          {
            path: filePath,
            mode: '100644', // regular file
            type: 'blob',
            sha: blobSha,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create tree: ${response.status} - ${error}`);
  }

  const data: any = await response.json();
  return data.sha;
}

/**
 * Create a commit
 */
async function createCommit(
  message: string,
  treeSha: string,
  parentSha: string
): Promise<string> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured');
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/git/commits`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message,
        tree: treeSha,
        parents: [parentSha],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create commit: ${response.status} - ${error}`);
  }

  const data: any = await response.json();
  return data.sha;
}

/**
 * Update branch reference to point to new commit
 */
async function updateRef(branch: string, commitSha: string): Promise<void> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured');
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/${branch}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        sha: commitSha,
        force: false, // Don't force push
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update ref: ${response.status} - ${error}`);
  }
}

export const commitFileTool = tool({
  description: `Commit a file to the GitHub repository (${GITHUB_REPO}).

  This tool allows you to create or update files in the repository by:
  1. Creating a new commit with the file changes
  2. Pushing the commit to a specified branch

  Use this tool when you need to:
  - Add new files to the repository
  - Update existing files with new content
  - Make programmatic changes to the codebase

  IMPORTANT:
  - Always specify a clear, descriptive commit message
  - Use appropriate branch names (don't commit directly to main unless necessary)
  - Ensure file paths are relative to repository root
  - Content should be the complete file content (not a diff)

  Examples:
  - Create a new config file: path="config/settings.json", content="{...}", message="Add settings config"
  - Update documentation: path="README.md", content="# Updated docs...", message="Update README with new examples"
  - Add a new tool: path="src/tools/newTool.ts", content="export const...", message="Add new tool for X"`,
  inputSchema: z.object({
    filePath: z.string().describe('Path to the file relative to repository root (e.g., "src/utils/helper.ts")'),
    content: z.string().describe('Complete content of the file to commit'),
    message: z.string().describe('Commit message describing the changes'),
    branch: z.string().default('main').describe('Branch name to commit to (default: "main")'),
  }),
  execute: async ({ filePath, content, message, branch }) => {
    try {
      if (!GITHUB_TOKEN) {
        return {
          success: false,
          error: 'GitHub token not configured. File commits require GitHub integration.',
        };
      }

      console.log(`📝 Committing file: ${filePath} to branch: ${branch}`);

      // Get the latest commit SHA for the branch
      const latestCommitSha = await getLatestCommitSha(branch);
      console.log(`   ✓ Got latest commit SHA: ${latestCommitSha.substring(0, 7)}`);

      // Get the tree SHA from the commit
      const baseTreeSha = await getTreeSha(latestCommitSha);
      console.log(`   ✓ Got base tree SHA: ${baseTreeSha.substring(0, 7)}`);

      // Create a blob for the file content
      const blobSha = await createBlob(content);
      console.log(`   ✓ Created blob: ${blobSha.substring(0, 7)}`);

      // Create a new tree with the file
      const newTreeSha = await createTree(baseTreeSha, filePath, blobSha);
      console.log(`   ✓ Created tree: ${newTreeSha.substring(0, 7)}`);

      // Create a commit
      const newCommitSha = await createCommit(message, newTreeSha, latestCommitSha);
      console.log(`   ✓ Created commit: ${newCommitSha.substring(0, 7)}`);

      // Update the branch reference
      await updateRef(branch, newCommitSha);
      console.log(`   ✓ Updated branch ${branch}`);

      const commitUrl = `https://github.com/${GITHUB_REPO}/commit/${newCommitSha}`;
      const fileUrl = `https://github.com/${GITHUB_REPO}/blob/${branch}/${filePath}`;

      return {
        success: true,
        commitSha: newCommitSha,
        commitUrl,
        fileUrl,
        branch,
        filePath,
        message: `Successfully committed ${filePath} to ${branch}`,
      };
    } catch (error) {
      console.error('Error committing file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to commit file',
      };
    }
  },
});
