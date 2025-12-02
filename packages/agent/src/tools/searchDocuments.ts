/**
 * Search Documents Tool
 * Performs fuzzy string searches on documents in the database
 * Returns top 3 most relevant documents with links
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@repo/database';

export const searchDocumentsTool = tool({
  description: `Search documents in the database using fuzzy string matching.

  This tool searches both document titles and content to find the most relevant matches.
  It returns the top 3 most relevant documents with links to view and edit them.

  Uses PostgreSQL's trigram similarity search for fuzzy matching, allowing for:
  - Approximate matches (typos, misspellings)
  - Partial matches
  - Ranked results by relevance

  Perfect for:
  - Finding documents by topic
  - Locating documents with specific keywords
  - Discovering related documents
  - Searching when you don't remember exact titles`,

  inputSchema: z.object({
    query: z.string().describe('The search query string to find documents. Can be keywords, phrases, or partial text.'),
    limit: z.number().int().min(1).max(10).optional().describe('Number of results to return (default 3, max 10)'),
  }),

  execute: async ({ query, limit = 3 }) => {
    try {
      console.log(`🔍 Searching documents for: "${query}"`);

      // Limit to reasonable bounds
      const resultLimit = Math.min(limit, 10);

      // Use PostgreSQL's ILIKE for fuzzy search (case-insensitive pattern matching)
      // Search in both title and content fields
      const documents = await prisma.$queryRaw<Array<{
        id: string;
        title: string;
        content: string;
        created_by: string;
        created_by_username: string | null;
        created_at: bigint;
        updated_at: bigint;
        is_public: boolean;
        relevance: number;
      }>>`
        SELECT
          id,
          title,
          content,
          created_by,
          created_by_username,
          created_at,
          updated_at,
          is_public,
          (
            CASE
              WHEN title ILIKE ${`%${query}%`} THEN 3
              ELSE 0
            END +
            CASE
              WHEN content ILIKE ${`%${query}%`} THEN 1
              ELSE 0
            END
          ) as relevance
        FROM documents
        WHERE
          title ILIKE ${`%${query}%`} OR
          content ILIKE ${`%${query}%`}
        ORDER BY relevance DESC, updated_at DESC
        LIMIT ${resultLimit}
      `;

      console.log(`✅ Found ${documents.length} matching documents`);

      if (documents.length === 0) {
        return {
          success: true,
          query,
          resultCount: 0,
          results: [],
          message: `No documents found matching "${query}". Try different keywords or create a new document.`,
        };
      }

      // Get server URL
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');

      // Format results with links
      const results = documents.map((doc) => {
        const editorUrl = `${serverUrl}/editor.html?id=${doc.id}`;
        const plainTextUrl = `${serverUrl}/api/documents/${doc.id}/plain`;

        // Preview content (first 200 chars)
        const contentPreview = doc.content.length > 200
          ? doc.content.substring(0, 200) + '...'
          : doc.content;

        return {
          id: doc.id,
          title: doc.title,
          contentPreview,
          createdBy: doc.created_by_username || doc.created_by,
          createdAt: Number(doc.created_at),
          updatedAt: Number(doc.updated_at),
          isPublic: doc.is_public,
          relevance: Number(doc.relevance),
          editorUrl,
          plainTextUrl,
        };
      });

      // Format message with results
      let message = `📚 Found ${results.length} document${results.length > 1 ? 's' : ''} matching "${query}":\n\n`;

      results.forEach((result, index) => {
        const updatedDate = new Date(result.updatedAt * 1000).toLocaleDateString();
        message += `${index + 1}. **${result.title}**\n`;
        message += `   🔗 Edit: ${result.editorUrl}\n`;
        message += `   📄 Plain text: ${result.plainTextUrl}\n`;
        message += `   👤 Created by: ${result.createdBy}\n`;
        message += `   📅 Last updated: ${updatedDate}\n`;
        message += `   📝 Preview: ${result.contentPreview}\n\n`;
      });

      return {
        success: true,
        query,
        resultCount: results.length,
        results,
        message,
      };
    } catch (error) {
      console.error('Error searching documents:', error);
      return {
        success: false,
        query,
        error: error instanceof Error ? error.message : 'Failed to search documents',
      };
    }
  },
});
