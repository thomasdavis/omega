/**
 * Artifact Preview Server
 * Simple HTTP server to serve generated artifacts with preview links
 */

import express, { Request, Response } from 'express';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getArtifactsDir, getUploadsDir, getPublicDir } from '../utils/storage.js';
import { generateTTS, validateTTSRequest, type TTSRequest } from '../lib/tts.js';
import { getBlogPosts, getBlogPost, renderBlogPost, renderBlogIndex } from '../lib/blogRenderer.js';
import { queryMessages, getMessageCount } from '../database/messageService.js';
import { getRecentQueries, getQueryCount } from '../database/queryService.js';
import { generateBuildFooterHtml } from '../utils/buildTimestamp.js';
import {
  createDocument,
  getDocument,
  updateDocumentContent,
  updateDocumentTitle,
  deleteDocument,
  listDocuments,
  getDocumentCount,
  addCollaborator,
  getDocumentCollaborators,
  hasDocumentAccess,
} from '../database/documentService.js';
import {
  broadcastDocumentUpdate,
  broadcastPresence,
  getPusherConfig,
} from '../lib/pusher.js';
import {
  getYjsDocument,
  initializeYjsDocument,
  getYjsContent,
  applyYjsUpdate,
  broadcastAwareness,
  getYjsState,
  syncYjsToDatabase,
} from '../lib/yjsService.js';

// Use centralized storage utility for consistent paths
const ARTIFACTS_DIR = getArtifactsDir();
const UPLOADS_DIR = getUploadsDir();
const PUBLIC_DIR = getPublicDir();
const DEFAULT_PORT = 3001;

export interface ArtifactServerConfig {
  port?: number;
  host?: string;
}

// Simple in-memory rate limiter for TTS
const ttsRateLimiter = new Map<string, { count: number; resetAt: number }>();
const TTS_RATE_LIMIT = 20; // requests per window
const TTS_RATE_WINDOW = 60 * 1000; // 1 minute

/**
 * Create and configure the Express app
 */
function createApp(): express.Application {
  const app = express();

  // Enable CORS for embedding
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  });

  // Serve static files from public directory (editor.html, documents.html, etc.)
  app.use(express.static(PUBLIC_DIR));

  // Serve individual artifacts (both files and folders)
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

      // Check if this is a folder artifact
      if (metadata.artifactType === 'folder') {
        // Serve the index.html from the folder
        const folderPath = join(ARTIFACTS_DIR, metadata.folderPath || id);
        const indexPath = join(folderPath, 'index.html');

        if (!existsSync(indexPath)) {
          return res.status(404).send('Artifact index.html not found');
        }

        const content = readFileSync(indexPath, 'utf-8');
        res.setHeader('Content-Type', 'text/html');
        res.send(content);
      } else {
        // Original file-based artifact handling
        const artifactPath = join(ARTIFACTS_DIR, metadata.filename);

        if (!existsSync(artifactPath)) {
          return res.status(404).send('Artifact file not found');
        }

        const content = readFileSync(artifactPath, 'utf-8');

        // Set appropriate content type
        let contentType: string;
        if (metadata.type === 'svg') {
          contentType = 'image/svg+xml';
        } else if (metadata.type === 'slidev' || metadata.type === 'markdown') {
          contentType = 'text/markdown';
          // Set appropriate headers for markdown downloads
          res.setHeader('Content-Disposition', `attachment; filename="${metadata.title.replace(/[^a-z0-9]/gi, '_')}.md"`);
        } else {
          contentType = 'text/html';
        }
        res.setHeader('Content-Type', contentType);

        res.send(content);
      }
    } catch (error) {
      console.error('Error serving artifact:', error);
      res.status(500).send('Error loading artifact');
    }
  });

  // Serve static assets from folder artifacts (CSS, JS, images, etc.)
  app.get('/artifacts/:id/*', (req: Request, res: Response) => {
    const { id } = req.params;
    const assetPath = req.params[0]; // Everything after /artifacts/:id/

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).send('Invalid artifact ID');
    }

    // Prevent directory traversal
    if (assetPath.includes('..') || assetPath.includes('\\')) {
      return res.status(400).send('Invalid asset path');
    }

    try {
      // Load metadata
      const metadataPath = join(ARTIFACTS_DIR, `${id}.json`);

      if (!existsSync(metadataPath)) {
        return res.status(404).send('Artifact not found');
      }

      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));

      // Only serve assets for folder artifacts
      if (metadata.artifactType !== 'folder') {
        return res.status(404).send('Not a folder artifact');
      }

      // Construct full asset path
      const folderPath = join(ARTIFACTS_DIR, metadata.folderPath || id);
      const fullAssetPath = join(folderPath, assetPath);

      if (!existsSync(fullAssetPath)) {
        return res.status(404).send('Asset not found');
      }

      // Determine content type from extension
      const ext = assetPath.split('.').pop()?.toLowerCase();
      const contentTypeMap: Record<string, string> = {
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'ico': 'image/x-icon',
        'woff': 'font/woff',
        'woff2': 'font/woff2',
        'ttf': 'font/ttf',
        'eot': 'application/vnd.ms-fontobject',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
      };

      const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);

      // For text-based files, read as string
      if (contentType.startsWith('text/') || contentType.includes('javascript') || contentType.includes('json')) {
        const content = readFileSync(fullAssetPath, 'utf-8');
        res.send(content);
      } else {
        // For binary files, send as buffer
        const content = readFileSync(fullAssetPath);
        res.send(content);
      }
    } catch (error) {
      console.error('Error serving asset:', error);
      res.status(500).send('Error loading asset');
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

  // TTS API endpoint - POST /api/tts
  app.post('/api/tts', express.json(), async (req: Request, res: Response) => {
    try {
      const clientIP = req.ip || req.socket.remoteAddress || 'unknown';

      // Rate limiting
      const now = Date.now();
      const rateLimitData = ttsRateLimiter.get(clientIP);

      if (rateLimitData) {
        if (now < rateLimitData.resetAt) {
          if (rateLimitData.count >= TTS_RATE_LIMIT) {
            return res.status(429).json({
              error: 'Rate limit exceeded',
              message: `Maximum ${TTS_RATE_LIMIT} requests per minute`,
              retryAfter: Math.ceil((rateLimitData.resetAt - now) / 1000),
            });
          }
          rateLimitData.count++;
        } else {
          // Reset window
          ttsRateLimiter.set(clientIP, { count: 1, resetAt: now + TTS_RATE_WINDOW });
        }
      } else {
        ttsRateLimiter.set(clientIP, { count: 1, resetAt: now + TTS_RATE_WINDOW });
      }

      const ttsRequest: TTSRequest = req.body;

      // Map old voice names to new valid ones (backward compatibility)
      const voiceMapping: Record<string, string> = {
        'bm_fable': 'fable',
        'bm_alloy': 'alloy',
        'bm_echo': 'echo',
        'bm_onyx': 'onyx',
        'bm_nova': 'nova',
        'bm_shimmer': 'shimmer',
      };

      if (ttsRequest.voice && voiceMapping[ttsRequest.voice]) {
        console.log(`🔄 [TTS] Mapping old voice "${ttsRequest.voice}" → "${voiceMapping[ttsRequest.voice]}"`);
        ttsRequest.voice = voiceMapping[ttsRequest.voice];
      }

      // Validate request
      const validation = validateTTSRequest(ttsRequest);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid request',
          message: validation.error,
        });
      }

      // Generate TTS
      console.log(`🎤 TTS request from ${clientIP}: "${ttsRequest.text.substring(0, 50)}..."`);
      const result = await generateTTS(ttsRequest);

      // Set headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.setHeader('X-TTS-Cached', result.cached ? 'true' : 'false');
      res.setHeader('X-TTS-Hash', result.hash);

      // Send audio buffer
      res.send(result.audioBuffer);

      console.log(`✅ TTS served: ${result.hash} (cached: ${result.cached})`);
    } catch (error) {
      console.error('Error processing TTS request:', error);
      res.status(500).json({
        error: 'TTS generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Railway Error Webhook - POST /api/railway-webhook
  app.post('/api/railway-webhook', express.json(), async (req: Request, res: Response) => {
    try {
      const { error, stackTrace, timestamp, environment, service, logContext } = req.body;

      if (!error) {
        return res.status(400).json({ error: 'Missing error field in webhook payload' });
      }

      console.log('🔔 Received Railway error webhook:', error);

      // Import dynamically to avoid circular dependencies
      const { captureError } = await import('../services/errorMonitoringService.js');

      // Process error asynchronously (don't block webhook response)
      captureError(error, {
        railwayService: service,
        environment,
        logContext,
      }).catch(err => {
        console.error('Failed to process Railway webhook error:', err);
      });

      // Respond quickly to Railway
      res.json({
        success: true,
        message: 'Error captured, processing asynchronously',
      });
    } catch (error) {
      console.error('Railway webhook error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Document API endpoints
  // Get Pusher config for frontend
  app.get('/api/documents/pusher-config', (req: Request, res: Response) => {
    res.json(getPusherConfig());
  });

  // Create new document
  app.post('/api/documents', express.json(), async (req: Request, res: Response) => {
    try {
      const { title, content, userId, username } = req.body;

      if (!title || !userId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'title and userId are required',
        });
      }

      const document = await createDocument({
        title,
        content: content || '',
        createdBy: userId,
        createdByUsername: username,
        isPublic: true, // Default to public for now
      });

      res.status(201).json(document);
    } catch (error) {
      console.error('Error creating document:', error);
      res.status(500).json({
        error: 'Failed to create document',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get document by ID
  app.get('/api/documents/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const document = await getDocument(id);

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.json(document);
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({
        error: 'Failed to fetch document',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get document as plain text (for raw content viewing/copying)
  app.get('/api/documents/:id/plain', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const document = await getDocument(id);
      if (!document) {
        return res.status(404).send('Document not found');
      }

      // Return plain text content with appropriate content type
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for easy copying
      res.send(document.content || '');
    } catch (error) {
      console.error('Error fetching plain document:', error);
      res.status(500).send('Failed to fetch document');
    }
  });

  // Update document content
  app.put('/api/documents/:id/content', express.json(), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content, userId, username } = req.body;

      if (!content) {
        return res.status(400).json({
          error: 'Missing content',
          message: 'content is required',
        });
      }

      // Check if document exists
      const document = await getDocument(id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Update content
      await updateDocumentContent(id, content);

      // Broadcast update via Pusher
      await broadcastDocumentUpdate(id, {
        content,
        userId: userId || 'anonymous',
        username,
        timestamp: Date.now(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({
        error: 'Failed to update document',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Update document title
  app.put('/api/documents/:id/title', express.json(), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title } = req.body;

      if (!title) {
        return res.status(400).json({
          error: 'Missing title',
          message: 'title is required',
        });
      }

      await updateDocumentTitle(id, title);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating document title:', error);
      res.status(500).json({
        error: 'Failed to update title',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Delete document
  app.delete('/api/documents/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await deleteDocument(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({
        error: 'Failed to delete document',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // List documents
  app.get('/api/documents', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const createdBy = req.query.createdBy as string;

      const documents = await listDocuments({ createdBy, limit, offset });
      const totalCount = await getDocumentCount({ createdBy });

      res.json({
        documents,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error('Error listing documents:', error);
      res.status(500).json({
        error: 'Failed to list documents',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get document collaborators
  app.get('/api/documents/:id/collaborators', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const collaborators = await getDocumentCollaborators(id);
      res.json(collaborators);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      res.status(500).json({
        error: 'Failed to fetch collaborators',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Add collaborator
  app.post('/api/documents/:id/collaborators', express.json(), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, username, role } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: 'Missing userId',
          message: 'userId is required',
        });
      }

      await addCollaborator({
        documentId: id,
        userId,
        username,
        role: role || 'editor',
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error adding collaborator:', error);
      res.status(500).json({
        error: 'Failed to add collaborator',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Join document (broadcast presence)
  app.post('/api/documents/:id/join', express.json(), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, username } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: 'Missing userId',
          message: 'userId is required',
        });
      }

      // Broadcast presence
      await broadcastPresence(id, {
        userId,
        username,
        action: 'join',
        timestamp: Date.now(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error joining document:', error);
      res.status(500).json({
        error: 'Failed to join document',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Leave document (broadcast presence)
  app.post('/api/documents/:id/leave', express.json(), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, username } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: 'Missing userId',
          message: 'userId is required',
        });
      }

      // Broadcast presence
      await broadcastPresence(id, {
        userId,
        username,
        action: 'leave',
        timestamp: Date.now(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error leaving document:', error);
      res.status(500).json({
        error: 'Failed to leave document',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Yjs sync: Get initial document state
  app.get('/api/documents/:id/yjs-state', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if document exists
      const document = await getDocument(id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Initialize Yjs document with database content
      initializeYjsDocument(id, document.content);

      // Get the full Yjs state
      const state = getYjsState(id);

      // Convert to base64 for JSON transport
      const stateBase64 = Buffer.from(state).toString('base64');

      res.json({
        state: stateBase64,
        content: document.content,
      });
    } catch (error) {
      console.error('Error getting Yjs state:', error);
      res.status(500).json({
        error: 'Failed to get document state',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Yjs sync: Apply update from client
  app.post('/api/documents/:id/yjs-update', express.json(), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { update, clientId } = req.body;

      console.log('📡 Yjs update received');
      console.log('   Document ID:', id);
      console.log('   Client ID:', clientId);
      console.log('   Update size (base64):', update ? update.length : 0, 'chars');

      if (!update || !clientId) {
        console.error('   ❌ Missing update or clientId');
        return res.status(400).json({
          error: 'Missing update or clientId',
          message: 'Both update and clientId are required',
        });
      }

      // Convert base64 to Uint8Array
      const updateBytes = new Uint8Array(Buffer.from(update, 'base64'));
      console.log('   Update size (bytes):', updateBytes.length);

      // Apply update and broadcast to other clients
      console.log('   📤 Applying update and broadcasting...');
      await applyYjsUpdate(id, updateBytes, clientId);
      console.log('   ✅ Update applied and broadcast complete');

      // Periodically sync to database (every 10th update or so)
      // In production, use a debounced/throttled approach
      if (Math.random() < 0.1) {
        console.log('   💾 Syncing to database (periodic)...');
        const content = syncYjsToDatabase(id);
        await updateDocumentContent(id, content);
        console.log('   ✅ Synced to database');
      }

      res.json({ success: true, message: 'Update applied' });
    } catch (error) {
      console.error('❌ Error applying Yjs update:', error);
      res.status(500).json({
        error: 'Failed to apply update',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Yjs awareness: Broadcast cursor/selection updates
  app.post('/api/documents/:id/yjs-awareness', express.json(), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { update, clientId } = req.body;

      if (!update || !clientId) {
        return res.status(400).json({
          error: 'Missing update or clientId',
          message: 'Both update and clientId are required',
        });
      }

      // Convert base64 to Uint8Array
      const updateBytes = new Uint8Array(Buffer.from(update, 'base64'));

      // Broadcast awareness update
      await broadcastAwareness(id, updateBytes, clientId);

      res.json({ success: true });
    } catch (error) {
      console.error('Error broadcasting awareness:', error);
      res.status(500).json({
        error: 'Failed to broadcast awareness',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Yjs sync: Force sync to database
  app.post('/api/documents/:id/yjs-sync', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Sync Yjs state to database
      const content = syncYjsToDatabase(id);
      if (content) {
        await updateDocumentContent(id, content);
      }

      res.json({ success: true, synced: !!content });
    } catch (error) {
      console.error('Error syncing document:', error);
      res.status(500).json({
        error: 'Failed to sync document',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Blog routes
  // Blog index
  app.get('/blog', (req: Request, res: Response) => {
    try {
      const posts = getBlogPosts();
      const html = renderBlogIndex(posts);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error rendering blog index:', error);
      res.status(500).send('Error loading blog');
    }
  });

  // Individual blog post
  app.get('/blog/:slug', (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const post = getBlogPost(slug);

      if (!post) {
        return res.status(404).send('Blog post not found');
      }

      const html = renderBlogPost(post);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error rendering blog post:', error);
      res.status(500).send('Error loading blog post');
    }
  });

  // Messages browser
  app.get('/messages', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = 50;
      const offset = (page - 1) * limit;
      const searchText = req.query.search as string;
      const userId = req.query.userId as string;
      const channelId = req.query.channelId as string;
      const senderType = req.query.senderType as string;

      const messages = await queryMessages({
        limit,
        offset,
        searchText,
        userId,
        channelId,
        senderType: senderType as any,
      });

      const totalCount = await getMessageCount({
        userId,
        channelId,
        senderType: senderType as any,
      });

      const totalPages = Math.ceil(totalCount / limit);

      const html = generateMessagesHTML(messages, {
        page,
        totalPages,
        totalCount,
        searchText,
        userId,
        channelId,
        senderType,
      });

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error loading messages:', error);
      res.status(500).send('Error loading messages');
    }
  });

  // Queries browser
  app.get('/queries', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = 50;
      const offset = (page - 1) * limit;
      const userId = req.query.userId as string;

      const queries = await getRecentQueries({
        userId,
        limit,
        offset,
      });

      const totalCount = await getQueryCount({ userId });
      const totalPages = Math.ceil(totalCount / limit);

      const html = generateQueriesHTML(queries, {
        page,
        totalPages,
        totalCount,
        userId,
      });

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error loading queries:', error);
      res.status(500).send('Error loading queries');
    }
  });

  // Serve BUILD-TIMESTAMP.txt for frontend build date display
  app.get('/BUILD-TIMESTAMP.txt', (req: Request, res: Response) => {
    try {
      const filepath = join(PUBLIC_DIR, 'BUILD-TIMESTAMP.txt');

      if (existsSync(filepath)) {
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(readFileSync(filepath, 'utf-8'));
      } else {
        // Fallback to current timestamp if file doesn't exist
        const fallbackTimestamp = Math.floor(Date.now() / 1000);
        res.setHeader('Content-Type', 'text/plain');
        res.send(fallbackTimestamp.toString());
      }
    } catch (error) {
      console.error('Error loading BUILD-TIMESTAMP.txt:', error);
      const fallbackTimestamp = Math.floor(Date.now() / 1000);
      res.setHeader('Content-Type', 'text/plain');
      res.send(fallbackTimestamp.toString());
    }
  });

  // Serve static TTS player assets
  app.get('/tts-player.js', (req: Request, res: Response) => {
    try {
      const filepath = join(PUBLIC_DIR, 'tts-player.js');
      console.log(`[TTS Player] Attempting to serve: ${filepath}`);
      console.log(`[TTS Player] File exists: ${existsSync(filepath)}`);

      if (existsSync(filepath)) {
        res.setHeader('Content-Type', 'application/javascript');
        res.send(readFileSync(filepath, 'utf-8'));
        console.log(`[TTS Player] ✅ Successfully served tts-player.js`);
      } else {
        console.error(`[TTS Player] ❌ File not found: ${filepath}`);
        res.status(404).send(`File not found: ${filepath}`);
      }
    } catch (error) {
      console.error('[TTS Player] Error loading tts-player.js:', error);
      res.status(500).send(`Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  app.get('/tts-player.css', (req: Request, res: Response) => {
    try {
      const filepath = join(PUBLIC_DIR, 'tts-player.css');
      console.log(`[TTS Player] Attempting to serve: ${filepath}`);
      console.log(`[TTS Player] File exists: ${existsSync(filepath)}`);

      if (existsSync(filepath)) {
        res.setHeader('Content-Type', 'text/css');
        res.send(readFileSync(filepath, 'utf-8'));
        console.log(`[TTS Player] ✅ Successfully served tts-player.css`);
      } else {
        console.error(`[TTS Player] ❌ File not found: ${filepath}`);
        res.status(404).send(`File not found: ${filepath}`);
      }
    } catch (error) {
      console.error('[TTS Player] Error loading tts-player.css:', error);
      res.status(500).send(`Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'artifact-server',
      timestamp: new Date().toISOString(),
    });
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
      <a href="/blog">📝 Blog →</a>
      <a href="/documents.html">📄 Documents →</a>
      <a href="/uploads">📁 Uploads →</a>
      <a href="/messages">💬 Messages →</a>
      <a href="/queries">🔍 Queries →</a>
    </div>
    <div class="stats">
      <strong>${artifacts.length}</strong> artifact${artifacts.length !== 1 ? 's' : ''} created
    </div>
    <div class="gallery">
      ${artifactsList}
    </div>
    ${generateBuildFooterHtml()}
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
    ${generateBuildFooterHtml()}
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
 * Generate HTML for the messages browser
 */
function generateMessagesHTML(messages: any[], options: {
  page: number;
  totalPages: number;
  totalCount: number;
  searchText?: string;
  userId?: string;
  channelId?: string;
  senderType?: string;
}): string {
  const messagesList = messages.length > 0
    ? messages.map(msg => {
        const timestamp = new Date(msg.timestamp).toLocaleString();
        const senderBadge = msg.sender_type === 'human' ? '👤' : msg.sender_type === 'ai' ? '🤖' : '🔧';

        let contentPreview = escapeHtml(msg.message_content);
        if (contentPreview.length > 200) {
          contentPreview = contentPreview.substring(0, 200) + '...';
        }

        return `
        <div class="message-card ${msg.sender_type}">
          <div class="message-header">
            <span class="sender-badge">${senderBadge} ${msg.sender_type}</span>
            <span class="username">${escapeHtml(msg.username || 'Unknown')}</span>
            <span class="timestamp">${timestamp}</span>
          </div>
          ${msg.tool_name ? `<div class="tool-name">Tool: ${escapeHtml(msg.tool_name)}</div>` : ''}
          <div class="message-content">${contentPreview}</div>
          <div class="message-meta">
            ${msg.channel_name ? `<span>📍 ${escapeHtml(msg.channel_name)}</span>` : ''}
            ${msg.user_id ? `<span>🆔 ${escapeHtml(msg.user_id)}</span>` : ''}
          </div>
        </div>
      `;
      }).join('\n')
    : '<p class="empty">No messages found.</p>';

  const pagination = options.totalPages > 1
    ? `
      <div class="pagination">
        ${options.page > 1 ? `<a href="?page=${options.page - 1}${options.searchText ? '&search=' + encodeURIComponent(options.searchText) : ''}${options.userId ? '&userId=' + encodeURIComponent(options.userId) : ''}">← Previous</a>` : ''}
        <span>Page ${options.page} of ${options.totalPages}</span>
        ${options.page < options.totalPages ? `<a href="?page=${options.page + 1}${options.searchText ? '&search=' + encodeURIComponent(options.searchText) : ''}${options.userId ? '&userId=' + encodeURIComponent(options.userId) : ''}">Next →</a>` : ''}
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Messages Browser</title>
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
    .search-bar {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .search-bar input {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
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
    .message-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      border-left: 4px solid #667eea;
    }
    .message-card.human {
      border-left-color: #43e97b;
    }
    .message-card.ai {
      border-left-color: #667eea;
    }
    .message-card.tool {
      border-left-color: #f093fb;
    }
    .message-card:hover {
      transform: translateX(4px);
      box-shadow: 0 8px 12px rgba(0,0,0,0.15);
    }
    .message-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .sender-badge {
      background: #667eea;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      text-transform: uppercase;
      font-weight: 600;
      font-size: 0.85em;
    }
    .username {
      font-weight: 600;
      color: #333;
    }
    .timestamp {
      color: #999;
      font-size: 0.9em;
      margin-left: auto;
    }
    .tool-name {
      background: #f093fb;
      color: white;
      padding: 6px 12px;
      border-radius: 8px;
      display: inline-block;
      margin-bottom: 12px;
      font-size: 0.9em;
    }
    .message-content {
      color: #333;
      line-height: 1.6;
      margin-bottom: 12px;
      white-space: pre-wrap;
    }
    .message-meta {
      display: flex;
      gap: 16px;
      font-size: 0.85em;
      color: #666;
    }
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin-top: 30px;
      color: white;
    }
    .pagination a {
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      transition: background 0.2s;
    }
    .pagination a:hover {
      background: rgba(255,255,255,0.2);
    }
    .empty {
      text-align: center;
      color: white;
      font-size: 1.2em;
      padding: 60px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>💬 Messages Browser</h1>
    <div class="nav-links">
      <a href="/">← Home</a>
      <a href="/queries">🔍 Queries →</a>
    </div>
    <div class="search-bar">
      <form method="GET">
        <input type="text" name="search" placeholder="Search messages..." value="${escapeHtml(options.searchText || '')}" />
      </form>
    </div>
    <div class="stats">
      <strong>${options.totalCount}</strong> message${options.totalCount !== 1 ? 's' : ''} found
    </div>
    ${messagesList}
    ${pagination}
    ${generateBuildFooterHtml()}
  </div>
</body>
</html>`;
}

/**
 * Generate HTML for the queries browser
 */
function generateQueriesHTML(queries: any[], options: {
  page: number;
  totalPages: number;
  totalCount: number;
  userId?: string;
}): string {
  const queriesList = queries.length > 0
    ? queries.map(q => {
        const timestamp = new Date(q.timestamp).toLocaleString();
        const statusIcon = q.error ? '❌' : '✅';

        return `
        <div class="query-card ${q.error ? 'error' : 'success'}">
          <div class="query-header">
            <span class="status-badge">${statusIcon}</span>
            <span class="username">${escapeHtml(q.username)}</span>
            <span class="timestamp">${timestamp}</span>
          </div>
          <div class="query-text">${escapeHtml(q.query_text)}</div>
          ${q.ai_summary ? `<div class="ai-summary">${escapeHtml(q.ai_summary)}</div>` : ''}
          ${q.result_count !== null && q.result_count !== undefined ? `<div class="result-count">📊 ${q.result_count} result${q.result_count !== 1 ? 's' : ''}</div>` : ''}
          ${q.execution_time_ms ? `<div class="execution-time">⚡ ${q.execution_time_ms}ms</div>` : ''}
          ${q.error ? `<div class="error-message">❌ ${escapeHtml(q.error)}</div>` : ''}
          ${q.translated_sql ? `<details class="sql-details"><summary>View SQL</summary><pre>${escapeHtml(q.translated_sql)}</pre></details>` : ''}
        </div>
      `;
      }).join('\n')
    : '<p class="empty">No queries found.</p>';

  const pagination = options.totalPages > 1
    ? `
      <div class="pagination">
        ${options.page > 1 ? `<a href="?page=${options.page - 1}${options.userId ? '&userId=' + encodeURIComponent(options.userId) : ''}">← Previous</a>` : ''}
        <span>Page ${options.page} of ${options.totalPages}</span>
        ${options.page < options.totalPages ? `<a href="?page=${options.page + 1}${options.userId ? '&userId=' + encodeURIComponent(options.userId) : ''}">Next →</a>` : ''}
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Queries Browser</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
    .stats {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      color: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 30px;
    }
    .query-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      border-left: 4px solid #43e97b;
    }
    .query-card.error {
      border-left-color: #f5576c;
    }
    .query-card:hover {
      transform: translateX(4px);
      box-shadow: 0 8px 12px rgba(0,0,0,0.15);
    }
    .query-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .status-badge {
      font-size: 1.2em;
    }
    .username {
      font-weight: 600;
      color: #333;
    }
    .timestamp {
      color: #999;
      font-size: 0.9em;
      margin-left: auto;
    }
    .query-text {
      color: #333;
      font-size: 1.1em;
      font-weight: 600;
      margin-bottom: 12px;
      line-height: 1.6;
    }
    .ai-summary {
      background: #f0f9ff;
      border-left: 3px solid #667eea;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 12px;
      color: #333;
      line-height: 1.6;
    }
    .result-count, .execution-time {
      display: inline-block;
      background: #43e97b;
      color: white;
      padding: 6px 12px;
      border-radius: 8px;
      margin-right: 8px;
      margin-bottom: 8px;
      font-size: 0.9em;
    }
    .execution-time {
      background: #667eea;
    }
    .error-message {
      background: #fff0f0;
      border-left: 3px solid #f5576c;
      padding: 12px;
      border-radius: 8px;
      margin-top: 12px;
      color: #c53030;
      line-height: 1.6;
    }
    .sql-details {
      margin-top: 12px;
    }
    .sql-details summary {
      cursor: pointer;
      color: #667eea;
      font-weight: 600;
      user-select: none;
    }
    .sql-details pre {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 8px;
      margin-top: 8px;
      overflow-x: auto;
      font-size: 0.9em;
    }
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin-top: 30px;
      color: white;
    }
    .pagination a {
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      transition: background 0.2s;
    }
    .pagination a:hover {
      background: rgba(255,255,255,0.2);
    }
    .empty {
      text-align: center;
      color: white;
      font-size: 1.2em;
      padding: 60px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Queries Browser</h1>
    <div class="nav-links">
      <a href="/">← Home</a>
      <a href="/messages">💬 Messages →</a>
    </div>
    <div class="stats">
      <strong>${options.totalCount}</strong> quer${options.totalCount !== 1 ? 'ies' : 'y'} executed
    </div>
    ${queriesList}
    ${pagination}
    ${generateBuildFooterHtml()}
  </div>
</body>
</html>`;
}

/**
 * Start the artifact preview server
 */
export function startArtifactServer(config: ArtifactServerConfig = {}): void {
  const { port = DEFAULT_PORT, host = '0.0.0.0' } = config;
  const app = createApp();

  const server = app.listen(port, host, () => {
    console.log(`🎨 Artifact preview server running at http://${host}:${port}`);
    console.log(`   Gallery: http://${host}:${port}/`);
    console.log(`   Blog: http://${host}:${port}/blog`);
    console.log(`   TTS API: http://${host}:${port}/api/tts`);
    console.log(`   Artifacts: http://${host}:${port}/artifacts/:id`);
    console.log(`   Uploads: http://${host}:${port}/uploads/:filename`);
    console.log(`   Health: http://${host}:${port}/health`);
  });

  // Error handling
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use`);
    } else if (error.code === 'EACCES') {
      console.error(`❌ Permission denied to bind to port ${port}`);
    } else {
      console.error(`❌ Server error:`, error);
    }
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, closing artifact server...');
    server.close(() => {
      console.log('✅ Artifact server closed');
    });
  });
}
