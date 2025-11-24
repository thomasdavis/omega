/**
 * Create Live Document Tool
 * Creates a collaborative live document from natural language requests
 * and returns a shareable link
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createDocument } from '../../database/documentService.js';
import { OMEGA_MODEL } from '../../config/models.js';

/**
 * Generate document content using AI based on natural language request
 */
async function generateDocumentContent(description: string): Promise<{ title: string; content: string }> {
  const model = openai.chat(OMEGA_MODEL);

  const prompt = `You are helping create a collaborative document based on a user's natural language request.

USER REQUEST:
${description}

TASK:
1. Generate an appropriate title for this document (keep it concise, 3-8 words)
2. Generate the initial content for this document based on the request

GUIDELINES:
- If the request is about creating questions (like "5 questions about the meaning of life"), generate those questions with space for answers
- If it's a template (like a Q&A, form, or structured document), create that structure
- Use clear formatting with headings, bullet points, and numbered lists as appropriate
- Leave blank spaces or placeholders where users should fill in content
- Make it collaborative-friendly (clear sections, organized structure)
- Use markdown-style formatting where appropriate (headings with ##, lists with -, etc.)

RESPONSE FORMAT:
Return a JSON object with two fields:
{
  "title": "The document title",
  "content": "The full document content with proper formatting and structure"
}

OUTPUT ONLY THE JSON - no explanations, no markdown code blocks, just the raw JSON object.`;

  const result = await generateText({
    model,
    prompt,
    temperature: 0.7,
  });

  try {
    const parsed = JSON.parse(result.text.trim());
    return {
      title: parsed.title || 'Untitled Document',
      content: parsed.content || '',
    };
  } catch (error) {
    // Fallback if JSON parsing fails
    console.error('Failed to parse AI response as JSON:', error);
    return {
      title: description.substring(0, 50).trim() + (description.length > 50 ? '...' : ''),
      content: description,
    };
  }
}

export const createLiveDocumentTool = tool({
  description: `Create a collaborative live document from a natural language request and get a shareable link.

  This tool dynamically generates document content based on your description, creates the document in the system,
  and returns a shareable link for collaborative editing.

  Perfect for:
  - Q&A documents (e.g., "create a document with 5 questions about the meaning of life")
  - Structured forms or templates
  - Collaborative brainstorming spaces
  - Meeting notes or agendas
  - Survey or feedback forms
  - Any other type of collaborative document you can describe

  The document will be:
  - Created with AI-generated content matching your description
  - Accessible via a shareable URL
  - Collaborative (multiple users can edit simultaneously)
  - Saved in the database with real-time sync via Yjs CRDT

  Example requests:
  - "create a live document where you ask about 5 questions about the meaning of life"
  - "create a Q&A document about favorite movies with 10 questions"
  - "create a meeting agenda template for sprint planning"
  - "create a feedback form with 3 sections"`,

  inputSchema: z.object({
    description: z.string().describe('Natural language description of the document to create. Be specific about the type, structure, and content you want.'),
    userId: z.string().optional().describe('User ID of the document creator. Use the current user\'s ID from context.'),
    username: z.string().optional().describe('Username of the document creator. Use the current user\'s username from context.'),
  }),

  execute: async ({ description, userId, username }) => {
    try {
      // Use defaults if not provided
      const creatorId = userId || 'anonymous';
      const creatorName = username || 'Anonymous';

      console.log('📝 Creating live document from description...');
      console.log('Description:', description);
      console.log('Creator:', creatorName || creatorId);

      // Generate document content using AI
      const { title, content } = await generateDocumentContent(description);

      console.log('✅ Document content generated');
      console.log('Title:', title);
      console.log('Content preview:', content.substring(0, 100) + '...');

      // Create the document in the database
      const document = await createDocument({
        title,
        content,
        createdBy: creatorId,
        createdByUsername: creatorName,
        isPublic: true, // Make documents public by default for easy sharing
      });

      console.log('✅ Document created with ID:', document.id);

      // Get server URL
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
      const editorUrl = `${serverUrl}/editor.html?id=${document.id}`;
      const plainTextUrl = `${serverUrl}/api/documents/${document.id}/plain`;

      console.log('✅ Live document created and ready!');
      console.log('Editor URL:', editorUrl);

      return {
        success: true,
        title,
        documentId: document.id,
        editorUrl,
        plainTextUrl,
        message: `✨ Created live document: "${title}"\n\n🔗 Edit collaboratively: ${editorUrl}\n📄 View as plain text: ${plainTextUrl}\n\nThe document is ready for collaborative editing!`,
      };
    } catch (error) {
      console.error('Error creating live document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create live document',
      };
    }
  },
});
