/**
 * GitHub Issue Service
 * Manages automated issue creation, updates, and duplicate detection for Railway errors
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const GITHUB_API_BASE = 'https://api.github.com';

export interface ErrorContext {
  errorMessage: string;
  stackTrace?: string;
  timestamp: string;
  environment?: string;
  railwayService?: string;
  logContext?: string[];
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  created_at: string;
  updated_at: string;
  html_url: string;
}

/**
 * Fetch existing open issues with 'railway-error' label
 */
async function fetchExistingIssues(): Promise<GitHubIssue[]> {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN not configured');
  }

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/issues?labels=railway-error&state=open&per_page=100`,
    {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch issues: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Use AI to detect if an error is similar to existing issues
 */
async function findSimilarIssue(
  errorContext: ErrorContext,
  existingIssues: GitHubIssue[]
): Promise<GitHubIssue | null> {
  if (existingIssues.length === 0) {
    return null;
  }

  // Use AI to compare the error with existing issues
  const prompt = `You are analyzing a Railway error to determine if it's a duplicate of existing issues.

NEW ERROR:
Message: ${errorContext.errorMessage}
Stack: ${errorContext.stackTrace || 'N/A'}
Environment: ${errorContext.environment || 'unknown'}
Service: ${errorContext.railwayService || 'unknown'}

EXISTING ISSUES:
${existingIssues.map((issue, idx) => `
${idx + 1}. Issue #${issue.number}: ${issue.title}
   ${issue.body.substring(0, 500)}...
`).join('\n')}

Respond with ONLY a JSON object in this exact format:
{
  "isDuplicate": true/false,
  "issueNumber": <number or null>,
  "reasoning": "brief explanation"
}

If the new error is clearly related to an existing issue (same root cause, same error type, similar stack trace), return isDuplicate: true with the issue number.
Otherwise, return isDuplicate: false with issueNumber: null.`;

  try {
    const { text } = await generateText({
      model: openai('gpt-4.1-mini'),
      prompt,
      temperature: 0.1,
    });

    const result = JSON.parse(text);

    if (result.isDuplicate && result.issueNumber) {
      const matchedIssue = existingIssues.find(i => i.number === result.issueNumber);
      if (matchedIssue) {
        console.log(`✅ Found duplicate issue: #${result.issueNumber} - ${result.reasoning}`);
        return matchedIssue;
      }
    }

    console.log(`📝 No duplicate found: ${result.reasoning}`);
    return null;
  } catch (error) {
    console.error('⚠️  Error detecting duplicates, assuming new issue:', error);
    return null;
  }
}

/**
 * Analyze missing/misconfigured environment variables
 */
async function analyzeEnvironmentIssues(errorContext: ErrorContext): Promise<string> {
  const prompt = `Analyze this Railway error and identify any missing or misconfigured environment variables:

Error: ${errorContext.errorMessage}
Stack: ${errorContext.stackTrace || 'N/A'}

Common environment variables in this project:
- DISCORD_BOT_TOKEN
- DISCORD_PUBLIC_KEY
- OPENAI_API_KEY
- GITHUB_TOKEN
- GITHUB_REPO
- RAILWAY_ENVIRONMENT
- DATABASE_URL

Respond with a brief markdown list of:
1. Environment variables that might be missing or misconfigured
2. Specific recommendations for fixing them

If no environment issues are detected, respond with "No environment variable issues detected."`;

  try {
    const { text } = await generateText({
      model: openai('gpt-4.1-mini'),
      prompt,
      temperature: 0.3,
    });

    return text;
  } catch (error) {
    console.error('⚠️  Error analyzing environment variables:', error);
    return 'Unable to analyze environment variables due to AI error.';
  }
}

/**
 * Create AI-powered error summary
 */
async function summarizeError(errorContext: ErrorContext): Promise<string> {
  const prompt = `Summarize this Railway error in a clear, concise way for a GitHub issue:

Error Message: ${errorContext.errorMessage}
Stack Trace: ${errorContext.stackTrace || 'N/A'}
Timestamp: ${errorContext.timestamp}
Environment: ${errorContext.environment || 'unknown'}
Service: ${errorContext.railwayService || 'unknown'}
${errorContext.logContext ? `\nLog Context:\n${errorContext.logContext.join('\n')}` : ''}

Provide:
1. **Root Cause**: What's the primary issue?
2. **Impact**: What functionality is affected?
3. **Urgency**: Critical/High/Medium/Low
4. **Suggested Fix**: Brief recommendation

Keep it under 300 words, technical but clear.`;

  try {
    const { text } = await generateText({
      model: openai('gpt-4.1-mini'),
      prompt,
      temperature: 0.3,
    });

    return text;
  } catch (error) {
    console.error('⚠️  Error generating summary, using fallback:', error);
    return `**Error**: ${errorContext.errorMessage}\n\n**Stack Trace**:\n\`\`\`\n${errorContext.stackTrace || 'N/A'}\n\`\`\`\n\n**Timestamp**: ${errorContext.timestamp}`;
  }
}

/**
 * Create a new GitHub issue
 */
async function createIssue(
  title: string,
  body: string,
  labels: string[]
): Promise<GitHubIssue> {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN not configured');
  }

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/issues`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        labels,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create issue: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Add a comment to an existing issue
 */
async function addIssueComment(
  issueNumber: number,
  comment: string
): Promise<void> {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN not configured');
  }

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: comment,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add comment: ${response.status} ${error}`);
  }
}

/**
 * Main function: Process Railway error and create/update GitHub issue
 */
export async function processRailwayError(
  errorContext: ErrorContext
): Promise<{ issueNumber: number; issueUrl: string; wasNewIssue: boolean }> {
  console.log('🔍 Processing Railway error for GitHub issue creation...');

  // Step 1: Fetch existing issues
  const existingIssues = await fetchExistingIssues();
  console.log(`📋 Found ${existingIssues.length} existing railway-error issues`);

  // Step 2: Check for duplicates
  const duplicateIssue = await findSimilarIssue(errorContext, existingIssues);

  // Step 3: Generate AI summary and environment analysis
  const [summary, envAnalysis] = await Promise.all([
    summarizeError(errorContext),
    analyzeEnvironmentIssues(errorContext),
  ]);

  if (duplicateIssue) {
    // Update existing issue with new occurrence
    console.log(`📝 Updating duplicate issue #${duplicateIssue.number}`);

    const updateComment = `## 🔄 Error Occurred Again

**Timestamp**: ${errorContext.timestamp}
**Environment**: ${errorContext.environment || 'unknown'}
**Service**: ${errorContext.railwayService || 'unknown'}

### Error Details
\`\`\`
${errorContext.errorMessage}
\`\`\`

${errorContext.stackTrace ? `### Stack Trace\n\`\`\`\n${errorContext.stackTrace}\n\`\`\`\n` : ''}

### AI Analysis
${summary}

### Environment Variable Check
${envAnalysis}

---

@claude please analyze this recurring error and investigate potential fixes. Check if any environment variables are missing or misconfigured.`;

    await addIssueComment(duplicateIssue.number, updateComment);

    return {
      issueNumber: duplicateIssue.number,
      issueUrl: duplicateIssue.html_url,
      wasNewIssue: false,
    };
  } else {
    // Create new issue
    console.log('🆕 Creating new issue for Railway error');

    const issueTitle = `[Railway Error] ${errorContext.errorMessage.substring(0, 80)}`;
    const issueBody = `## 🚨 Automated Railway Error Report

**Detected**: ${errorContext.timestamp}
**Environment**: ${errorContext.environment || 'unknown'}
**Service**: ${errorContext.railwayService || 'unknown'}

### Error Message
\`\`\`
${errorContext.errorMessage}
\`\`\`

${errorContext.stackTrace ? `### Stack Trace\n\`\`\`\n${errorContext.stackTrace}\n\`\`\`\n` : ''}

${errorContext.logContext && errorContext.logContext.length > 0 ? `### Log Context\n\`\`\`\n${errorContext.logContext.join('\n')}\n\`\`\`\n` : ''}

### AI-Generated Summary
${summary}

### Environment Variable Analysis
${envAnalysis}

---

@claude please analyze this error and determine the root cause. If you can fix it, please implement a solution. Pay special attention to any missing or misconfigured environment variables.

---

*This issue was automatically created by the Railway Error Monitoring system.*`;

    const newIssue = await createIssue(
      issueTitle,
      issueBody,
      ['railway-error', 'automated', 'bug']
    );

    console.log(`✅ Created issue #${newIssue.number}: ${newIssue.html_url}`);

    return {
      issueNumber: newIssue.number,
      issueUrl: newIssue.html_url,
      wasNewIssue: true,
    };
  }
}
