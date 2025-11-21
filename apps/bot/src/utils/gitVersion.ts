/**
 * Git Version Utility
 * Provides the current Git SHA for version tracking
 */

import { execSync } from 'child_process';

let cachedGitSha: string | null = null;

/**
 * Get the current Git SHA
 * Returns the short SHA (7 characters) for display
 */
export function getGitSha(): string {
  if (cachedGitSha) {
    return cachedGitSha;
  }

  try {
    // Get the short SHA (7 characters)
    const sha = execSync('git rev-parse --short HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'], // Suppress stderr
    }).trim();

    cachedGitSha = sha;
    return sha;
  } catch (error) {
    console.warn('Failed to get git SHA:', error instanceof Error ? error.message : error);
    return 'unknown';
  }
}

/**
 * Get the full Git SHA
 */
export function getFullGitSha(): string {
  try {
    const sha = execSync('git rev-parse HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    return sha;
  } catch (error) {
    console.warn('Failed to get full git SHA:', error instanceof Error ? error.message : error);
    return 'unknown';
  }
}

/**
 * Generate GitHub commit URL
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
 * Generate footer HTML with Git SHA and commit link
 */
export function generateGitFooterHtml(): string {
  const sha = getGitSha();
  const commitUrl = getGitCommitUrl();

  return `
  <footer class="git-version-footer">
    <div class="footer-content">
      <span class="version-label">Version:</span>
      <a href="${commitUrl}" target="_blank" rel="noopener noreferrer" class="commit-link">
        <code>${sha}</code>
      </a>
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
    .commit-link {
      color: rgba(255, 255, 255, 0.95);
      text-decoration: none;
      transition: all 0.2s;
    }
    .commit-link:hover {
      color: white;
      text-decoration: underline;
    }
    .commit-link code {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      padding: 4px 10px;
      border-radius: 6px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.95em;
      font-weight: 600;
    }
    .commit-link:hover code {
      background: rgba(255, 255, 255, 0.3);
    }
  </style>`;
}
