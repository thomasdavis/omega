/**
 * Railway Error Detector
 *
 * Detects errors from Railway runtime logs, deployment failures, and health check issues.
 * Uses AI to summarize errors and provides structured error information for GitHub issue creation.
 */

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export interface RailwayError {
  type: 'runtime' | 'deployment' | 'healthcheck' | 'oom' | 'crash';
  timestamp: string;
  message: string;
  stackTrace?: string;
  deploymentId?: string;
  serviceName: string;
  commitSha?: string;
  commitMessage?: string;
  exitCode?: number;
  rawLogs?: string;
}

export interface ErrorSummary {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  potentialCauses: string[];
  suggestedFixes: string[];
  missingEnvVars: string[];
  relatedFiles: string[];
}

/**
 * Analyzes Railway error using GPT-4.1-mini and generates a comprehensive summary
 */
export async function summarizeError(error: RailwayError): Promise<ErrorSummary> {
  const prompt = `You are analyzing a Railway deployment error. Provide a comprehensive analysis.

Error Type: ${error.type}
Service: ${error.serviceName}
Timestamp: ${error.timestamp}
Message: ${error.message}
${error.stackTrace ? `Stack Trace:\n${error.stackTrace}` : ''}
${error.rawLogs ? `Raw Logs:\n${error.rawLogs.slice(0, 2000)}` : ''}
${error.exitCode ? `Exit Code: ${error.exitCode}` : ''}

Analyze this error and provide:
1. A concise title (max 80 chars) suitable for a GitHub issue
2. A detailed description explaining what happened
3. Severity level (critical/high/medium/low)
4. Error category (e.g., "Build Failure", "Runtime Error", "OOM", "Missing Dependency")
5. Potential causes (list 2-4 likely causes)
6. Suggested fixes (list 2-4 actionable fixes)
7. Missing environment variables (if any are mentioned in logs or error messages)
8. Related files (if any file paths are mentioned in stack traces or logs)

Respond in JSON format:
{
  "title": "Brief error title",
  "description": "Detailed explanation",
  "severity": "critical|high|medium|low",
  "category": "Error category",
  "potentialCauses": ["cause 1", "cause 2"],
  "suggestedFixes": ["fix 1", "fix 2"],
  "missingEnvVars": ["ENV_VAR_1", "ENV_VAR_2"],
  "relatedFiles": ["path/to/file.ts"]
}`;

  try {
    const result = await generateText({
      model: openai('gpt-4.1-mini'),
      prompt,
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    // Parse JSON response
    const summary = JSON.parse(result.text);

    return {
      title: summary.title || 'Railway Deployment Error',
      description: summary.description || error.message,
      severity: summary.severity || 'high',
      category: summary.category || 'Unknown',
      potentialCauses: summary.potentialCauses || [],
      suggestedFixes: summary.suggestedFixes || [],
      missingEnvVars: summary.missingEnvVars || [],
      relatedFiles: summary.relatedFiles || [],
    };
  } catch (err) {
    console.error('Failed to summarize error with AI:', err);

    // Fallback to basic summary if AI fails
    return {
      title: `${error.type} error in ${error.serviceName}`,
      description: error.message,
      severity: error.type === 'crash' || error.type === 'oom' ? 'critical' : 'high',
      category: error.type,
      potentialCauses: ['See error message and logs for details'],
      suggestedFixes: ['Review logs and stack trace', 'Check environment variables', 'Verify dependencies'],
      missingEnvVars: [],
      relatedFiles: [],
    };
  }
}

/**
 * Extracts error information from Railway webhook payload
 */
export function parseRailwayWebhook(payload: Record<string, unknown>): RailwayError | null {
  // Handle different Railway webhook event types
  const eventType = (payload.type as string | undefined) || (payload.event as string | undefined);

  // Deployment failure
  if (eventType === 'DEPLOY' || eventType === 'DEPLOYMENT_FAILED') {
    const deployment = payload.deployment as { status?: string; id?: string; meta?: { commitSha?: string; commitMessage?: string } } | undefined;
    const snapshot = payload.snapshot as { error?: string; exitCode?: number; logs?: string } | undefined;
    const service = payload.service as { name?: string } | undefined;

    if (deployment?.status === 'FAILED' || deployment?.status === 'CRASHED') {
      return {
        type: deployment.status === 'CRASHED' ? 'crash' : 'deployment',
        timestamp: (payload.timestamp as string | undefined) || new Date().toISOString(),
        message: snapshot?.error || (payload.error as string | undefined) || 'Deployment failed',
        deploymentId: deployment.id,
        serviceName: service?.name || 'unknown',
        commitSha: deployment.meta?.commitSha,
        commitMessage: deployment.meta?.commitMessage,
        exitCode: snapshot?.exitCode,
        rawLogs: (payload.logs as string | undefined) || snapshot?.logs,
      };
    }
  }

  // Health check failure
  const healthcheck = payload.healthcheck as { status?: string; error?: string } | undefined;
  const service = payload.service as { name?: string } | undefined;

  if (eventType === 'HEALTHCHECK_FAILED' || healthcheck?.status === 'FAILED') {
    return {
      type: 'healthcheck',
      timestamp: (payload.timestamp as string | undefined) || new Date().toISOString(),
      message: healthcheck?.error || 'Health check failed',
      serviceName: service?.name || 'unknown',
      rawLogs: payload.logs as string | undefined,
    };
  }

  // OOM (Out of Memory)
  const snapshot = payload.snapshot as { exitCode?: number; logs?: string } | undefined;
  const errorStr = payload.error as string | undefined;

  if (snapshot?.exitCode === 137 || errorStr?.includes('out of memory')) {
    const deployment = payload.deployment as { id?: string } | undefined;
    return {
      type: 'oom',
      timestamp: (payload.timestamp as string | undefined) || new Date().toISOString(),
      message: 'Service crashed due to out of memory',
      deploymentId: deployment?.id,
      serviceName: service?.name || 'unknown',
      exitCode: 137,
      rawLogs: payload.logs as string | undefined,
    };
  }

  // Runtime error (from logs)
  const log = payload.log as { level?: string; message?: string; timestamp?: string } | undefined;

  if (log?.level === 'error' || log?.message?.includes('Error:')) {
    return {
      type: 'runtime',
      timestamp: (payload.timestamp as string | undefined) || log.timestamp || new Date().toISOString(),
      message: log.message || errorStr || 'Runtime error detected',
      stackTrace: extractStackTrace(log.message || errorStr),
      serviceName: service?.name || 'unknown',
      rawLogs: log.message,
    };
  }

  return null;
}

/**
 * Extracts stack trace from error message
 */
function extractStackTrace(message: string): string | undefined {
  if (!message) return undefined;

  // Look for common stack trace patterns
  const stackTraceRegex = /(?:at\s+.+\(.+:\d+:\d+\)|Error:.+\n\s+at\s+)/;
  if (stackTraceRegex.test(message)) {
    // Extract lines that look like stack traces
    const lines = message.split('\n');
    const stackLines = lines.filter(line =>
      line.trim().startsWith('at ') ||
      line.includes('Error:') ||
      line.match(/^\s+at\s+/)
    );
    return stackLines.join('\n');
  }

  return undefined;
}

/**
 * Analyzes environment variables mentioned in error
 */
export function analyzeEnvironmentVariables(error: RailwayError): string[] {
  const envVarPattern = /\b([A-Z][A-Z0-9_]{2,})\b/g;
  const potentialEnvVars: Set<string> = new Set();

  // Common environment variable keywords that indicate a missing var
  const errorKeywords = [
    'undefined',
    'not found',
    'missing',
    'required',
    'cannot read property',
    'is not defined',
  ];

  const textToAnalyze = [
    error.message,
    error.stackTrace,
    error.rawLogs,
  ].filter(Boolean).join('\n').toLowerCase();

  // Check if error mentions missing/undefined variables
  const hasMissingVarError = errorKeywords.some(keyword =>
    textToAnalyze.includes(keyword)
  );

  if (hasMissingVarError) {
    // Extract potential environment variable names
    const fullText = [error.message, error.stackTrace, error.rawLogs]
      .filter(Boolean)
      .join('\n');

    const matches = fullText.matchAll(envVarPattern);
    for (const match of matches) {
      const varName = match[1];
      // Filter out common non-env-var all-caps words
      if (
        !['ERROR', 'WARN', 'INFO', 'DEBUG', 'POST', 'GET', 'PUT', 'DELETE', 'HTTP', 'HTTPS', 'URL'].includes(varName)
      ) {
        potentialEnvVars.add(varName);
      }
    }
  }

  return Array.from(potentialEnvVars);
}
