/**
 * Transfer Queue Management Tool - Monitor and manage the Railway → GitHub transfer queue
 * Provides visibility into pending transfers, failed transfers, and orphaned files
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  loadQueue,
  getTransferLog,
  getQueueStats,
  cleanupOrphanedFiles,
} from './transferQueue';

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const GITHUB_STORAGE_PATH = 'file-library';

/**
 * Get file index from GitHub
 */
async function getFileIndex(): Promise<string[]> {
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
    const index = JSON.parse(content);
    return index.map((entry: any) => entry.filename);
  } catch (error) {
    console.error('Error getting file index:', error);
    return [];
  }
}

export const transferQueueManagementTool = tool({
  description: `Monitor and manage the Railway → GitHub file transfer queue system.

  This tool provides visibility into the persistent transfer queue that handles automatic
  file migration from Railway storage to GitHub. It helps diagnose transfer issues,
  clean up orphaned files, and view transfer history.

  Features:
  - View pending transfers in the queue
  - See recent transfer history (successes and failures)
  - Get queue statistics (size, oldest item, success/failure rates)
  - Clean up orphaned files (files in Railway that are already in GitHub)
  - Dry-run mode for safe previewing before cleanup

  Use cases:
  - "Show me what's in the transfer queue"
  - "Are there any failed transfers?"
  - "Clean up orphaned files in Railway storage"
  - "Show me recent transfer activity"

  The transfer queue is persistent across bot restarts, ensuring no transfers are lost.`,
  inputSchema: z.object({
    action: z.enum(['status', 'queue', 'log', 'cleanup']).describe(
      'Action to perform: ' +
      '"status" = Get queue statistics, ' +
      '"queue" = Show pending transfers, ' +
      '"log" = Show recent transfer history, ' +
      '"cleanup" = Clean up orphaned files'
    ),
    dryRun: z.boolean().optional().default(false).describe(
      'For cleanup action: preview what would be cleaned without actually deleting'
    ),
    limit: z.number().optional().default(50).describe(
      'For log action: number of recent entries to show (max 1000)'
    ),
  }),
  execute: async ({ action, dryRun = false, limit = 50 }) => {
    try {
      switch (action) {
        case 'status': {
          const stats = getQueueStats();
          return {
            success: true,
            stats: {
              queueSize: stats.queueSize,
              oldestItem: stats.oldestItem || 'none',
              recentSuccesses: stats.recentSuccesses,
              recentFailures: stats.recentFailures,
            },
            message: stats.queueSize === 0
              ? 'Transfer queue is empty'
              : `${stats.queueSize} item(s) in queue. ` +
                `Recent activity: ${stats.recentSuccesses} successes, ${stats.recentFailures} failures`,
          };
        }

        case 'queue': {
          const queue = loadQueue();
          return {
            success: true,
            queueSize: queue.length,
            queue: queue.map(item => ({
              filename: item.filename,
              originalName: item.originalName,
              retries: item.retries,
              scheduledAt: new Date(item.scheduledAt).toISOString(),
              lastAttemptAt: item.lastAttemptAt
                ? new Date(item.lastAttemptAt).toISOString()
                : null,
              error: item.error,
            })),
            message: queue.length === 0
              ? 'No pending transfers in queue'
              : `${queue.length} pending transfer(s)`,
          };
        }

        case 'log': {
          const log = getTransferLog(Math.min(limit, 1000));
          return {
            success: true,
            logSize: log.length,
            log: log.map(entry => ({
              filename: entry.filename,
              originalName: entry.originalName,
              status: entry.status,
              timestamp: entry.timestamp,
              githubUrl: entry.githubUrl,
              error: entry.error,
              retries: entry.retries,
            })),
            message: log.length === 0
              ? 'No transfer history available'
              : `Showing ${log.length} recent transfer(s)`,
          };
        }

        case 'cleanup': {
          if (!GITHUB_TOKEN) {
            return {
              success: false,
              error: 'GitHub token not configured. Cannot check GitHub index for cleanup.',
            };
          }

          // Get GitHub index to know which files are already there
          const githubIndex = await getFileIndex();

          if (githubIndex.length === 0) {
            return {
              success: true,
              message: 'GitHub index is empty or unavailable. Nothing to clean up.',
              cleaned: 0,
              files: [],
            };
          }

          // Clean up orphaned files
          const result = await cleanupOrphanedFiles(githubIndex, dryRun);

          return {
            success: true,
            dryRun,
            cleaned: result.cleaned,
            errors: result.errors,
            files: result.files,
            message: dryRun
              ? `[DRY RUN] Would clean up ${result.files.length} orphaned file(s)`
              : `Cleaned up ${result.cleaned} orphaned file(s), ${result.errors} error(s)`,
          };
        }

        default:
          return {
            success: false,
            error: 'Invalid action',
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to manage transfer queue',
      };
    }
  },
});
