/**
 * Image Service - Handles generated images storage
 */

import { prisma } from './prismaClient.js';
import type { Prisma } from '@prisma/client';

export interface GeneratedImageRecord {
  id: number;
  title: string;
  description?: string | null;
  imageData?: Buffer | null;
  prompt: string;
  revisedPrompt?: string | null;
  toolUsed: string;
  modelUsed?: string | null;
  filename: string;
  fileSize?: number | null;
  artifactPath?: string | null;
  publicUrl?: string | null;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  metadata?: Prisma.JsonValue | null;
  createdBy?: string | null;
  createdByUsername?: string | null;
  discordMessageId?: string | null;
  githubIssueNumber?: number | null;
  createdAt: Date;
}

export interface CreateGeneratedImageInput {
  title: string;
  description?: string;
  imageData?: Buffer;
  prompt: string;
  revisedPrompt?: string;
  toolUsed: string;
  modelUsed?: string;
  filename: string;
  artifactPath?: string;
  publicUrl?: string;
  width?: number;
  height?: number;
  format?: string;
  metadata?: Prisma.InputJsonValue | null;
  createdBy?: string;
  createdByUsername?: string;
  discordMessageId?: string;
  githubIssueNumber?: number;
}

/**
 * Save generated image to database
 */
export async function saveGeneratedImage(
  input: CreateGeneratedImageInput
): Promise<GeneratedImageRecord> {
  const record = await prisma.generatedImage.create({
    data: {
      title: input.title,
      description: input.description,
      imageData: input.imageData,
      prompt: input.prompt,
      revisedPrompt: input.revisedPrompt,
      toolUsed: input.toolUsed,
      modelUsed: input.modelUsed,
      filename: input.filename,
      fileSize: input.imageData?.length,
      artifactPath: input.artifactPath,
      publicUrl: input.publicUrl,
      width: input.width,
      height: input.height,
      format: input.format,
      metadata: input.metadata ?? undefined,
      createdBy: input.createdBy,
      createdByUsername: input.createdByUsername,
      discordMessageId: input.discordMessageId,
      githubIssueNumber: input.githubIssueNumber,
    },
  });

  return record;
}

/**
 * Get generated image by ID
 */
export async function getGeneratedImage(id: number): Promise<GeneratedImageRecord | null> {
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
 * Get generated image metadata (without binary data)
 */
export async function getGeneratedImageMetadata(id: number): Promise<{
  id: number;
  title: string;
  description: string | null;
  prompt: string;
  revisedPrompt: string | null;
  toolUsed: string;
  modelUsed: string | null;
  filename: string;
  fileSize: number | null;
  artifactPath: string | null;
  publicUrl: string | null;
  width: number | null;
  height: number | null;
  format: string | null;
  metadata: Prisma.JsonValue | null;
  createdBy: string | null;
  createdByUsername: string | null;
  discordMessageId: string | null;
  githubIssueNumber: number | null;
  createdAt: Date;
} | null> {
  return await prisma.generatedImage.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      prompt: true,
      revisedPrompt: true,
      toolUsed: true,
      modelUsed: true,
      filename: true,
      fileSize: true,
      artifactPath: true,
      publicUrl: true,
      width: true,
      height: true,
      format: true,
      metadata: true,
      createdBy: true,
      createdByUsername: true,
      discordMessageId: true,
      githubIssueNumber: true,
      createdAt: true,
    },
  });
}

/**
 * List generated images metadata (without binary data)
 */
export async function listGeneratedImagesMetadata(
  limit = 50,
  offset = 0
): Promise<Array<{
  id: number;
  title: string;
  description: string | null;
  prompt: string;
  revisedPrompt: string | null;
  toolUsed: string;
  modelUsed: string | null;
  filename: string;
  fileSize: number | null;
  artifactPath: string | null;
  publicUrl: string | null;
  width: number | null;
  height: number | null;
  format: string | null;
  metadata: Prisma.JsonValue | null;
  createdBy: string | null;
  createdByUsername: string | null;
  discordMessageId: string | null;
  githubIssueNumber: number | null;
  createdAt: Date;
}>> {
  return await prisma.generatedImage.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      title: true,
      description: true,
      prompt: true,
      revisedPrompt: true,
      toolUsed: true,
      modelUsed: true,
      filename: true,
      fileSize: true,
      artifactPath: true,
      publicUrl: true,
      width: true,
      height: true,
      format: true,
      metadata: true,
      createdBy: true,
      createdByUsername: true,
      discordMessageId: true,
      githubIssueNumber: true,
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
    where: { createdBy: userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * List generated images by tool
 */
export async function listGeneratedImagesByTool(
  toolUsed: string,
  limit = 50,
  offset = 0
): Promise<GeneratedImageRecord[]> {
  return await prisma.generatedImage.findMany({
    where: { toolUsed },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
