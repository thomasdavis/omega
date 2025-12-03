/**
 * Page Templates - Reusable layouts with theme integration
 * Provides consistent page structure across the site
 */

import { getTheme, generateBaseStyles, Theme } from './theme.js';
import { listRoutes } from './router.js';
import { generateBuildFooterHtml } from '../utils/buildTimestamp.js';

export interface PageOptions {
  title: string;
  content: string;
  theme?: string;
  includeNav?: boolean;
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
 * Convert markdown to simple HTML
 * Basic markdown support for headings, paragraphs, links, and code blocks
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Code blocks (must be done before inline code)
  html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Paragraphs (split by double newlines)
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs
    .map(p => {
      // Don't wrap if already in a tag
      if (p.trim().startsWith('<')) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return html;
}

/**
 * Generate navigation menu from all routes
 */
function generateNav(): string {
  const routes = listRoutes();

  if (routes.length === 0) {
    return '';
  }

  const navItems = routes
    .map(route => `<li><a href="/pages/${route.slug}">${escapeHtml(route.title)}</a></li>`)
    .join('\n        ');

  return `
    <nav>
      <ul class="nav">
        ${navItems}
      </ul>
    </nav>
  `;
}

/**
 * Generate page header
 */
function generateHeader(title: string, includeNav: boolean): string {
  const nav = includeNav ? generateNav() : '';

  return `
    <header class="header">
      <h1>${escapeHtml(title)}</h1>
      ${nav}
    </header>
  `;
}

/**
 * Generate page footer
 */
function generateFooter(): string {
  const buildInfo = generateBuildFooterHtml();

  return `
    <footer class="footer">
      <p>Powered by <a href="https://omegaai.dev">Omega</a></p>
      ${buildInfo}
    </footer>
  `;
}

/**
 * Generate a complete HTML page with theme and navigation
 */
export function generatePage(options: PageOptions): string {
  const theme = getTheme(options.theme || 'default');
  const includeNav = options.includeNav !== false;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(options.title)} - Omega">
  <title>${escapeHtml(options.title)} - Omega</title>
  <style>
    ${generateBaseStyles(theme)}
  </style>
</head>
<body>
  <div class="container">
    ${generateHeader(options.title, includeNav)}

    <main>
      ${options.content}
    </main>

    ${generateFooter()}
  </div>
</body>
</html>`;
}

/**
 * Generate a page from markdown content
 */
export function generatePageFromMarkdown(options: Omit<PageOptions, 'content'> & { markdown: string }): string {
  const htmlContent = markdownToHtml(options.markdown);

  return generatePage({
    ...options,
    content: htmlContent,
  });
}
