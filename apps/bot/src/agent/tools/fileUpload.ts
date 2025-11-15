/**
 * File Upload Tool - Upload files to public folder with shareable links
 * Allows users to upload files via Discord and get shareable URLs
 */

import { tool } from 'ai';
import { z } from 'zod';
import { writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Public uploads directory
const UPLOADS_DIR = join(__dirname, '../../../public/uploads');

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

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
  const basename = filename.replace(/^.*[\\\/]/, '');

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
 * Save uploaded file
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
  };

  const metadataPath = join(UPLOADS_DIR, `${filename}.json`);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return metadata;
}

export const fileUploadTool = tool({
  description: `Upload files to a public folder and get shareable links.
  Supports various file types including images, documents, code files, and archives.
  Maximum file size: ${MAX_FILE_SIZE / 1024 / 1024}MB.

  IMPORTANT: This tool is designed to work with Discord attachments. When a user shares a file in Discord:
  1. Extract the attachment URL from the message
  2. Download the file content
  3. Use this tool to save it to the public folder
  4. Return the shareable URL to the user

  Security features:
  - File type validation (whitelist of allowed extensions)
  - File size limits
  - Filename sanitization to prevent directory traversal
  - Unique filenames to prevent collisions`,
  parameters: z.object({
    fileData: z.string().describe('Base64-encoded file data or raw file content'),
    originalName: z.string().describe('Original filename with extension'),
    mimeType: z.string().optional().describe('MIME type of the file (e.g., image/png, application/pdf)'),
    uploadedBy: z.string().optional().describe('Username of the person uploading the file'),
  }),
  execute: async ({ fileData, originalName, mimeType, uploadedBy }) => {
    try {
      const metadata = saveUploadedFile(
        fileData,
        originalName,
        mimeType,
        uploadedBy
      );

      // Get server URL from environment or use default
      const serverUrl = process.env.ARTIFACT_SERVER_URL || 'http://localhost:3001';
      const publicUrl = `${serverUrl}/uploads/${metadata.filename}`;

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
        publicUrl,
        message: `File uploaded successfully! Access it at: ${publicUrl}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      };
    }
  },
});
