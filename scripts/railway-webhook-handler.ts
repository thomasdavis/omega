#!/usr/bin/env tsx
/**
 * Railway Webhook Handler - Intelligent Version
 *
 * This enhanced webhook handler:
 * 1. Receives Railway error webhooks (deployment failures, runtime errors, crashes)
 * 2. Uses AI to summarize errors with GPT-4.1-mini
 * 3. Checks for duplicate GitHub issues before creating new ones
 * 4. Creates or updates GitHub issues with @claude mention
 * 5. Analyzes environment variables for missing/misconfigured vars
 *
 * Environment Variables Required:
 * - OPENAI_API_KEY: OpenAI API key for error summarization
 * - GITHUB_TOKEN: GitHub Personal Access Token with repo scope
 * - PORT: Port to listen on (default: 3000)
 */

import { createServer } from 'node:http';
import { processRailwayError, validateEnvironment } from '../apps/bot/src/services/railwayErrorOrchestrator.js';

const PORT = process.env.PORT || 3000;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

// Validate required environment variables
const envCheck = validateEnvironment();
if (!envCheck.valid) {
  console.error('❌ Missing required environment variables:', envCheck.missing);
  console.error('   Please set: OPENAI_API_KEY, GITHUB_TOKEN');
  process.exit(1);
}

console.log('✅ Environment validated');
console.log(`   Repository: ${GITHUB_REPO}`);
console.log(`   OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}`);
console.log(`   GitHub: ${process.env.GITHUB_TOKEN ? 'Configured' : 'Missing'}`);

const server = createServer(async (req, res) => {
  // CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'railway-webhook-handler',
      version: '2.0.0',
      features: [
        'AI error summarization',
        'Duplicate detection',
        'Environment variable analysis',
        'Automatic GitHub issue creation/updating',
      ],
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // Main webhook endpoint
  if (req.url === '/railway-webhook' && req.method === 'POST') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      const startTime = Date.now();

      try {
        const webhookPayload = JSON.parse(body);

        console.log('📥 Received Railway webhook:', {
          type: webhookPayload.type,
          service: webhookPayload.service?.name,
          deployment: webhookPayload.deployment?.id,
          status: webhookPayload.deployment?.status,
          timestamp: new Date().toISOString(),
        });

        // Process the error using our intelligent orchestrator
        const result = await processRailwayError(
          webhookPayload,
          process.env.GITHUB_TOKEN!,
          GITHUB_REPO
        );

        const processingTime = Date.now() - startTime;

        console.log(`⏱️  Processing completed in ${processingTime}ms`);
        console.log(`   Action: ${result.action}`);
        if (result.issueNumber) {
          console.log(`   Issue: #${result.issueNumber}`);
        }
        if (result.isDuplicate !== undefined) {
          console.log(`   Duplicate: ${result.isDuplicate}`);
        }
        if (result.similarityScore !== undefined) {
          console.log(`   Similarity: ${(result.similarityScore * 100).toFixed(1)}%`);
        }

        // Send response
        if (result.success) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'success',
            action: result.action,
            issueNumber: result.issueNumber,
            issueUrl: result.issueUrl,
            isDuplicate: result.isDuplicate,
            similarityScore: result.similarityScore,
            processingTime: `${processingTime}ms`,
            summary: result.summary ? {
              title: result.summary.title,
              severity: result.summary.severity,
              category: result.summary.category,
              missingEnvVars: result.summary.missingEnvVars,
            } : undefined,
          }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'error',
            action: result.action,
            error: result.error,
            processingTime: `${processingTime}ms`,
          }));
        }
      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error('❌ Error processing webhook:', error);

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'error',
          message: 'Invalid webhook payload or processing error',
          error: error instanceof Error ? error.message : String(error),
          processingTime: `${processingTime}ms`,
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
    availableEndpoints: [
      'GET  /health - Health check',
      'POST /railway-webhook - Railway webhook handler',
    ],
  }));
});

server.listen(PORT, () => {
  console.log('🚀 Railway Webhook Handler Started');
  console.log(`📍 Port: ${PORT}`);
  console.log(`📍 Webhook endpoint: http://localhost:${PORT}/railway-webhook`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Features enabled:');
  console.log('  ✅ AI-powered error summarization (GPT-4.1-mini)');
  console.log('  ✅ Intelligent duplicate detection');
  console.log('  ✅ Environment variable analysis');
  console.log('  ✅ Automatic GitHub issue management');
  console.log('  ✅ @claude auto-tagging for investigation');
  console.log('');
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`📴 ${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
