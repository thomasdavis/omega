/**
 * List Artifacts Tool - List all stored artifacts and uploads
 * Allows the bot to see what files are currently stored in persistent storage
 */

import { tool } from 'ai';
import { z } from 'zod';
import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { getArtifactsDir, getUploadsDir } from '@repo/shared';

// Use centralized storage utility for consistent paths
const ARTIFACTS_DIR = getArtifactsDir();
const UPLOADS_DIR = getUploadsDir();

interface FileInfo {
  name: string;
  size: number;
  sizeFormatted: string;
  created: string;
  modified: string;
  extension: string;
  path: string;
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file extension
 */
function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'none';
}

/**
 * List files in a directory
 */
function listFiles(directory: string, type: 'artifacts' | 'uploads'): FileInfo[] {
  try {
    if (!existsSync(directory)) {
      console.log(`📁 Directory does not exist: ${directory}`);
      return [];
    }

    const files = readdirSync(directory);
    console.log(`📁 Found ${files.length} files in ${directory}`);

    return files
      .filter(file => !file.startsWith('.')) // Skip hidden files
      .map(file => {
        const fullPath = join(directory, file);
        const stats = statSync(fullPath);

        return {
          name: file,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          extension: getExtension(file),
          path: type === 'artifacts'
            ? `/artifacts/${file.replace(/\.(html|svg|md)$/, '')}`
            : `/uploads/${file}`,
        };
      })
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  } catch (error) {
    console.error(`❌ Error listing files in ${directory}:`, error);
    return [];
  }
}

export const listArtifactsTool = tool({
  description: `List all artifacts and uploaded files stored in the bot's persistent storage.

  This tool allows you to see what files are currently stored, including:
  - Artifacts created with the artifact tool (HTML, SVG, Markdown)
  - Files uploaded by users via the fileUpload tool

  You can filter by type (artifacts, uploads, or both) and sort the results.

  Use cases:
  - "Show me all my artifacts"
  - "List uploaded files"
  - "What files do I have stored?"
  - "Show me the 5 most recent artifacts"`,

  inputSchema: z.object({
    type: z.enum(['artifacts', 'uploads', 'all']).default('all')
      .describe('Type of files to list: artifacts (HTML/SVG/MD), uploads (user files), or all'),

    sortBy: z.enum(['modified', 'created', 'size', 'name']).default('modified')
      .describe('Sort files by: modified (most recent first), created, size (largest first), or name (alphabetical)'),

    limit: z.number().int().min(1).max(100).optional()
      .describe('Maximum number of files to return (default: all files)'),

    extension: z.string().optional()
      .describe('Filter by file extension (e.g., "html", "png", "pdf")'),
  }),

  execute: async ({ type, sortBy, limit, extension }) => {
    console.log(`📋 Listing files: type=${type}, sortBy=${sortBy}, limit=${limit || 'all'}, extension=${extension || 'all'}`);

    try {
      let allFiles: (FileInfo & { type: 'artifact' | 'upload' })[] = [];

      // List artifacts
      if (type === 'artifacts' || type === 'all') {
        const artifactFiles = listFiles(ARTIFACTS_DIR, 'artifacts');
        allFiles.push(...artifactFiles.map(f => ({ ...f, type: 'artifact' as const })));
      }

      // List uploads
      if (type === 'uploads' || type === 'all') {
        const uploadFiles = listFiles(UPLOADS_DIR, 'uploads');
        allFiles.push(...uploadFiles.map(f => ({ ...f, type: 'upload' as const })));
      }

      // Filter by extension if specified
      if (extension) {
        allFiles = allFiles.filter(f => f.extension === extension.toLowerCase());
      }

      // Sort files
      if (sortBy === 'modified') {
        allFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
      } else if (sortBy === 'created') {
        allFiles.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
      } else if (sortBy === 'size') {
        allFiles.sort((a, b) => b.size - a.size);
      } else if (sortBy === 'name') {
        allFiles.sort((a, b) => a.name.localeCompare(b.name));
      }

      // Apply limit
      if (limit) {
        allFiles = allFiles.slice(0, limit);
      }

      // Calculate totals
      const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);
      const artifactCount = allFiles.filter(f => f.type === 'artifact').length;
      const uploadCount = allFiles.filter(f => f.type === 'upload').length;

      console.log(`✅ Returning ${allFiles.length} files (${artifactCount} artifacts, ${uploadCount} uploads)`);

      return {
        success: true,
        files: allFiles,
        summary: {
          totalFiles: allFiles.length,
          artifactCount,
          uploadCount,
          totalSize,
          totalSizeFormatted: formatBytes(totalSize),
          directories: {
            artifacts: ARTIFACTS_DIR,
            uploads: UPLOADS_DIR,
          },
        },
      };
    } catch (error) {
      console.error('❌ Error listing files:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list files',
        files: [],
      };
    }
  },
});
