/**
 * Railway Error Orchestrator
 *
 * Main service that orchestrates the entire flow:
 * 1. Receives Railway error from webhook
 * 2. Summarizes error with AI
 * 3. Checks for duplicate issues
 * 4. Creates or updates GitHub issue
 * 5. Tags @claude for investigation
 */

import {
  parseRailwayWebhook,
  summarizeError,
  analyzeEnvironmentVariables,
  type RailwayError,
  type ErrorSummary,
} from './railwayErrorDetector.js';
import {
  fetchExistingIssues,
  findDuplicateIssue,
  createGitHubIssue,
  updateGitHubIssue,
  type GitHubIssue,
} from './githubIssueManager.js';

export interface ErrorProcessingResult {
  success: boolean;
  action: 'created' | 'updated' | 'skipped' | 'failed';
  issueNumber?: number;
  issueUrl?: string;
  error?: string;
  summary?: ErrorSummary;
  isDuplicate?: boolean;
  similarityScore?: number;
}

/**
 * Main orchestration function that processes Railway errors end-to-end
 */
export async function processRailwayError(
  webhookPayload: any,
  githubToken: string,
  repo: string = 'thomasdavis/omega'
): Promise<ErrorProcessingResult> {
  console.log('🔍 Processing Railway webhook payload...');

  // Step 1: Parse Railway webhook to extract error information
  const railwayError = parseRailwayWebhook(webhookPayload);

  if (!railwayError) {
    console.log('ℹ️  Webhook does not contain error information, skipping');
    return {
      success: true,
      action: 'skipped',
      error: 'No error detected in webhook payload',
    };
  }

  console.log(`📋 Detected ${railwayError.type} error in ${railwayError.serviceName}`);

  // Step 2: Analyze environment variables
  const potentialMissingEnvVars = analyzeEnvironmentVariables(railwayError);
  console.log(`🔑 Analyzed environment variables: ${potentialMissingEnvVars.length} potential issues`);

  // Step 3: Use AI to summarize the error
  console.log('🤖 Generating AI summary with GPT-4.1-mini...');
  const summary = await summarizeError(railwayError);

  // Add environment variable analysis to summary
  if (potentialMissingEnvVars.length > 0) {
    summary.missingEnvVars = [
      ...new Set([...summary.missingEnvVars, ...potentialMissingEnvVars]),
    ];
  }

  console.log(`✅ Summary generated: ${summary.title}`);
  console.log(`   Severity: ${summary.severity}, Category: ${summary.category}`);

  // Step 4: Fetch existing GitHub issues to check for duplicates
  console.log('🔎 Checking for duplicate issues...');
  const existingIssues = await fetchExistingIssues(githubToken, repo);
  console.log(`   Found ${existingIssues.length} existing railway-error issues`);

  // Step 5: Check if this is a duplicate or similar issue
  const deduplicationResult = await findDuplicateIssue(summary, existingIssues);

  if (deduplicationResult.isDuplicate && deduplicationResult.existingIssue) {
    console.log(
      `🔄 Duplicate issue found: #${deduplicationResult.existingIssue.number} (${deduplicationResult.similarityScore?.toFixed(2)} similarity)`
    );

    // Update existing issue with new occurrence
    const updated = await updateGitHubIssue(
      githubToken,
      deduplicationResult.existingIssue.number,
      railwayError,
      summary,
      repo
    );

    if (updated) {
      console.log(`✅ Updated issue #${deduplicationResult.existingIssue.number}`);
      return {
        success: true,
        action: 'updated',
        issueNumber: deduplicationResult.existingIssue.number,
        issueUrl: deduplicationResult.existingIssue.html_url,
        summary,
        isDuplicate: true,
        similarityScore: deduplicationResult.similarityScore,
      };
    } else {
      console.error(`❌ Failed to update issue #${deduplicationResult.existingIssue.number}`);
      return {
        success: false,
        action: 'failed',
        error: 'Failed to update existing issue',
        summary,
      };
    }
  }

  if (deduplicationResult.shouldUpdate && deduplicationResult.existingIssue) {
    console.log(
      `📝 Similar issue found: #${deduplicationResult.existingIssue.number} (${deduplicationResult.similarityScore?.toFixed(2)} similarity)`
    );

    // Update similar issue with new occurrence
    const updated = await updateGitHubIssue(
      githubToken,
      deduplicationResult.existingIssue.number,
      railwayError,
      summary,
      repo
    );

    if (updated) {
      console.log(`✅ Updated similar issue #${deduplicationResult.existingIssue.number}`);
      return {
        success: true,
        action: 'updated',
        issueNumber: deduplicationResult.existingIssue.number,
        issueUrl: deduplicationResult.existingIssue.html_url,
        summary,
        isDuplicate: false,
        similarityScore: deduplicationResult.similarityScore,
      };
    }
  }

  // Step 6: Create new GitHub issue
  console.log('📝 Creating new GitHub issue...');
  const issue = await createGitHubIssue(githubToken, railwayError, summary, repo);

  if (!issue) {
    console.error('❌ Failed to create GitHub issue');
    return {
      success: false,
      action: 'failed',
      error: 'Failed to create GitHub issue',
      summary,
    };
  }

  console.log(`✅ Created issue #${issue.number}: ${issue.html_url}`);

  return {
    success: true,
    action: 'created',
    issueNumber: issue.number,
    issueUrl: issue.html_url,
    summary,
    isDuplicate: false,
  };
}

/**
 * Validates that required environment variables are present
 */
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = ['OPENAI_API_KEY', 'GITHUB_TOKEN'];
  const missing = required.filter(varName => !process.env[varName]);

  return {
    valid: missing.length === 0,
    missing,
  };
}
