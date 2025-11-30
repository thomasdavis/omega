/**
 * URL Router System
 * Enables named routes and slug-based pages alongside UUID artifacts
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getContentIndexDir } from '../utils/storage.js';
import { generatePage, PageMetadata } from './pageTemplate.js';

export interface PageRoute {
  slug: string; // URL slug (e.g., "about", "features")
  title: string;
  description?: string;
  content: string; // HTML or markdown content
  contentType: 'html' | 'markdown';
  metadata?: Partial<PageMetadata>;
  createdAt: string;
  updatedAt: string;
}

export interface RouteIndex {
  routes: Record<string, PageRoute>;
}

const ROUTES_FILE = 'routes.json';

/**
 * Get the path to the routes index file
 */
function getRoutesFilePath(): string {
  const indexDir = getContentIndexDir();
  return join(indexDir, ROUTES_FILE);
}

/**
 * Load all routes from the index
 */
export function loadRoutes(): RouteIndex {
  const routesPath = getRoutesFilePath();

  if (!existsSync(routesPath)) {
    return { routes: {} };
  }

  try {
    const content = readFileSync(routesPath, 'utf-8');
    return JSON.parse(content) as RouteIndex;
  } catch (error) {
    console.error('Error loading routes:', error);
    return { routes: {} };
  }
}

/**
 * Save routes to the index
 */
export function saveRoutes(index: RouteIndex): void {
  const routesPath = getRoutesFilePath();

  try {
    writeFileSync(routesPath, JSON.stringify(index, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving routes:', error);
    throw error;
  }
}

/**
 * Get a specific route by slug
 */
export function getRoute(slug: string): PageRoute | null {
  const index = loadRoutes();
  return index.routes[slug] || null;
}

/**
 * Create or update a route
 */
export function setRoute(route: PageRoute): void {
  const index = loadRoutes();
  const now = new Date().toISOString();

  const existingRoute = index.routes[route.slug];

  index.routes[route.slug] = {
    ...route,
    createdAt: existingRoute?.createdAt || now,
    updatedAt: now,
  };

  saveRoutes(index);
}

/**
 * Delete a route
 */
export function deleteRoute(slug: string): boolean {
  const index = loadRoutes();

  if (!index.routes[slug]) {
    return false;
  }

  delete index.routes[slug];
  saveRoutes(index);
  return true;
}

/**
 * List all routes
 */
export function listRoutes(): PageRoute[] {
  const index = loadRoutes();
  return Object.values(index.routes).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Validate slug format (lowercase alphanumeric with hyphens)
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Render a route to HTML
 */
export function renderRoute(route: PageRoute): string {
  const metadata: PageMetadata = {
    title: route.title,
    description: route.description,
    ...route.metadata,
  };

  let htmlContent = route.content;

  // If markdown, convert to HTML (simple conversion for now)
  if (route.contentType === 'markdown') {
    htmlContent = markdownToHtml(route.content);
  }

  // Wrap content in a container
  const contentWrapper = `
    <div class="route-content">
      <article class="route-article">
        <header class="route-header">
          <h1>${escapeHtml(route.title)}</h1>
          ${route.description ? `<p class="route-description">${escapeHtml(route.description)}</p>` : ''}
        </header>
        <div class="route-body">
          ${htmlContent}
        </div>
      </article>
    </div>
  `;

  const customStyles = `
    .route-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: var(--theme-spacing-xl) var(--theme-spacing-md);
    }

    .route-article {
      background: var(--theme-surface);
      padding: var(--theme-spacing-xl);
      border-radius: var(--theme-radius-lg);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .route-header {
      margin-bottom: var(--theme-spacing-xl);
      padding-bottom: var(--theme-spacing-lg);
      border-bottom: 2px solid var(--theme-border);
    }

    .route-header h1 {
      font-size: 3rem;
      margin-bottom: var(--theme-spacing-md);
      font-weight: 800;
      color: var(--theme-text);
    }

    .route-description {
      font-size: 1.25rem;
      color: var(--theme-text-secondary);
      line-height: 1.6;
    }

    .route-body {
      font-size: 1.1rem;
      line-height: 1.8;
    }

    .route-body h2 {
      margin-top: var(--theme-spacing-lg);
      margin-bottom: var(--theme-spacing-md);
      font-size: 2rem;
      font-weight: 700;
    }

    .route-body h3 {
      margin-top: var(--theme-spacing-md);
      margin-bottom: var(--theme-spacing-sm);
      font-size: 1.5rem;
      font-weight: 600;
    }

    .route-body p {
      margin-bottom: var(--theme-spacing-md);
    }

    .route-body ul, .route-body ol {
      margin: var(--theme-spacing-md) 0;
      padding-left: var(--theme-spacing-lg);
    }

    .route-body li {
      margin-bottom: var(--theme-spacing-xs);
    }

    .route-body code {
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: var(--theme-radius-sm);
      font-size: 0.9em;
    }

    .route-body pre {
      background: rgba(0, 0, 0, 0.5);
      padding: var(--theme-spacing-md);
      border-radius: var(--theme-radius-md);
      overflow-x: auto;
      margin: var(--theme-spacing-md) 0;
    }

    .route-body pre code {
      background: none;
      padding: 0;
    }

    @media (max-width: 768px) {
      .route-content {
        padding: var(--theme-spacing-md);
      }

      .route-article {
        padding: var(--theme-spacing-md);
      }

      .route-header h1 {
        font-size: 2rem;
      }

      .route-description {
        font-size: 1rem;
      }

      .route-body {
        font-size: 1rem;
      }
    }
  `;

  return generatePage({
    metadata: {
      ...metadata,
      customStyles,
    },
    content: contentWrapper,
  });
}

/**
 * Simple markdown to HTML conversion
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Code blocks
  html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Paragraphs
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(para => {
    const trimmed = para.trim();
    if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') ||
        trimmed.startsWith('<ul') || trimmed.startsWith('<ol') ||
        trimmed.startsWith('<li') || trimmed.length === 0) {
      return para;
    }
    return `<p>${para}</p>`;
  }).join('');

  return html;
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
