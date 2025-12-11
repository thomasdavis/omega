/**
 * Comic Service - Database operations for comic images
 * Stores comic image metadata and binary data in PostgreSQL
 */

import { getPostgresPool } from './client.js';
import type { Pool } from 'pg';

export interface ComicImageRecord {
  id: number;
  comic_id: number;
  image_url: string;
  image_data: Buffer | null;
  created_at: Date;
}

export interface CreateComicImageInput {
  comicId: number;
  imageUrl: string;
  imageData?: Buffer;
}

/**
 * Save a comic image to the database
 */
export async function saveComicImage(input: CreateComicImageInput): Promise<ComicImageRecord> {
  const pool = await getPostgresPool();

  const result = await pool.query<ComicImageRecord>(
    `INSERT INTO comic_images (comic_id, image_url, image_data, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, comic_id, image_url, image_data, created_at`,
    [input.comicId, input.imageUrl, input.imageData || null]
  );

  if (result.rows.length === 0) {
    throw new Error('Failed to save comic image');
  }

  return result.rows[0];
}

/**
 * Get a comic image by comic ID
 */
export async function getComicImage(comicId: number): Promise<ComicImageRecord | null> {
  const pool = await getPostgresPool();

  const result = await pool.query<ComicImageRecord>(
    `SELECT id, comic_id, image_url, image_data, created_at
     FROM comic_images
     WHERE comic_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [comicId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get all comic images, ordered by newest first
 */
export async function listComicImages(limit = 100, offset = 0): Promise<ComicImageRecord[]> {
  const pool = await getPostgresPool();

  const result = await pool.query<ComicImageRecord>(
    `SELECT id, comic_id, image_url, image_data, created_at
     FROM comic_images
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
}

/**
 * Get comic image metadata (without binary data) for listing
 */
export interface ComicImageMetadata {
  id: number;
  comic_id: number;
  image_url: string;
  created_at: Date;
  has_image_data: boolean;
  image_size: number | null;
}

export async function listComicImagesMetadata(limit = 100, offset = 0): Promise<ComicImageMetadata[]> {
  const pool = await getPostgresPool();

  const result = await pool.query<ComicImageMetadata>(
    `SELECT
       id,
       comic_id,
       image_url,
       created_at,
       (image_data IS NOT NULL) as has_image_data,
       octet_length(image_data) as image_size
     FROM comic_images
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
}

/**
 * Get count of comic images
 */
export async function getComicImageCount(): Promise<number> {
  const pool = await getPostgresPool();

  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM comic_images'
  );

  return parseInt(result.rows[0].count, 10);
}

/**
 * Delete a comic image by comic ID
 */
export async function deleteComicImage(comicId: number): Promise<boolean> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    'DELETE FROM comic_images WHERE comic_id = $1',
    [comicId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Check if a comic image exists
 */
export async function comicImageExists(comicId: number): Promise<boolean> {
  const pool = await getPostgresPool();

  const result = await pool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM comic_images WHERE comic_id = $1) as exists',
    [comicId]
  );

  return result.rows[0].exists;
}
