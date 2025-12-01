/**
 * List Repository Files Tool - Browse files in the GitHub repository
 * Allows users to explore the codebase structure and find specific files
 */

import { tool } from 'ai';
import { z } from 'zod';
import { minimatch } from 'minimatch';

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

interface TreeNode {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

interface FileEntry {
  path: string;
  type: 'file' | 'directory';
  size: number;
  sizeFormatted: string;
  sha: string;
  url: string;
}

/**
 * Get repository tree from GitHub
 */
async function getRepositoryTree(recursive: boolean = true): Promise<TreeNode[]> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured');
  }

  try {
    // Get the default branch first
    const repoResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!repoResponse.ok) {
      throw new Error(`Failed to get repository info: ${repoResponse.status}`);
    }

    const repoData: any = await repoResponse.json();
    const defaultBranch = repoData.default_branch;

    // Get the tree for the default branch
    const treeUrl = recursive
      ? `https://api.github.com/repos/${GITHUB_REPO}/git/trees/${defaultBranch}?recursive=1`
      : `https://api.github.com/repos/${GITHUB_REPO}/git/trees/${defaultBranch}`;

    const response = await fetch(treeUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get repository tree: ${response.status}`);
    }

    const data: any = await response.json();
    return data.tree || [];
  } catch (error) {
    console.error('Error getting repository tree:', error);
    throw error;
  }
}

/**
 * Filter files based on search criteria
 */
function filterFiles(
  nodes: TreeNode[],
  pattern?: string,
  path?: string,
  fileType?: 'file' | 'directory'
): TreeNode[] {
  let filtered = nodes;

  // Filter by type
  if (fileType) {
    filtered = filtered.filter(node =>
      fileType === 'file' ? node.type === 'blob' : node.type === 'tree'
    );
  }

  // Filter by path prefix
  if (path) {
    const pathPrefix = path.endsWith('/') ? path : `${path}/`;
    filtered = filtered.filter(node =>
      node.path.startsWith(pathPrefix) || node.path === path.replace(/\/$/, '')
    );
  }

  // Filter by pattern (glob-like matching)
  if (pattern) {
    filtered = filtered.filter(node =>
      minimatch(node.path, pattern, { matchBase: true, dot: true })
    );
  }

  return filtered;
}

/**
 * Format file size to human-readable string
 */
function formatSize(bytes?: number): string {
  if (bytes === undefined || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export const listRepositoryFilesTool = tool({
  description: `List and browse files in the GitHub repository (thomasdavis/omega).
  Explore the codebase structure, find specific files, and get file metadata.

  **IMPORTANT - Tool Listing Default:**
  When users ask "what tools do you have?" or want to see available tools, ALWAYS use:
  path="apps/bot/src/agent/tools"
  This is the correct directory where all tool implementations are located.

  You can filter by:
  - Pattern: Glob-like patterns (e.g., "*.ts", "src/**/*.ts", "*.test.js")
  - Path: Directory path to list (e.g., "apps/bot/src/agent/tools", "apps/bot")
  - Type: Filter to show only files or only directories

  Returns file metadata including path, size, and GitHub URLs.
  Use this tool to help users understand the codebase structure or locate specific files.

  Examples:
  - List available tools: path="apps/bot/src/agent/tools", pattern="*.ts"
  - List all TypeScript files: pattern="*.ts"
  - List files in a directory: path="src/lib"
  - Find test files: pattern="*.test.ts"
  - List all markdown files: pattern="**/*.md"`,
  inputSchema: z.object({
    pattern: z.string().optional().describe('Glob pattern to match files (e.g., "*.ts", "src/**/*.js", "*.test.ts")'),
    path: z.string().optional().describe('Directory path to list. For tool listings, use "apps/bot/src/agent/tools"'),
    fileType: z.enum(['file', 'directory']).optional().describe('Filter to show only files or directories'),
    limit: z.number().optional().describe('Maximum number of results to return (default: 50)'),
  }),
  execute: async ({ pattern, path, fileType, limit = 50 }) => {
    try {
      if (!GITHUB_TOKEN) {
        return {
          success: false,
          error: 'GitHub token not configured. Repository file listing requires GitHub integration.',
        };
      }

      // Get repository tree (recursive to get all files)
      const allNodes = await getRepositoryTree(true);

      if (allNodes.length === 0) {
        return {
          success: true,
          files: [],
          totalFiles: 0,
          message: 'Repository tree is empty.',
        };
      }

      // Apply filters
      const filteredNodes = filterFiles(allNodes, pattern, path, fileType);

      // Limit results
      const limitedNodes = filteredNodes.slice(0, limit);

      // Format results
      const formattedFiles: FileEntry[] = limitedNodes.map(node => ({
        path: node.path,
        type: node.type === 'blob' ? 'file' : 'directory',
        size: node.size || 0,
        sizeFormatted: formatSize(node.size),
        sha: node.sha,
        url: `https://github.com/${GITHUB_REPO}/blob/${node.sha}/${node.path}`,
      }));

      // Build filter summary
      const filterSummary = [];
      if (pattern) filterSummary.push(`pattern: "${pattern}"`);
      if (path) filterSummary.push(`path: "${path}"`);
      if (fileType) filterSummary.push(`type: ${fileType}`);

      return {
        success: true,
        files: formattedFiles,
        repository: GITHUB_REPO,
        totalFiles: filteredNodes.length,
        showing: limitedNodes.length,
        hasMore: filteredNodes.length > limit,
        filters: filterSummary.length > 0 ? filterSummary.join(', ') : 'none',
        message: filteredNodes.length > 0
          ? `Found ${filteredNodes.length} file(s) in ${GITHUB_REPO}${filterSummary.length > 0 ? ` matching: ${filterSummary.join(', ')}` : ''}`
          : `No files found in ${GITHUB_REPO}${filterSummary.length > 0 ? ` matching: ${filterSummary.join(', ')}` : ''}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list repository files',
      };
    }
  },
});
