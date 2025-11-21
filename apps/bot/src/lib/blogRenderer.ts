/**
 * Blog Renderer
 * Reads markdown files from persistent blog storage and renders them with TTS support
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getBlogDir } from '../utils/storage.js';
import { generateBuildFooterHtml } from '../utils/buildTimestamp.js';

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  content: string;
  frontmatter: Record<string, any>;
  ttsEnabled: boolean;
  ttsVoice: string;
}

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, any>;
  body: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const [, frontmatterText, body] = match;
  const frontmatter: Record<string, any> = {};

  // Parse YAML-like frontmatter
  frontmatterText.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1) {
      const key = line.substring(0, colonIndex).trim();
      let value: string | boolean = line.substring(colonIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Parse booleans
      if (value === 'true') value = true;
      if (value === 'false') value = false;

      frontmatter[key] = value;
    }
  });

  return { frontmatter, body };
}

/**
 * Simple markdown to HTML converter
 * Handles basic markdown syntax
 */
function markdownToHTML(markdown: string, ttsEnabled: boolean): string {
  let html = markdown;

  // Headers with TTS support
  if (ttsEnabled) {
    html = html.replace(/^### (.*$)/gim, (match, text) => {
      const sanitized = text.trim().replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      return `<h3 data-tts="${sanitized}" class="tts-text">${text}</h3>`;
    });
    html = html.replace(/^## (.*$)/gim, (match, text) => {
      const sanitized = text.trim().replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      return `<h2 data-tts="${sanitized}" class="tts-text">${text}</h2>`;
    });
    html = html.replace(/^# (.*$)/gim, (match, text) => {
      const sanitized = text.trim().replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      return `<h1 data-tts="${sanitized}" class="tts-text">${text}</h1>`;
    });
  } else {
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  }

  // Images with alt text - add TTS support
  if (ttsEnabled) {
    html = html.replace(
      /!\[(.*?)\]\((.*?)\)\s*\n\*([^*]+)\*/g,
      (match, alt, src, caption) => {
        const sanitizedCaption = caption.trim()
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        return `<figure>
          <img src="${src}" alt="${alt}" data-tts="${sanitizedCaption}" />
          <figcaption>${caption}</figcaption>
        </figure>`;
      }
    );

    // Regular images with alt text
    html = html.replace(
      /!\[(.*?)\]\((.*?)\)/g,
      (match, alt, src) => {
        if (!alt.trim()) return match;
        const sanitizedAlt = alt.trim()
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        return `<img src="${src}" alt="${sanitizedAlt}" data-tts="${sanitizedAlt}" />`;
      }
    );
  } else {
    // Without TTS
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />');
  }

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Paragraphs - split into paragraphs first
  const paragraphs = html.split(/\n\n/);
  if (ttsEnabled) {
    html = paragraphs.map(para => {
      // Skip if it's a heading, code block, or other special element
      if (para.trim().startsWith('<h') || para.trim().startsWith('<pre') ||
          para.trim().startsWith('<figure') || para.trim().length === 0) {
        return para;
      }
      // Extract text content for TTS (strip HTML tags for the data-tts attribute)
      const textContent = para.replace(/<[^>]+>/g, '').trim();
      if (textContent.length > 0) {
        const sanitized = textContent.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        return `<p data-tts="${sanitized}" class="tts-text">${para}</p>`;
      }
      return `<p>${para}</p>`;
    }).join('');
  } else {
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
  }

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<figure>)/g, '$1');
  html = html.replace(/(<\/figure>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');

  return html;
}

/**
 * Get all blog posts from persistent blog storage
 */
export function getBlogPosts(contentDir?: string): BlogPost[] {
  const blogDir = contentDir || getBlogDir();

  if (!existsSync(blogDir)) {
    console.warn(`Blog directory not found: ${blogDir}`);
    return [];
  }

  const files = readdirSync(blogDir).filter(f => f.endsWith('.md'));
  const posts: BlogPost[] = [];

  files.forEach(filename => {
    try {
      const filepath = join(blogDir, filename);
      const content = readFileSync(filepath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);

      const slug = filename.replace(/\.md$/, '');

      posts.push({
        slug,
        title: frontmatter.title || slug,
        date: frontmatter.date || new Date().toISOString(),
        content: body,
        frontmatter,
        ttsEnabled: frontmatter.tts === true,
        ttsVoice: frontmatter.ttsVoice || 'alloy',
      });
    } catch (error) {
      console.error(`Error reading blog post ${filename}:`, error);
    }
  });

  // Sort by date (newest first)
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
}

/**
 * Get a single blog post by slug
 */
export function getBlogPost(slug: string, contentDir?: string): BlogPost | null {
  const blogDir = contentDir || getBlogDir();
  const filepath = join(blogDir, `${slug}.md`);

  if (!existsSync(filepath)) {
    return null;
  }

  try {
    const content = readFileSync(filepath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    return {
      slug,
      title: frontmatter.title || slug,
      date: frontmatter.date || new Date().toISOString(),
      content: body,
      frontmatter,
      ttsEnabled: frontmatter.tts === true,
      ttsVoice: frontmatter.ttsVoice || 'alloy',
    };
  } catch (error) {
    console.error(`Error reading blog post ${slug}:`, error);
    return null;
  }
}

/**
 * Render a blog post to HTML
 */
export function renderBlogPost(post: BlogPost): string {
  const contentHTML = markdownToHTML(post.content, post.ttsEnabled);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(post.title)}</title>
  <link rel="stylesheet" href="/tts-player.css">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f9f9f9;
    }
    article {
      background: white;
      padding: 60px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 0.5em;
      color: #222;
    }
    h2 {
      font-size: 2em;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      color: #333;
    }
    h3 {
      font-size: 1.5em;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      color: #444;
    }
    p {
      margin-bottom: 1.2em;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 1.5em 0;
    }
    figure {
      margin: 2em 0;
    }
    figcaption {
      margin-top: 0.5em;
      font-style: italic;
      color: #666;
      text-align: center;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1.5em 0;
    }
    pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    .meta {
      color: #666;
      margin-bottom: 2em;
      padding-bottom: 1em;
      border-bottom: 1px solid #eee;
    }
    .tts-notice {
      background: #e7f3ff;
      border-left: 4px solid #2196F3;
      padding: 15px;
      margin-bottom: 2em;
      border-radius: 4px;
    }
    .tts-notice p {
      margin: 0 0 12px 0;
      color: #1976D2;
    }
    .tts-controls {
      display: flex;
      gap: 10px;
      margin-top: 12px;
    }
    .tts-read-all-button,
    .tts-stop-all-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .tts-read-all-button {
      background: #2196F3;
      color: white;
    }
    .tts-read-all-button:hover {
      background: #1976D2;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
    }
    .tts-stop-all-button {
      background: #f44336;
      color: white;
    }
    .tts-stop-all-button:hover {
      background: #d32f2f;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
    }
    .tts-text {
      position: relative;
      cursor: pointer;
    }
    .tts-text:hover {
      background: rgba(33, 150, 243, 0.05);
      border-radius: 4px;
    }
    .tts-text.tts-playing {
      background: rgba(76, 175, 80, 0.1);
      border-left: 4px solid #4CAF50;
      padding-left: 12px;
      margin-left: -16px;
    }
    a {
      color: #2196F3;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    @media (max-width: 768px) {
      article {
        padding: 30px 20px;
      }
      h1 {
        font-size: 2em;
      }
    }
  </style>
</head>
<body>
  <article>
    <header>
      <h1>${escapeHtml(post.title)}</h1>
      <div class="meta">
        <time datetime="${post.date}">${new Date(post.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</time>
      </div>
      ${post.ttsEnabled ? `
      <div class="tts-notice">
        <p>🔊 This post has audio support. Click the play buttons on text and images to hear them read aloud, or use the "Read Entire Post" button below.</p>
        <div class="tts-controls">
          <button id="tts-read-all" class="tts-read-all-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Read Entire Post
          </button>
          <button id="tts-stop-all" class="tts-stop-all-button" style="display:none;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h12v12H6z"/>
            </svg>
            Stop
          </button>
        </div>
      </div>
      ` : ''}
    </header>
    <main>
      ${contentHTML}
    </main>
    ${generateBuildFooterHtml()}
  </article>
  ${post.ttsEnabled ? `
  <script>
    window.ttsPlayerConfig = {
      voice: '${post.ttsVoice}',
      apiEndpoint: '/api/tts'
    };
  </script>
  <script src="/tts-player.js"></script>
  ` : ''}
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
 * Generate blog index page
 */
export function renderBlogIndex(posts: BlogPost[]): string {
  const postsList = posts.map(post => `
    <article class="post-preview">
      <h2><a href="/blog/${post.slug}">${escapeHtml(post.title)}</a></h2>
      <div class="meta">
        <time datetime="${post.date}">${new Date(post.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</time>
        ${post.ttsEnabled ? '<span class="tts-badge">🔊 TTS</span>' : ''}
      </div>
    </article>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f9f9f9;
    }
    h1 {
      font-size: 3em;
      margin-bottom: 1em;
      color: #222;
    }
    .post-preview {
      background: white;
      padding: 30px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .post-preview:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .post-preview h2 {
      margin-bottom: 0.5em;
    }
    .post-preview h2 a {
      color: #222;
      text-decoration: none;
    }
    .post-preview h2 a:hover {
      color: #2196F3;
    }
    .meta {
      color: #666;
      font-size: 0.9em;
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .tts-badge {
      background: #e7f3ff;
      color: #1976D2;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <h1>Blog</h1>
  ${postsList || '<p>No posts yet.</p>'}
  ${generateBuildFooterHtml()}
</body>
</html>`;
}
