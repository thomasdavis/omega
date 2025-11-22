#!/usr/bin/env tsx
/**
 * Verification script for Railway → GitHub file transfer system
 * Checks if files uploaded to Railway have been successfully transferred to GitHub
 * and optionally cleaned up from Railway storage
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

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
async function getGitHubFileIndex(): Promise<FileIndexEntry[]> {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN not configured');
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
        console.log('ℹ️  File index not found on GitHub (no files uploaded yet)');
        return [];
      }
      throw new Error(`Failed to get file index: ${response.status}`);
    }

    const data: any = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Error getting file index:', error);
    return [];
  }
}

/**
 * Check if a file exists in GitHub repository
 */
async function checkFileExistsInGitHub(filename: string): Promise<boolean> {
  if (!GITHUB_TOKEN) {
    return false;
  }

  const filePath = `${GITHUB_STORAGE_PATH}/${filename}`;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Get Railway uploads directory based on environment
 */
function getRailwayUploadsDir(): string {
  // Check if running in production with Railway volume
  if (process.env.NODE_ENV === 'production' && existsSync('/data')) {
    return '/data/uploads';
  }
  // Local development
  return join(process.cwd(), 'apps/bot/public/uploads');
}

/**
 * Get files from Railway storage
 */
function getRailwayFiles(): string[] {
  const uploadsDir = getRailwayUploadsDir();

  if (!existsSync(uploadsDir)) {
    console.log(`ℹ️  Railway uploads directory not found at ${uploadsDir}`);
    return [];
  }

  const files = readdirSync(uploadsDir);

  // Filter out metadata JSON files and .gitkeep
  return files.filter(file =>
    !file.endsWith('.json') &&
    file !== '.gitkeep' &&
    !file.startsWith('.')
  );
}

/**
 * Verify a specific file
 */
async function verifyFile(filename: string): Promise<void> {
  console.log(`\n🔍 Verifying: ${filename}`);
  console.log('─'.repeat(80));

  // Check GitHub index
  const githubIndex = await getGitHubFileIndex();
  const indexEntry = githubIndex.find(e => e.filename === filename);

  if (indexEntry) {
    console.log('✅ Found in GitHub index');
    console.log(`   📝 Original name: ${indexEntry.originalName}`);
    console.log(`   📊 Size: ${(indexEntry.size / 1024).toFixed(2)} KB`);
    console.log(`   📅 Uploaded: ${new Date(indexEntry.uploadedAt).toLocaleString()}`);
    console.log(`   👤 Uploaded by: ${indexEntry.uploadedBy || 'Unknown'}`);
    console.log(`   🔗 GitHub URL: ${indexEntry.githubUrl}`);
    console.log(`   📥 Raw URL: ${indexEntry.rawUrl}`);
    if (indexEntry.description) {
      console.log(`   📄 Description: ${indexEntry.description}`);
    }
    if (indexEntry.tags && indexEntry.tags.length > 0) {
      console.log(`   🏷️  Tags: ${indexEntry.tags.join(', ')}`);
    }
  } else {
    console.log('❌ NOT found in GitHub index');

    // Check if file exists directly in GitHub (not in index)
    const existsInGitHub = await checkFileExistsInGitHub(filename);
    if (existsInGitHub) {
      console.log('⚠️  File exists in GitHub but not in index (index may need updating)');
    }
  }

  // Check Railway storage
  const uploadsDir = getRailwayUploadsDir();
  const railwayPath = join(uploadsDir, filename);

  if (existsSync(railwayPath)) {
    const stats = statSync(railwayPath);
    console.log('📦 Still in Railway storage');
    console.log(`   📊 Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   📅 Modified: ${stats.mtime.toLocaleString()}`);

    // Check metadata
    const metadataPath = join(uploadsDir, `${filename}.json`);
    if (existsSync(metadataPath)) {
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      console.log(`   📋 Metadata exists`);
      if (metadata.uploadedBy) {
        console.log(`   👤 Uploaded by: ${metadata.uploadedBy}`);
      }
    }

    if (indexEntry) {
      console.log('⚠️  File transferred to GitHub but NOT cleaned up from Railway');
      console.log('   ℹ️  Cleanup can be done manually using transferRailwayFiles tool with deleteAfterTransfer=true');
    }
  } else {
    if (indexEntry) {
      console.log('✅ Cleaned up from Railway storage');
    } else {
      console.log('❌ Not found in Railway storage');
    }
  }
}

/**
 * Full system verification
 */
async function verifySystem(): Promise<void> {
  console.log('🔍 Railway → GitHub File Transfer Verification');
  console.log('═'.repeat(80));

  // Get GitHub index
  const githubIndex = await getGitHubFileIndex();
  console.log(`\n📊 GitHub Storage Status:`);
  console.log(`   Total files in index: ${githubIndex.length}`);

  if (githubIndex.length > 0) {
    const totalSize = githubIndex.reduce((sum, f) => sum + f.size, 0);
    console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Latest upload: ${new Date(githubIndex[0].uploadedAt).toLocaleString()}`);
  }

  // Get Railway files
  const railwayFiles = getRailwayFiles();
  console.log(`\n📦 Railway Storage Status:`);
  console.log(`   Total files: ${railwayFiles.length}`);

  if (railwayFiles.length > 0) {
    console.log(`   Files pending transfer/cleanup:`);
    railwayFiles.forEach(file => {
      const inGitHub = githubIndex.find(e => e.filename === file);
      if (inGitHub) {
        console.log(`   ⚠️  ${file} (in GitHub, needs cleanup)`);
      } else {
        console.log(`   ❌ ${file} (NOT in GitHub, needs transfer)`);
      }
    });
  }

  // Summary
  console.log(`\n📋 Summary:`);
  const filesInBoth = railwayFiles.filter(f => githubIndex.find(e => e.filename === f));
  const filesOnlyRailway = railwayFiles.filter(f => !githubIndex.find(e => e.filename === f));

  if (filesInBoth.length > 0) {
    console.log(`   ⚠️  ${filesInBoth.length} file(s) transferred but not cleaned up from Railway`);
  }
  if (filesOnlyRailway.length > 0) {
    console.log(`   ❌ ${filesOnlyRailway.length} file(s) in Railway but not in GitHub`);
  }
  if (railwayFiles.length === 0 && githubIndex.length > 0) {
    console.log(`   ✅ All files transferred to GitHub and cleaned up from Railway`);
  }
  if (railwayFiles.length === 0 && githubIndex.length === 0) {
    console.log(`   ℹ️  No files found in either storage`);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  // No arguments - run full system verification
  verifySystem().catch(console.error);
} else {
  // Verify specific file(s)
  Promise.all(args.map(verifyFile)).catch(console.error);
}
