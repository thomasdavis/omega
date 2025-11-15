/**
 * Artifact Preview Server
 * Simple HTTP server to serve generated artifacts with preview links
 */

import express, { Request, Response } from 'express';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ARTIFACTS_DIR = join(__dirname, '../../../artifacts');
// Use persistent Fly.io Volume if available, otherwise fall back to local public folder
const UPLOADS_DIR = process.env.NODE_ENV === 'production' && existsSync('/data/uploads')
  ? '/data/uploads'
  : join(__dirname, '../../../public/uploads');
const DEFAULT_PORT = 3001;

export interface ArtifactServerConfig {
  port?: number;
  host?: string;
}

/**
 * Create and configure the Express app
 */
function createApp(): express.Application {
  const app = express();

  // Enable CORS for embedding
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  // Serve individual artifacts
  app.get('/artifacts/:id', (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate UUID format (basic check)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).send('Invalid artifact ID');
    }

    try {
      // Try to load metadata first
      const metadataPath = join(ARTIFACTS_DIR, `${id}.json`);

      if (!existsSync(metadataPath)) {
        return res.status(404).send('Artifact not found');
      }

      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      const artifactPath = join(ARTIFACTS_DIR, metadata.filename);

      if (!existsSync(artifactPath)) {
        return res.status(404).send('Artifact file not found');
      }

      const content = readFileSync(artifactPath, 'utf-8');

      // Set appropriate content type
      const contentType = metadata.type === 'svg' ? 'image/svg+xml' : 'text/html';
      res.setHeader('Content-Type', contentType);

      res.send(content);
    } catch (error) {
      console.error('Error serving artifact:', error);
      res.status(500).send('Error loading artifact');
    }
  });

  // Serve uploaded files
  app.get('/uploads/:filename', (req: Request, res: Response) => {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).send('Invalid filename');
    }

    try {
      const filepath = join(UPLOADS_DIR, filename);

      if (!existsSync(filepath)) {
        return res.status(404).send('File not found');
      }

      // Try to load metadata if available
      const metadataPath = join(UPLOADS_DIR, `${filename}.json`);
      let contentType = 'application/octet-stream';

      if (existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
          if (metadata.mimeType) {
            contentType = metadata.mimeType;
          }
        } catch (error) {
          // Metadata read failed, use default content type
        }
      }

      // Set appropriate content type
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

      // Send the file
      const content = readFileSync(filepath);
      res.send(content);
    } catch (error) {
      console.error('Error serving uploaded file:', error);
      res.status(500).send('Error loading file');
    }
  });

  // Uploads gallery - list all uploaded files
  app.get('/uploads', (req: Request, res: Response) => {
    try {
      if (!existsSync(UPLOADS_DIR)) {
        return res.send(generateUploadsGalleryHTML([]));
      }

      const files = readdirSync(UPLOADS_DIR);
      const metadataFiles = files.filter(f => f.endsWith('.json'));

      const uploads = metadataFiles.map(file => {
        try {
          const content = readFileSync(join(UPLOADS_DIR, file), 'utf-8');
          return JSON.parse(content);
        } catch {
          return null;
        }
      }).filter(Boolean);

      // Sort by upload date (newest first)
      uploads.sort((a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );

      res.send(generateUploadsGalleryHTML(uploads));
    } catch (error) {
      console.error('Error generating uploads gallery:', error);
      res.status(500).send('Error loading uploads gallery');
    }
  });

  // Gallery view - list all artifacts
  app.get('/', (req: Request, res: Response) => {
    try {
      if (!existsSync(ARTIFACTS_DIR)) {
        return res.send(generateGalleryHTML([]));
      }

      const files = readdirSync(ARTIFACTS_DIR);
      const metadataFiles = files.filter(f => f.endsWith('.json'));

      const artifacts = metadataFiles.map(file => {
        try {
          const content = readFileSync(join(ARTIFACTS_DIR, file), 'utf-8');
          return JSON.parse(content);
        } catch {
          return null;
        }
      }).filter(Boolean);

      // Sort by creation date (newest first)
      artifacts.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      res.send(generateGalleryHTML(artifacts));
    } catch (error) {
      console.error('Error generating gallery:', error);
      res.status(500).send('Error loading gallery');
    }
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'artifact-server' });
  });

  return app;
}

/**
 * Generate HTML for the gallery page
 */
function generateGalleryHTML(artifacts: any[]): string {
  const artifactsList = artifacts.length > 0
    ? artifacts.map(a => `
        <div class="artifact-card">
          <h3>${escapeHtml(a.title)}</h3>
          <p class="description">${escapeHtml(a.description)}</p>
          <div class="meta">
            <span class="type">${a.type}</span>
            <span class="date">${new Date(a.createdAt).toLocaleString()}</span>
          </div>
          <a href="/artifacts/${a.id}" class="view-link" target="_blank">View Artifact →</a>
        </div>
      `).join('\n')
    : '<p class="empty">No artifacts yet. Create one using the artifact tool!</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Artifact Gallery</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: white;
      text-align: center;
      margin-bottom: 40px;
      font-size: 3em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .nav-links {
      text-align: center;
      margin-bottom: 20px;
    }
    .nav-links a {
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      margin: 0 10px;
      transition: background 0.2s;
    }
    .nav-links a:hover {
      background: rgba(255,255,255,0.2);
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .artifact-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .artifact-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 12px rgba(0,0,0,0.15);
    }
    .artifact-card h3 {
      color: #333;
      margin-bottom: 12px;
      font-size: 1.4em;
    }
    .description {
      color: #666;
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .meta {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 0.9em;
    }
    .type {
      background: #667eea;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      text-transform: uppercase;
      font-weight: 600;
      font-size: 0.85em;
    }
    .date {
      color: #999;
    }
    .view-link {
      display: inline-block;
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
    }
    .view-link:hover {
      color: #764ba2;
    }
    .empty {
      grid-column: 1 / -1;
      text-align: center;
      color: white;
      font-size: 1.2em;
      padding: 60px;
    }
    .stats {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      color: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 Artifact Gallery</h1>
    <div class="nav-links">
      <a href="/uploads">📁 Uploads Gallery →</a>
    </div>
    <div class="stats">
      <strong>${artifacts.length}</strong> artifact${artifacts.length !== 1 ? 's' : ''} created
    </div>
    <div class="gallery">
      ${artifactsList}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate HTML for the uploads gallery page
 */
function generateUploadsGalleryHTML(uploads: any[]): string {
  const uploadsList = uploads.length > 0
    ? uploads.map(u => {
        const isImage = u.extension && ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'].includes(u.extension.toLowerCase());
        const preview = isImage
          ? `<div class="preview-image"><img src="/uploads/${u.filename}" alt="${escapeHtml(u.originalName)}" /></div>`
          : `<div class="preview-icon">${getFileIcon(u.extension)}</div>`;

        return `
        <div class="upload-card">
          ${preview}
          <h3>${escapeHtml(u.originalName)}</h3>
          <div class="meta">
            <span class="type">${u.extension || 'unknown'}</span>
            <span class="size">${formatFileSize(u.size)}</span>
            ${u.uploadedBy ? `<span class="uploader">by ${escapeHtml(u.uploadedBy)}</span>` : ''}
          </div>
          <p class="date">${new Date(u.uploadedAt).toLocaleString()}</p>
          <a href="/uploads/${u.filename}" class="view-link" target="_blank">Download →</a>
        </div>
      `;
      }).join('\n')
    : '<p class="empty">No uploads yet. Upload a file in Discord to get started!</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Uploads Gallery</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: white;
      text-align: center;
      margin-bottom: 40px;
      font-size: 3em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .upload-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
    }
    .upload-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 12px rgba(0,0,0,0.15);
    }
    .preview-image {
      width: 100%;
      height: 200px;
      margin-bottom: 16px;
      border-radius: 8px;
      overflow: hidden;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .preview-image img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .preview-icon {
      width: 100%;
      height: 200px;
      margin-bottom: 16px;
      border-radius: 8px;
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 4em;
    }
    .upload-card h3 {
      color: #333;
      margin-bottom: 12px;
      font-size: 1.2em;
      word-break: break-word;
    }
    .meta {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
      font-size: 0.85em;
    }
    .type, .size, .uploader {
      background: #43e97b;
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      text-transform: uppercase;
      font-weight: 600;
      font-size: 0.85em;
    }
    .size {
      background: #38f9d7;
    }
    .uploader {
      background: #667eea;
    }
    .date {
      color: #999;
      font-size: 0.85em;
      margin-bottom: 12px;
    }
    .view-link {
      display: inline-block;
      color: #43e97b;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
      margin-top: auto;
    }
    .view-link:hover {
      color: #38f9d7;
    }
    .empty {
      grid-column: 1 / -1;
      text-align: center;
      color: white;
      font-size: 1.2em;
      padding: 60px;
    }
    .stats {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      color: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      gap: 20px;
    }
    .stat {
      flex: 1;
      min-width: 150px;
    }
    .stat-value {
      font-size: 2em;
      font-weight: bold;
      display: block;
    }
    .stat-label {
      font-size: 0.9em;
      opacity: 0.9;
    }
    .nav-links {
      text-align: center;
      margin-bottom: 20px;
    }
    .nav-links a {
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      margin: 0 10px;
      transition: background 0.2s;
    }
    .nav-links a:hover {
      background: rgba(255,255,255,0.2);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📁 Uploads Gallery</h1>
    <div class="nav-links">
      <a href="/">← Artifacts Gallery</a>
    </div>
    <div class="stats">
      <div class="stat">
        <span class="stat-value">${uploads.length}</span>
        <span class="stat-label">Total Uploads</span>
      </div>
      <div class="stat">
        <span class="stat-value">${formatFileSize(uploads.reduce((sum, u) => sum + (u.size || 0), 0))}</span>
        <span class="stat-label">Total Size</span>
      </div>
    </div>
    <div class="gallery">
      ${uploadsList}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Get file icon emoji based on extension
 */
function getFileIcon(extension: string | undefined): string {
  if (!extension) return '📄';

  const iconMap: Record<string, string> = {
    '.pdf': '📕',
    '.txt': '📝',
    '.md': '📝',
    '.doc': '📘',
    '.docx': '📘',
    '.json': '📋',
    '.xml': '📋',
    '.csv': '📊',
    '.zip': '📦',
    '.tar': '📦',
    '.gz': '📦',
    '.7z': '📦',
    '.js': '📜',
    '.ts': '📜',
    '.py': '🐍',
    '.java': '☕',
    '.cpp': '⚙️',
    '.c': '⚙️',
    '.rs': '🦀',
    '.go': '🐹',
    '.rb': '💎',
    '.php': '🐘',
    '.html': '🌐',
    '.css': '🎨',
    '.mp3': '🎵',
    '.mp4': '🎬',
    '.wav': '🎵',
    '.log': '📋',
    '.sql': '🗄️',
  };

  return iconMap[extension.toLowerCase()] || '📄';
}

/**
 * Format file size to human-readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
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
 * Start the artifact preview server
 */
export function startArtifactServer(config: ArtifactServerConfig = {}): void {
  const { port = DEFAULT_PORT, host = '0.0.0.0' } = config;
  const app = createApp();

  app.listen(port, host, () => {
    console.log(`🎨 Artifact preview server running at http://${host}:${port}`);
    console.log(`   Gallery: http://${host}:${port}/`);
    console.log(`   Artifacts: http://${host}:${port}/artifacts/:id`);
    console.log(`   Uploads: http://${host}:${port}/uploads/:filename`);
  });
}
