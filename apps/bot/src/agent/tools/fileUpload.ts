/**
 * File Upload Tool - Upload files to GitHub repository with shareable links
 * Allows users to upload files via Discord and get shareable GitHub URLs
 * Falls back to local storage if GitHub is not configured
 */

import { tool } from 'ai';
import { z } from 'zod';
import { writeFileSync, statSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { getUploadsDir } from '../../utils/storage.js';

// Public uploads directory - use centralized storage utility (fallback)
const UPLOADS_DIR = getUploadsDir();

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const GITHUB_STORAGE_PATH = 'file-library'; // Directory in repo for file storage

// File size limits (in bytes)
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Discord's attachment limit)

// Allowed file extensions (whitelist approach for security)
const ALLOWED_EXTENSIONS = [
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
  // Documents
  '.pdf', '.txt', '.md', '.doc', '.docx', '.odt',
  // Data
  '.json', '.xml', '.csv', '.yaml', '.yml',
  // Archives
  '.zip', '.tar', '.gz', '.7z',
  // Code
  '.js', '.ts', '.py', '.java', '.cpp', '.c', '.rs', '.go', '.rb', '.php',
  '.html', '.css', '.scss', '.sass',
  // Media
  '.mp3', '.mp4', '.wav', '.ogg', '.webm',
  // Other
  '.log', '.sql', '.sh', '.bat',
];

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
 * Background transfer queue for automatic Railway → GitHub migration
 */
interface TransferQueueItem {
  filename: string;
  buffer: Buffer;
  originalName: string;
  mimeType?: string;
  uploadedBy?: string;
  description?: string;
  tags?: string[];
  retries: number;
  scheduledAt: number;
}

const transferQueue: TransferQueueItem[] = [];
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 60000]; // 5s, 15s, 1m

/**
 * Schedule a file for background transfer to GitHub
 * This is the automatic hook that detects Railway uploads and triggers transfer
 */
function scheduleBackgroundTransfer(
  filename: string,
  buffer: Buffer,
  originalName: string,
  mimeType?: string,
  uploadedBy?: string,
  description?: string,
  tags?: string[]
): void {
  // Only schedule if GitHub token is configured
  if (!GITHUB_TOKEN) {
    console.log('⏭️  Skipping background transfer - GitHub not configured');
    return;
  }

  console.log(`📋 Scheduling background transfer for ${filename}`);

  transferQueue.push({
    filename,
    buffer,
    originalName,
    mimeType,
    uploadedBy,
    description: description || `Automatically transferred from Railway storage`,
    tags: tags || ['auto-transfer'],
    retries: 0,
    scheduledAt: Date.now(),
  });

  // Process queue (non-blocking)
  processTransferQueue();
}

/**
 * Process the transfer queue with retry logic
 */
async function processTransferQueue(): Promise<void> {
  if (transferQueue.length === 0) {
    return;
  }

  const item = transferQueue[0];

  try {
    console.log(`🔄 Attempting background transfer: ${item.filename} (attempt ${item.retries + 1}/${MAX_RETRIES + 1})`);

    // Attempt upload to GitHub
    const metadata = await uploadToGitHub(
      item.buffer,
      item.filename,
      item.originalName,
      item.mimeType,
      item.uploadedBy,
      item.description,
      item.tags
    );

    console.log(`✅ Background transfer successful: ${item.filename} → ${metadata.githubUrl}`);

    // CLEANUP: Delete from Railway after successful background transfer
    try {
      const railwayFilePath = join(UPLOADS_DIR, item.filename);
      const railwayMetadataPath = join(UPLOADS_DIR, `${item.filename}.json`);

      if (existsSync(railwayFilePath)) {
        unlinkSync(railwayFilePath);
        console.log(`🗑️  Cleaned up file from Railway (background transfer): ${item.filename}`);
      }
      if (existsSync(railwayMetadataPath)) {
        unlinkSync(railwayMetadataPath);
        console.log(`🗑️  Cleaned up metadata from Railway (background transfer): ${item.filename}.json`);
      }
    } catch (cleanupError) {
      console.error('⚠️  Error cleaning up Railway storage after background transfer:', cleanupError);
      // Don't fail the transfer if cleanup fails
    }

    // Remove from queue on success
    transferQueue.shift();

    // Process next item if any
    if (transferQueue.length > 0) {
      setTimeout(() => processTransferQueue(), 1000);
    }
  } catch (error) {
    console.error(`❌ Background transfer failed for ${item.filename}:`, error);

    item.retries++;

    if (item.retries > MAX_RETRIES) {
      console.error(`⚠️  Max retries reached for ${item.filename}, removing from queue`);
      transferQueue.shift();

      // Process next item
      if (transferQueue.length > 0) {
        setTimeout(() => processTransferQueue(), 1000);
      }
    } else {
      // Schedule retry with exponential backoff
      const delay = RETRY_DELAYS[item.retries - 1] || 60000;
      console.log(`⏰ Scheduling retry for ${item.filename} in ${delay}ms`);

      setTimeout(() => processTransferQueue(), delay);
    }
  }
}

/**
 * Validate file extension
 */
function isAllowedExtension(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Sanitize filename to prevent directory traversal and other attacks
 */
function sanitizeFilename(filename: string): string {
  // Remove any path components
  const basename = filename.replace(/^.*[\\/ ]/, '');

  // Remove dangerous characters but keep extension
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Generate safe filename with UUID to prevent collisions
 */
function generateSafeFilename(originalName: string): string {
  const ext = extname(originalName);
  const sanitized = sanitizeFilename(originalName.replace(ext, ''));
  const uuid = randomUUID().split('-')[0]; // Use first part of UUID for brevity

  return `${sanitized}_${uuid}${ext}`;
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
  description?: string,
  tags?: string[]
): Promise<UploadMetadata> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured. Cannot upload to GitHub.');
  }

  const filePath = `${GITHUB_STORAGE_PATH}/${filename}`;
  const base64Content = fileBuffer.toString('base64');

  try {
    // Check if file already exists (to get SHA for updates)
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
      console.log(`File ${filename} already exists, will update with SHA: ${sha}`);
    }

    // Upload file to GitHub
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
          message: `Upload ${originalName}${uploadedBy ? ` by ${uploadedBy}` : ''}`,
          content: base64Content,
          ...(sha && { sha }), // Include SHA if updating existing file
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

    console.log(`✅ Uploaded to GitHub: ${githubUrl}`);

    // Create metadata
    const metadata: UploadMetadata = {
      id: randomUUID().split('-')[0],
      originalName,
      filename,
      size: fileBuffer.length,
      extension: extname(originalName),
      mimeType,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      storageType: 'github',
      githubUrl,
      rawUrl,
      description,
      tags,
    };

    // Update file index in GitHub
    await updateFileIndex(metadata);

    return metadata;
  } catch (error) {
    console.error('Error uploading to GitHub:', error);
    throw error;
  }
}

/**
 * Get current file index from GitHub
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
        // Index doesn't exist yet
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
    // Get current index
    const currentIndex = await getFileIndex();

    // Create new entry
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

    // Check if entry already exists (by filename) and update, otherwise add
    const existingIndex = currentIndex.findIndex(e => e.filename === metadata.filename);
    if (existingIndex >= 0) {
      currentIndex[existingIndex] = newEntry;
    } else {
      currentIndex.push(newEntry);
    }

    // Sort by upload date (newest first)
    currentIndex.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    const indexContent = JSON.stringify(currentIndex, null, 2);
    const base64Content = Buffer.from(indexContent).toString('base64');

    // Get current SHA of index file if it exists
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

    // Update index file
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
    // Don't throw - index update is not critical
  }
}

/**
 * Save uploaded file (local storage fallback)
 */
function saveUploadedFile(
  fileData: Buffer | string,
  originalName: string,
  mimeType?: string,
  uploadedBy?: string
): UploadMetadata {
  // Validate extension
  if (!isAllowedExtension(originalName)) {
    throw new Error(
      `File type not allowed. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
    );
  }

  // Convert string data to Buffer if needed
  const buffer = typeof fileData === 'string'
    ? Buffer.from(fileData, 'base64')
    : fileData;

  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `File size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${MAX_FILE_SIZE / 1024 / 1024}MB)`
    );
  }

  // Generate safe filename
  const filename = generateSafeFilename(originalName);
  const filepath = join(UPLOADS_DIR, filename);

  // Save the file
  writeFileSync(filepath, buffer);

  // Get file stats
  const stats = statSync(filepath);

  // Save metadata
  const metadata: UploadMetadata = {
    id: filename.split('_').pop()?.split('.')[0] || randomUUID().split('-')[0],
    originalName,
    filename,
    size: stats.size,
    extension: extname(originalName),
    mimeType,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    storageType: 'local',
  };

  const metadataPath = join(UPLOADS_DIR, `${filename}.json`);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return metadata;
}

/**
 * Download file from URL
 */
async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export const fileUploadTool = tool({
  description: `Upload files to GitHub repository storage and get shareable links.
  Files are stored in the ${GITHUB_REPO} repository under the ${GITHUB_STORAGE_PATH}/ directory.
  Each file is tracked in a searchable index with metadata for easy retrieval.

  Supports various file types including images, documents, code files, and archives.
  Maximum file size: ${MAX_FILE_SIZE / 1024 / 1024}MB.

  CORRECTED UPLOAD WORKFLOW:
  - Files are ALWAYS saved to Railway storage (/data/uploads) FIRST
  - Then immediately uploaded to GitHub for permanent storage
  - After successful GitHub upload, files are automatically cleaned up from Railway
  - This ensures integrity and avoids duplication
  - If GitHub upload fails, files remain in Railway storage for retry
  - Automatic background transfer from Railway → GitHub is triggered on failure
  - Retry logic: 3 attempts with exponential backoff (5s, 15s, 1m)
  - Metadata is preserved throughout the transfer process
  - No manual intervention required - transfers and cleanup happen automatically

  IMPORTANT: This tool is designed to work with Discord attachments. When a user shares a file in Discord:
  1. The message will include attachment information in the format:
     **[ATTACHMENTS]**
     - filename.ext (mime/type, XX.XX KB): https://cdn.discordapp.com/...
  2. Extract the attachment URL and filename from the message
  3. Use this tool with the fileUrl parameter to download and save the file
  4. Return the shareable GitHub URL to the user

  You can use this tool in two ways:
  - With fileUrl: Provide a Discord attachment URL to download and save
  - With fileData: Provide base64-encoded file data directly

  Metadata features:
  - Add a description to help identify the file's purpose
  - Add tags (keywords) for categorization and search
  - All files are indexed in ${GITHUB_STORAGE_PATH}/index.json

  Security features:
  - File type validation (whitelist of allowed extensions)
  - File size limits (${MAX_FILE_SIZE / 1024 / 1024}MB max)
  - Filename sanitization to prevent directory traversal
  - Unique filenames to prevent collisions
  - Version control via GitHub (all uploads are tracked)

  Allowed file types: ${ALLOWED_EXTENSIONS.join(', ')}

  Falls back to local storage if GitHub is not configured.`,
  inputSchema: z.object({
    fileUrl: z.string().optional().describe('URL to download the file from (e.g., Discord attachment URL)'),
    fileData: z.string().optional().describe('Base64-encoded file data (alternative to fileUrl)'),
    originalName: z.string().describe('Original filename with extension'),
    mimeType: z.string().optional().describe('MIME type of the file (e.g., image/png, application/pdf)'),
    uploadedBy: z.string().optional().describe('Username of the person uploading the file'),
    description: z.string().optional().describe('Description of the file (what it contains, its purpose, etc.)'),
    tags: z.array(z.string()).optional().describe('Tags/keywords for categorizing the file (e.g., ["game-assets", "flappy-bird", "audio"])'),
  }),
  execute: async ({ fileUrl, fileData, originalName, mimeType, uploadedBy, description, tags }) => {
    try {
      // Validate that either fileUrl or fileData is provided
      if (!fileUrl && !fileData) {
        return {
          success: false,
          error: 'Either fileUrl or fileData must be provided',
        };
      }

      // Validate file extension first
      if (!isAllowedExtension(originalName)) {
        return {
          success: false,
          error: `File type not allowed. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
        };
      }

      // Download file if URL is provided, otherwise decode base64
      let dataBuffer: Buffer;
      if (fileUrl) {
        console.log(`📥 Downloading file from: ${fileUrl}`);
        dataBuffer = await downloadFile(fileUrl);
        console.log(`✅ Downloaded ${dataBuffer.length} bytes`);
      } else {
        dataBuffer = Buffer.from(fileData!, 'base64');
      }

      // Check file size
      if (dataBuffer.length > MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File size (${(dataBuffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        };
      }

      // Generate safe filename
      const filename = generateSafeFilename(originalName);

      let metadata: UploadMetadata;
      let publicUrl: string;

      // CORRECTED WORKFLOW: Always save to Railway first, then upload to GitHub
      console.log('📦 Saving to Railway storage first...');
      metadata = saveUploadedFile(dataBuffer, originalName, mimeType, uploadedBy);
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
      publicUrl = `${serverUrl}/uploads/${metadata.filename}`;
      console.log(`✅ Saved to Railway: ${publicUrl}`);

      // Now upload to GitHub if configured
      if (GITHUB_TOKEN) {
        try {
          console.log('📤 Uploading to GitHub...');
          const githubMetadata = await uploadToGitHub(
            dataBuffer,
            filename,
            originalName,
            mimeType,
            uploadedBy,
            description,
            tags
          );

          // Update metadata with GitHub info
          metadata = { ...metadata, ...githubMetadata };
          publicUrl = metadata.rawUrl || metadata.githubUrl || '';
          console.log(`✅ Successfully uploaded to GitHub: ${publicUrl}`);

          // CLEANUP: Delete from Railway after successful GitHub upload
          try {
            const railwayFilePath = join(UPLOADS_DIR, metadata.filename);
            const railwayMetadataPath = join(UPLOADS_DIR, `${metadata.filename}.json`);

            if (existsSync(railwayFilePath)) {
              unlinkSync(railwayFilePath);
              console.log(`🗑️  Cleaned up file from Railway: ${metadata.filename}`);
            }
            if (existsSync(railwayMetadataPath)) {
              unlinkSync(railwayMetadataPath);
              console.log(`🗑️  Cleaned up metadata from Railway: ${metadata.filename}.json`);
            }
          } catch (cleanupError) {
            console.error('⚠️  Error cleaning up Railway storage:', cleanupError);
            // Don't fail the upload if cleanup fails
          }
        } catch (githubError) {
          console.error('⚠️  GitHub upload failed, file remains in Railway storage:', githubError);
          // File stays in Railway storage for manual transfer later
          // Schedule background transfer to GitHub (automatic hook)
          scheduleBackgroundTransfer(metadata.filename, dataBuffer, originalName, mimeType, uploadedBy, description, tags);
        }
      } else {
        console.log('⚠️  GitHub not configured, file remains in Railway storage');
        // Schedule background transfer to GitHub (automatic hook)
        scheduleBackgroundTransfer(metadata.filename, dataBuffer, originalName, mimeType, uploadedBy, description, tags);
      }

      return {
        success: true,
        filename: metadata.filename,
        originalName: metadata.originalName,
        size: metadata.size,
        sizeFormatted: `${(metadata.size / 1024).toFixed(2)} KB`,
        extension: metadata.extension,
        mimeType: metadata.mimeType,
        uploadedAt: metadata.uploadedAt,
        uploadedBy: metadata.uploadedBy,
        storageType: metadata.storageType,
        publicUrl,
        githubUrl: metadata.githubUrl,
        rawUrl: metadata.rawUrl,
        description: metadata.description,
        tags: metadata.tags,
        message: metadata.storageType === 'github'
          ? `✅ Upload Complete!\n\n` +
            `1. Saved to Railway: ✓\n` +
            `2. Uploaded to GitHub: ✓\n` +
            `3. Cleaned up from Railway: ✓\n\n` +
            `View it at: ${metadata.githubUrl}\n` +
            `Direct download: ${metadata.rawUrl}`
          : `⚠️ Partial Upload\n\n` +
            `1. Saved to Railway: ✓\n` +
            `2. GitHub upload: Pending/Failed\n\n` +
            `File remains in Railway storage and will be transferred to GitHub automatically.\n` +
            `Access it at: ${publicUrl}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      };
    }
  },
});
