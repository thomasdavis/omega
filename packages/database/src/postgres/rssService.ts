/**
 * RSS Service - Database operations for RSS feed items
 * Stores summarized Discord messages and links for RSS feed generation
 */

import { getPostgresPool } from './client.js';
import { randomUUID } from 'crypto';

export interface RssFeedItemRecord {
  id: string;
  message_id: string;
  summary: string;
  link: string | null;
  created_at: Date;
}

export interface CreateRssFeedItemInput {
  messageId: string;
  summary: string;
  link?: string;
}

/**
 * Save an RSS feed item to the database
 * Returns null if the message_id already exists (duplicate)
 */
export async function saveRssFeedItem(input: CreateRssFeedItemInput): Promise<RssFeedItemRecord | null> {
  const pool = await getPostgresPool();
  const id = randomUUID();

  try {
    const result = await pool.query<RssFeedItemRecord>(
      `INSERT INTO rss_feed_items (id, message_id, summary, link, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, message_id, summary, link, created_at`,
      [id, input.messageId, input.summary, input.link || null]
    );

    return result.rows[0];
  } catch (error: any) {
    // If duplicate message_id, return null
    if (error.code === '23505') { // unique_violation
      return null;
    }
    throw error;
  }
}

/**
 * Check if an RSS feed item already exists for a message
 */
export async function rssFeedItemExists(messageId: string): Promise<boolean> {
  const pool = await getPostgresPool();

  const result = await pool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM rss_feed_items WHERE message_id = $1) as exists',
    [messageId]
  );

  return result.rows[0].exists;
}

/**
 * Get RSS feed items, ordered by newest first
 */
export async function listRssFeedItems(limit = 50, offset = 0): Promise<RssFeedItemRecord[]> {
  const pool = await getPostgresPool();

  const result = await pool.query<RssFeedItemRecord>(
    `SELECT id, message_id, summary, link, created_at
     FROM rss_feed_items
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
}

/**
 * Get an RSS feed item by message ID
 */
export async function getRssFeedItemByMessageId(messageId: string): Promise<RssFeedItemRecord | null> {
  const pool = await getPostgresPool();

  const result = await pool.query<RssFeedItemRecord>(
    `SELECT id, message_id, summary, link, created_at
     FROM rss_feed_items
     WHERE message_id = $1`,
    [messageId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get count of RSS feed items
 */
export async function getRssFeedItemCount(): Promise<number> {
  const pool = await getPostgresPool();

  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM rss_feed_items'
  );

  return parseInt(result.rows[0].count, 10);
}

/**
 * Delete an RSS feed item by message ID
 */
export async function deleteRssFeedItem(messageId: string): Promise<boolean> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    'DELETE FROM rss_feed_items WHERE message_id = $1',
    [messageId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}
