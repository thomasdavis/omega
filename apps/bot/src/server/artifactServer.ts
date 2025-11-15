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
  });
}
