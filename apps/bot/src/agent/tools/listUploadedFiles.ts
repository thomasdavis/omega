/**
 * List Uploaded Files Tool - Search and browse files in GitHub storage
 * Allows users to find and retrieve files from the file library
 */

import { tool } from 'ai';
import { z } from 'zod';

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const GITHUB_STORAGE_PATH = 'file-library';

interface FileIndexEntry {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  extension: string;
  mimeType?: string;
  uploadedAt: string;
  uploadedBy?: string;
  githubUrl: string;
  rawUrl: string;
  description?: string;
  tags?: string[];
}

/**
 * Get file index from GitHub
 */
async function getFileIndex(): Promise<FileIndexEntry[]> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured');
  }

  const indexPath = `${GITHUB_STORAGE_PATH}/index.json`;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${indexPath}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to get file index: ${response.status}`);
    }

    const data: any = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error getting file index:', error);
    throw error;
  }
}

/**
 * Filter files based on search criteria
 */
function filterFiles(
  files: FileIndexEntry[],
  searchQuery?: string,
  tags?: string[],
  extension?: string,
  uploadedBy?: string
): FileIndexEntry[] {
  let filtered = files;

  // Filter by search query (searches in filename, original name, and description)
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(file =>
      file.filename.toLowerCase().includes(query) ||
      file.originalName.toLowerCase().includes(query) ||
      file.description?.toLowerCase().includes(query)
    );
  }

  // Filter by tags
  if (tags && tags.length > 0) {
    filtered = filtered.filter(file =>
      file.tags && tags.some(tag =>
        file.tags!.some(fileTag => fileTag.toLowerCase() === tag.toLowerCase())
      )
    );
  }

  // Filter by extension
  if (extension) {
    const ext = extension.startsWith('.') ? extension : `.${extension}`;
    filtered = filtered.filter(file =>
      file.extension.toLowerCase() === ext.toLowerCase()
    );
  }

  // Filter by uploader
  if (uploadedBy) {
    filtered = filtered.filter(file =>
      file.uploadedBy?.toLowerCase() === uploadedBy.toLowerCase()
    );
  }

  return filtered;
}

export const listUploadedFilesTool = tool({
  description: `List and search files uploaded to GitHub storage.
  Search through all files in the file library using various filters.

  You can filter by:
  - Search query (matches filename, original name, or description)
  - Tags (find files with specific tags)
  - File extension (e.g., .png, .mp3, .pdf)
  - Uploader username

  Returns file metadata including GitHub URLs for easy access.
  If no filters are provided, returns all files (most recent first).`,
  inputSchema: z.object({
    searchQuery: z.string().optional().describe('Search query to match against filename, original name, or description'),
    tags: z.array(z.string()).optional().describe('Filter by tags (returns files that have any of these tags)'),
    extension: z.string().optional().describe('Filter by file extension (e.g., "png", ".mp3", "pdf")'),
    uploadedBy: z.string().optional().describe('Filter by uploader username'),
    limit: z.number().optional().describe('Maximum number of results to return (default: 20)'),
  }),
  execute: async ({ searchQuery, tags, extension, uploadedBy, limit = 20 }) => {
    try {
      if (!GITHUB_TOKEN) {
        return {
          success: false,
          error: 'GitHub token not configured. File listing requires GitHub integration.',
        };
      }

      // Get file index
      const allFiles = await getFileIndex();

      if (allFiles.length === 0) {
        return {
          success: true,
          files: [],
          totalFiles: 0,
          message: 'No files found in the file library. Upload some files to get started!',
        };
      }

      // Apply filters
      const filteredFiles = filterFiles(allFiles, searchQuery, tags, extension, uploadedBy);

      // Limit results
      const limitedFiles = filteredFiles.slice(0, limit);

      // Format results
      const formattedFiles = limitedFiles.map(file => ({
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        sizeFormatted: `${(file.size / 1024).toFixed(2)} KB`,
        extension: file.extension,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        uploadedBy: file.uploadedBy,
        githubUrl: file.githubUrl,
        rawUrl: file.rawUrl,
        description: file.description,
        tags: file.tags,
      }));

      const filterSummary = [];
      if (searchQuery) filterSummary.push(`query: "${searchQuery}"`);
      if (tags && tags.length > 0) filterSummary.push(`tags: [${tags.join(', ')}]`);
      if (extension) filterSummary.push(`extension: ${extension}`);
      if (uploadedBy) filterSummary.push(`uploader: ${uploadedBy}`);

      return {
        success: true,
        files: formattedFiles,
        totalFiles: filteredFiles.length,
        showing: limitedFiles.length,
        hasMore: filteredFiles.length > limit,
        filters: filterSummary.length > 0 ? filterSummary.join(', ') : 'none',
        message: filteredFiles.length > 0
          ? `Found ${filteredFiles.length} file(s)${filterSummary.length > 0 ? ` matching: ${filterSummary.join(', ')}` : ''}`
          : `No files found${filterSummary.length > 0 ? ` matching: ${filterSummary.join(', ')}` : ''}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list uploaded files',
      };
    }
  },
});
