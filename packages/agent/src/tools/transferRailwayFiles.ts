/**
 * Transfer Railway Files Tool - Migrate uploaded files from Railway storage to GitHub
 * Allows automated transfer of files from ephemeral Railway storage to permanent GitHub storage
 */

import { tool } from 'ai';
import { z } from 'zod';
import { readdirSync, readFileSync, existsSync, statSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { getUploadsDir } from '@repo/shared';

// Railway uploads directory (fallback storage)
const RAILWAY_UPLOADS_DIR = getUploadsDir();

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const GITHUB_STORAGE_PATH = 'file-library';

interface UploadMetadata {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  extension: string;
  mimeType?: string;
  uploadedAt: string;
  uploadedBy?: string;
  storageType: 'github' | 'local';
  githubUrl?: string;
  rawUrl?: string;
  description?: string;
  tags?: string[];
}

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
    return [];
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
    return [];
  }
}

/**
 * Update file index in GitHub with new entry
 */
async function updateFileIndex(metadata: UploadMetadata): Promise<void> {
  if (!GITHUB_TOKEN || !metadata.githubUrl || !metadata.rawUrl) {
    return;
  }

  const indexPath = `${GITHUB_STORAGE_PATH}/index.json`;

  try {
    const currentIndex = await getFileIndex();

    const newEntry: FileIndexEntry = {
      id: metadata.id,
      filename: metadata.filename,
      originalName: metadata.originalName,
      size: metadata.size,
      extension: metadata.extension,
      mimeType: metadata.mimeType,
      uploadedAt: metadata.uploadedAt,
      uploadedBy: metadata.uploadedBy,
      githubUrl: metadata.githubUrl,
      rawUrl: metadata.rawUrl,
      description: metadata.description,
      tags: metadata.tags,
    };

    const existingIndex = currentIndex.findIndex(e => e.filename === metadata.filename);
    if (existingIndex >= 0) {
      currentIndex[existingIndex] = newEntry;
    } else {
      currentIndex.push(newEntry);
    }

    currentIndex.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    const indexContent = JSON.stringify(currentIndex, null, 2);
    const base64Content = Buffer.from(indexContent).toString('base64');

    let sha: string | undefined;
    const checkResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${indexPath}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (checkResponse.ok) {
      const existingFile: any = await checkResponse.json();
      sha = existingFile.sha;
    }

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${indexPath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          message: `Update file index: add ${metadata.filename}`,
          content: base64Content,
          ...(sha && { sha }),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to update index: ${response.status} - ${error}`);
    } else {
      console.log('✅ Updated file index');
    }
  } catch (error) {
    console.error('Error updating file index:', error);
  }
}

/**
 * Upload file to GitHub repository
 */
async function uploadToGitHub(
  fileBuffer: Buffer,
  filename: string,
  originalName: string,
  mimeType?: string,
  uploadedBy?: string,
  uploadedAt?: string,
  description?: string,
  tags?: string[]
): Promise<UploadMetadata> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured');
  }

  const filePath = `${GITHUB_STORAGE_PATH}/${filename}`;
  const base64Content = fileBuffer.toString('base64');

  try {
    let sha: string | undefined;
    const checkResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (checkResponse.ok) {
      const existingFile: any = await checkResponse.json();
      sha = existingFile.sha;
      console.log(`File ${filename} already exists in GitHub, will update`);
    }

    const uploadResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          message: `Transfer ${originalName} from Railway to GitHub${uploadedBy ? ` (uploaded by ${uploadedBy})` : ''}`,
          content: base64Content,
          ...(sha && { sha }),
        }),
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`GitHub API error: ${uploadResponse.status} - ${error}`);
    }

    const uploadData: any = await uploadResponse.json();
    const githubUrl = uploadData.content.html_url;
    const rawUrl = uploadData.content.download_url;

    const metadata: UploadMetadata = {
      id: randomUUID().split('-')[0],
      originalName,
      filename,
      size: fileBuffer.length,
      extension: extname(originalName),
      mimeType,
      uploadedAt: uploadedAt || new Date().toISOString(),
      uploadedBy,
      storageType: 'github',
      githubUrl,
      rawUrl,
      description,
      tags,
    };

    await updateFileIndex(metadata);

    return metadata;
  } catch (error) {
    console.error('Error uploading to GitHub:', error);
    throw error;
  }
}

/**
 * Get files from Railway storage that are not in GitHub
 */
function getRailwayOnlyFiles(): string[] {
  if (!existsSync(RAILWAY_UPLOADS_DIR)) {
    return [];
  }

  const files = readdirSync(RAILWAY_UPLOADS_DIR);

  // Filter out metadata JSON files and .gitkeep
  return files.filter(file =>
    !file.endsWith('.json') &&
    file !== '.gitkeep' &&
    !file.startsWith('.')
  );
}

/**
 * Read metadata for a Railway file if it exists
 */
function readRailwayMetadata(filename: string): Partial<UploadMetadata> | null {
  const metadataPath = join(RAILWAY_UPLOADS_DIR, `${filename}.json`);

  if (existsSync(metadataPath)) {
    try {
      const content = readFileSync(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading metadata for ${filename}:`, error);
      return null;
    }
  }

  return null;
}

/**
 * Extract metadata from filename or create basic metadata
 */
function extractOrCreateMetadata(filename: string, filepath: string): {
  originalName: string;
  mimeType?: string;
  uploadedBy?: string;
  uploadedAt: string;
  description?: string;
  tags?: string[];
} {
  const stats = statSync(filepath);
  const railwayMetadata = readRailwayMetadata(filename);

  if (railwayMetadata) {
    return {
      originalName: railwayMetadata.originalName || filename,
      mimeType: railwayMetadata.mimeType,
      uploadedBy: railwayMetadata.uploadedBy,
      uploadedAt: railwayMetadata.uploadedAt || stats.mtime.toISOString(),
      description: railwayMetadata.description,
      tags: railwayMetadata.tags,
    };
  }

  // Extract original name from filename pattern (name_uuid.ext -> name.ext)
  const parts = filename.split('_');
  const ext = extname(filename);
  const originalName = parts.length > 1
    ? parts.slice(0, -1).join('_') + ext
    : filename;

  return {
    originalName,
    uploadedAt: stats.mtime.toISOString(),
    description: `Transferred from Railway storage on ${new Date().toISOString().split('T')[0]}`,
    tags: ['railway-transfer'],
  };
}

export const transferRailwayFilesTool = tool({
  description: `Transfer uploaded files from Railway storage to GitHub repository.

  This tool migrates files that are currently stored in Railway's ephemeral storage
  to permanent GitHub storage. This is useful for:
  - Files uploaded before GitHub integration was implemented
  - Files that failed to upload to GitHub and fell back to Railway storage
  - Manual migration for backup and long-term storage

  The tool will:
  1. Scan Railway storage (/data/uploads) for files not yet in GitHub
  2. Read existing metadata JSON files if available
  3. Upload files to GitHub with metadata (description, tags, uploader, timestamp)
  4. Update the file index in GitHub (file-library/index.json)
  5. Optionally clean up Railway files after successful transfer

  Features:
  - Preserves original metadata (uploader, timestamp, description, tags)
  - Generates sensible defaults if metadata is missing
  - Supports batch transfer or single file transfer
  - Automatically cleans up Railway files after successful transfer (configurable)
  - Idempotent: Can be run multiple times safely

  Requirements:
  - GitHub token must be configured (GITHUB_TOKEN env var)
  - Railway storage must be accessible (/data/uploads in production)`,
  inputSchema: z.object({
    filename: z.string().optional().describe('Specific filename to transfer (leave empty to scan all Railway files)'),
    deleteAfterTransfer: z.boolean().optional().default(true).describe('Delete Railway file after successful transfer to GitHub (default: true)'),
    dryRun: z.boolean().optional().default(false).describe('Preview what would be transferred without actually transferring'),
  }),
  execute: async ({ filename, deleteAfterTransfer = true, dryRun = false }) => {
    try {
      if (!GITHUB_TOKEN) {
        return {
          success: false,
          error: 'GitHub token not configured. Cannot transfer files to GitHub.',
        };
      }

      if (!existsSync(RAILWAY_UPLOADS_DIR)) {
        return {
          success: false,
          error: `Railway uploads directory not found at ${RAILWAY_UPLOADS_DIR}`,
        };
      }

      // Get files to transfer
      let filesToTransfer: string[];
      if (filename) {
        // Transfer specific file
        const filepath = join(RAILWAY_UPLOADS_DIR, filename);
        if (!existsSync(filepath)) {
          return {
            success: false,
            error: `File not found: ${filename}`,
          };
        }
        filesToTransfer = [filename];
      } else {
        // Scan all Railway files
        filesToTransfer = getRailwayOnlyFiles();
      }

      if (filesToTransfer.length === 0) {
        return {
          success: true,
          message: 'No files found in Railway storage to transfer',
          transferred: 0,
        };
      }

      if (dryRun) {
        // Preview mode
        const preview = filesToTransfer.map(file => {
          const filepath = join(RAILWAY_UPLOADS_DIR, file);
          const metadata = extractOrCreateMetadata(file, filepath);
          const stats = statSync(filepath);

          return {
            filename: file,
            originalName: metadata.originalName,
            size: stats.size,
            sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
            uploadedBy: metadata.uploadedBy,
            uploadedAt: metadata.uploadedAt,
            description: metadata.description,
            tags: metadata.tags,
          };
        });

        return {
          success: true,
          dryRun: true,
          message: `Found ${filesToTransfer.length} file(s) in Railway storage ready for transfer`,
          files: preview,
          totalFiles: filesToTransfer.length,
        };
      }

      // Get current GitHub index to avoid re-transferring
      const githubIndex = await getFileIndex();
      const githubFilenames = new Set(githubIndex.map(f => f.filename));

      // Transfer files
      const results = [];
      let transferred = 0;
      let skipped = 0;
      let failed = 0;

      for (const file of filesToTransfer) {
        const filepath = join(RAILWAY_UPLOADS_DIR, file);

        // Skip if already in GitHub
        if (githubFilenames.has(file)) {
          console.log(`⏭️  Skipping ${file} (already in GitHub)`);
          skipped++;
          results.push({
            filename: file,
            status: 'skipped',
            reason: 'already in GitHub',
          });
          continue;
        }

        try {
          // Read file and metadata
          const fileBuffer = readFileSync(filepath);
          const metadata = extractOrCreateMetadata(file, filepath);

          console.log(`📤 Transferring ${file} to GitHub...`);

          // Upload to GitHub
          const uploadResult = await uploadToGitHub(
            fileBuffer,
            file,
            metadata.originalName,
            metadata.mimeType,
            metadata.uploadedBy,
            metadata.uploadedAt,
            metadata.description,
            metadata.tags
          );

          console.log(`✅ Transferred ${file} to GitHub: ${uploadResult.githubUrl}`);

          transferred++;
          results.push({
            filename: file,
            status: 'transferred',
            githubUrl: uploadResult.githubUrl,
            rawUrl: uploadResult.rawUrl,
          });

          // Delete from Railway if requested
          if (deleteAfterTransfer) {
            try {
              unlinkSync(filepath);
              const metadataPath = join(RAILWAY_UPLOADS_DIR, `${file}.json`);
              if (existsSync(metadataPath)) {
                unlinkSync(metadataPath);
              }
              console.log(`🗑️  Deleted ${file} from Railway storage`);
            } catch (deleteError) {
              console.error(`Error deleting ${file}:`, deleteError);
            }
          }
        } catch (error) {
          console.error(`❌ Failed to transfer ${file}:`, error);
          failed++;
          results.push({
            filename: file,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        success: true,
        message: `Transfer complete: ${transferred} transferred, ${skipped} skipped, ${failed} failed`,
        transferred,
        skipped,
        failed,
        totalFiles: filesToTransfer.length,
        results,
        deletedFromRailway: deleteAfterTransfer,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transfer files',
      };
    }
  },
});
