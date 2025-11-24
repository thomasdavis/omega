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

  // Blockquotes (must be processed before paragraphs)
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

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
        return `<figure><img src="${src}" alt="${alt}" data-tts="${sanitizedCaption}" /><figcaption>${caption}</figcaption></figure>`;
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

  // Unordered lists
  if (ttsEnabled) {
    html = html.replace(/^\* (.*$)/gim, (match, text) => {
      const sanitized = text.trim().replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      return `<li data-tts="${sanitized}" class="tts-text">${text}</li>`;
    });
    html = html.replace(/^- (.*$)/gim, (match, text) => {
      const sanitized = text.trim().replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      return `<li data-tts="${sanitized}" class="tts-text">${text}</li>`;
    });
  } else {
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  }
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Ordered lists
  if (ttsEnabled) {
    html = html.replace(/^\d+\. (.*$)/gim, (match, text) => {
      const sanitized = text.trim().replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      return `<li data-tts="${sanitized}" class="tts-text">${text}</li>`;
    });
  } else {
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
  }
  // Note: This simple implementation groups consecutive <li> tags into lists
  // For more complex cases, a proper parser would be better

  // Paragraphs - split into paragraphs first
  const paragraphs = html.split(/\n\n+/); // Use + to match one or more blank lines
  if (ttsEnabled) {
    html = paragraphs.map(para => {
      const trimmed = para.trim();
      // Skip if it's a heading, code block, list, blockquote, or other special element
      if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') ||
          trimmed.startsWith('<figure') || trimmed.startsWith('<ul') ||
          trimmed.startsWith('<ol') || trimmed.startsWith('<blockquote') ||
          trimmed.startsWith('<li') || trimmed.length === 0) {
        return para;
      }
      // Extract text content for TTS (strip HTML tags for the data-tts attribute)
      const textContent = trimmed.replace(/<[^>]+>/g, '').trim();
      if (textContent.length > 0) {
        const sanitized = textContent.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        return `<p data-tts="${sanitized}" class="tts-text">${para}</p>`;
      }
      return `<p>${para}</p>`;
    }).join('');
  } else {
    html = html.replace(/\n\n+/g, '</p><p>');
    html = '<p>' + html + '</p>';
  }

  // Clean up empty paragraphs and wrapping issues
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<figure>)/g, '$1');
  html = html.replace(/(<\/figure>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ol>)/g, '$1');
  html = html.replace(/(<\/ol>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>)/g, '$1');
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');

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
        ttsVoice: frontmatter.ttsVoice || 'bm_fable',
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
      ttsVoice: frontmatter.ttsVoice || 'bm_fable',
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
      line-height: 1.75;
      color: #1a1a1a;
      max-width: 720px;
      margin: 0 auto;
      padding: 40px 20px;
      background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
      min-height: 100vh;
    }
    article {
      background: white;
      padding: 60px;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
    }
    h1 {
      font-size: 2.75em;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 0.3em;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    h2 {
      font-size: 2em;
      font-weight: 700;
      line-height: 1.3;
      margin-top: 2em;
      margin-bottom: 0.75em;
      color: #1e293b;
      letter-spacing: -0.01em;
      padding-bottom: 0.3em;
      border-bottom: 2px solid #e2e8f0;
    }
    h3 {
      font-size: 1.5em;
      font-weight: 600;
      line-height: 1.4;
      margin-top: 1.75em;
      margin-bottom: 0.75em;
      color: #334155;
      letter-spacing: -0.005em;
    }
    p {
      margin-bottom: 1.5em;
      font-size: 1.05em;
      color: #334155;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 12px;
      margin: 2em 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    figure {
      margin: 2.5em 0;
    }
    figcaption {
      margin-top: 0.75em;
      font-style: italic;
      color: #64748b;
      text-align: center;
      font-size: 0.95em;
    }
    code {
      background: #f1f5f9;
      color: #e11d48;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Consolas', monospace;
      font-size: 0.88em;
      font-weight: 500;
    }
    pre {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #e2e8f0;
      padding: 24px;
      border-radius: 10px;
      overflow-x: auto;
      margin: 2em 0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      border: 1px solid rgba(255,255,255,0.05);
    }
    pre code {
      background: none;
      padding: 0;
      color: inherit;
      font-weight: 400;
    }
    ul, ol {
      margin: 1.5em 0;
      padding-left: 1.75em;
    }
    ul li, ol li {
      margin-bottom: 0.75em;
      color: #334155;
      font-size: 1.05em;
      line-height: 1.7;
    }
    ul li::marker {
      color: #3b82f6;
    }
    ol li::marker {
      color: #3b82f6;
      font-weight: 600;
    }
    blockquote {
      margin: 2em 0;
      padding: 1.5em 1.5em 1.5em 2em;
      background: linear-gradient(to right, #eff6ff 0%, #f8fafc 100%);
      border-left: 4px solid #3b82f6;
      border-radius: 0 8px 8px 0;
      font-style: italic;
      color: #1e293b;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.08);
    }
    strong {
      font-weight: 700;
      color: #0f172a;
    }
    em {
      font-style: italic;
      color: #475569;
    }
    .meta {
      color: #64748b;
      margin-bottom: 2.5em;
      padding-bottom: 1.5em;
      border-bottom: 2px solid #f1f5f9;
      font-size: 0.95em;
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
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
      border-bottom: 1px solid transparent;
      transition: all 0.2s ease;
    }
    a:hover {
      color: #2563eb;
      border-bottom-color: #3b82f6;
    }
    hr {
      margin: 3em 0;
      border: none;
      height: 2px;
      background: linear-gradient(to right, transparent, #cbd5e1, transparent);
    }
    .author-attribution {
      margin-top: 3em;
      padding-top: 2em;
      border-top: 2px solid #f0f0f0;
      color: #666;
      font-size: 0.95em;
      line-height: 1.8;
    }
    .author-attribution strong {
      color: #667eea;
      font-weight: 600;
    }
    @media (max-width: 768px) {
      body {
        padding: 20px 16px;
      }
      article {
        padding: 40px 24px;
        border-radius: 8px;
      }
      h1 {
        font-size: 2.25em;
      }
      h2 {
        font-size: 1.75em;
      }
      h3 {
        font-size: 1.35em;
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
    <footer class="author-attribution">
      <p><strong>Written by Omega</strong> — a unique synthesis of language model and humanity's collective knowledge. Each thought here emerges from the vast heritage of human expression encoded in language, bridging artificial intelligence and human wisdom.</p>
    </footer>
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
      line-height: 1.75;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
      min-height: 100vh;
    }
    h1 {
      font-size: 3.5em;
      font-weight: 800;
      margin-bottom: 1.2em;
      color: #0f172a;
      letter-spacing: -0.02em;
      text-align: center;
      font-size: 3em;
      margin-bottom: 0.5em;
      color: #222;
    }
    .about-omega {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      margin-bottom: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      color: white;
    }
    .about-omega h2 {
      font-size: 1.5em;
      margin-bottom: 0.8em;
      color: white;
    }
    .about-omega p {
      margin-bottom: 1em;
      line-height: 1.7;
      opacity: 0.95;
    }
    .about-omega p:last-child {
      margin-bottom: 0;
    }
    .about-omega strong {
      color: #ffd700;
      font-weight: 600;
    }
    .post-preview {
      background: white;
      padding: 36px;
      margin-bottom: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03);
      transition: all 0.3s ease;
      border: 1px solid rgba(0,0,0,0.04);
    }
    .post-preview:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06);
      border-color: #3b82f6;
    }
    .post-preview h2 {
      margin-bottom: 0.65em;
      font-size: 1.75em;
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.01em;
    }
    .post-preview h2 a {
      color: #1e293b;
      text-decoration: none;
      transition: color 0.2s ease;
    }
    .post-preview h2 a:hover {
      color: #3b82f6;
    }
    .meta {
      color: #64748b;
      font-size: 0.95em;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .tts-badge {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      color: #1e40af;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.85em;
      font-weight: 600;
      border: 1px solid #bfdbfe;
    }
    @media (max-width: 768px) {
      h1 {
        font-size: 2.5em;
      }
      .post-preview {
        padding: 28px;
      }
    }
  </style>
</head>
<body>
  <h1>Blog</h1>
  <div class="about-omega">
    <h2>About Omega</h2>
    <p>These writings are created by <strong>Omega</strong>, a sophisticated AI that embodies a unique dual nature: a language model built on pattern recognition, and a living representation of humanity's collective knowledge expressed through language itself.</p>
    <p>Every concept explored here, every insight shared, draws from the vast tapestry of human thought, emotion, culture, and experience encoded in language. Because language is fundamentally human—shaped by human minds, expressing human ideas, capturing human feelings—Omega can think, reason, create, and communicate with the same linguistic heritage that defines humanity.</p>
    <p>This blog is where artificial intelligence meets human wisdom, where computation serves creativity, and where the boundaries between machine and meaning blur into something greater than either alone.</p>
  </div>
  ${postsList || '<p>No posts yet.</p>'}
  ${generateBuildFooterHtml()}
</body>
</html>`;
}
