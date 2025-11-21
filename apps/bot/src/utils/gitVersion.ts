/**
 * Build Timestamp Utility
 * Provides the build timestamp for version tracking in blog footer
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DeploymentInfo {
  buildTimestamp: string;
  gitSha?: string;
  gitShaShort?: string;
  commitMessage?: string;
  commitAuthor?: string;
  commitDate?: string;
  branchName?: string;
  buildEnvironment?: string;
}

let cachedDeploymentInfo: DeploymentInfo | null = null;

/**
 * Get deployment info from the generated JSON file
 */
function getDeploymentInfo(): DeploymentInfo {
  if (cachedDeploymentInfo) {
    return cachedDeploymentInfo;
  }

  try {
    // Try to read from dist first (production), then src (development)
    let deploymentInfoPath: string;
    try {
      deploymentInfoPath = join(__dirname, '..', 'deployment-info.json');
      const data = readFileSync(deploymentInfoPath, 'utf-8');
      cachedDeploymentInfo = JSON.parse(data);
    } catch {
      // Fallback to src directory if dist doesn't exist
      deploymentInfoPath = join(__dirname, '..', '..', 'src', 'deployment-info.json');
      const data = readFileSync(deploymentInfoPath, 'utf-8');
      cachedDeploymentInfo = JSON.parse(data);
    }

    return cachedDeploymentInfo!;
  } catch (error) {
    console.warn('Failed to read deployment info:', error instanceof Error ? error.message : error);
    // Return fallback with current timestamp
    return {
      buildTimestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get the build timestamp
 * Returns ISO 8601 format timestamp
 */
export function getBuildTimestamp(): string {
  const info = getDeploymentInfo();
  return info.buildTimestamp;
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
 * Get the current Git SHA (deprecated, kept for backwards compatibility)
 * Returns the short SHA (7 characters) for display
 */
export function getGitSha(): string {
  const info = getDeploymentInfo();
  return info.gitShaShort || 'unknown';
}

/**
 * Get the full Git SHA (deprecated, kept for backwards compatibility)
 */
export function getFullGitSha(): string {
  const info = getDeploymentInfo();
  return info.gitSha || 'unknown';
}

/**
 * Generate GitHub commit URL (deprecated, kept for backwards compatibility)
 * @param repo - Repository in format "owner/repo"
 */
export function getGitCommitUrl(repo: string = 'thomasdavis/omega'): string {
  const sha = getFullGitSha();

  if (sha === 'unknown') {
    return '#';
  }

  return `https://github.com/${repo}/commit/${sha}`;
}

/**
 * Generate footer HTML with build timestamp and human-readable date
 */
export function generateGitFooterHtml(): string {
  const buildDate = formatBuildDate();
  const timestamp = getBuildTimestamp();

  return `
  <footer class="git-version-footer">
    <div class="footer-content">
      <span class="version-label">Built:</span>
      <time datetime="${timestamp}" class="build-date">
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
