/**
 * Music Service - Handles ABC sheet music and MIDI files storage
 */

import { prisma } from './prismaClient.js';
import type { Prisma } from '@prisma/client';

// ============================================
// ABC Sheet Music Operations
// ============================================

export interface AbcSheetMusicRecord {
  id: number;
  title: string;
  composer?: string | null;
  key?: string | null;
  timeSignature?: string | null;
  tempo?: string | null;
  abcNotation: string;
  description?: string | null;
  musicalStructure?: string | null;
  metadata?: Prisma.JsonValue | null;
  createdBy?: string | null;
  createdByUsername?: string | null;
  createdAt: Date;
}

export interface CreateAbcSheetMusicInput {
  title: string;
  composer?: string;
  key?: string;
  timeSignature?: string;
  tempo?: string;
  abcNotation: string;
  description?: string;
  musicalStructure?: string;
  metadata?: Prisma.InputJsonValue | null;
  createdBy?: string;
  createdByUsername?: string;
}

/**
 * Save ABC sheet music to database
 */
export async function saveAbcSheetMusic(
  input: CreateAbcSheetMusicInput
): Promise<AbcSheetMusicRecord> {
  const record = await prisma.abcSheetMusic.create({
    data: {
      title: input.title,
      composer: input.composer,
      key: input.key,
      timeSignature: input.timeSignature,
      tempo: input.tempo,
      abcNotation: input.abcNotation,
      description: input.description,
      musicalStructure: input.musicalStructure,
      metadata: input.metadata ?? undefined,
      createdBy: input.createdBy,
      createdByUsername: input.createdByUsername,
    },
  });

  return record;
}

/**
 * Get ABC sheet music by ID
 */
export async function getAbcSheetMusic(id: number): Promise<AbcSheetMusicRecord | null> {
  return await prisma.abcSheetMusic.findUnique({
    where: { id },
  });
}

/**
 * List recent ABC sheet music
 */
export async function listAbcSheetMusic(
  limit = 50,
  offset = 0
): Promise<AbcSheetMusicRecord[]> {
  return await prisma.abcSheetMusic.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get ABC sheet music count
 */
export async function getAbcSheetMusicCount(): Promise<number> {
  return await prisma.abcSheetMusic.count();
}

// ============================================
// MIDI File Operations
// ============================================

export interface MidiFileRecord {
  id: number;
  title: string;
  description?: string | null;
  midiData: Buffer;
  abcNotation?: string | null;
  abcSheetMusicId?: number | null;
  filename: string;
  fileSize?: number | null;
  artifactPath?: string | null;
  metadata?: Prisma.JsonValue | null;
  createdBy?: string | null;
  createdByUsername?: string | null;
  createdAt: Date;
}

export interface CreateMidiFileInput {
  title: string;
  description?: string;
  midiData: Buffer;
  abcNotation?: string;
  abcSheetMusicId?: number;
  filename: string;
  artifactPath?: string;
  metadata?: Prisma.InputJsonValue | null;
  createdBy?: string;
  createdByUsername?: string;
}

/**
 * Save MIDI file to database
 */
export async function saveMidiFile(
  input: CreateMidiFileInput
): Promise<MidiFileRecord> {
  const record = await prisma.midiFile.create({
    data: {
      title: input.title,
      description: input.description,
      midiData: input.midiData,
      abcNotation: input.abcNotation,
      abcSheetMusicId: input.abcSheetMusicId,
      filename: input.filename,
      fileSize: input.midiData.length,
      artifactPath: input.artifactPath,
      metadata: input.metadata ?? undefined,
      createdBy: input.createdBy,
      createdByUsername: input.createdByUsername,
    },
  });

  return record;
}

/**
 * Get MIDI file by ID
 */
export async function getMidiFile(id: number): Promise<MidiFileRecord | null> {
  return await prisma.midiFile.findUnique({
    where: { id },
  });
}

/**
 * List recent MIDI files
 */
export async function listMidiFiles(
  limit = 50,
  offset = 0
): Promise<MidiFileRecord[]> {
  return await prisma.midiFile.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get MIDI files count
 */
export async function getMidiFileCount(): Promise<number> {
  return await prisma.midiFile.count();
}

/**
 * Get MIDI file metadata (without binary data)
 */
export async function getMidiFileMetadata(id: number): Promise<{
  id: number;
  title: string;
  description: string | null;
  abcNotation: string | null;
  abcSheetMusicId: number | null;
  filename: string;
  fileSize: number | null;
  artifactPath: string | null;
  metadata: Prisma.JsonValue | null;
  createdBy: string | null;
  createdByUsername: string | null;
  createdAt: Date;
} | null> {
  return await prisma.midiFile.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      abcNotation: true,
      abcSheetMusicId: true,
      filename: true,
      fileSize: true,
      artifactPath: true,
      metadata: true,
      createdBy: true,
      createdByUsername: true,
      createdAt: true,
    },
  });
}

/**
 * List MIDI files metadata (without binary data)
 */
export async function listMidiFilesMetadata(
  limit = 50,
  offset = 0
): Promise<Array<{
  id: number;
  title: string;
  description: string | null;
  abcNotation: string | null;
  abcSheetMusicId: number | null;
  filename: string;
  fileSize: number | null;
  artifactPath: string | null;
  metadata: Prisma.JsonValue | null;
  createdBy: string | null;
  createdByUsername: string | null;
  createdAt: Date;
}>> {
  return await prisma.midiFile.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      title: true,
      description: true,
      abcNotation: true,
      abcSheetMusicId: true,
      filename: true,
      fileSize: true,
      artifactPath: true,
      metadata: true,
      createdBy: true,
      createdByUsername: true,
      createdAt: true,
    },
  });
}

// ============================================
// MP3 File Operations
// ============================================

export interface Mp3FileRecord {
  id: number;
  title: string;
  description?: string | null;
  mp3Data: Buffer;
  abcNotation?: string | null;
  abcSheetMusicId?: number | null;
  filename: string;
  fileSize?: number | null;
  artifactPath?: string | null;
  metadata?: Prisma.JsonValue | null;
  createdBy?: string | null;
  createdByUsername?: string | null;
  createdAt: Date;
}

export interface CreateMp3FileInput {
  title: string;
  description?: string;
  mp3Data: Buffer;
  abcNotation?: string;
  abcSheetMusicId?: number;
  filename: string;
  artifactPath?: string;
  metadata?: Prisma.InputJsonValue | null;
  createdBy?: string;
  createdByUsername?: string;
}

/**
 * Save MP3 file to database
 */
export async function saveMp3File(
  input: CreateMp3FileInput
): Promise<Mp3FileRecord> {
  const record = await prisma.mp3File.create({
    data: {
      title: input.title,
      description: input.description,
      mp3Data: input.mp3Data,
      abcNotation: input.abcNotation,
      abcSheetMusicId: input.abcSheetMusicId,
      filename: input.filename,
      fileSize: input.mp3Data.length,
      artifactPath: input.artifactPath,
      metadata: input.metadata ?? undefined,
      createdBy: input.createdBy,
      createdByUsername: input.createdByUsername,
    },
  });

  return record;
}

/**
 * Get MP3 file by ID
 */
export async function getMp3File(id: number): Promise<Mp3FileRecord | null> {
  return await prisma.mp3File.findUnique({
    where: { id },
  });
}

/**
 * List recent MP3 files
 */
export async function listMp3Files(
  limit = 50,
  offset = 0
): Promise<Mp3FileRecord[]> {
  return await prisma.mp3File.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get MP3 files count
 */
export async function getMp3FileCount(): Promise<number> {
  return await prisma.mp3File.count();
}

/**
 * Get MP3 file metadata (without binary data)
 */
export async function getMp3FileMetadata(id: number): Promise<{
  id: number;
  title: string;
  description: string | null;
  abcNotation: string | null;
  abcSheetMusicId: number | null;
  filename: string;
  fileSize: number | null;
  artifactPath: string | null;
  metadata: Prisma.JsonValue | null;
  createdBy: string | null;
  createdByUsername: string | null;
  createdAt: Date;
} | null> {
  return await prisma.mp3File.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      abcNotation: true,
      abcSheetMusicId: true,
      filename: true,
      fileSize: true,
      artifactPath: true,
      metadata: true,
      createdBy: true,
      createdByUsername: true,
      createdAt: true,
    },
  });
}

/**
 * List MP3 files metadata (without binary data)
 */
export async function listMp3FilesMetadata(
  limit = 50,
  offset = 0
): Promise<Array<{
  id: number;
  title: string;
  description: string | null;
  abcNotation: string | null;
  abcSheetMusicId: number | null;
  filename: string;
  fileSize: number | null;
  artifactPath: string | null;
  metadata: Prisma.JsonValue | null;
  createdBy: string | null;
  createdByUsername: string | null;
  createdAt: Date;
}>> {
  return await prisma.mp3File.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      title: true,
      description: true,
      abcNotation: true,
      abcSheetMusicId: true,
      filename: true,
      fileSize: true,
      artifactPath: true,
      metadata: true,
      createdBy: true,
      createdByUsername: true,
      createdAt: true,
    },
  });
}

// ============================================
// Video File Operations
// ============================================

export interface VideoFileRecord {
  id: number;
  title: string;
  description?: string | null;
  videoData: Buffer;
  filename: string;
  fileSize?: number | null;
  format?: string | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  imageReferences?: Prisma.JsonValue | null;
  metadata?: Prisma.JsonValue | null;
  createdBy?: string | null;
  createdByUsername?: string | null;
  createdAt: Date;
}

export interface CreateVideoFileInput {
  title: string;
  description?: string;
  videoData: Buffer;
  filename: string;
  format?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  imageReferences?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
  createdBy?: string;
  createdByUsername?: string;
}

/**
 * Save video file to database
 */
export async function saveVideoFile(
  input: CreateVideoFileInput
): Promise<VideoFileRecord> {
  const record = await prisma.videoFile.create({
    data: {
      title: input.title,
      description: input.description,
      videoData: input.videoData,
      filename: input.filename,
      fileSize: input.videoData.length,
      format: input.format || 'mp4',
      duration: input.duration,
      width: input.width,
      height: input.height,
      fps: input.fps,
      imageReferences: input.imageReferences ?? undefined,
      metadata: input.metadata ?? undefined,
      createdBy: input.createdBy,
      createdByUsername: input.createdByUsername,
    },
  });

  return record;
}

/**
 * Get video file by ID
 */
export async function getVideoFile(id: number): Promise<VideoFileRecord | null> {
  return await prisma.videoFile.findUnique({
    where: { id },
  });
}

/**
 * List recent video files
 */
export async function listVideoFiles(
  limit = 50,
  offset = 0
): Promise<VideoFileRecord[]> {
  return await prisma.videoFile.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get video files count
 */
export async function getVideoFileCount(): Promise<number> {
  return await prisma.videoFile.count();
}

/**
 * Get video file metadata (without binary data)
 */
export async function getVideoFileMetadata(id: number): Promise<{
  id: number;
  title: string;
  description: string | null;
  filename: string;
  fileSize: number | null;
  format: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  imageReferences: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  createdBy: string | null;
  createdByUsername: string | null;
  createdAt: Date;
} | null> {
  return await prisma.videoFile.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      filename: true,
      fileSize: true,
      format: true,
      duration: true,
      width: true,
      height: true,
      fps: true,
      imageReferences: true,
      metadata: true,
      createdBy: true,
      createdByUsername: true,
      createdAt: true,
    },
  });
}

/**
 * List video files metadata (without binary data)
 */
export async function listVideoFilesMetadata(
  limit = 50,
  offset = 0
): Promise<Array<{
  id: number;
  title: string;
  description: string | null;
  filename: string;
  fileSize: number | null;
  format: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  imageReferences: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  createdBy: string | null;
  createdByUsername: string | null;
  createdAt: Date;
}>> {
  return await prisma.videoFile.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      title: true,
      description: true,
      filename: true,
      fileSize: true,
      format: true,
      duration: true,
      width: true,
      height: true,
      fps: true,
      imageReferences: true,
      metadata: true,
      createdBy: true,
      createdByUsername: true,
      createdAt: true,
    },
  });
}
