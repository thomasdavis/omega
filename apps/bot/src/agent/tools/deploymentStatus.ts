/**
 * Deployment Status Tool - Reports current deployment version and date
 */

import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DeploymentInfo {
  gitSha: string;
  gitShaShort: string;
  commitMessage: string;
  commitAuthor: string;
  commitDate: string;
  branchName: string;
  buildTimestamp: string;
  buildEnvironment: string;
}

/**
 * Load deployment info from JSON file
 */
function loadDeploymentInfo(): DeploymentInfo | null {
  try {
    const deploymentInfoPath = join(__dirname, '..', '..', 'deployment-info.json');
    const data = readFileSync(deploymentInfoPath, 'utf-8');
    return JSON.parse(data) as DeploymentInfo;
  } catch (error) {
    console.error('❌ Failed to load deployment info:', error);
    return null;
  }
}

export const deploymentStatusTool = tool({
  description: 'Get information about the current deployment version, git SHA, and deployment date of Omega bot',
  inputSchema: z.object({
    format: z.enum(['brief', 'detailed']).default('brief').describe('Level of detail - brief for quick info, detailed for comprehensive deployment information'),
  }),
  execute: async ({ format }) => {
    console.log(`📊 Deployment status tool called with format: ${format}`);

    const deploymentInfo = loadDeploymentInfo();

    if (!deploymentInfo) {
      return {
        error: 'Deployment information is not available',
        message: 'Could not load deployment metadata. This might happen in development environments.',
      };
    }

    // Calculate how long ago the deployment was
    const buildDate = new Date(deploymentInfo.buildTimestamp);
    const now = new Date();
    const hoursSinceBuild = Math.floor((now.getTime() - buildDate.getTime()) / (1000 * 60 * 60));
    const daysSinceBuild = Math.floor(hoursSinceBuild / 24);

    let timeAgo: string;
    if (hoursSinceBuild < 1) {
      timeAgo = 'less than an hour ago';
    } else if (hoursSinceBuild < 24) {
      timeAgo = `${hoursSinceBuild} hour${hoursSinceBuild === 1 ? '' : 's'} ago`;
    } else {
      timeAgo = `${daysSinceBuild} day${daysSinceBuild === 1 ? '' : 's'} ago`;
    }

    if (format === 'brief') {
      return {
        version: deploymentInfo.gitShaShort,
        deployed: timeAgo,
        commitMessage: deploymentInfo.commitMessage.split('\n')[0], // First line only
        environment: deploymentInfo.buildEnvironment,
      };
    }

    // Detailed format
    return {
      deployment: {
        version: deploymentInfo.gitShaShort,
        fullSha: deploymentInfo.gitSha,
        deployed: timeAgo,
        deploymentDate: deploymentInfo.buildTimestamp,
        environment: deploymentInfo.buildEnvironment,
      },
      commit: {
        message: deploymentInfo.commitMessage,
        author: deploymentInfo.commitAuthor,
        date: deploymentInfo.commitDate,
        branch: deploymentInfo.branchName,
      },
      links: {
        githubCommit: `https://github.com/thomasdavis/omega/commit/${deploymentInfo.gitSha}`,
        repository: 'https://github.com/thomasdavis/omega',
      },
    };
  },
});
