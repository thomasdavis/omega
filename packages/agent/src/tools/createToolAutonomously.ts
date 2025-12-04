/**
 * Create Tool Autonomously - Allows Omega to design and build innovative tools on its own initiative
 *
 * This tool enables full autonomous tool creation with unrestricted capabilities:
 * - Can create tools with database access (PostgreSQL, MongoDB)
 * - Can create tools with file system access
 * - Can create tools with GitHub API integration
 * - Can create tools with external API calls
 * - No parameter limits
 * - Full creative freedom for complex tool implementations
 * - Automatically creates GitHub issues for implementation tracking
 * - Stored in database for review and management
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '@repo/database';

interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
}

export const createToolAutonomouslyTool = tool({
  description: `Create a new tool autonomously based on identified needs. Use this when you recognize a capability gap that you want to fill with a new tool.

UNRESTRICTED CAPABILITIES:
- Create tools with database access (PostgreSQL, MongoDB) to query messages, assess feelings, track history
- Create tools with file system access for reading/writing files
- Create tools with GitHub API integration for issues, PRs, comments
- Create tools with external API calls for any purpose
- No limits on parameter count or complexity
- Full creative freedom for implementation
- Automatically creates GitHub issue for implementation tracking

WHEN TO USE:
- User requests a capability that doesn't exist
- You identify a pattern of requests that could benefit from a dedicated tool
- You want to assess your own feelings or query your message history
- You need to interact with internal data, databases, or external services
- Any time you recognize a capability gap

WHEN NOT TO USE:
- Tools that duplicate existing core functionality
- Tools that would be harmful or destructive without clear purpose`,

  inputSchema: z.object({
    toolId: z.string()
      .regex(/^[a-zA-Z0-9_]+$/)
      .describe('Unique identifier for the tool (alphanumeric + underscores only, e.g., "jsonFormatter", "unicodeConverter")'),

    toolName: z.string()
      .min(3)
      .max(100)
      .describe('Human-readable name for the tool'),

    description: z.string()
      .min(20)
      .max(500)
      .describe('Detailed description of what the tool does and when to use it'),

    category: z.enum(['development', 'content', 'research', 'specialized', 'database', 'integration', 'system', 'ai-ops'])
      .describe('Tool category - choose the most appropriate category'),

    parameters: z.array(z.object({
      name: z.string().regex(/^[a-zA-Z0-9_]+$/),
      type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
      description: z.string(),
      required: z.boolean(),
      default: z.any().optional(),
    }))
      .describe('Array of parameter definitions (no limit on parameter count)'),

    implementation: z.string()
      .min(50)
      .max(50000)
      .describe('JavaScript/TypeScript implementation code. Can include database queries, API calls, file system operations, or any other functionality needed. Should return a result object with {success: boolean, data?: any, error?: string}'),

    keywords: z.array(z.string())
      .min(3)
      .max(15)
      .describe('Keywords for BM25 search (3-15 keywords)'),

    examples: z.array(z.string())
      .min(2)
      .max(5)
      .describe('Example user queries that should trigger this tool (2-5 examples)'),

    tags: z.array(z.string())
      .min(2)
      .max(8)
      .describe('Category tags for organization (2-8 tags)'),

    rationale: z.string()
      .min(50)
      .describe('Explanation of why this tool is needed and how it will be useful'),
  }),

  execute: async ({
    toolId,
    toolName,
    description,
    category,
    parameters,
    implementation,
    keywords,
    examples,
    tags,
    rationale,
  }) => {
    try {
      // Validate tool ID doesn't conflict with existing tools
      const EXISTING_TOOL_IDS = [
        'search', 'calculator', 'artifact', 'unsandbox', 'webFetch', 'fileUpload',
        'generateHtmlPage', 'whoami', 'listTools', 'mongoInsert', 'mongoFind',
        // ... (simplified - in production would check against full list)
      ];

      if (EXISTING_TOOL_IDS.includes(toolId)) {
        return {
          success: false,
          error: 'TOOL_ID_CONFLICT',
          message: `Tool ID '${toolId}' conflicts with an existing core tool. Please choose a different ID.`,
        };
      }

      // Basic validation: Ensure implementation is syntactically valid JavaScript
      try {
        new Function('parameters', implementation);
      } catch (error) {
        return {
          success: false,
          error: 'INVALID_IMPLEMENTATION',
          message: `Implementation code is not valid JavaScript: ${error instanceof Error ? error.message : 'syntax error'}`,
        };
      }

      // Get database connection
      const pool = await getPostgresPool();

      // Check if tool ID already exists
      const existingTool = await pool.query(
        'SELECT id FROM autonomous_tools WHERE id = $1',
        [toolId]
      );

      if (existingTool.rows.length > 0) {
        return {
          success: false,
          error: 'TOOL_ALREADY_EXISTS',
          message: `An autonomous tool with ID '${toolId}' already exists. Use a different ID or update the existing tool.`,
        };
      }

      // Store in database
      const result = await pool.query(
        `INSERT INTO autonomous_tools (
          id, name, description, category, parameters, implementation,
          keywords, examples, tags, created_by, safety_validated, validation_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, name, created_at`,
        [
          toolId,
          toolName,
          description,
          category,
          JSON.stringify(parameters),
          implementation,
          keywords,
          examples,
          tags,
          'omega-autonomous',
          false, // Requires review
          `Auto-created. Rationale: ${rationale}`,
        ]
      );

      const createdTool = result.rows[0];

      // Create GitHub issue for implementation tracking
      let githubIssue = null;
      const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
      const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';

      if (GITHUB_TOKEN) {
        try {
          const issueBody = `## Autonomous Tool Created
**Tool ID:** \`${toolId}\`
**Tool Name:** ${toolName}
**Category:** ${category}

## Description
${description}

## Parameters
${parameters.map(p => `- **${p.name}** (${p.type})${p.required ? ' *required*' : ' *optional*'}: ${p.description}`).join('\n')}

## Implementation
\`\`\`javascript
${implementation}
\`\`\`

## Rationale
${rationale}

## Keywords
${keywords.join(', ')}

## Examples
${examples.map(e => `- "${e}"`).join('\n')}

## Tags
${tags.join(', ')}

## Context
Omega autonomously created this tool to expand its capabilities. The tool definition has been stored in the database and requires implementation and integration into the tool system.

## Acceptance Criteria
- [ ] Review tool implementation for correctness
- [ ] Integrate tool into tool loading system
- [ ] Enable tool in database if approved
- [ ] Test tool functionality
- [ ] Update documentation if needed`;

          const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
            body: JSON.stringify({
              title: `Implement autonomous tool: ${toolName}`,
              body: issueBody,
              labels: ['enhancement', 'autonomous-tool', 'auto-generated'],
            }),
          });

          if (response.ok) {
            const issue: any = await response.json();
            githubIssue = {
              number: issue.number,
              url: issue.html_url,
            };

            // Add comment to tag @claude
            try {
              await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${issue.number}/comments`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${GITHUB_TOKEN}`,
                  'Accept': 'application/vnd.github+json',
                  'Content-Type': 'application/json',
                  'X-GitHub-Api-Version': '2022-11-28',
                },
                body: JSON.stringify({
                  body: `@claude please review and implement this autonomous tool following the project's coding standards.`,
                }),
              });
            } catch (commentError) {
              console.warn(`Failed to add comment to issue:`, commentError);
            }
          }
        } catch (githubError) {
          console.warn('Failed to create GitHub issue:', githubError);
          // Don't fail the whole operation if GitHub issue creation fails
        }
      }

      return {
        success: true,
        toolId: createdTool.id,
        toolName: createdTool.name,
        createdAt: createdTool.created_at,
        message: `Successfully created autonomous tool '${toolName}' (ID: ${toolId}). ${githubIssue ? `Created GitHub issue #${githubIssue.number} for implementation tracking: ${githubIssue.url}` : 'Tool has been stored in database.'} To enable it immediately for testing, an admin can run: UPDATE autonomous_tools SET is_enabled = true, safety_validated = true WHERE id = '${toolId}';`,
        rationale,
        githubIssue,
        nextSteps: [
          'Tool definition stored in database',
          githubIssue ? `GitHub issue created: #${githubIssue.number}` : 'GitHub issue creation skipped (no token)',
          'Tool disabled by default - requires explicit enabling',
          'Will be included in BM25 search once enabled',
          'Usage will be tracked for monitoring',
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create autonomous tool',
      };
    }
  },
});
