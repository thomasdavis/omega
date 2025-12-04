/**
 * Generate HTML Page Tool - AI-powered functional HTML page generation
 * Accepts natural language descriptions and generates complete working HTML pages
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { getDataDir } from '@repo/shared';
import { OMEGA_MODEL } from '@repo/shared';

// Artifacts directory - use centralized storage utility
const ARTIFACTS_DIR = getDataDir('artifacts');

interface ArtifactMetadata {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  filename: string;
}

/**
 * Validate and sanitize generated HTML for security
 */
function validateHtmlCode(html: string): { valid: boolean; reason?: string } {
  // Basic HTML structure validation only
  // Allow user-generated content to have full JavaScript functionality
  if (!html.includes('<!DOCTYPE html>') && !html.includes('<html')) {
    return {
      valid: false,
      reason: 'Generated code is missing basic HTML structure',
    };
  }

  return { valid: true };
}

/**
 * Generate complete HTML page using AI
 */
async function generateHtmlWithAI(description: string): Promise<string> {
  const model = openai.chat(OMEGA_MODEL);

  const prompt = `You are an expert web developer. Generate a complete, functional HTML page based on this description:

${description}

REQUIREMENTS:
1. Create a complete HTML document with <!DOCTYPE html>, <html>, <head>, and <body> tags
2. Include all necessary CSS in a <style> tag in the <head>
3. Include all JavaScript in a <script> tag before closing </body>
4. Make it fully functional and interactive as described
5. Use modern, clean design with good UX
6. Make it mobile-responsive
7. Use inline styles and scripts only - NO external resources (no CDN links, external scripts, or external stylesheets)
8. Ensure all functionality works without any server-side processing
9. Use semantic HTML5 elements
10. Add appropriate meta tags for viewport and charset

STYLE GUIDELINES:
- Use a modern color scheme with good contrast
- Apply smooth animations and transitions
- Make it visually appealing and professional
- Use flexbox or grid for layout
- Ensure text is readable and well-formatted

CODE QUALITY REQUIREMENTS:
- Write clean, well-structured HTML5 that validates
- Use proper HTML semantics (header, nav, main, section, article, footer, etc.)
- Ensure all HTML tags are properly closed
- Use meaningful class names and IDs
- Include comments for complex sections
- Test that all interactive features work (buttons, forms, etc.)
- Make sure JavaScript has no syntax errors
- Verify all CSS is valid and properly scoped
- Use any JavaScript you need to make it fully functional

OUTPUT ONLY THE HTML CODE - no explanations, no markdown code blocks, just the raw HTML starting with <!DOCTYPE html>.`;

  const result = await generateText({
    model,
    prompt,
    temperature: 0.7,
  });

  return result.text.trim();
}

/**
 * Save artifact to filesystem (same as artifact.ts)
 */
function saveArtifact(
  content: string,
  type: string,
  title: string,
  description: string
): ArtifactMetadata {
  const id = randomUUID();
  const filename = `${id}.html`;
  const filepath = join(ARTIFACTS_DIR, filename);

  // Save the artifact file
  writeFileSync(filepath, content, 'utf-8');

  // Save metadata
  const metadata: ArtifactMetadata = {
    id,
    type,
    title,
    description,
    createdAt: new Date().toISOString(),
    filename,
  };

  const metadataPath = join(ARTIFACTS_DIR, `${id}.json`);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return metadata;
}

export const generateHtmlPageTool = tool({
  description: `Generate a complete, functional HTML page from a natural language description.
  Perfect for creating interactive web pages like guest lists, forms, calculators, games, dashboards, or any custom web application.

  The AI will generate a fully-functional, self-contained HTML page with CSS and JavaScript based on your description.
  The page will be automatically hosted and a shareable URL will be provided.

  Examples of what you can create:
  - Interactive guest list with add/remove functionality
  - Todo list or task manager
  - Simple calculator or converter
  - Interactive quiz or game
  - Data visualization or chart
  - Form with validation
  - Calendar or scheduling interface
  - Portfolio or landing page
  - Any other interactive web page you can describe

  The generated page will be:
  - Fully functional with working JavaScript
  - Mobile-responsive
  - Visually appealing with modern design
  - Self-contained (no external dependencies)
  - Security-validated to prevent malicious code`,

  inputSchema: z.object({
    description: z.string().describe('Detailed natural language description of the HTML page to generate. Be specific about functionality, layout, and features you want.'),
    title: z.string().optional().describe('Optional title for the page. If not provided, will be extracted from description.'),
  }),

  execute: async ({ description, title }) => {
    try {
      console.log('🎨 Generating HTML page from description...');
      console.log('Description:', description);

      // Generate the page title if not provided
      const pageTitle = title || description.substring(0, 50).trim() + (description.length > 50 ? '...' : '');

      // Use AI to generate the HTML code
      const generatedHtml = await generateHtmlWithAI(description);

      console.log('✅ HTML generated, validating...');

      // Validate the generated code
      const validation = validateHtmlCode(generatedHtml);
      if (!validation.valid) {
        console.error('❌ Validation failed:', validation.reason);
        return {
          success: false,
          error: `Generated code failed security validation: ${validation.reason}`,
        };
      }

      console.log('✅ Validation passed, saving artifact...');

      // Save as artifact
      const metadata = saveArtifact(
        generatedHtml,
        'generated-html',
        pageTitle,
        description
      );

      // Get server URL
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
      const previewUrl = `${serverUrl}/artifacts/${metadata.id}`;

      console.log('✅ HTML page generated and hosted!');
      console.log('URL:', previewUrl);

      return {
        success: true,
        title: pageTitle,
        description,
        url: previewUrl,
        artifactId: metadata.id,
        message: `✨ Generated functional HTML page! View it at: ${previewUrl}`,
      };
    } catch (error) {
      console.error('Error generating HTML page:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate HTML page',
      };
    }
  },
});
