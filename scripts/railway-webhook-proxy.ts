#!/usr/bin/env tsx
/**
 * Railway Webhook Proxy
 *
 * This script receives Railway deployment webhooks and forwards them
 * to GitHub's repository_dispatch API to trigger the deployment monitor workflow.
 *
 * Deploy this as a separate Railway service or use it as a reference
 * for implementing webhook transformation in your preferred language.
 *
 * Environment Variables Required:
 * - GITHUB_DISPATCH_TOKEN: GitHub Personal Access Token with repo and workflow scopes
 * - PORT: Port to listen on (default: 3000)
 */

import { createServer } from 'node:http';

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_DISPATCH_TOKEN;
const GITHUB_REPO = 'thomasdavis/omega';

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_DISPATCH_TOKEN environment variable is required');
  process.exit(1);
}

interface RailwayWebhookPayload {
  type: string;
  timestamp: string;
  project?: {
    id: string;
    name: string;
  };
  environment?: {
    id: string;
    name: string;
  };
  service?: {
    id: string;
    name: string;
  };
  deployment?: {
    id: string;
    status: string;
    meta?: {
      commitSha?: string;
      commitMessage?: string;
      commitAuthor?: string;
    };
  };
  snapshot?: {
    error?: string;
    exitCode?: number;
  };
}

interface GitHubRepositoryDispatch {
  event_type: string;
  client_payload: {
    deployment_id: string;
    error_message: string;
    service_name: string;
    commit_sha: string;
    commit_message: string;
  };
}

async function forwardToGitHub(payload: GitHubRepositoryDispatch): Promise<boolean> {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/dispatches`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Railway-Webhook-Proxy',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ GitHub API error (${response.status}):`, errorText);
      return false;
    }

    console.log('✅ Successfully dispatched to GitHub');
    return true;
  } catch (error) {
    console.error('❌ Failed to dispatch to GitHub:', error);
    return false;
  }
}

function transformRailwayPayload(railway: RailwayWebhookPayload): GitHubRepositoryDispatch | null {
  // Only process deployment failure events
  if (railway.type !== 'DEPLOY' && railway.type !== 'DEPLOYMENT_FAILED') {
    console.log(`ℹ️  Ignoring event type: ${railway.type}`);
    return null;
  }

  // Check if deployment actually failed
  if (railway.deployment?.status !== 'FAILED' && railway.deployment?.status !== 'CRASHED') {
    console.log(`ℹ️  Ignoring non-failure status: ${railway.deployment?.status}`);
    return null;
  }

  const errorMessage = railway.snapshot?.error
    || `Deployment failed with exit code ${railway.snapshot?.exitCode}`
    || 'Unknown deployment error';

  return {
    event_type: 'railway_deployment_failed',
    client_payload: {
      deployment_id: railway.deployment?.id || 'unknown',
      error_message: errorMessage,
      service_name: railway.service?.name || 'unknown',
      commit_sha: railway.deployment?.meta?.commitSha || 'unknown',
      commit_message: railway.deployment?.meta?.commitMessage || 'No commit message',
    },
  };
}

const server = createServer(async (req, res) => {
  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'railway-webhook-proxy',
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // Webhook endpoint
  if (req.url === '/railway-webhook' && req.method === 'POST') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const railwayPayload: RailwayWebhookPayload = JSON.parse(body);

        console.log('📥 Received Railway webhook:', {
          type: railwayPayload.type,
          service: railwayPayload.service?.name,
          deployment: railwayPayload.deployment?.id,
          status: railwayPayload.deployment?.status,
        });

        const githubPayload = transformRailwayPayload(railwayPayload);

        if (!githubPayload) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ignored',
            reason: 'Not a deployment failure event',
          }));
          return;
        }

        const success = await forwardToGitHub(githubPayload);

        if (success) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'success',
            message: 'Webhook forwarded to GitHub',
          }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'error',
            message: 'Failed to forward to GitHub',
          }));
        }
      } catch (error) {
        console.error('❌ Error processing webhook:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'error',
          message: 'Invalid webhook payload',
        }));
      }
    });

    return;
  }

  // 404 for all other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'error',
    message: 'Not found',
  }));
});

server.listen(PORT, () => {
  console.log(`🚀 Railway Webhook Proxy listening on port ${PORT}`);
  console.log(`📍 Webhook endpoint: http://localhost:${PORT}/railway-webhook`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
});
