/**
 * Persistent Transfer Queue Management
 * Handles file transfers from Railway to GitHub with persistence across restarts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const QUEUE_DIR = '/data/transfer-queue';
const QUEUE_FILE = join(QUEUE_DIR, 'queue.json');
const LOG_FILE = join(QUEUE_DIR, 'transfer-log.json');
const MAX_LOG_ENTRIES = 1000;

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

export interface TransferLogEntry {
  filename: string;
  timestamp: number;
  status: 'success' | 'failure';
  error?: string;
  retries: number;
}

/**
 * Initialize queue storage directories
 */
function ensureQueueDirectory(): void {
  if (!existsSync(QUEUE_DIR)) {
    mkdirSync(QUEUE_DIR, { recursive: true });
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
    const data = readFileSync(QUEUE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error loading transfer queue:', error);
    return [];
  }
}

/**
 * Save queue to persistent storage
 */
export function saveQueue(queue: TransferQueueItem[]): void {
  ensureQueueDirectory();

  try {
    writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
  } catch (error) {
    console.error('❌ Error saving transfer queue:', error);
  }
}

/**
 * Add item to queue
 */
export function addToQueue(item: TransferQueueItem): void {
  const queue = loadQueue();
  queue.push(item);
  saveQueue(queue);
}

/**
 * Remove item from queue
 */
export function removeFromQueue(filename: string): void {
  const queue = loadQueue();
  const filtered = queue.filter(item => item.filename !== filename);
  saveQueue(filtered);
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
 * Load transfer log
 */
export function loadLog(): TransferLogEntry[] {
  ensureQueueDirectory();

  if (!existsSync(LOG_FILE)) {
    return [];
  }

  try {
    const data = readFileSync(LOG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error loading transfer log:', error);
    return [];
  }
}

/**
 * Save transfer log (keeps last MAX_LOG_ENTRIES)
 */
export function saveLog(log: TransferLogEntry[]): void {
  ensureQueueDirectory();

  try {
    // Keep only the most recent entries
    const trimmed = log.slice(-MAX_LOG_ENTRIES);
    writeFileSync(LOG_FILE, JSON.stringify(trimmed, null, 2));
  } catch (error) {
    console.error('❌ Error saving transfer log:', error);
  }
}

/**
 * Add entry to transfer log
 */
export function logTransfer(entry: TransferLogEntry): void {
  const log = loadLog();
  log.push(entry);
  saveLog(log);
}

/**
 * Get transfer statistics from log
 */
export function getLogStats(): {
  total: number;
  successes: number;
  failures: number;
  successRate: number;
} {
  const log = loadLog();
  const successes = log.filter(e => e.status === 'success').length;
  const failures = log.filter(e => e.status === 'failure').length;
  const total = log.length;

  return {
    total,
    successes,
    failures,
    successRate: total > 0 ? (successes / total) * 100 : 0,
  };
}

/**
 * Clean up orphaned files (files in Railway that are already in GitHub)
 */
export async function cleanupOrphanedFiles(
  dryRun: boolean = true
): Promise<{
  scanned: number;
  orphaned: string[];
  deleted: number;
  errors: string[];
}> {
  const UPLOADS_DIR = '/data/uploads';
  const GITHUB_INDEX_PATH = '/data/file-library/index.json';

  const result = {
    scanned: 0,
    orphaned: [] as string[],
    deleted: 0,
    errors: [] as string[],
  };

  // Load GitHub file index
  if (!existsSync(GITHUB_INDEX_PATH)) {
    result.errors.push('GitHub file index not found');
    return result;
  }

  let githubFiles: any[];
  try {
    const indexData = readFileSync(GITHUB_INDEX_PATH, 'utf-8');
    githubFiles = JSON.parse(indexData);
  } catch (error) {
    result.errors.push(`Error reading GitHub index: ${error}`);
    return result;
  }

  // Get all Railway files
  if (!existsSync(UPLOADS_DIR)) {
    return result;
  }

  const railwayFiles = readdirSync(UPLOADS_DIR).filter(f => !f.endsWith('.json'));
  result.scanned = railwayFiles.length;

  // Check each Railway file against GitHub index
  for (const filename of railwayFiles) {
    const inGitHub = githubFiles.some(f => f.filename === filename);

    if (inGitHub) {
      result.orphaned.push(filename);

      if (!dryRun) {
        try {
          const filePath = join(UPLOADS_DIR, filename);
          const metadataPath = join(UPLOADS_DIR, `${filename}.json`);

          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
          if (existsSync(metadataPath)) {
            unlinkSync(metadataPath);
          }

          result.deleted++;
        } catch (error) {
          result.errors.push(`Error deleting ${filename}: ${error}`);
        }
      }
    }
  }

  return result;
}
