import * as Y from 'yjs';

// In-memory store for Yjs documents
// In production, you'd want to persist this to Redis or a database
const yjsDocuments = new Map<string, Y.Doc>();

/**
 * Get or create a Yjs document for a given document ID
 */
export function getYjsDoc(documentId: string, initialContent?: string): Y.Doc {
  let ydoc = yjsDocuments.get(documentId);

  if (!ydoc) {
    ydoc = new Y.Doc();
    yjsDocuments.set(documentId, ydoc);

    // Initialize with content if provided
    if (initialContent) {
      const ytext = ydoc.getText('content');
      ytext.insert(0, initialContent);
    }
  }

  return ydoc;
}

/**
 * Apply an update to a Yjs document
 */
export function applyUpdate(documentId: string, update: Uint8Array): void {
  const ydoc = yjsDocuments.get(documentId);
  if (ydoc) {
    Y.applyUpdate(ydoc, update);
  }
}

/**
 * Get the current state of a Yjs document as a base64 string
 */
export function getState(documentId: string): string | null {
  const ydoc = yjsDocuments.get(documentId);
  if (!ydoc) return null;

  const state = Y.encodeStateAsUpdate(ydoc);
  return Buffer.from(state).toString('base64');
}

/**
 * Get the current text content from a Yjs document
 */
export function getTextContent(documentId: string): string {
  const ydoc = yjsDocuments.get(documentId);
  if (!ydoc) return '';

  const ytext = ydoc.getText('content');
  return ytext.toString();
}

/**
 * Delete a Yjs document from memory (cleanup)
 */
export function deleteYjsDoc(documentId: string): void {
  yjsDocuments.delete(documentId);
}
