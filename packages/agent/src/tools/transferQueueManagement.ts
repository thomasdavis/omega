/**
 * Transfer Queue Management Tool
 * Monitor and manage the persistent file transfer queue
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  loadQueue,
  getQueueStats,
  getTransferLog,
  cleanupOrphanedFiles,
} from './transferQueue.js';

export const transferQueueManagementTool = tool({
  name: 'transferQueueManagement',
  description: 'Monitor and manage the Railway → GitHub file transfer queue. Check queue status, view pending transfers, review transfer history, or clean up orphaned files.',
  parameters: z.object({
    action: z.enum(['status', 'queue', 'log', 'cleanup']).describe(
      'Action to perform: "status" = queue statistics, "queue" = list pending transfers, "log" = view transfer history, "cleanup" = remove orphaned files'
    ),
    limit: z.number().optional().describe('For "log" action: number of recent entries to show (default: 50)'),
    dryRun: z.boolean().optional().describe('For "cleanup" action: preview files to delete without actually deleting (default: false)'),
  }),
  execute: async ({ action, limit, dryRun }) => {
    try {
      switch (action) {
        case 'status': {
          const stats = getQueueStats();
          return {
            success: true,
            stats: {
              queueSize: stats.size,
              oldestItemAge: stats.oldestItem
                ? Math.floor((Date.now() - stats.oldestItem.scheduledAt) / 1000 / 60)
                : null,
              totalRetries: stats.totalRetries,
            },
            message: stats.size === 0
              ? '✅ Transfer queue is empty - no pending transfers'
              : `📋 ${stats.size} file(s) in queue, ${stats.totalRetries} total retries`,
          };
        }

        case 'queue': {
          const queue = loadQueue();

          if (queue.length === 0) {
            return {
              success: true,
              queue: [],
              message: '✅ Transfer queue is empty',
            };
          }

          const queueDetails = queue.map(item => ({
            filename: item.filename,
            originalName: item.originalName,
            retries: item.retries,
            scheduledAt: new Date(item.scheduledAt).toISOString(),
            ageMinutes: Math.floor((Date.now() - item.scheduledAt) / 1000 / 60),
            lastAttempt: item.lastAttempt ? new Date(item.lastAttempt).toISOString() : null,
          }));

          return {
            success: true,
            queue: queueDetails,
            message: `📋 ${queue.length} file(s) pending transfer`,
          };
        }

        case 'log': {
          const logLimit = limit || 50;
          const log = getTransferLog(logLimit);

          if (log.length === 0) {
            return {
              success: true,
              log: [],
              message: '📝 No transfer history available',
            };
          }

          const logDetails = log.map(entry => ({
            filename: entry.filename,
            status: entry.status,
            timestamp: new Date(entry.timestamp).toISOString(),
            error: entry.error,
            retries: entry.retries,
          }));

          const successCount = log.filter(e => e.status === 'success').length;
          const failureCount = log.filter(e => e.status === 'failure').length;

          return {
            success: true,
            log: logDetails,
            summary: {
              total: log.length,
              successes: successCount,
              failures: failureCount,
            },
            message: `📝 Showing ${log.length} recent transfer attempts (${successCount} successful, ${failureCount} failed)`,
          };
        }

        case 'cleanup': {
          const isDryRun = dryRun !== false; // Default to true for safety
          const result = await cleanupOrphanedFiles(isDryRun);

          if (result.found === 0) {
            return {
              success: true,
              result,
              message: '✅ No orphaned files found - Railway storage is clean',
            };
          }

          if (isDryRun) {
            return {
              success: true,
              result,
              message: `🔍 Found ${result.found} orphaned file(s) in Railway that exist in GitHub. Use dryRun=false to delete them.`,
            };
          }

          return {
            success: true,
            result,
            message: `🗑️  Deleted ${result.deleted} of ${result.found} orphaned file(s) from Railway storage`,
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
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
