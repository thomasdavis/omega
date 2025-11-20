/**
 * Query Messages Tool
 * Allows users to query the message database using natural language
 * Translates natural language to SQL and executes queries
 */

import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { getDatabase } from '../../database/client.js';
import { saveQuery } from '../../database/queryService.js';
import { OMEGA_MODEL } from '../../config/models.js';

export const queryMessagesTool = tool({
  description: `Query the message history database using natural language.

  This tool allows you to search through all stored messages, AI responses, and tool executions.

  Examples:
  - "Show me all messages from user123 in the last 24 hours"
  - "Find messages containing 'python'"
  - "Show me all tool executions from yesterday"
  - "What did I ask about JavaScript last week?"

  The tool will:
  1. Translate your natural language query into SQL
  2. Execute the query safely
  3. Return the results with a summary
  4. Store the query and results for future reference`,

  parameters: z.object({
    query: z.string().describe('Natural language query to search the message database'),
    userId: z.string().optional().describe('User ID making the query (for tracking)'),
    username: z.string().optional().describe('Username making the query (for tracking)'),
  }),

  execute: async ({ query, userId, username }) => {
    const startTime = Date.now();

    try {
      console.log(`🔍 Query messages: "${query}"`);

      // Use AI to translate natural language to SQL
      const sqlTranslation = await generateText({
        model: openai.chat(OMEGA_MODEL),
        prompt: `You are a SQL expert. Convert the following natural language query into a safe SQL query for a SQLite database.

Database Schema:
- messages table with columns:
  - id (TEXT PRIMARY KEY)
  - timestamp (INTEGER - Unix timestamp in milliseconds)
  - sender_type (TEXT - 'human', 'ai', or 'tool')
  - user_id (TEXT)
  - username (TEXT)
  - channel_id (TEXT)
  - channel_name (TEXT)
  - guild_id (TEXT)
  - message_content (TEXT)
  - tool_name (TEXT - nullable)
  - tool_args (TEXT - JSON string, nullable)
  - tool_result (TEXT - JSON string, nullable)
  - session_id (TEXT - nullable)
  - parent_message_id (TEXT - nullable)
  - metadata (TEXT - JSON string, nullable)
  - created_at (INTEGER - Unix timestamp)

Important rules:
1. ONLY generate SELECT queries - no INSERT, UPDATE, DELETE, DROP, etc.
2. Always limit results to a reasonable number (default 100, max 500)
3. Use ORDER BY timestamp DESC for chronological ordering
4. For time-based queries, remember timestamp is in milliseconds
5. For full-text search, you can query the messages_fts virtual table
6. Return ONLY the SQL query, no explanations

Natural language query: "${query}"

SQL Query:`,
      });

      const sqlQuery = sqlTranslation.text.trim().replace(/^```sql\n?/, '').replace(/\n?```$/, '').trim();
      console.log(`   Translated SQL: ${sqlQuery}`);

      // Validate the SQL query for safety
      const lowerSql = sqlQuery.toLowerCase();
      const forbiddenKeywords = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate'];

      if (forbiddenKeywords.some(keyword => lowerSql.includes(keyword))) {
        const error = 'Query rejected: Only SELECT queries are allowed for security reasons';

        if (userId && username) {
          await saveQuery({
            userId,
            username,
            queryText: query,
            translatedSql: sqlQuery,
            error,
            executionTimeMs: Date.now() - startTime,
          });
        }

        return {
          success: false,
          error,
          originalQuery: query,
        };
      }

      // Execute the query
      const db = getDatabase();
      const result = await db.execute(sqlQuery);

      const executionTime = Date.now() - startTime;
      const resultCount = result.rows.length;

      console.log(`   Query executed: ${resultCount} results in ${executionTime}ms`);

      // Generate a summary of the results using AI
      const summaryPrompt = `Summarize the following database query results in a clear, concise way for the user.

Original query: "${query}"
Number of results: ${resultCount}

Results (showing first 10):
${JSON.stringify(result.rows.slice(0, 10), null, 2)}

Provide a natural language summary that:
1. Confirms what was found
2. Highlights key insights or patterns
3. Mentions the total count
4. Is conversational and helpful

Summary:`;

      const summaryResponse = await generateText({
        model: openai.chat(OMEGA_MODEL),
        prompt: summaryPrompt,
      });

      const aiSummary = summaryResponse.text.trim();

      // Save the query to the queries table
      if (userId && username) {
        await saveQuery({
          userId,
          username,
          queryText: query,
          translatedSql: sqlQuery,
          aiSummary,
          queryResult: JSON.stringify(result.rows),
          resultCount,
          executionTimeMs: executionTime,
        });
      }

      return {
        success: true,
        summary: aiSummary,
        resultCount,
        results: result.rows,
        translatedSql: sqlQuery,
        executionTimeMs: executionTime,
        note: 'Full results are stored in the database. You can view them on the web interface.',
      };

    } catch (error) {
      console.error('Error executing query:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      if (userId && username) {
        await saveQuery({
          userId,
          username,
          queryText: query,
          error: errorMessage,
          executionTimeMs: Date.now() - startTime,
        });
      }

      return {
        success: false,
        error: `Failed to execute query: ${errorMessage}`,
        originalQuery: query,
      };
    }
  },
});
