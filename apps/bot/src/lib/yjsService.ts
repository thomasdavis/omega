/**
 * Yjs Service for CRDT-based Collaboration
 * Handles real-time document synchronization using Yjs with Pusher
 */

import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { getPusher } from './pusher.js';

// In-memory store for Yjs documents (in production, use Redis or persistent storage)
const documents = new Map<string, Y.Doc>();

/**
 * Get or create a Yjs document for a given document ID
 */
export function getYjsDocument(documentId: string): Y.Doc {
  let doc = documents.get(documentId);

  if (!doc) {
    doc = new Y.Doc();
    documents.set(documentId, doc);

    // Clean up old documents after 1 hour of inactivity
    setTimeout(() => {
      documents.delete(documentId);
    }, 60 * 60 * 1000);
  }

  return doc;
}

/**
 * Initialize a Yjs document with content from database
 */
export function initializeYjsDocument(documentId: string, content: string): Y.Doc {
  const doc = getYjsDocument(documentId);
  const yText = doc.getText('content');

  // Only initialize if empty
  if (yText.length === 0 && content) {
    yText.insert(0, content);
  }

  return doc;
}

/**
 * Get the current text content from a Yjs document
 */
export function getYjsContent(documentId: string): string {
  const doc = documents.get(documentId);
  if (!doc) return '';

  const yText = doc.getText('content');
  return yText.toString();
}

/**
 * Apply a Yjs update to a document and broadcast to other clients
 */
export async function applyYjsUpdate(
  documentId: string,
  update: Uint8Array,
  clientId: string
): Promise<void> {
  console.log('🔄 applyYjsUpdate called');
  console.log('   Document ID:', documentId);
  console.log('   Client ID:', clientId);
  console.log('   Update size:', update.length, 'bytes');

  const doc = getYjsDocument(documentId);

  // Apply the update to the document
  console.log('   📝 Applying update to Yjs document...');
  Y.applyUpdate(doc, update);
  console.log('   ✅ Update applied to server-side Yjs doc');

  // Broadcast the update via Pusher to all other clients
  const pusher = getPusher();
  if (!pusher) {
    console.warn('   ⚠️  Pusher not configured, skipping broadcast');
    return;
  }

  try {
    // Convert Uint8Array to base64 for JSON transport
    const updateBase64 = Buffer.from(update).toString('base64');
    const channel = `document-${documentId}`;

    console.log('   📡 Broadcasting to Pusher channel:', channel);
    console.log('   Excluding client:', clientId);

    await pusher.trigger(channel, 'yjs-update', {
      update: updateBase64,
      clientId,
      timestamp: Date.now(),
    });

    console.log('   ✅ Broadcast successful!');
  } catch (error) {
    console.error('   ❌ Error broadcasting Yjs update:', error);
  }
}

/**
 * Broadcast awareness update (cursor positions, user info, etc.)
 */
export async function broadcastAwareness(
  documentId: string,
  awarenessUpdate: Uint8Array,
  clientId: string
): Promise<void> {
  const pusher = getPusher();
  if (!pusher) {
    return;
  }

  try {
    const updateBase64 = Buffer.from(awarenessUpdate).toString('base64');

    await pusher.trigger(`document-${documentId}`, 'yjs-awareness', {
      update: updateBase64,
      clientId,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error broadcasting awareness update:', error);
  }
}

/**
 * Get the full Yjs document state for a new client
 */
export function getYjsState(documentId: string): Uint8Array {
  const doc = getYjsDocument(documentId);
  return Y.encodeStateAsUpdate(doc);
}

/**
 * Sync Yjs document state to database
 * Should be called periodically or on document close
 */
export function syncYjsToDatabase(documentId: string): string {
  const doc = documents.get(documentId);
  if (!doc) return '';

  const yText = doc.getText('content');
  return yText.toString();
}
