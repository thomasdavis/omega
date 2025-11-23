/**
 * Upload and Commit File Tool
 * Automatically uploads files to GitHub repository and creates explicit commits
 *
 * This tool provides a streamlined workflow for uploading files from Discord attachments
 * and committing them to the repository with descriptive commit messages.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { extname } from 'path';
import { randomUUID } from 'crypto';

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const GITHUB_STORAGE_PATH = 'file-library';
const GITHUB_BRANCH = 'main';

// File size limits
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Allowed file extensions (whitelist for security)
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
 * Sanitize filename to prevent directory traversal
 */
function sanitizeFilename(filename: string): string {
  const basename = filename.replace(/^.*[\\\/]/, '');
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Generate safe filename with UUID
 */
function generateSafeFilename(originalName: string): string {
  const ext = extname(originalName);
  const sanitized = sanitizeFilename(originalName.replace(ext, ''));
  const uuid = randomUUID().split('-')[0];
  return `${sanitized}_${uuid}${ext}`;
}

/**
 * Validate file extension
 */
function isAllowedExtension(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
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

/**
 * Decode base64 file content
 */
function decodeBase64File(base64Content: string): Buffer {
  // Remove data URL prefix if present (e.g., "data:image/png;base64,")
  const base64Data = base64Content.replace(/^data:[^;]+;base64,/, '');

  // Validate base64 format
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
    throw new Error('Invalid base64 content');
  }

  return Buffer.from(base64Data, 'base64');
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
 * Upload file and update index in a single commit
 */
async function uploadAndCommit(
  fileBuffer: Buffer,
  filename: string,
  originalName: string,
  mimeType?: string,
  uploadedBy?: string,
  description?: string,
  tags?: string[]
): Promise<{
  fileUrl: string;
  rawUrl: string;
  commitUrl: string;
  commitSha: string;
}> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured');
  }

  const filePath = `${GITHUB_STORAGE_PATH}/${filename}`;
  const indexPath = `${GITHUB_STORAGE_PATH}/index.json`;

  // Get current index
  const currentIndex = await getFileIndex();

  // Create new entry
  const newEntry: FileIndexEntry = {
    id: randomUUID().split('-')[0],
    filename,
    originalName,
    size: fileBuffer.length,
    extension: extname(originalName),
    mimeType,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    githubUrl: `https://github.com/${GITHUB_REPO}/blob/${GITHUB_BRANCH}/${filePath}`,
    rawUrl: `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`,
    description,
    tags,
  };

  // Update index
  const existingIndex = currentIndex.findIndex(e => e.filename === filename);
  if (existingIndex >= 0) {
    currentIndex[existingIndex] = newEntry;
  } else {
    currentIndex.push(newEntry);
  }

  // Sort by upload date (newest first)
  currentIndex.sort((a, b) =>
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );

  // Get latest commit SHA
  const refResponse = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`,
    {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!refResponse.ok) {
    throw new Error(`Failed to get branch ref: ${refResponse.status}`);
  }

  const refData: any = await refResponse.json();
  const latestCommitSha = refData.object.sha;

  // Get tree SHA from commit
  const commitResponse = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/git/commits/${latestCommitSha}`,
    {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!commitResponse.ok) {
    throw new Error(`Failed to get commit: ${commitResponse.status}`);
  }

  const commitData: any = await commitResponse.json();
  const baseTreeSha = commitData.tree.sha;

  // Create blobs for file and index
  const fileBlobResponse = await fetch(
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
        content: fileBuffer.toString('base64'),
        encoding: 'base64',
      }),
    }
  );

  if (!fileBlobResponse.ok) {
    const error = await fileBlobResponse.text();
    throw new Error(`Failed to create file blob: ${fileBlobResponse.status} - ${error}`);
  }

  const fileBlobData: any = await fileBlobResponse.json();
  const fileBlobSha = fileBlobData.sha;

  const indexContent = JSON.stringify(currentIndex, null, 2);
  const indexBlobResponse = await fetch(
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
        content: indexContent,
        encoding: 'utf-8',
      }),
    }
  );

  if (!indexBlobResponse.ok) {
    const error = await indexBlobResponse.text();
    throw new Error(`Failed to create index blob: ${indexBlobResponse.status} - ${error}`);
  }

  const indexBlobData: any = await indexBlobResponse.json();
  const indexBlobSha = indexBlobData.sha;

  // Create tree with both files
  const treeResponse = await fetch(
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
            mode: '100644',
            type: 'blob',
            sha: fileBlobSha,
          },
          {
            path: indexPath,
            mode: '100644',
            type: 'blob',
            sha: indexBlobSha,
          },
        ],
      }),
    }
  );

  if (!treeResponse.ok) {
    const error = await treeResponse.text();
    throw new Error(`Failed to create tree: ${treeResponse.status} - ${error}`);
  }

  const treeData: any = await treeResponse.json();
  const newTreeSha = treeData.sha;

  // Create commit with descriptive message
  const commitMessage = `Upload ${originalName}${uploadedBy ? ` by ${uploadedBy}` : ''}${description ? `\n\n${description}` : ''}`;

  const newCommitResponse = await fetch(
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
        message: commitMessage,
        tree: newTreeSha,
        parents: [latestCommitSha],
      }),
    }
  );

  if (!newCommitResponse.ok) {
    const error = await newCommitResponse.text();
    throw new Error(`Failed to create commit: ${newCommitResponse.status} - ${error}`);
  }

  const newCommitData: any = await newCommitResponse.json();
  const newCommitSha = newCommitData.sha;

  // Update branch reference
  const updateRefResponse = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        sha: newCommitSha,
        force: false,
      }),
    }
  );

  if (!updateRefResponse.ok) {
    const error = await updateRefResponse.text();
    throw new Error(`Failed to update ref: ${updateRefResponse.status} - ${error}`);
  }

  const commitUrl = `https://github.com/${GITHUB_REPO}/commit/${newCommitSha}`;

  return {
    fileUrl: newEntry.githubUrl,
    rawUrl: newEntry.rawUrl,
    commitUrl,
    commitSha: newCommitSha,
  };
}

export const uploadAndCommitFileTool = tool({
  description: `Upload files to GitHub repository with automatic commit from URL or base64 content.

  This tool provides a streamlined workflow for uploading files and committing them to the repository:
  1. Gets file content from either:
     - Discord attachment URL (fileUrl parameter)
     - Base64-encoded content (fileContent parameter)
  2. Validates file type and size
  3. Uploads to ${GITHUB_STORAGE_PATH}/ directory
  4. Updates file index (${GITHUB_STORAGE_PATH}/index.json)
  5. Creates a single atomic commit with both file and index
  6. Returns shareable GitHub URLs and commit details

  Features:
  - Atomic commits (file + index in one commit)
  - Descriptive commit messages
  - File validation (type and size limits)
  - Automatic filename sanitization
  - Metadata tracking (uploader, description, tags)
  - Collision-proof filenames (UUID-based)
  - Base64 content support (no external URL needed)

  Security:
  - Whitelist-based file type validation
  - File size limits (${MAX_FILE_SIZE / 1024 / 1024}MB max)
  - Filename sanitization
  - Base64 validation
  - No code execution risk

  Allowed file types: ${ALLOWED_EXTENSIONS.join(', ')}

  Use this tool when you want to:
  - Save Discord attachments permanently in the GitHub repository
  - Commit base64-encoded file content (text files, generated content, etc.)
  - Make files shareable via GitHub URLs
  - Track files in the file index for later retrieval`,
  inputSchema: z.object({
    fileUrl: z.string().optional().describe('URL to download the file from (e.g., Discord attachment URL). Use either fileUrl or fileContent, not both.'),
    fileContent: z.string().optional().describe('Base64-encoded file content. Use this for text files or generated content without an external URL. Use either fileUrl or fileContent, not both.'),
    originalName: z.string().describe('Original filename with extension'),
    mimeType: z.string().optional().describe('MIME type of the file (e.g., image/png, application/pdf, text/plain)'),
    uploadedBy: z.string().optional().describe('Username of the person uploading the file'),
    description: z.string().optional().describe('Description of the file (what it contains, its purpose, etc.)'),
    tags: z.array(z.string()).optional().describe('Tags/keywords for categorizing the file'),
  }),
  execute: async ({ fileUrl, fileContent, originalName, mimeType, uploadedBy, description, tags }) => {
    try {
      // Validate GitHub token
      if (!GITHUB_TOKEN) {
        return {
          success: false,
          error: 'GitHub token not configured. File uploads require GitHub integration.',
        };
      }

      // Validate that exactly one of fileUrl or fileContent is provided
      if (!fileUrl && !fileContent) {
        return {
          success: false,
          error: 'Either fileUrl or fileContent must be provided',
        };
      }

      if (fileUrl && fileContent) {
        return {
          success: false,
          error: 'Cannot provide both fileUrl and fileContent. Use only one.',
        };
      }

      // Validate file extension
      if (!isAllowedExtension(originalName)) {
        return {
          success: false,
          error: `File type not allowed. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
        };
      }

      // Get file buffer from either URL or base64 content
      let fileBuffer: Buffer;
      if (fileUrl) {
        console.log(`📥 Downloading file from: ${fileUrl}`);
        fileBuffer = await downloadFile(fileUrl);
        console.log(`✅ Downloaded ${fileBuffer.length} bytes`);
      } else if (fileContent) {
        console.log(`🔓 Decoding base64 file content...`);
        try {
          fileBuffer = decodeBase64File(fileContent);
          console.log(`✅ Decoded ${fileBuffer.length} bytes from base64`);
        } catch (error) {
          return {
            success: false,
            error: `Invalid base64 content: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      } else {
        // This should never happen due to validation above, but TypeScript needs it
        throw new Error('No file source provided');
      }

      // Check file size
      if (fileBuffer.length > MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File size (${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        };
      }

      // Generate safe filename
      const filename = generateSafeFilename(originalName);

      // Upload and commit
      console.log(`📤 Uploading ${filename} to GitHub and committing...`);
      const result = await uploadAndCommit(
        fileBuffer,
        filename,
        originalName,
        mimeType,
        uploadedBy,
        description,
        tags
      );

      console.log(`✅ Successfully uploaded and committed: ${result.commitUrl}`);

      return {
        success: true,
        filename,
        originalName,
        size: fileBuffer.length,
        sizeFormatted: `${(fileBuffer.length / 1024).toFixed(2)} KB`,
        extension: extname(originalName),
        mimeType,
        uploadedBy,
        description,
        tags,
        fileUrl: result.fileUrl,
        rawUrl: result.rawUrl,
        commitUrl: result.commitUrl,
        commitSha: result.commitSha,
        message: `✅ File uploaded and committed successfully!\n\n` +
          `📁 File: ${filename}\n` +
          `📝 Commit: ${result.commitSha.substring(0, 7)}\n` +
          `🔗 View file: ${result.fileUrl}\n` +
          `📦 Direct download: ${result.rawUrl}\n` +
          `💾 Commit details: ${result.commitUrl}\n\n` +
          `The file has been permanently saved to the repository and is now shareable via the GitHub URLs above.`,
      };
    } catch (error) {
      console.error('Error uploading and committing file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload and commit file',
      };
    }
  },
});
