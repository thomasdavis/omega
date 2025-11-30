/**
 * MongoDB Client
 * Singleton connection to MongoDB database
 *
 * Follows the same pattern as LibSQL client (apps/bot/src/database/client.ts)
 * Supports both local MongoDB and Railway MongoDB plugin
 */

import { MongoClient, Db } from 'mongodb';

let mongoClient: MongoClient | null = null;
let database: Db | null = null;

/**
 * Get MongoDB database connection
 * Uses singleton pattern - returns existing connection if available
 *
 * @returns Promise<Db> MongoDB database instance
 */
export async function getMongoDatabase(): Promise<Db> {
  if (database) {
    return database;
  }

  console.log('🔌 Connecting to MongoDB...');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DATABASE || 'omega_bot';

  try {
    mongoClient = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    await mongoClient.connect();
    database = mongoClient.db(dbName);

    console.log(`✅ MongoDB connected to database: ${dbName}`);
    console.log(`   Connection URI: ${uri.replace(/\/\/.*@/, '//***@')}`); // Hide credentials in logs

    return database;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw new Error(`MongoDB connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Close MongoDB connection
 * Call this on graceful shutdown
 */
export async function closeMongoConnection(): Promise<void> {
  if (mongoClient) {
    console.log('🔌 Closing MongoDB connection...');
    await mongoClient.close();
    mongoClient = null;
    database = null;
    console.log('✅ MongoDB connection closed');
  }
}

/**
 * Validate collection name
 * MongoDB collection names must:
 * - Not be empty
 * - Not start with "system." (reserved)
 * - Only contain alphanumeric characters and underscores
 *
 * @param name Collection name to validate
 * @returns boolean True if valid
 */
export function isValidCollectionName(name: string): boolean {
  if (!name || name.length === 0) {
    return false;
  }

  if (name.startsWith('system.')) {
    return false;
  }

  // Allow alphanumeric and underscore only
  return /^[a-zA-Z0-9_]+$/.test(name);
}

/**
 * Check if collection exists
 *
 * @param collectionName Collection to check
 * @returns Promise<boolean> True if exists
 */
export async function collectionExists(collectionName: string): Promise<boolean> {
  const db = await getMongoDatabase();
  const collections = await db.listCollections({ name: collectionName }).toArray();
  return collections.length > 0;
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await closeMongoConnection();
});

process.on('SIGINT', async () => {
  await closeMongoConnection();
});
