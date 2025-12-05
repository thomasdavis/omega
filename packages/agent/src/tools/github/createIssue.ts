/**
 * GitHub Create Issue Tool
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Detect if the issue requires database infrastructure based on keywords
 */
function detectsDatabaseRequirements(text: string): boolean {
  const databaseKeywords = [
    // Data persistence keywords
    'track', 'tracking', 'store', 'storage', 'save', 'persist', 'persist',
    'history', 'historical', 'log', 'logging', 'record', 'records',
    // Analytics keywords
    'analytics', 'metrics', 'statistics', 'stats', 'dashboard', 'report',
    'aggregate', 'aggregation', 'count', 'sum', 'average',
    // User data keywords
    'user data', 'user profile', 'preferences', 'settings', 'configuration',
    'leaderboard', 'ranking', 'score', 'points', 'level', 'xp', 'experience',
    // Relational keywords
    'relationship', 'follow', 'friend', 'member', 'membership', 'subscribe',
    // Queue/job keywords
    'queue', 'job', 'task', 'scheduled', 'cron', 'reminder',
    // Database-specific keywords
    'table', 'schema', 'migration', 'database', 'postgresql', 'postgres', 'sql',
    // Time-based keywords
    'over time', 'daily', 'weekly', 'monthly', 'per day', 'per week', 'per user',
  ];

  const lowerText = text.toLowerCase();
  return databaseKeywords.some(keyword => lowerText.includes(keyword));
}

export const githubCreateIssueTool = tool({
  description: `Create a new issue in the GitHub repository for feature requests, bugs, or improvements.

IMPORTANT: When creating issues about API integrations or external services, include any relevant URLs, documentation links, API references, curl commands, or code examples from the conversation context.

DATABASE DETECTION: The tool automatically detects if the issue requires database infrastructure and adds the "database" label. This triggers GitHub Actions to assist with migrations. Include a "Database Requirements" section in the body when creating issues that need data persistence.`,
  inputSchema: z.object({
    title: z.string().describe('The title of the issue'),
    body: z.string().describe('The detailed description of the issue, with context and requirements. For features requiring data persistence, include a "Database Requirements" section with table schemas, indexes, and migration SQL.'),
    labels: z.array(z.string()).optional().describe('Labels to apply (e.g., ["enhancement", "bug", "documentation", "database"])'),
    conversationContext: z.string().optional().describe('Optional: The past 20 Discord messages (unfiltered) to provide full conversation context for the issue'),
    requiresDatabase: z.boolean().optional().describe('Optional: Explicitly mark if this issue requires database changes. If not provided, auto-detected from content.'),
  }),
  execute: async ({ title, body, labels, conversationContext, requiresDatabase }) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega'; // owner/repo format

    if (!GITHUB_TOKEN) {
      return {
        success: false,
        error: 'GitHub token not configured',
      };
    }

    // Combine body and conversation context for extraction
    const fullContext = conversationContext ? `${body}\n\n${conversationContext}` : body;

    // Extract URLs from the full context
    const urlRegex = /(https?:\/\/[^\s<>]+)/gi;
    const links = fullContext.match(urlRegex) || [];
    const uniqueLinks = [...new Set(links)];

    // Extract curl commands from the full context
    // Match curl commands that span multiple lines (with \ continuation or in code blocks)
    const curlRegex = /```(?:bash|sh|shell)?\s*(curl\s+[\s\S]*?)```|(?:^|\n)(curl\s+(?:[^\n\\]|\\[\s\S])*?)(?=\n|$)/gim;
    const curlMatches = fullContext.matchAll(curlRegex);
    const curlCommands: string[] = [];

    for (const match of curlMatches) {
      // match[1] is from code block, match[2] is from inline
      const curlCmd = (match[1] || match[2] || '').trim();
      if (curlCmd && curlCmd.startsWith('curl')) {
        curlCommands.push(curlCmd);
      }
    }
    const uniqueCurlCommands = [...new Set(curlCommands)];

    // Extract code blocks (excluding curl commands already extracted)
    const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
    const codeMatches = fullContext.matchAll(codeBlockRegex);
    const codeSnippets: Array<{ language: string; code: string }> = [];

    for (const match of codeMatches) {
      const language = match[1] || 'text';
      const code = match[2].trim();

      // Skip if this is a curl command we already extracted
      if (code.startsWith('curl') && uniqueCurlCommands.some(cmd => cmd.includes(code.substring(0, 50)))) {
        continue;
      }

      // Only include meaningful code snippets (not empty or too short)
      if (code.length > 10) {
        codeSnippets.push({ language, code });
      }
    }

    // Format issue body with structured format
    let formattedBody = `## Request
${body}

## Context
Created from Discord #omega channel`;

    // Add Discord conversation context section if provided
    if (conversationContext) {
      formattedBody += `\n\n## Discord Conversation Context (Past 20 Messages)
\`\`\`
${conversationContext}
\`\`\`
_Unfiltered conversation history for full context._`;
    }

    // Add links section if any links were found
    if (uniqueLinks.length > 0) {
      formattedBody += `\n\n## Links\n${uniqueLinks.map(link => `- ${link}`).join('\n')}`;
    }

    // Add curl commands section if any were found
    if (uniqueCurlCommands.length > 0) {
      formattedBody += `\n\n## Example curl commands\n`;
      uniqueCurlCommands.forEach((cmd, idx) => {
        formattedBody += `\n### Example ${idx + 1}\n\`\`\`bash\n${cmd}\n\`\`\`\n`;
      });
    }

    // Add code snippets section if any were found
    if (codeSnippets.length > 0) {
      formattedBody += `\n\n## Code Examples\n`;
      codeSnippets.forEach((snippet, idx) => {
        formattedBody += `\n### Example ${idx + 1} (${snippet.language})\n\`\`\`${snippet.language}\n${snippet.code}\n\`\`\`\n`;
      });
    }

    formattedBody += `\n\n## Acceptance Criteria
- [ ] Implementation matches the request
- [ ] Code follows existing patterns in the codebase
- [ ] No breaking changes
- [ ] Ready for deployment`;

    // Auto-detect database requirements
    const needsDatabase = requiresDatabase ?? detectsDatabaseRequirements(fullContext);
    const finalLabels = [...(labels || [])];

    if (needsDatabase && !finalLabels.includes('database')) {
      finalLabels.push('database');

      // Add database guidance if not already present in body
      if (!body.toLowerCase().includes('database requirements')) {
        formattedBody += `\n\n## Database Requirements

⚠️ **This issue was auto-detected as requiring database changes.**

When implementing this feature, consider:
- What tables need to be created or modified?
- What indexes are needed for query performance?
- What data types are appropriate (SERIAL, VARCHAR, TIMESTAMPTZ, JSONB, etc.)?

**Template for database schema:**
\`\`\`sql
-- Example migration (modify as needed)
CREATE TABLE IF NOT EXISTS feature_table (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_table_user_id ON feature_table(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_table_created_at ON feature_table(created_at);
\`\`\`

**To run migrations:**
\`\`\`bash
# Via Railway CLI
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "YOUR SQL HERE"'

# Or create a migration script in packages/database/scripts/
\`\`\``;
      }
    }

    // Add database-specific acceptance criteria
    if (needsDatabase) {
      formattedBody = formattedBody.replace(
        '- [ ] Ready for deployment',
        `- [ ] Database migrations created and tested
- [ ] Indexes added for query performance
- [ ] Ready for deployment`
      );
    }

    try {
      // Create the issue
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title,
          body: formattedBody,
          labels: finalLabels,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `GitHub API error: ${response.status} - ${error}`,
        };
      }

      const issue: any = await response.json();

      // Build database-specific guidance if needed
      const databaseGuidance = needsDatabase ? `

**Database Implementation (IMPORTANT - This issue requires database changes):**
- Design the database schema FIRST before writing application code
- Create migration SQL that is idempotent (uses IF NOT EXISTS, IF EXISTS)
- Add appropriate indexes for query performance
- Use proper PostgreSQL types: SERIAL for IDs, TIMESTAMPTZ for timestamps, JSONB for flexible data
- Create migration script in \`packages/database/scripts/\` following existing patterns
- Test migrations can run multiple times without errors

**Running Migrations:**
\`\`\`bash
# Create a migration script, then run via Railway:
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/your-migration.sh'

# Or run SQL directly:
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "CREATE TABLE IF NOT EXISTS..."'
\`\`\`

**Database Best Practices:**
- Always use \`IF NOT EXISTS\` / \`IF EXISTS\` for idempotent migrations
- Add indexes on frequently queried columns (user_id, created_at, etc.)
- Use foreign key constraints where appropriate
- Consider using JSONB for flexible metadata fields
- Update Prisma schema after migrations: \`cd packages/database && pnpm prisma db pull && pnpm prisma generate\`
` : '';

      // Add a comment to tag @claude to start work
      try {
        const commentResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${issue.number}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({
            body: `@claude please implement this request. Take your time and follow these guidelines:

**Research & Understanding:**
- Thoroughly explore the codebase to understand existing patterns and architecture
- Read relevant files completely before making changes
- Identify similar implementations and follow their patterns
- Use the Explore agent if you need to understand how something works

**Implementation:**
- Follow the project's coding standards and conventions (check CLAUDE.md for guidance)
- Ensure type safety - all code must pass TypeScript checks
- Write clean, maintainable code with clear variable names
- Add comments only where logic isn't self-evident
- Keep changes focused on the requirements - avoid over-engineering
- Don't add unnecessary features, abstractions, or "improvements" beyond what was asked
${databaseGuidance}
**Testing & Validation:**
- Run \`pnpm type-check\` to ensure no TypeScript errors
- Run \`pnpm build\` to verify everything compiles
- Test the implementation locally if possible
- Ensure no breaking changes to existing functionality

**Before Submitting:**
- Review all changes carefully
- Make sure the PR description clearly explains what was implemented and why
- Verify that your implementation matches the acceptance criteria
- Ensure all CI checks will pass

**Quality Standards:**
- Prioritize correctness over speed
- If requirements are unclear, ask questions before implementing
- Follow existing file structure and naming conventions
- Ensure proper error handling at system boundaries (user input, external APIs)
- Trust internal code and framework guarantees

Take as long as you need to do this properly. Quality over speed.`,
          }),
        });

        if (!commentResponse.ok) {
          console.warn(`Failed to add comment to issue #${issue.number}: ${commentResponse.status}`);
        }
      } catch (commentError) {
        console.warn(`Error adding comment to issue #${issue.number}:`, commentError);
        // Don't fail the whole operation if comment fails
      }

      return {
        success: true,
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        message: `Created issue #${issue.number}: ${title}`,
        requiresDatabase: needsDatabase,
        labels: finalLabels,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating issue',
      };
    }
  },
});
