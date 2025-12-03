/**
 * Persistent Transfer Queue - Manages Railway → GitHub file transfers
 * Survives bot restarts by storing queue state in Railway volume
 */

import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getDataDir, getUploadsDir } from '@repo/shared';

const QUEUE_DIR = getDataDir('transfer-queue');
const UPLOADS_DIR = getUploadsDir();
const QUEUE_FILE = join(QUEUE_DIR, 'queue.json');
const LOG_FILE = join(QUEUE_DIR, 'transfer-log.json');

// Maximum number of retries before giving up
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 60000]; // 5s, 15s, 1m

export interface TransferQueueItem {
  filename: string;
  originalName: string;
  mimeType?: string;
  uploadedBy?: string;
  description?: string;
  tags?: string[];
  retries: number;
  scheduledAt: number;
  lastAttemptAt?: number;
  error?: string;
}

export interface TransferLogEntry {
  filename: string;
  originalName: string;
  status: 'success' | 'failed' | 'skipped';
  timestamp: string;
  githubUrl?: string;
  error?: string;
  retries: number;
}

/**
 * Load the transfer queue from persistent storage
 */
export function loadQueue(): TransferQueueItem[] {
  try {
    if (existsSync(QUEUE_FILE)) {
      const content = readFileSync(QUEUE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading transfer queue:', error);
  }
  return [];
}

/**
 * Save the transfer queue to persistent storage
 */
export function saveQueue(queue: TransferQueueItem[]): void {
  try {
    writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving transfer queue:', error);
  }
}

/**
 * Add a file to the transfer queue
 */
export function enqueueTransfer(
  filename: string,
  originalName: string,
  mimeType?: string,
  uploadedBy?: string,
  description?: string,
  tags?: string[]
): void {
  const queue = loadQueue();

  // Check if already in queue
  const existing = queue.find(item => item.filename === filename);
  if (existing) {
    console.log(`⏭️  ${filename} is already in transfer queue`);
    return;
  }

  console.log(`📋 Adding ${filename} to persistent transfer queue`);

  queue.push({
    filename,
    originalName,
    mimeType,
    uploadedBy,
    description: description || `Automatically transferred from Railway storage`,
    tags: tags || ['auto-transfer'],
    retries: 0,
    scheduledAt: Date.now(),
  });

  saveQueue(queue);
}

/**
 * Remove a file from the transfer queue
 */
export function dequeueTransfer(filename: string): void {
  const queue = loadQueue();
  const filtered = queue.filter(item => item.filename !== filename);

  if (filtered.length !== queue.length) {
    saveQueue(filtered);
    console.log(`✅ Removed ${filename} from transfer queue`);
  }
}

/**
 * Update an item in the queue (e.g., increment retries, update error)
 */
export function updateQueueItem(
  filename: string,
  updates: Partial<TransferQueueItem>
): void {
  const queue = loadQueue();
  const item = queue.find(q => q.filename === filename);

  if (item) {
    Object.assign(item, updates);
    saveQueue(queue);
  }
}

/**
 * Get the next item from the queue that's ready for processing
 */
export function getNextQueueItem(): TransferQueueItem | null {
  const queue = loadQueue();

  // Filter out items that have exceeded max retries
  const validQueue = queue.filter(item => item.retries <= MAX_RETRIES);

  // Save if we filtered any out
  if (validQueue.length !== queue.length) {
    saveQueue(validQueue);
  }

  if (validQueue.length === 0) {
    return null;
  }

  // Find items that are ready for retry (past their delay period)
  const now = Date.now();
  const readyItems = validQueue.filter(item => {
    if (item.retries === 0) {
      return true; // First attempt, always ready
    }

    const delay = RETRY_DELAYS[item.retries - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    const readyAt = (item.lastAttemptAt || item.scheduledAt) + delay;
    return now >= readyAt;
  });

  if (readyItems.length === 0) {
    return null; // No items ready yet
  }

  // Return the oldest item
  return readyItems.sort((a, b) => a.scheduledAt - b.scheduledAt)[0];
}

/**
 * Log a transfer result
 */
export function logTransfer(entry: TransferLogEntry): void {
  try {
    let log: TransferLogEntry[] = [];

    if (existsSync(LOG_FILE)) {
      const content = readFileSync(LOG_FILE, 'utf-8');
      log = JSON.parse(content);
    }

    log.push(entry);

    // Keep only last 1000 entries
    if (log.length > 1000) {
      log = log.slice(-1000);
    }

    writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing transfer log:', error);
  }
}

/**
 * Get recent transfer log entries
 */
export function getTransferLog(limit: number = 50): TransferLogEntry[] {
  try {
    if (existsSync(LOG_FILE)) {
      const content = readFileSync(LOG_FILE, 'utf-8');
      const log: TransferLogEntry[] = JSON.parse(content);
      return log.slice(-limit).reverse();
    }
  } catch (error) {
    console.error('Error reading transfer log:', error);
  }
  return [];
}

/**
 * Clean up Railway files that are confirmed to be in GitHub
 * This handles orphaned files that were transferred but cleanup failed
 */
export async function cleanupOrphanedFiles(
  githubIndex: string[],
  dryRun: boolean = false
): Promise<{ cleaned: number; errors: number; files: string[] }> {
  const result = { cleaned: 0, errors: 0, files: [] as string[] };

  // Get all files in Railway uploads
  const railwayFiles = existsSync(UPLOADS_DIR)
    ? require('fs').readdirSync(UPLOADS_DIR).filter((f: string) =>
        !f.endsWith('.json') && f !== '.gitkeep' && !f.startsWith('.')
      )
    : [];

  // Find files that exist in both Railway and GitHub
  const orphaned = railwayFiles.filter((file: string) => githubIndex.includes(file));

  if (orphaned.length === 0) {
    console.log('✅ No orphaned files found in Railway storage');
    return result;
  }

  console.log(`🧹 Found ${orphaned.length} orphaned files in Railway storage`);

  for (const file of orphaned) {
    const filepath = join(UPLOADS_DIR, file);
    const metadataPath = join(UPLOADS_DIR, `${file}.json`);

    if (dryRun) {
      console.log(`[DRY RUN] Would delete: ${file}`);
      result.files.push(file);
      continue;
    }

    try {
      if (existsSync(filepath)) {
        unlinkSync(filepath);
        console.log(`🗑️  Deleted orphaned file: ${file}`);
      }
      if (existsSync(metadataPath)) {
        unlinkSync(metadataPath);
        console.log(`🗑️  Deleted orphaned metadata: ${file}.json`);
      }
      result.cleaned++;
      result.files.push(file);
    } catch (error) {
      console.error(`Error deleting ${file}:`, error);
      result.errors++;
    }
  }

  return result;
}

/**
 * Get statistics about the transfer queue and system
 */
export function getQueueStats(): {
  queueSize: number;
  oldestItem?: string;
  recentSuccesses: number;
  recentFailures: number;
} {
  const queue = loadQueue();
  const log = getTransferLog(100);

  const recentSuccesses = log.filter(e => e.status === 'success').length;
  const recentFailures = log.filter(e => e.status === 'failed').length;

  let oldestItem: string | undefined;
  if (queue.length > 0) {
    const oldest = queue.reduce((prev, curr) =>
      prev.scheduledAt < curr.scheduledAt ? prev : curr
    );
    const age = Math.floor((Date.now() - oldest.scheduledAt) / 1000 / 60);
    oldestItem = `${oldest.filename} (${age} minutes old)`;
  }

  return {
    queueSize: queue.length,
    oldestItem,
    recentSuccesses,
    recentFailures,
  };
}
