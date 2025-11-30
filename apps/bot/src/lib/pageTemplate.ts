/**
 * Page Template System
 * Reusable page templates with theme integration
 */

import { Theme, defaultTheme, generateThemeCSS, getBaseStyles } from './theme.js';
import { generateBuildFooterHtml } from '../utils/buildTimestamp.js';

export interface PageMetadata {
  title: string;
  description?: string;
  keywords?: string[];
  author?: string;
  theme?: Theme;
  customStyles?: string;
  customScripts?: string;
}

export interface PageOptions {
  metadata: PageMetadata;
  content: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
  headerContent?: string;
  footerContent?: string;
}

/**
 * Generate standard header HTML
 */
export function generateHeader(title: string = 'Omega'): string {
  return `
    <header class="site-header">
      <div class="header-container">
        <div class="header-logo">
          <span class="logo-symbol">Ω</span>
          <span class="logo-text">${title}</span>
        </div>
        <nav class="header-nav">
          <a href="/">Home</a>
          <a href="/blog">Blog</a>
          <a href="/artifacts">Artifacts</a>
          <a href="/comics.html">Comics</a>
          <a href="/documents.html">Documents</a>
        </nav>
      </div>
    </header>
  `;
}

/**
 * Generate standard footer HTML
 */
export function generateFooter(): string {
  return `
    <footer class="site-footer">
      <div class="footer-container">
        <p class="footer-text">
          <strong>Omega</strong> — Autonomous Engineering Systems
        </p>
        ${generateBuildFooterHtml()}
      </div>
    </footer>
  `;
}

/**
 * Get header/footer styles
 */
export function getLayoutStyles(): string {
  return `
    .site-header {
      background: rgba(0, 0, 0, 0.9);
      border-bottom: 1px solid var(--theme-border);
      padding: var(--theme-spacing-sm);
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(10px);
    }

    .header-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 var(--theme-spacing-md);
    }

    .header-logo {
      display: flex;
      align-items: center;
      gap: var(--theme-spacing-sm);
      font-family: var(--theme-font-heading);
      font-size: 1.25rem;
      font-weight: bold;
      color: var(--theme-text);
    }

    .logo-symbol {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 2px solid var(--theme-primary);
      color: var(--theme-primary);
      background: rgba(255, 159, 28, 0.1);
      font-size: 1.5rem;
    }

    .header-nav {
      display: flex;
      gap: var(--theme-spacing-md);
      font-family: var(--theme-font-body);
      font-size: 0.9rem;
    }

    .header-nav a {
      color: var(--theme-text-secondary);
      text-decoration: none;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: color 0.2s ease;
      padding: var(--theme-spacing-xs) var(--theme-spacing-sm);
      border: 1px solid transparent;
    }

    .header-nav a:hover {
      color: var(--theme-primary);
      border-color: var(--theme-primary);
    }

    .site-footer {
      background: rgba(0, 0, 0, 0.9);
      border-top: 1px solid var(--theme-border);
      padding: var(--theme-spacing-lg);
      margin-top: var(--theme-spacing-xl);
      text-align: center;
      font-size: 0.9rem;
      color: var(--theme-text-secondary);
    }

    .footer-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .footer-text {
      margin-bottom: var(--theme-spacing-sm);
    }

    .footer-text strong {
      color: var(--theme-primary);
    }

    @media (max-width: 768px) {
      .header-nav {
        display: none;
      }

      .header-logo {
        font-size: 1rem;
      }

      .logo-symbol {
        width: 32px;
        height: 32px;
        font-size: 1.2rem;
      }
    }
  `;
}

/**
 * Generate complete HTML page with theme and layout
 */
export function generatePage(options: PageOptions): string {
  const {
    metadata,
    content,
    includeHeader = true,
    includeFooter = true,
    headerContent,
    footerContent,
  } = options;

  const theme = metadata.theme || defaultTheme;
  const themeCSS = generateThemeCSS(theme);
  const baseStyles = getBaseStyles();
  const layoutStyles = getLayoutStyles();

  const metaTags = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(metadata.title)}</title>
    ${metadata.description ? `<meta name="description" content="${escapeHtml(metadata.description)}">` : ''}
    ${metadata.keywords ? `<meta name="keywords" content="${metadata.keywords.map(escapeHtml).join(', ')}">` : ''}
    ${metadata.author ? `<meta name="author" content="${escapeHtml(metadata.author)}">` : ''}
  `;

  const styles = `
    <style>
      ${themeCSS}
      ${baseStyles}
      ${layoutStyles}
      ${metadata.customStyles || ''}
    </style>
  `;

  const header = includeHeader ? (headerContent || generateHeader(metadata.title)) : '';
  const footer = includeFooter ? (footerContent || generateFooter()) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${metaTags}
  ${styles}
</head>
<body>
  ${header}
  <main class="page-content">
    ${content}
  </main>
  ${footer}
  ${metadata.customScripts || ''}
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
