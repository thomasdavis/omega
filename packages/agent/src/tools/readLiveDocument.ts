/**
 * Read Live Document Tool
 * Allows Omega to read the content of any shared document it creates in real-time
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Fetch document content from the plain text API endpoint
 */
async function fetchDocumentContent(documentId: string): Promise<{ content: string; error?: string }> {
  try {
    // Get server URL
    const serverUrl = process.env.ARTIFACT_SERVER_URL
      || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
    const plainTextUrl = `${serverUrl}/api/documents/${documentId}/plain`;

    console.log(`📖 Fetching document content from: ${plainTextUrl}`);

    // Fetch the document content
    const response = await fetch(plainTextUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          content: '',
          error: 'Document not found. The document may have been deleted or the ID is incorrect.',
        };
      }
      return {
        content: '',
        error: `Failed to fetch document: HTTP ${response.status} ${response.statusText}`,
      };
    }

    const content = await response.text();
    console.log(`✅ Successfully fetched document content (${content.length} characters)`);

    return { content };
  } catch (error) {
    console.error('Error fetching document content:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred while fetching document',
    };
  }
}

export const readLiveDocumentTool = tool({
  description: `Read the current content of a live document in real-time.

  Use this tool to read and understand the content of any shared documents that have been created.
  This allows you to:
  - See user responses in Q&A documents
  - Check current state of collaborative documents
  - Understand what users have written in shared documents
  - Provide context-aware responses based on document content

  The tool fetches the most current version of the document from the database.

  Example use cases:
  - "Read the answers from the questions document I created"
  - "What did users write in the collaborative brainstorming document?"
  - "Check the responses in the feedback form"
  - "Read the content of document XYZ to understand what's there"`,

  inputSchema: z.object({
    documentId: z.string().describe('The ID of the document to read. This is returned when creating a document with createLiveDocument.'),
  }),

  execute: async ({ documentId }) => {
    try {
      console.log(`📖 Reading live document: ${documentId}`);

      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId)) {
        return {
          success: false,
          error: 'Invalid document ID format. Expected a UUID.',
        };
      }

      // Fetch document content
      const { content, error } = await fetchDocumentContent(documentId);

      if (error) {
        return {
          success: false,
          error,
          documentId,
        };
      }

      console.log(`✅ Document read successfully`);

      // Get server URL for reference
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
      const editorUrl = `${serverUrl}/editor.html?id=${documentId}`;

      return {
        success: true,
        documentId,
        content,
        editorUrl,
        characterCount: content.length,
        message: `Successfully read document content (${content.length} characters).\n\n📄 Editor URL: ${editorUrl}`,
      };
    } catch (error) {
      console.error('Error reading live document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read live document',
        documentId,
      };
    }
  },
});
