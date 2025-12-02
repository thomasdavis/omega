/**
 * PostgreSQL Document Service
 * Refactored to use Prisma ORM for type-safe database operations
 * Handles CRUD operations for collaborative documents
 */

import { prisma } from './prismaClient.js';
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
  const id = randomUUID();
  const timestamp = BigInt(Math.floor(Date.now() / 1000));

  const document = await prisma.document.create({
    data: {
      id,
      title: params.title,
      content: params.content || '',
      createdBy: params.createdBy,
      createdByUsername: params.createdByUsername || null,
      isPublic: params.isPublic !== false,
      metadata: undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  });

  // Add creator as first collaborator
  await addCollaborator({
    documentId: id,
    userId: params.createdBy,
    username: params.createdByUsername,
    role: 'owner',
  });

  return document as any as DocumentRecord;
}

/**
 * Get a document by ID
 */
export async function getDocument(id: string): Promise<DocumentRecord | null> {
  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    return null;
  }

  return document as any as DocumentRecord;
}

/**
 * Update document content
 */
export async function updateDocumentContent(id: string, content: string): Promise<void> {
  const timestamp = BigInt(Math.floor(Date.now() / 1000));

  await prisma.document.update({
    where: { id },
    data: {
      content,
      updatedAt: timestamp,
    },
  });
}

/**
 * Update document title
 */
export async function updateDocumentTitle(id: string, title: string): Promise<void> {
  const timestamp = BigInt(Math.floor(Date.now() / 1000));

  await prisma.document.update({
    where: { id },
    data: {
      title,
      updatedAt: timestamp,
    },
  });
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<void> {
  await prisma.document.delete({
    where: { id },
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
  const limit = params?.limit || 50;
  const offset = params?.offset || 0;

  const where: any = {};
  if (params?.createdBy) {
    where.createdBy = params.createdBy;
  }

  const documents = await prisma.document.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return documents as any as DocumentRecord[];
}

/**
 * Get documents count
 */
export async function getDocumentCount(params?: { createdBy?: string }): Promise<number> {
  const where: any = {};
  if (params?.createdBy) {
    where.createdBy = params.createdBy;
  }

  const count = await prisma.document.count({ where });

  return count;
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
  const id = randomUUID();

  await prisma.documentCollaborator.upsert({
    where: {
      documentId_userId: {
        documentId: params.documentId,
        userId: params.userId,
      },
    },
    update: {
      username: params.username || null,
      role: params.role || 'editor',
    },
    create: {
      id,
      documentId: params.documentId,
      userId: params.userId,
      username: params.username || null,
      role: params.role || 'editor',
    },
  });
}

/**
 * Remove a collaborator from a document
 */
export async function removeCollaborator(documentId: string, userId: string): Promise<void> {
  await prisma.documentCollaborator.deleteMany({
    where: {
      documentId,
      userId,
    },
  });
}

/**
 * Get all collaborators for a document
 */
export async function getDocumentCollaborators(
  documentId: string
): Promise<DocumentCollaboratorRecord[]> {
  const collaborators = await prisma.documentCollaborator.findMany({
    where: { documentId },
    orderBy: { joinedAt: 'asc' },
  });

  return collaborators as any as DocumentCollaboratorRecord[];
}

/**
 * Check if user has access to document
 */
export async function hasDocumentAccess(documentId: string, userId: string): Promise<boolean> {
  // Check if document is public
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { isPublic: true },
  });

  if (!document) {
    return false;
  }

  if (document.isPublic) {
    return true;
  }

  // Check if user is a collaborator
  const collaborator = await prisma.documentCollaborator.findFirst({
    where: {
      documentId,
      userId,
    },
  });

  return collaborator !== null;
}
