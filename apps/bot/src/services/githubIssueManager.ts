/**
 * GitHub Issue Manager
 *
 * Manages GitHub issues with intelligent deduplication.
 * Checks for existing similar issues before creating new ones.
 */

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { ErrorSummary, RailwayError } from './railwayErrorDetector.js';

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

export interface IssueSearchResult {
  isDuplicate: boolean;
  existingIssue?: GitHubIssue;
  similarityScore?: number;
  shouldUpdate: boolean;
}

/**
 * Fetches existing GitHub issues with railway-error label
 */
export async function fetchExistingIssues(
  githubToken: string,
  repo: string = 'thomasdavis/omega'
): Promise<GitHubIssue[]> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues?labels=railway-error&state=open&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch GitHub issues:', response.statusText);
      return [];
    }

    const issues = await response.json() as any[];
    return issues.map((issue: any) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      state: issue.state,
      labels: issue.labels.map((l: any) => l.name),
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      html_url: issue.html_url,
    }));
  } catch (error) {
    console.error('Error fetching GitHub issues:', error);
    return [];
  }
}

/**
 * Uses AI to determine if two errors are duplicates or similar
 */
export async function checkSimilarity(
  newError: ErrorSummary,
  existingIssue: GitHubIssue
): Promise<{ isDuplicate: boolean; similarityScore: number; reasoning: string }> {
  const prompt = `Compare these two Railway errors and determine if they are duplicates or similar issues.

NEW ERROR:
Title: ${newError.title}
Category: ${newError.category}
Description: ${newError.description}
Potential Causes: ${newError.potentialCauses.join(', ')}

EXISTING ISSUE #${existingIssue.number}:
Title: ${existingIssue.title}
Body: ${existingIssue.body.slice(0, 1000)}

Analyze if these are:
1. DUPLICATE - Same root cause, same error (score: 0.9-1.0)
2. SIMILAR - Related errors, might share causes (score: 0.6-0.89)
3. DIFFERENT - Unrelated errors (score: 0.0-0.59)

Consider:
- Error messages and stack traces
- Categories and types
- Root causes
- Affected files/services

Respond in JSON:
{
  "isDuplicate": true/false,
  "similarityScore": 0.0-1.0,
  "reasoning": "Brief explanation"
}`;

  try {
    const result = await generateText({
      model: openai('gpt-5-mini'),
      prompt,
      temperature: 0.2,
    });

    const analysis = JSON.parse(result.text);

    return {
      isDuplicate: analysis.isDuplicate || analysis.similarityScore >= 0.9,
      similarityScore: analysis.similarityScore || 0,
      reasoning: analysis.reasoning || 'AI analysis completed',
    };
  } catch (error) {
    console.error('Failed to check similarity with AI:', error);

    // Fallback to simple string matching
    const titleSimilarity = calculateStringSimilarity(
      newError.title.toLowerCase(),
      existingIssue.title.toLowerCase()
    );

    return {
      isDuplicate: titleSimilarity > 0.8,
      similarityScore: titleSimilarity,
      reasoning: 'Fallback string matching used',
    };
  }
}

/**
 * Simple string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Finds duplicate or similar issues
 */
export async function findDuplicateIssue(
  newError: ErrorSummary,
  existingIssues: GitHubIssue[]
): Promise<IssueSearchResult> {
  if (existingIssues.length === 0) {
    return {
      isDuplicate: false,
      shouldUpdate: false,
    };
  }

  // Check each existing issue for similarity
  for (const issue of existingIssues) {
    const similarity = await checkSimilarity(newError, issue);

    // If exact duplicate (>90% similar), return existing issue
    if (similarity.isDuplicate || similarity.similarityScore >= 0.9) {
      return {
        isDuplicate: true,
        existingIssue: issue,
        similarityScore: similarity.similarityScore,
        shouldUpdate: true,
      };
    }

    // If similar (60-89%), also update but note it's not exact duplicate
    if (similarity.similarityScore >= 0.6) {
      return {
        isDuplicate: false,
        existingIssue: issue,
        similarityScore: similarity.similarityScore,
        shouldUpdate: true,
      };
    }
  }

  return {
    isDuplicate: false,
    shouldUpdate: false,
  };
}

/**
 * Creates a new GitHub issue
 */
export async function createGitHubIssue(
  githubToken: string,
  error: RailwayError,
  summary: ErrorSummary,
  repo: string = 'thomasdavis/omega'
): Promise<GitHubIssue | null> {
  const issueBody = formatIssueBody(error, summary);

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: summary.title,
        body: issueBody,
        labels: ['railway-error', 'automated', summary.severity, summary.category.toLowerCase().replace(/\s+/g, '-')],
      }),
    });

    if (!response.ok) {
      console.error('Failed to create GitHub issue:', response.statusText);
      return null;
    }

    const issue = await response.json() as any;
    return {
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      labels: issue.labels.map((l: any) => l.name),
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      html_url: issue.html_url,
    };
  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    return null;
  }
}

/**
 * Updates an existing GitHub issue with new error occurrence
 */
export async function updateGitHubIssue(
  githubToken: string,
  issueNumber: number,
  error: RailwayError,
  summary: ErrorSummary,
  repo: string = 'thomasdavis/omega'
): Promise<boolean> {
  const commentBody = formatUpdateComment(error, summary);

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: commentBody,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error updating GitHub issue:', error);
    return false;
  }
}

/**
 * Formats issue body for new issue
 */
function formatIssueBody(error: RailwayError, summary: ErrorSummary): string {
  return `## Railway Error Detected

**Severity:** ${summary.severity.toUpperCase()}
**Category:** ${summary.category}
**Service:** ${error.serviceName}
**Timestamp:** ${error.timestamp}

### Description

${summary.description}

### Error Details

\`\`\`
${error.message}
\`\`\`

${error.stackTrace ? `### Stack Trace\n\n\`\`\`\n${error.stackTrace}\n\`\`\`\n` : ''}

### Potential Causes

${summary.potentialCauses.map((cause, i) => `${i + 1}. ${cause}`).join('\n')}

### Suggested Fixes

${summary.suggestedFixes.map((fix, i) => `${i + 1}. ${fix}`).join('\n')}

${summary.missingEnvVars.length > 0 ? `### Missing Environment Variables\n\nThe following environment variables may be missing or misconfigured:\n\n${summary.missingEnvVars.map(v => `- \`${v}\``).join('\n')}\n` : ''}

${summary.relatedFiles.length > 0 ? `### Related Files\n\n${summary.relatedFiles.map(f => `- \`${f}\``).join('\n')}\n` : ''}

${error.deploymentId ? `### Deployment Info\n\n- **Deployment ID:** ${error.deploymentId}\n` : ''}${error.commitSha ? `- **Commit:** ${error.commitSha}\n` : ''}${error.commitMessage ? `- **Message:** ${error.commitMessage}\n` : ''}

---

@claude Please analyze this Railway error and investigate potential fixes.`;
}

/**
 * Formats update comment for existing issue
 */
function formatUpdateComment(error: RailwayError, summary: ErrorSummary): string {
  return `## Error Recurrence Detected

**Timestamp:** ${error.timestamp}
**Service:** ${error.serviceName}

This error has occurred again. Details:

\`\`\`
${error.message}
\`\`\`

${error.deploymentId ? `**Deployment ID:** ${error.deploymentId}\n` : ''}${error.commitSha ? `**Commit:** ${error.commitSha}\n` : ''}

${summary.missingEnvVars.length > 0 ? `### Environment Variables\n\nPotentially missing:\n${summary.missingEnvVars.map(v => `- \`${v}\``).join('\n')}\n` : ''}

---

@claude This error has recurred. Please review the latest occurrence and update your analysis.`;
}
