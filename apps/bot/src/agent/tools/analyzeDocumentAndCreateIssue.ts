/**
 * Analyze Document and Create GitHub Issue Tool
 * Analyzes document content with AI to infer user intent and creates a GitHub issue
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getDocument } from '@repo/database';// OLD:documentService.js';
import { OMEGA_MODEL } from '../../config/models.js';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubIssue {
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
 * Analyze document content and extract actionable intent
 */
async function analyzeDocumentIntent(documentContent: string, documentTitle: string): Promise<{
  title: string;
  description: string;
  labels: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  taskType: string;
}> {
  const model = openai.chat(OMEGA_MODEL);

  const prompt = `You are analyzing a collaborative document to extract the user's intent and create a GitHub issue.

DOCUMENT TITLE:
${documentTitle}

DOCUMENT CONTENT:
${documentContent}

TASK:
Analyze the document content and infer what the user wants to accomplish. Even if the content is arbitrary or informal, determine the underlying intent and actionable task.

GUIDELINES:
- Extract the core intent/goal from the document
- Identify specific, actionable tasks
- Determine appropriate labels (e.g., "bug", "feature", "enhancement", "documentation", "question")
- Assess priority based on urgency indicators in the content
- Classify the task type (e.g., "Feature Request", "Bug Report", "Improvement", "Question", "Documentation")

RESPONSE FORMAT:
Return a JSON object with these fields:
{
  "title": "Clear, concise issue title (50-80 characters)",
  "description": "Detailed issue description with context, requirements, and acceptance criteria in markdown format",
  "labels": ["label1", "label2", "label3"],
  "priority": "low|medium|high|critical",
  "taskType": "Feature Request|Bug Report|Improvement|Question|Documentation|Other"
}

IMPORTANT:
- The title should be action-oriented and specific
- The description should include:
  - Context from the document
  - Clear explanation of what needs to be done
  - Acceptance criteria or success metrics
  - Any relevant details or constraints
- Labels should be relevant and specific (max 5 labels)
- Be creative in inferring intent - the document might be a brainstorm, notes, questions, or feedback

OUTPUT ONLY THE JSON - no explanations, no markdown code blocks, just the raw JSON object.`;

  const result = await generateText({
    model,
    prompt,
    temperature: 0.3,
  });

  try {
    const parsed = JSON.parse(result.text.trim());
    return {
      title: parsed.title || 'Untitled Issue from Document',
      description: parsed.description || documentContent,
      labels: Array.isArray(parsed.labels) ? parsed.labels : ['from-document'],
      priority: parsed.priority || 'medium',
      taskType: parsed.taskType || 'Other',
    };
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error);
    // Fallback
    return {
      title: `[Document] ${documentTitle.substring(0, 60)}`,
      description: documentContent,
      labels: ['from-document'],
      priority: 'medium',
      taskType: 'Other',
    };
  }
}

/**
 * Create a GitHub issue
 */
async function createGitHubIssue(
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

  return await response.json() as GitHubIssue;
}

export const analyzeDocumentAndCreateIssueTool = tool({
  description: `Analyze a live document's content using AI to infer user intent and automatically create a GitHub issue.

  This tool reads a collaborative document, uses AI to understand what the user wants to accomplish,
  and creates a detailed GitHub issue with appropriate labels and priority.

  Perfect for:
  - Converting brainstorming documents into actionable issues
  - Creating issues from user feedback or feature requests
  - Transforming meeting notes into tracked work items
  - Capturing arbitrary ideas or notes as GitHub issues

  The AI will:
  - Analyze the document content to infer intent
  - Generate a clear, action-oriented issue title
  - Create a detailed description with context and acceptance criteria
  - Assign appropriate labels and priority
  - Handle arbitrary or informal content intelligently

  Example use cases:
  - User creates a document with "5 questions about improving the UI"
  - User writes informal notes about a bug they encountered
  - User brainstorms feature ideas in a collaborative document
  - User provides feedback that should be tracked as an issue`,

  inputSchema: z.object({
    documentId: z.string().describe('ID of the document to analyze'),
  }),

  execute: async ({ documentId }) => {
    try {
      console.log('📄 Analyzing document for issue creation...');
      console.log('Document ID:', documentId);

      // Fetch the document
      const document = await getDocument(documentId);
      if (!document) {
        return {
          success: false,
          error: 'Document not found',
        };
      }

      console.log('✅ Document fetched');
      console.log('Title:', document.title);
      console.log('Content length:', document.content.length, 'characters');

      // Analyze content with AI
      console.log('🤖 Analyzing content with AI...');
      const analysis = await analyzeDocumentIntent(document.content, document.title);

      console.log('✅ Analysis complete');
      console.log('Issue title:', analysis.title);
      console.log('Task type:', analysis.taskType);
      console.log('Priority:', analysis.priority);
      console.log('Labels:', analysis.labels.join(', '));

      // Format issue body
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
      const documentUrl = `${serverUrl}/editor.html?id=${document.id}`;

      const issueBody = `## ${analysis.taskType}

${analysis.description}

---

### Source Document
**Title**: ${document.title}
**Created by**: ${document.created_by_username || document.created_by}
**Document URL**: [View in editor](${documentUrl})

### AI Analysis
- **Priority**: ${analysis.priority}
- **Task Type**: ${analysis.taskType}

---

*This issue was automatically created from a live document using AI intent analysis.*`;

      // Create GitHub issue
      console.log('📝 Creating GitHub issue...');
      const issue = await createGitHubIssue(
        analysis.title,
        issueBody,
        [...analysis.labels, 'from-document', 'automated']
      );

      console.log('✅ Issue created successfully!');
      console.log('Issue number:', issue.number);
      console.log('Issue URL:', issue.html_url);

      return {
        success: true,
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        issueTitle: analysis.title,
        priority: analysis.priority,
        labels: analysis.labels,
        message: `✅ Created GitHub issue #${issue.number}: "${analysis.title}"\n\n🔗 View issue: ${issue.html_url}\n\n**Priority**: ${analysis.priority}\n**Labels**: ${analysis.labels.join(', ')}`,
      };
    } catch (error) {
      console.error('Error analyzing document and creating issue:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create issue from document',
      };
    }
  },
});
