/**
 * Error Monitoring Service
 * Captures runtime errors and triggers GitHub issue creation
 */

import { processRailwayError, type ErrorContext } from './githubIssueService.js';

// In-memory error tracking to prevent spam
const recentErrors = new Map<string, { count: number; lastSeen: number; issueNumber?: number }>();
const ERROR_COOLDOWN = 10 * 60 * 1000; // 10 minutes cooldown before creating another issue
const ERROR_DEDUP_WINDOW = 5 * 60 * 1000; // 5 minute window for deduplication

/**
 * Generate a normalized hash key for error deduplication.
 * Strips dynamic parts (line numbers, timestamps, specific IDs) to group similar errors.
 */
function generateErrorKey(error: Error | string): string {
  const errorMessage = typeof error === 'string' ? error : error.message;
  // Normalize: strip line numbers, hex addresses, UUIDs, timestamps
  const normalized = errorMessage
    .replace(/:\d+:\d+/g, ':*:*')          // file:line:col → file:*:*
    .replace(/0x[0-9a-f]+/gi, '0x*')       // hex addresses
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '*uuid*') // UUIDs
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '*timestamp*') // ISO timestamps
    .trim();
  return normalized.substring(0, 200);
}

/**
 * Check if we should report this error (cooldown + deduplication)
 */
function shouldReportError(errorKey: string): boolean {
  const now = Date.now();
  const existing = recentErrors.get(errorKey);

  if (!existing) {
    // New error, report it
    recentErrors.set(errorKey, { count: 1, lastSeen: now });
    return true;
  }

  const timeSinceLastSeen = now - existing.lastSeen;

  if (timeSinceLastSeen < ERROR_DEDUP_WINDOW) {
    // Same error within dedup window, just increment count
    existing.count++;
    existing.lastSeen = now;
    return false;
  }

  if (timeSinceLastSeen < ERROR_COOLDOWN) {
    // Within cooldown period, don't spam
    existing.count++;
    existing.lastSeen = now;
    return false;
  }

  // Cooldown expired, report again
  existing.count++;
  existing.lastSeen = now;
  return true;
}

/**
 * Capture and report an error to GitHub
 */
export async function captureError(
  error: Error | string,
  context?: {
    railwayService?: string;
    environment?: string;
    logContext?: string[];
  }
): Promise<void> {
  const errorKey = generateErrorKey(error);

  if (!shouldReportError(errorKey)) {
    console.log('⏭️  Skipping duplicate error within cooldown period');
    return;
  }

  const errorMessage = typeof error === 'string' ? error : error.message;
  const stackTrace = typeof error === 'string' ? undefined : error.stack;

  const errorContext: ErrorContext = {
    errorMessage,
    stackTrace,
    timestamp: new Date().toISOString(),
    environment: context?.environment || process.env.RAILWAY_ENVIRONMENT || 'production',
    railwayService: context?.railwayService || process.env.RAILWAY_SERVICE_NAME || 'omega-bot',
    logContext: context?.logContext,
  };

  try {
    console.log('🚨 Capturing error for GitHub issue creation...');
    const result = await processRailwayError(errorContext);

    // Update tracking with issue number
    const existing = recentErrors.get(errorKey);
    if (existing) {
      existing.issueNumber = result.issueNumber;
    }

    if (result.wasNewIssue) {
      console.log(`✅ Created GitHub issue #${result.issueNumber}: ${result.issueUrl}`);
    } else {
      console.log(`📝 Updated GitHub issue #${result.issueNumber}: ${result.issueUrl}`);
    }
  } catch (reportError) {
    console.error('⚠️  Failed to report error to GitHub:', reportError);
    // Don't throw - we don't want error reporting to crash the app
  }
}

/**
 * Wrap an async function with error monitoring
 */
export function withErrorMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: { railwayService?: string; environment?: string }
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      await captureError(error as Error, context);
      throw error; // Re-throw after capturing
    }
  }) as T;
}

/**
 * Global error handler setup
 */
export function initializeErrorMonitoring(): void {
  // Only monitor in production or if explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !process.env.ENABLE_ERROR_MONITORING) {
    console.log('⏭️  Error monitoring disabled (not in production)');
    return;
  }

  if (!process.env.GITHUB_TOKEN) {
    console.log('⚠️  Error monitoring disabled (GITHUB_TOKEN not set)');
    return;
  }

  console.log('🔍 Initializing Railway error monitoring...');

  // Capture unhandled rejections
  process.on('unhandledRejection', (reason) => {
    console.error('🚨 Unhandled Promise Rejection:', reason);
    if (reason instanceof Error) {
      captureError(reason, { railwayService: 'unhandled-rejection' });
    } else {
      captureError(String(reason), { railwayService: 'unhandled-rejection' });
    }
  });

  // Capture uncaught exceptions (but don't prevent default behavior)
  process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    captureError(error, { railwayService: 'uncaught-exception' });
    // Note: We let the default handler run, which will typically exit the process
  });

  console.log('✅ Error monitoring initialized');
}

/**
 * Clean up old error tracking entries
 */
setInterval(() => {
  const now = Date.now();
  const CLEANUP_AGE = 30 * 60 * 1000; // 30 minutes

  for (const [key, value] of recentErrors.entries()) {
    if (now - value.lastSeen > CLEANUP_AGE) {
      recentErrors.delete(key);
    }
  }
}, 10 * 60 * 1000); // Run every 10 minutes
