/**
 * Transfer Queue Management Tool
 * Provides visibility and control over the file transfer queue
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  loadQueue,
  getQueueStats,
  loadLog,
  getLogStats,
  cleanupOrphanedFiles,
} from './transferQueue.js';

export const transferQueueManagement = tool({
  description: `Manage and monitor the Railway → GitHub file transfer queue.

Actions:
- status: Get queue statistics (size, oldest item, retry counts)
- queue: View all pending transfers with details
- log: Show recent transfer history (up to 1000 entries)
- cleanup: Clean up orphaned files (files in Railway that are already in GitHub)

Use this tool to:
- Check if files are stuck in the transfer queue
- View transfer success/failure rates
- Identify files that failed to transfer
- Clean up Railway storage`,

  parameters: z.object({
    action: z.enum(['status', 'queue', 'log', 'cleanup']).describe('Action to perform'),
    limit: z.number().optional().describe('For log action: number of recent entries to show (default: 50)'),
    dryRun: z.boolean().optional().describe('For cleanup action: if true, only preview what would be deleted (default: true)'),
  }),

  execute: async ({ action, limit = 50, dryRun = true }) => {
    try {
      switch (action) {
        case 'status': {
          const queueStats = getQueueStats();
          const logStats = getLogStats();

          return {
            success: true,
            queue: {
              pendingTransfers: queueStats.size,
              totalRetries: queueStats.totalRetries,
              oldestItem: queueStats.oldestItem
                ? {
                    filename: queueStats.oldestItem.filename,
                    scheduledAt: new Date(queueStats.oldestItem.scheduledAt).toISOString(),
                    retries: queueStats.oldestItem.retries,
                  }
                : null,
            },
            history: {
              totalTransfers: logStats.total,
              successes: logStats.successes,
              failures: logStats.failures,
              successRate: `${logStats.successRate.toFixed(1)}%`,
            },
          };
        }

        case 'queue': {
          const queue = loadQueue();

          return {
            success: true,
            pendingTransfers: queue.length,
            items: queue.map(item => ({
              filename: item.filename,
              originalName: item.originalName,
              uploadedBy: item.uploadedBy,
              description: item.description,
              retries: item.retries,
              scheduledAt: new Date(item.scheduledAt).toISOString(),
              lastAttempt: item.lastAttempt ? new Date(item.lastAttempt).toISOString() : null,
            })),
          };
        }

        case 'log': {
          const log = loadLog();
          const recentEntries = log.slice(-limit);

          return {
            success: true,
            totalEntries: log.length,
            showing: recentEntries.length,
            entries: recentEntries.map(entry => ({
              filename: entry.filename,
              timestamp: new Date(entry.timestamp).toISOString(),
              status: entry.status,
              retries: entry.retries,
              error: entry.error,
            })),
          };
        }

        case 'cleanup': {
          const result = await cleanupOrphanedFiles(dryRun);

          return {
            success: true,
            dryRun,
            scannedFiles: result.scanned,
            orphanedFiles: result.orphaned,
            deletedFiles: result.deleted,
            errors: result.errors.length > 0 ? result.errors : undefined,
            message: dryRun
              ? `Found ${result.orphaned.length} orphaned files. Run with dryRun=false to delete them.`
              : `Deleted ${result.deleted} orphaned files from Railway storage.`,
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
        error: String(error),
      };
    }
  },
});
