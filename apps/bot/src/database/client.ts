/**
 * Turso Database Client
 * Manages connection to Turso (SQLite) database for persistent message and query storage
 */

import { createClient, type Client } from '@libsql/client';
import { isProductionWithVolume } from '../utils/storage.js';
import { existsSync } from 'fs';
import { join } from 'path';

let dbClient: Client | null = null;

/**
 * Get database file path
 * Uses /data/omega.db in production with Railway volume, otherwise local path
 */
export function getDatabasePath(): string {
  if (isProductionWithVolume()) {
    return '/data/omega.db';
  }
  return join(process.cwd(), 'apps/bot/data/omega.db');
}

/**
 * Initialize the Turso database client
 * Supports both local file and Turso cloud
 */
export function initializeDatabase(): Client {
  if (dbClient) {
    return dbClient;
  }

  // Check for Turso cloud configuration
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoAuthToken) {
    console.log('🗄️  Connecting to Turso cloud database...');
    dbClient = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
    console.log('✅ Connected to Turso cloud database');
  } else {
    // Fall back to local SQLite file
    const dbPath = getDatabasePath();
    console.log(`🗄️  Using local SQLite database: ${dbPath}`);

    dbClient = createClient({
      url: `file:${dbPath}`,
    });

    console.log('✅ Connected to local SQLite database');
  }

  return dbClient;
}

/**
 * Get the database client instance
 * Initializes if not already initialized
 */
export function getDatabase(): Client {
  if (!dbClient) {
    return initializeDatabase();
  }
  return dbClient;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (dbClient) {
    await dbClient.close();
    dbClient = null;
    console.log('✅ Database connection closed');
  }
}
