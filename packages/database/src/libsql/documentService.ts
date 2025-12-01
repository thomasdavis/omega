/**
 * Document Service
 * Handles CRUD operations for collaborative documents
 */

import { getDatabase } from './client.js';
import type { DocumentRecord, DocumentCollaboratorRecord } from './schema.js';
import { randomUUID } from 'crypto';

/**
 * Create a new document
 */
export async function createDocument(params: {
  title: string;
  content?: string;
  createdBy: string;
  createdByUsername?: string;
  isPublic?: boolean;
}): Promise<DocumentRecord> {
  const db = getDatabase();
  const id = randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);

  const document: DocumentRecord = {
    id,
    title: params.title,
    content: params.content || '',
    created_by: params.createdBy,
    created_by_username: params.createdByUsername,
    created_at: timestamp,
    updated_at: timestamp,
    is_public: params.isPublic ? 1 : 0,
  };

  await db.execute({
    sql: `
      INSERT INTO documents (id, title, content, created_by, created_by_username, created_at, updated_at, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      document.id,
      document.title,
      document.content,
      document.created_by,
      document.created_by_username || null,
      document.created_at,
      document.updated_at,
      document.is_public,
    ],
  });

  // Add creator as first collaborator
  await addCollaborator({
    documentId: id,
    userId: params.createdBy,
    username: params.createdByUsername,
    role: 'owner',
  });

  return document;
}

/**
 * Get a document by ID
 */
export async function getDocument(id: string): Promise<DocumentRecord | null> {
  const db = getDatabase();

  const result = await db.execute({
    sql: 'SELECT * FROM documents WHERE id = ?',
    args: [id],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as unknown as DocumentRecord;
}

/**
 * Update document content
 */
export async function updateDocumentContent(
  id: string,
  content: string
): Promise<void> {
  const db = getDatabase();
  const timestamp = Math.floor(Date.now() / 1000);

  await db.execute({
    sql: 'UPDATE documents SET content = ?, updated_at = ? WHERE id = ?',
    args: [content, timestamp, id],
  });
}

/**
 * Update document title
 */
export async function updateDocumentTitle(
  id: string,
  title: string
): Promise<void> {
  const db = getDatabase();
  const timestamp = Math.floor(Date.now() / 1000);

  await db.execute({
    sql: 'UPDATE documents SET title = ?, updated_at = ? WHERE id = ?',
    args: [title, timestamp, id],
  });
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: 'DELETE FROM documents WHERE id = ?',
    args: [id],
  });
}

/**
 * List all documents (with optional filtering)
 */
export async function listDocuments(params?: {
  createdBy?: string;
  limit?: number;
  offset?: number;
}): Promise<DocumentRecord[]> {
  const db = getDatabase();
  const limit = params?.limit || 50;
  const offset = params?.offset || 0;

  let sql = 'SELECT * FROM documents';
  const args: any[] = [];

  if (params?.createdBy) {
    sql += ' WHERE created_by = ?';
    args.push(params.createdBy);
  }

  sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  args.push(limit, offset);

  const result = await db.execute({ sql, args });
  return result.rows as unknown as DocumentRecord[];
}

/**
 * Get documents count
 */
export async function getDocumentCount(params?: {
  createdBy?: string;
}): Promise<number> {
  const db = getDatabase();

  let sql = 'SELECT COUNT(*) as count FROM documents';
  const args: any[] = [];

  if (params?.createdBy) {
    sql += ' WHERE created_by = ?';
    args.push(params.createdBy);
  }

  const result = await db.execute({ sql, args });
  return (result.rows[0] as any).count;
}

/**
 * Add a collaborator to a document
 */
export async function addCollaborator(params: {
  documentId: string;
  userId: string;
  username?: string;
  role?: string;
}): Promise<void> {
  const db = getDatabase();
  const id = randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);

  await db.execute({
    sql: `
      INSERT INTO document_collaborators (id, document_id, user_id, username, role, joined_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (document_id, user_id) DO UPDATE SET
        username = excluded.username,
        role = excluded.role
    `,
    args: [
      id,
      params.documentId,
      params.userId,
      params.username || null,
      params.role || 'editor',
      timestamp,
    ],
  });
}

/**
 * Remove a collaborator from a document
 */
export async function removeCollaborator(
  documentId: string,
  userId: string
): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: 'DELETE FROM document_collaborators WHERE document_id = ? AND user_id = ?',
    args: [documentId, userId],
  });
}

/**
 * Get all collaborators for a document
 */
export async function getDocumentCollaborators(
  documentId: string
): Promise<DocumentCollaboratorRecord[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: 'SELECT * FROM document_collaborators WHERE document_id = ? ORDER BY joined_at ASC',
    args: [documentId],
  });

  return result.rows as unknown as DocumentCollaboratorRecord[];
}

/**
 * Check if user has access to document
 */
export async function hasDocumentAccess(
  documentId: string,
  userId: string
): Promise<boolean> {
  const db = getDatabase();

  // Check if document is public
  const docResult = await db.execute({
    sql: 'SELECT is_public FROM documents WHERE id = ?',
    args: [documentId],
  });

  if (docResult.rows.length === 0) {
    return false;
  }

  const isPublic = (docResult.rows[0] as any).is_public;
  if (isPublic) {
    return true;
  }

  // Check if user is a collaborator
  const collabResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM document_collaborators WHERE document_id = ? AND user_id = ?',
    args: [documentId, userId],
  });

  return (collabResult.rows[0] as any).count > 0;
}
