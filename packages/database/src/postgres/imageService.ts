/**
 * Image Service - Handles generated images storage
 */

import { prisma } from './prismaClient.js';
import type { Prisma } from '@prisma/client';

export interface GeneratedImageRecord {
  id: bigint;
  requestId?: string | null;
  userId: string;
  username?: string | null;
  toolName: string;
  prompt: string;
  model?: string | null;
  size?: string | null;
  quality?: string | null;
  style?: string | null;
  n?: number | null;
  storageUrl: string;
  storageProvider?: string | null;
  mimeType?: string | null;
  bytes?: number | null;
  sha256?: string | null;
  tags: string[];
  status: string;
  error?: string | null;
  metadata?: Prisma.JsonValue | null;
  messageId?: string | null;
  imageData?: Buffer | null;
  createdAt: Date;
}

export interface CreateGeneratedImageInput {
  requestId?: string;
  userId: string;
  username?: string;
  toolName?: string;
  prompt: string;
  model?: string;
  size?: string;
  quality?: string;
  style?: string;
  n?: number;
  storageUrl: string;
  storageProvider?: string;
  mimeType?: string;
  bytes?: number;
  sha256?: string;
  tags?: string[];
  status?: string;
  error?: string;
  metadata?: Prisma.InputJsonValue | null;
  messageId?: string;
  imageData?: Buffer;
}

/**
 * Save generated image to database
 */
export async function saveGeneratedImage(
  input: CreateGeneratedImageInput
): Promise<GeneratedImageRecord> {
  const record = await prisma.generatedImage.create({
    data: {
      requestId: input.requestId,
      userId: input.userId,
      username: input.username,
      toolName: input.toolName || 'generateUserImage',
      prompt: input.prompt,
      model: input.model,
      size: input.size,
      quality: input.quality,
      style: input.style,
      n: input.n ?? 1,
      storageUrl: input.storageUrl,
      storageProvider: input.storageProvider || 'omega',
      mimeType: input.mimeType,
      bytes: input.bytes,
      sha256: input.sha256,
      tags: input.tags || [],
      status: input.status || 'success',
      error: input.error,
      metadata: input.metadata ?? undefined,
      messageId: input.messageId,
      imageData: input.imageData,
    },
  });

  return record;
}

/**
 * Get generated image by ID
 */
export async function getGeneratedImage(id: bigint): Promise<GeneratedImageRecord | null> {
  return await prisma.generatedImage.findUnique({
    where: { id },
  });
}

/**
 * List recent generated images
 */
export async function listGeneratedImages(
  limit = 50,
  offset = 0
): Promise<GeneratedImageRecord[]> {
  return await prisma.generatedImage.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get generated images count
 */
export async function getGeneratedImageCount(): Promise<number> {
  return await prisma.generatedImage.count();
}

/**
 * Get generated image metadata
 */
export async function getGeneratedImageMetadata(id: bigint): Promise<{
  id: bigint;
  requestId: string | null;
  userId: string;
  username: string | null;
  toolName: string;
  prompt: string;
  model: string | null;
  size: string | null;
  quality: string | null;
  style: string | null;
  n: number | null;
  storageUrl: string;
  storageProvider: string | null;
  mimeType: string | null;
  bytes: number | null;
  sha256: string | null;
  tags: string[];
  status: string;
  error: string | null;
  metadata: Prisma.JsonValue | null;
  messageId: string | null;
  createdAt: Date;
} | null> {
  return await prisma.generatedImage.findUnique({
    where: { id },
    select: {
      id: true,
      requestId: true,
      userId: true,
      username: true,
      toolName: true,
      prompt: true,
      model: true,
      size: true,
      quality: true,
      style: true,
      n: true,
      storageUrl: true,
      storageProvider: true,
      mimeType: true,
      bytes: true,
      sha256: true,
      tags: true,
      status: true,
      error: true,
      metadata: true,
      messageId: true,
      createdAt: true,
    },
  });
}

/**
 * List generated images metadata
 */
export async function listGeneratedImagesMetadata(
  limit = 50,
  offset = 0
): Promise<Array<{
  id: bigint;
  requestId: string | null;
  userId: string;
  username: string | null;
  toolName: string;
  prompt: string;
  model: string | null;
  size: string | null;
  quality: string | null;
  style: string | null;
  n: number | null;
  storageUrl: string;
  storageProvider: string | null;
  mimeType: string | null;
  bytes: number | null;
  sha256: string | null;
  tags: string[];
  status: string;
  error: string | null;
  metadata: Prisma.JsonValue | null;
  messageId: string | null;
  createdAt: Date;
}>> {
  return await prisma.generatedImage.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      requestId: true,
      userId: true,
      username: true,
      toolName: true,
      prompt: true,
      model: true,
      size: true,
      quality: true,
      style: true,
      n: true,
      storageUrl: true,
      storageProvider: true,
      mimeType: true,
      bytes: true,
      sha256: true,
      tags: true,
      status: true,
      error: true,
      metadata: true,
      messageId: true,
      createdAt: true,
    },
  });
}

/**
 * List generated images by user
 */
export async function listGeneratedImagesByUser(
  userId: string,
  limit = 50,
  offset = 0
): Promise<GeneratedImageRecord[]> {
  return await prisma.generatedImage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * List generated images by tool
 */
export async function listGeneratedImagesByTool(
  toolName: string,
  limit = 50,
  offset = 0
): Promise<GeneratedImageRecord[]> {
  return await prisma.generatedImage.findMany({
    where: { toolName },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * List failed image generations
 */
export async function listFailedGeneratedImages(
  limit = 50,
  offset = 0
): Promise<GeneratedImageRecord[]> {
  return await prisma.generatedImage.findMany({
    where: { status: { not: 'success' } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
