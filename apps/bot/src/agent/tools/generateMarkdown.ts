/**
 * Generate Markdown Tool - Creates markdown documents from natural language prompts
 *
 * Features:
 * - Natural language to markdown document generation
 * - Support for all standard markdown elements (headings, lists, tables, code blocks, etc.)
 * - Automatic data/text to markdown conversion
 * - Context-aware markdown generation based on conversation
 * - Multiple markdown styles and formats
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../../config/models.js';

// Available markdown document types
const MARKDOWN_TYPES = [
  'documentation',
  'readme',
  'tutorial',
  'article',
  'notes',
  'list',
  'table',
  'report',
  'custom',
] as const;

type MarkdownType = typeof MARKDOWN_TYPES[number];

// Markdown style preferences
const MARKDOWN_STYLES = [
  'github',
  'standard',
  'minimal',
  'technical',
  'creative',
] as const;

type MarkdownStyle = typeof MARKDOWN_STYLES[number];

/**
 * Generate markdown document using AI based on natural language prompt
 */
async function generateMarkdownDocument(
  prompt: string,
  type: MarkdownType,
  style: MarkdownStyle,
  conversationContext?: string,
  includeElements?: string[]
): Promise<{
  title: string;
  markdown: string;
  description: string;
  elementsUsed: string[];
}> {
  // Build type-specific guidance
  const typeGuidance: Record<MarkdownType, string> = {
    documentation: `Technical documentation markdown:
- Clear hierarchical structure with proper heading levels (# ## ###)
- Code examples in fenced code blocks with language specification
- Well-organized sections (Installation, Usage, API Reference, Examples)
- Use tables for parameter descriptions
- Include inline code for technical terms
- Add warning/note blocks using blockquotes
- Provide clear, actionable information`,

    readme: `README.md format:
- Project title with # heading
- Brief description/tagline
- Badges (if applicable)
- Table of contents for longer docs
- Installation instructions with code blocks
- Usage examples with syntax highlighting
- Features list (bulleted or numbered)
- Contributing guidelines
- License information
- Contact/links section`,

    tutorial: `Tutorial/guide markdown:
- Step-by-step numbered instructions
- Clear section headings for each major step
- Code examples with explanatory comments
- Screenshots or diagrams descriptions (use image syntax)
- Tips and warnings using blockquotes
- Prerequisites section
- Expected outcomes for each step
- Troubleshooting section if applicable`,

    article: `Article/blog post markdown:
- Engaging title and introduction
- Well-structured sections with descriptive headings
- Mix of paragraphs, lists, and emphasis
- Pull quotes using blockquotes
- Code examples where relevant
- Images with descriptive alt text
- Conclusion or summary
- Links to references or related content`,

    notes: `Note-taking markdown:
- Concise, scannable format
- Bullet points and numbered lists
- Bold/italic for emphasis on key terms
- Code snippets for technical notes
- Nested lists for sub-topics
- Quick reference tables
- Minimal prose, maximum information density`,

    list: `List-focused markdown:
- Primary use of bulleted or numbered lists
- Nested sub-lists where appropriate
- Check boxes for task lists (- [ ] syntax)
- Brief headers to categorize list sections
- Use bold for list item emphasis
- Keep items concise and parallel in structure`,

    table: `Table-centric markdown:
- Well-formatted markdown tables
- Clear column headers
- Aligned columns for readability
- Use tables for structured data comparison
- Include a brief introduction before tables
- Add notes or explanations after tables if needed
- Consider multiple tables for different data sets`,

    report: `Report/summary markdown:
- Executive summary at the top
- Clear section divisions (## headings)
- Data presented in tables and lists
- Key findings highlighted with bold/emphasis
- Bullet points for recommendations
- Numbered sections for formal structure
- Conclusions and next steps
- Appendix or references if applicable`,

    custom: `Custom markdown document:
- Follow standard markdown syntax
- Use appropriate elements for content
- Maintain consistent formatting
- Clear hierarchical structure
- Mix elements as needed for best presentation`,
  };

  // Build style-specific guidance
  const styleGuidance: Record<MarkdownStyle, string> = {
    github: `GitHub-flavored markdown:
- Use GFM syntax extensions (tables, task lists, strikethrough)
- Fenced code blocks with language identifiers
- Emoji support using :emoji_name: syntax
- Automatic URL linking
- Table alignment (left, center, right)
- Strikethrough with ~~text~~
- Task lists with - [ ] and - [x]`,

    standard: `Standard markdown:
- Stick to core markdown specification
- Use reference-style links for readability
- Avoid platform-specific extensions
- Simple, portable markdown syntax
- Works across all markdown parsers`,

    minimal: `Minimal markdown:
- Use only essential formatting
- Prefer readability in plain text
- Minimal use of special characters
- Simple structure without complex nesting
- Clean, uncluttered appearance`,

    technical: `Technical documentation style:
- Precise, formal language
- Heavy use of code blocks and inline code
- Technical terminology without simplification
- Detailed parameter tables
- API-style documentation
- Version numbers and technical specifications`,

    creative: `Creative writing style:
- Engaging, narrative tone
- Use of emphasis for dramatic effect
- Blockquotes for memorable passages
- Descriptive language
- Mix of long and short sections
- More personal and conversational`,
  };

  // Build element-specific guidance
  let elementGuidance = '';
  if (includeElements && includeElements.length > 0) {
    const elementDescriptions = {
      'headings': 'Use multiple heading levels (# ## ### ####)',
      'lists': 'Include bulleted (-) and numbered (1.) lists',
      'tables': 'Create markdown tables with | separators and alignment',
      'code-blocks': 'Use fenced code blocks with ```language syntax',
      'inline-code': 'Use `backticks` for inline code and technical terms',
      'links': 'Include [text](url) style links',
      'images': 'Add ![alt](url) image syntax',
      'blockquotes': 'Use > for quotes, notes, or warnings',
      'emphasis': 'Use *italic* and **bold** for emphasis',
      'horizontal-rules': 'Use --- for section dividers',
      'task-lists': 'Include - [ ] checkboxes for tasks',
    };

    elementGuidance = `\n\nRequired Elements to Include:
${includeElements.map(elem => `- ${elementDescriptions[elem as keyof typeof elementDescriptions] || elem}`).join('\n')}

Make sure to incorporate these elements naturally into the document.`;
  }

  // Build context analysis
  let contextGuidance = '';
  if (conversationContext) {
    contextGuidance = `\n\nConversation Context:
${conversationContext}

Use this context to:
- Inform the content and examples in the markdown
- Make the document relevant to the discussion
- Reference topics or themes mentioned
- Adapt the level of detail appropriately`;
  }

  const systemPrompt = `You are an expert markdown document generator. Generate a well-structured markdown document following these guidelines:

${typeGuidance[type]}

${styleGuidance[style]}${elementGuidance}${contextGuidance}

User Request:
${prompt}

Requirements:
- Use proper markdown syntax
- Create a clear, logical structure
- Ensure the document is well-formatted and readable
- Include practical examples where appropriate
- Use appropriate heading hierarchy
- Make it comprehensive but focused
- Follow best practices for the specified type and style

Respond in JSON format:
{
  "title": "A clear, descriptive title for the document",
  "markdown": "The complete markdown document (use \\n for line breaks)",
  "description": "A brief 1-2 sentence description of the document's purpose and content",
  "elementsUsed": ["array", "of", "markdown", "elements", "used"]
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt: systemPrompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      title: parsed.title,
      markdown: parsed.markdown,
      description: parsed.description,
      elementsUsed: parsed.elementsUsed || [],
    };
  } catch (error) {
    console.error('Error generating markdown:', error);
    // Fallback markdown in case of error
    return {
      title: "Markdown Generation Error",
      markdown: `# Markdown Generation Error

An error occurred while generating the markdown document.

## Request Details
- **Type:** ${type}
- **Style:** ${style}
- **Prompt:** ${prompt}

## Error
${error instanceof Error ? error.message : 'Unknown error occurred'}

## Fallback Example
Here's a simple markdown template:

\`\`\`markdown
# Your Title

## Section 1
Content goes here.

## Section 2
More content.
\`\`\``,
      description: "Error fallback markdown document",
      elementsUsed: ['headings', 'code-blocks', 'lists'],
    };
  }
}

export const generateMarkdownTool = tool({
  description: 'Generate markdown documents from natural language prompts. Creates well-structured markdown with support for all standard elements (headings, lists, tables, code blocks, links, images, etc.). Can convert text/data to markdown, generate documentation, READMEs, tutorials, articles, notes, and more. Supports GitHub-flavored markdown and various styles. Perfect for documentation, note-taking, and content creation.',
  inputSchema: z.object({
    prompt: z.string().describe('Natural language description of the markdown document to generate. Be specific about content, structure, and purpose. Examples: "Create a README for a Python web scraper", "Generate a tutorial on Git basics", "Make a comparison table of JavaScript frameworks"'),
    type: z.enum(['documentation', 'readme', 'tutorial', 'article', 'notes', 'list', 'table', 'report', 'custom']).optional().describe('Type of markdown document (default: custom). Determines the overall structure and format.'),
    style: z.enum(['github', 'standard', 'minimal', 'technical', 'creative']).optional().describe('Markdown style preference (default: github). Affects formatting choices and language tone.'),
    conversationContext: z.string().optional().describe('Recent conversation context to inform the content. The generated markdown will be relevant to the discussion topics.'),
    includeElements: z.array(z.enum(['headings', 'lists', 'tables', 'code-blocks', 'inline-code', 'links', 'images', 'blockquotes', 'emphasis', 'horizontal-rules', 'task-lists'])).optional().describe('Specific markdown elements to include in the document. Ensures these elements are incorporated.'),
  }),
  execute: async ({
    prompt,
    type = 'custom',
    style = 'github',
    conversationContext,
    includeElements
  }) => {
    try {
      console.log(`📝 Generate Markdown: Creating ${type} document in ${style} style...`);
      console.log(`   📋 Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
      if (conversationContext) {
        console.log(`   💬 Using conversation context (${conversationContext.length} chars)`);
      }
      if (includeElements && includeElements.length > 0) {
        console.log(`   🎯 Required elements: ${includeElements.join(', ')}`);
      }

      const markdownData = await generateMarkdownDocument(
        prompt,
        type,
        style,
        conversationContext,
        includeElements
      );

      console.log(`   ✨ Generated: "${markdownData.title}"`);

      return {
        success: true,
        title: markdownData.title,
        markdown: markdownData.markdown,
        description: markdownData.description,
        type,
        style,
        elementsUsed: markdownData.elementsUsed,
        contextUsed: !!conversationContext,
        availableTypes: Array.from(MARKDOWN_TYPES),
        availableStyles: Array.from(MARKDOWN_STYLES),
        formattedOutput: `**${markdownData.title}**\n\n${markdownData.description}\n\n---\n\n${markdownData.markdown}\n\n---\n*Type: ${type} | Style: ${style}*`,
      };
    } catch (error) {
      console.error('Error generating markdown:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate markdown',
      };
    }
  },
});
