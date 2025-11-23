#!/usr/bin/env tsx
/**
 * Railway Error Processor - CLI Tool
 *
 * Command-line tool for processing Railway errors from JSON files or stdin.
 * Used by GitHub Actions workflow to process errors.
 *
 * Usage:
 *   tsx railway-error-processor.ts <path-to-json-file>
 *   cat error.json | tsx railway-error-processor.ts
 */

import { readFileSync } from 'node:fs';
import { processRailwayError, validateEnvironment } from '../apps/bot/src/services/railwayErrorOrchestrator.js';

async function main() {
  console.log('🔧 Railway Error Processor v2.0.0');
  console.log('');

  // Validate environment
  const envCheck = validateEnvironment();
  if (!envCheck.valid) {
    console.error('❌ Missing required environment variables:', envCheck.missing);
    console.error('   Required: OPENAI_API_KEY, GITHUB_TOKEN');
    process.exit(1);
  }

  const githubToken = process.env.GITHUB_TOKEN!;
  const repo = process.env.GITHUB_REPO || 'thomasdavis/omega';

  console.log('✅ Environment validated');
  console.log(`   Repository: ${repo}`);
  console.log('');

  // Read webhook payload from file or stdin
  let webhookPayload: any;

  const filePath = process.argv[2];
  if (filePath) {
    console.log(`📄 Reading from file: ${filePath}`);
    try {
      const content = readFileSync(filePath, 'utf-8');
      webhookPayload = JSON.parse(content);
    } catch (error) {
      console.error('❌ Failed to read or parse file:', error);
      process.exit(1);
    }
  } else {
    console.log('📥 Reading from stdin...');
    // Note: For GitHub Actions, we'll always use file path
    console.error('❌ No file path provided');
    console.error('Usage: tsx railway-error-processor.ts <path-to-json-file>');
    process.exit(1);
  }

  console.log('📋 Webhook payload received');
  console.log('');

  // Process the error
  const startTime = Date.now();

  try {
    const result = await processRailwayError(webhookPayload, githubToken, repo);

    const processingTime = Date.now() - startTime;

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 PROCESSING RESULT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Action: ${result.action}`);
    if (result.issueNumber) {
      console.log(`   Issue: #${result.issueNumber}`);
    }
    if (result.issueUrl) {
      console.log(`   URL: ${result.issueUrl}`);
    }
    if (result.isDuplicate !== undefined) {
      console.log(`   Duplicate: ${result.isDuplicate ? 'Yes' : 'No'}`);
    }
    if (result.similarityScore !== undefined) {
      console.log(`   Similarity: ${(result.similarityScore * 100).toFixed(1)}%`);
    }
    if (result.summary) {
      console.log('');
      console.log('   Error Summary:');
      console.log(`     Title: ${result.summary.title}`);
      console.log(`     Severity: ${result.summary.severity}`);
      console.log(`     Category: ${result.summary.category}`);
      if (result.summary.missingEnvVars.length > 0) {
        console.log(`     Missing Env Vars: ${result.summary.missingEnvVars.join(', ')}`);
      }
    }
    console.log(`   Processing Time: ${processingTime}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    if (result.error) {
      console.error(`❌ Error: ${result.error}`);
      process.exit(1);
    }

    if (result.success) {
      console.log('✅ Successfully processed Railway error');

      // Output GitHub Actions environment variable for downstream jobs
      if (result.issueNumber && process.env.GITHUB_OUTPUT) {
        const fs = await import('node:fs');
        fs.appendFileSync(
          process.env.GITHUB_OUTPUT,
          `issue_number=${result.issueNumber}\n`
        );
        fs.appendFileSync(
          process.env.GITHUB_OUTPUT,
          `issue_url=${result.issueUrl}\n`
        );
      }

      process.exit(0);
    } else {
      console.error('❌ Failed to process Railway error');
      process.exit(1);
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ PROCESSING FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`   Processing Time: ${processingTime}ms`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');

    if (error instanceof Error && error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

main();
