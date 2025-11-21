/**
 * Build Timestamp Utility
 * Provides the build timestamp for version tracking in blog footer
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cachedBuildTimestamp: number | null = null;

/**
 * Get build timestamp from BUILD-TIMESTAMP.txt file
 */
function getBuildTimestampFromFile(): number {
  if (cachedBuildTimestamp !== null) {
    return cachedBuildTimestamp;
  }

  try {
    // Try to read from dist/public first (production), then public (development)
    let timestampPath: string;
    try {
      timestampPath = join(__dirname, '..', '..', 'public', 'BUILD-TIMESTAMP.txt');
      const data = readFileSync(timestampPath, 'utf-8').trim();
      // BUILD-TIMESTAMP.txt contains Unix timestamp in seconds
      cachedBuildTimestamp = parseInt(data, 10) * 1000; // Convert to milliseconds
    } catch {
      // Fallback to dist/public if public doesn't exist
      timestampPath = join(__dirname, '..', 'public', 'BUILD-TIMESTAMP.txt');
      const data = readFileSync(timestampPath, 'utf-8').trim();
      cachedBuildTimestamp = parseInt(data, 10) * 1000; // Convert to milliseconds
    }

    return cachedBuildTimestamp!;
  } catch (error) {
    console.warn('Failed to read BUILD-TIMESTAMP.txt:', error instanceof Error ? error.message : error);
    // Return fallback with current timestamp
    return Date.now();
  }
}

/**
 * Get the raw build timestamp (Unix timestamp in milliseconds)
 */
export function getBuildTimestamp(): number {
  return getBuildTimestampFromFile();
}

/**
 * Format timestamp to human-readable date
 */
export function formatBuildDate(): string {
  const timestamp = getBuildTimestamp();
  const date = new Date(timestamp);

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC';
}

/**
 * Generate footer HTML with build timestamp and human-readable date
 */
export function generateBuildFooterHtml(): string {
  const buildDate = formatBuildDate();
  const timestamp = getBuildTimestamp();

  return `
  <footer class="git-version-footer">
    <div class="footer-content">
      <span class="version-label">Built:</span>
      <time datetime="${new Date(timestamp).toISOString()}" class="build-date">
        ${buildDate}
      </time>
    </div>
  </footer>
  <style>
    .git-version-footer {
      position: relative;
      margin-top: 40px;
      padding: 20px;
      text-align: center;
      font-size: 0.85em;
      color: rgba(255, 255, 255, 0.8);
    }
    .footer-content {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      padding: 10px 20px;
      border-radius: 8px;
    }
    .version-label {
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
    }
    .build-date {
      color: rgba(255, 255, 255, 0.95);
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 12px;
      border-radius: 6px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.95em;
      font-weight: 600;
    }
  </style>`;
}
