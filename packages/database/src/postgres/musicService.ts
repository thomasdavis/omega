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
