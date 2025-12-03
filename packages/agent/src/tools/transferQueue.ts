/**
 * Persistent Transfer Queue System
 * Manages file transfers from Railway to GitHub with persistence across restarts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getUploadsDir } from '@repo/shared';

// Storage paths
const QUEUE_DIR = '/data/transfer-queue';
const QUEUE_FILE = join(QUEUE_DIR, 'queue.json');
const LOG_FILE = join(QUEUE_DIR, 'transfer-log.json');

// Railway uploads directory
const UPLOADS_DIR = getUploadsDir();

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const GITHUB_STORAGE_PATH = 'file-library';

export interface TransferQueueItem {
  filename: string;
  originalName: string;
  mimeType?: string;
  uploadedBy?: string;
  description?: string;
  tags?: string[];
  retries: number;
  scheduledAt: number;
  lastAttempt?: number;
}

interface TransferLogEntry {
  filename: string;
  timestamp: number;
  status: 'success' | 'failure' | 'scheduled';
  error?: string;
  retries: number;
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
 * Initialize queue storage directory
 */
function ensureQueueDirectory(): void {
  if (!existsSync(QUEUE_DIR)) {
    mkdirSync(QUEUE_DIR, { recursive: true });
    console.log(`📁 Created transfer queue directory: ${QUEUE_DIR}`);
  }
}

/**
 * Load queue from persistent storage
 */
export function loadQueue(): TransferQueueItem[] {
  ensureQueueDirectory();

  if (!existsSync(QUEUE_FILE)) {
    return [];
  }

  try {
    const content = readFileSync(QUEUE_FILE, 'utf-8');
    const queue = JSON.parse(content);
    console.log(`📋 Loaded ${queue.length} items from persistent queue`);
    return queue;
  } catch (error) {
    console.error('❌ Error loading queue:', error);
    return [];
  }
}

/**
 * Save queue to persistent storage
 */
export function saveQueue(queue: TransferQueueItem[]): void {
  ensureQueueDirectory();

  try {
    writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');
  } catch (error) {
    console.error('❌ Error saving queue:', error);
  }
}

/**
 * Add item to queue
 */
export function addToQueue(item: TransferQueueItem): void {
  const queue = loadQueue();

  // Check if already in queue
  const exists = queue.some(q => q.filename === item.filename);
  if (exists) {
    console.log(`⏭️  File already in queue: ${item.filename}`);
    return;
  }

  queue.push(item);
  saveQueue(queue);
  logTransfer(item.filename, 'scheduled', undefined, item.retries);
  console.log(`➕ Added to persistent queue: ${item.filename}`);
}

/**
 * Remove item from queue
 */
export function removeFromQueue(filename: string): void {
  const queue = loadQueue();
  const newQueue = queue.filter(item => item.filename !== filename);
  saveQueue(newQueue);
}

/**
 * Update item in queue
 */
export function updateQueueItem(filename: string, updates: Partial<TransferQueueItem>): void {
  const queue = loadQueue();
  const index = queue.findIndex(item => item.filename === filename);

  if (index !== -1) {
    queue[index] = { ...queue[index], ...updates };
    saveQueue(queue);
  }
}

/**
 * Get queue statistics
 */
export function getQueueStats(): {
  size: number;
  oldestItem?: TransferQueueItem;
  totalRetries: number;
} {
  const queue = loadQueue();

  return {
    size: queue.length,
    oldestItem: queue.length > 0 ? queue[0] : undefined,
    totalRetries: queue.reduce((sum, item) => sum + item.retries, 0),
  };
}

/**
 * Log transfer attempt
 */
export function logTransfer(
  filename: string,
  status: 'success' | 'failure' | 'scheduled',
  error?: string,
  retries?: number
): void {
  ensureQueueDirectory();

  let log: TransferLogEntry[] = [];

  if (existsSync(LOG_FILE)) {
    try {
      const content = readFileSync(LOG_FILE, 'utf-8');
      log = JSON.parse(content);
    } catch (error) {
      console.error('❌ Error loading transfer log:', error);
    }
  }

  log.push({
    filename,
    timestamp: Date.now(),
    status,
    error,
    retries: retries || 0,
  });

  // Keep only last 1000 entries
  if (log.length > 1000) {
    log = log.slice(-1000);
  }

  try {
    writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf-8');
  } catch (error) {
    console.error('❌ Error saving transfer log:', error);
  }
}

/**
 * Get transfer log
 */
export function getTransferLog(limit?: number): TransferLogEntry[] {
  ensureQueueDirectory();

  if (!existsSync(LOG_FILE)) {
    return [];
  }

  try {
    const content = readFileSync(LOG_FILE, 'utf-8');
    const log = JSON.parse(content);
    return limit ? log.slice(-limit) : log;
  } catch (error) {
    console.error('❌ Error loading transfer log:', error);
    return [];
  }
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
 * Clean up orphaned files - files in Railway that are already in GitHub
 */
export async function cleanupOrphanedFiles(dryRun: boolean = false): Promise<{
  found: number;
  deleted: number;
  files: string[];
}> {
  console.log(`🔍 Scanning for orphaned files (dryRun: ${dryRun})...`);

  // Get files in Railway storage
  const railwayFiles = existsSync(UPLOADS_DIR)
    ? readdirSync(UPLOADS_DIR).filter(f => !f.endsWith('.json'))
    : [];

  // Get files in GitHub
  const githubIndex = await getFileIndex();
  const githubFilenames = new Set(githubIndex.map(entry => entry.filename));

  // Find orphans - files in Railway that exist in GitHub
  const orphans = railwayFiles.filter(filename => githubFilenames.has(filename));

  console.log(`📊 Found ${orphans.length} orphaned files in Railway storage`);

  if (!dryRun && orphans.length > 0) {
    let deleted = 0;

    for (const filename of orphans) {
      try {
        const filePath = join(UPLOADS_DIR, filename);
        const metadataPath = join(UPLOADS_DIR, `${filename}.json`);

        if (existsSync(filePath)) {
          unlinkSync(filePath);
          deleted++;
        }

        if (existsSync(metadataPath)) {
          unlinkSync(metadataPath);
        }

        console.log(`🗑️  Deleted orphaned file: ${filename}`);
      } catch (error) {
        console.error(`❌ Error deleting ${filename}:`, error);
      }
    }

    return { found: orphans.length, deleted, files: orphans };
  }

  return { found: orphans.length, deleted: 0, files: orphans };
}
