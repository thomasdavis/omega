/**
 * Artifact Tool - Generate and preview artifacts (HTML, SVG, Markdown, etc.)
 * Allows creating interactive content with shareable preview links
 */

import { tool } from 'ai';
import { z } from 'zod';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Artifacts directory - store generated content
const ARTIFACTS_DIR = join(__dirname, '../../../artifacts');

// Ensure artifacts directory exists
if (!existsSync(ARTIFACTS_DIR)) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

interface ArtifactMetadata {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  filename: string;
}

/**
 * Generate HTML artifact with optional CSS and JavaScript
 */
function generateHTML(title: string, content: string, css?: string, js?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    ${css || ''}
  </style>
</head>
<body>
  ${content}
  ${js ? `<script>${js}</script>` : ''}
</body>
</html>`;
}

/**
 * Generate SVG artifact
 */
function generateSVG(content: string, width: number = 800, height: number = 600): string {
  // If content is already a complete SVG, return it
  if (content.trim().startsWith('<svg')) {
    return content;
  }

  // Otherwise, wrap it in SVG tags
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${content}
</svg>`;
}

/**
 * Generate Markdown artifact with HTML wrapper for preview
 */
function generateMarkdown(title: string, content: string): string {
  // For preview purposes, we'll wrap markdown in HTML with a simple renderer
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    pre {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre code {
      background: none;
      padding: 0;
    }
  </style>
</head>
<body>
  <pre>${escapeHtml(content)}</pre>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Save artifact to filesystem
 */
function saveArtifact(
  content: string,
  type: string,
  title: string,
  description: string
): ArtifactMetadata {
  const id = randomUUID();
  const extension = type === 'svg' ? 'svg' : 'html';
  const filename = `${id}.${extension}`;
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

export const artifactTool = tool({
  description: `Generate interactive artifacts (HTML pages, SVG graphics, diagrams, etc.) with shareable preview links.
  Perfect for creating visualizations, demos, interactive content, or any web-based artifacts that users can view in their browser.`,
  parameters: z.object({
    type: z.enum(['html', 'svg', 'markdown']).describe('Type of artifact to generate'),
    title: z.string().describe('Title of the artifact'),
    description: z.string().describe('Brief description of what the artifact shows or does'),
    content: z.string().describe('Main content of the artifact (HTML body, SVG elements, or Markdown text)'),
    css: z.string().optional().describe('Optional CSS styles (for HTML artifacts only)'),
    js: z.string().optional().describe('Optional JavaScript code (for HTML artifacts only)'),
    width: z.number().optional().describe('Width for SVG artifacts (default: 800)'),
    height: z.number().optional().describe('Height for SVG artifacts (default: 600)'),
  }),
  execute: async ({ type, title, description, content, css, js, width, height }) => {
    try {
      let artifactContent: string;

      switch (type) {
        case 'html':
          artifactContent = generateHTML(title, content, css, js);
          break;
        case 'svg':
          artifactContent = generateSVG(content, width, height);
          break;
        case 'markdown':
          artifactContent = generateMarkdown(title, content);
          break;
        default:
          throw new Error(`Unsupported artifact type: ${type}`);
      }

      const metadata = saveArtifact(artifactContent, type, title, description);

      // Get server URL from environment or use default
      const serverUrl = process.env.ARTIFACT_SERVER_URL || 'http://localhost:3001';
      const previewUrl = `${serverUrl}/artifacts/${metadata.id}`;

      return {
        success: true,
        artifactId: metadata.id,
        type: metadata.type,
        title: metadata.title,
        description: metadata.description,
        previewUrl,
        filename: metadata.filename,
        message: `Artifact created! View it at: ${previewUrl}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate artifact',
      };
    }
  },
});
