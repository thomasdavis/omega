/**
 * PostgreSQL Document Service
 * Port of libsql/documentService.ts for PostgreSQL
 * Handles CRUD operations for collaborative documents
 */

import { getPostgresPool } from './client.js';
import type { DocumentRecord, DocumentCollaboratorRecord } from '../libsql/schema.js';
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
  const pool = await getPostgresPool();
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

  await pool.query(
    `INSERT INTO documents (id, title, content, created_by, created_by_username, created_at, updated_at, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      document.id,
      document.title,
      document.content,
      document.created_by,
      document.created_by_username || null,
      document.created_at,
      document.updated_at,
      params.isPublic !== false, // PostgreSQL BOOLEAN
    ]
  );

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
  const pool = await getPostgresPool();

  const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as DocumentRecord;
}

/**
 * Update document content
 */
export async function updateDocumentContent(id: string, content: string): Promise<void> {
  const pool = await getPostgresPool();
  const timestamp = Math.floor(Date.now() / 1000);

  await pool.query('UPDATE documents SET content = $1, updated_at = $2 WHERE id = $3', [
    content,
    timestamp,
    id,
  ]);
}

/**
 * Update document title
 */
export async function updateDocumentTitle(id: string, title: string): Promise<void> {
  const pool = await getPostgresPool();
  const timestamp = Math.floor(Date.now() / 1000);

  await pool.query('UPDATE documents SET title = $1, updated_at = $2 WHERE id = $3', [
    title,
    timestamp,
    id,
  ]);
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<void> {
  const pool = await getPostgresPool();

  await pool.query('DELETE FROM documents WHERE id = $1', [id]);
}

/**
 * List all documents (with optional filtering)
 */
export async function listDocuments(params?: {
  createdBy?: string;
  limit?: number;
  offset?: number;
}): Promise<DocumentRecord[]> {
  const pool = await getPostgresPool();
  const limit = params?.limit || 50;
  const offset = params?.offset || 0;

  let sql = 'SELECT * FROM documents';
  const args: any[] = [];
  let paramIndex = 1;

  if (params?.createdBy) {
    sql += ` WHERE created_by = $${paramIndex++}`;
    args.push(params.createdBy);
  }

  sql += ` ORDER BY updated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  args.push(limit, offset);

  const result = await pool.query(sql, args);
  return result.rows as DocumentRecord[];
}

/**
 * Get documents count
 */
export async function getDocumentCount(params?: { createdBy?: string }): Promise<number> {
  const pool = await getPostgresPool();

  let sql = 'SELECT COUNT(*) as count FROM documents';
  const args: any[] = [];

  if (params?.createdBy) {
    sql += ' WHERE created_by = $1';
    args.push(params.createdBy);
  }

  const result = await pool.query(sql, args);
  return parseInt(result.rows[0].count, 10);
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
  const pool = await getPostgresPool();
  const id = randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);

  await pool.query(
    `INSERT INTO document_collaborators (id, document_id, user_id, username, role, joined_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (document_id, user_id) DO UPDATE SET
       username = EXCLUDED.username,
       role = EXCLUDED.role`,
    [id, params.documentId, params.userId, params.username || null, params.role || 'editor', timestamp]
  );
}

/**
 * Remove a collaborator from a document
 */
export async function removeCollaborator(documentId: string, userId: string): Promise<void> {
  const pool = await getPostgresPool();

  await pool.query('DELETE FROM document_collaborators WHERE document_id = $1 AND user_id = $2', [
    documentId,
    userId,
  ]);
}

/**
 * Get all collaborators for a document
 */
export async function getDocumentCollaborators(
  documentId: string
): Promise<DocumentCollaboratorRecord[]> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    'SELECT * FROM document_collaborators WHERE document_id = $1 ORDER BY joined_at ASC',
    [documentId]
  );

  return result.rows as DocumentCollaboratorRecord[];
}

/**
 * Check if user has access to document
 */
export async function hasDocumentAccess(documentId: string, userId: string): Promise<boolean> {
  const pool = await getPostgresPool();

  // Check if document is public
  const docResult = await pool.query('SELECT is_public FROM documents WHERE id = $1', [documentId]);

  if (docResult.rows.length === 0) {
    return false;
  }

  const isPublic = docResult.rows[0].is_public;
  if (isPublic) {
    return true;
  }

  // Check if user is a collaborator
  const collabResult = await pool.query(
    'SELECT COUNT(*) as count FROM document_collaborators WHERE document_id = $1 AND user_id = $2',
    [documentId, userId]
  );

  return parseInt(collabResult.rows[0].count, 10) > 0;
}
