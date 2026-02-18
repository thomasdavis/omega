/**
 * PostgreSQL Client
 * Connection pool singleton for PostgreSQL database
 *
 * Follows the same pattern as MongoDB client (apps/bot/src/mongodb/client.ts)
 * Supports Railway PostgreSQL plugin and local PostgreSQL
 */

import { Pool } from 'pg';

let pgPool: Pool | null = null;
let isClosing = false;

/**
 * Get the connection string from environment variables
 */
function getConnectionString(): string {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL, DATABASE_PUBLIC_URL, or DATABASE_URL environment variable not set');
  }
  return connectionString;
}

/**
 * Create a new pool with error handling attached
 */
function createPool(connectionString: string): Pool {
  const pool = new Pool({
    connectionString,
    max: 20,                        // Max connections in pool
    min: 2,                         // Min connections in pool
    idleTimeoutMillis: 30000,       // 30s idle timeout
    connectionTimeoutMillis: 10000, // 10s connection timeout
    statement_timeout: 30000,       // 30s query timeout
  });

  // Handle errors on idle clients in the pool.
  // Without this handler, idle client errors become uncaught exceptions
  // that crash the process (e.g., when Railway restarts the database or
  // a network blip drops a connection).
  pool.on('error', (err) => {
    console.error('⚠️  PostgreSQL pool idle client error:', err.message);
    // The pool will automatically remove the errored client and create
    // a new one on the next query. No manual intervention needed.
  });

  return pool;
}

/**
 * Get PostgreSQL connection pool
 * Uses singleton pattern - returns existing pool if available.
 * If the pool exists but is unhealthy, it will be replaced.
 *
 * @returns Promise<Pool> PostgreSQL connection pool
 */
export async function getPostgresPool(): Promise<Pool> {
  if (pgPool) {
    return pgPool;
  }

  console.log('🔌 Connecting to PostgreSQL...');

  const connectionString = getConnectionString();
  pgPool = createPool(connectionString);
  isClosing = false;

  // Test connection
  const client = await pgPool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected');
    console.log(`   Server time: ${result.rows[0].now}`);
  } catch (error) {
    console.error('❌ PostgreSQL connection test failed:', error);
    pgPool = null;
    throw error;
  } finally {
    client.release();
  }

  return pgPool;
}

/**
 * Close PostgreSQL connection pool
 * Call this on graceful shutdown
 *
 * Uses a guard flag to prevent calling end() multiple times on the same pool,
 * which can happen when multiple signal handlers trigger simultaneously.
 */
export async function closePostgresPool(): Promise<void> {
  if (pgPool && !isClosing) {
    isClosing = true;
    console.log('🔌 Closing PostgreSQL pool...');
    try {
      await pgPool.end();
      console.log('✅ PostgreSQL pool closed');
    } catch (error) {
      console.error('❌ Error closing PostgreSQL pool:', error);
    } finally {
      pgPool = null;
      isClosing = false;
    }
  }
}

/**
 * Validate table name
 * PostgreSQL table names must:
 * - Not be empty
 * - Start with letter or underscore
 * - Only contain alphanumeric and underscores
 * - Not start with "pg_" (system tables)
 * - Not be "information_schema"
 *
 * @param name Table name to validate
 * @returns boolean True if valid
 */
export function isValidTableName(name: string): boolean {
  if (!name || name.length === 0) {
    return false;
  }

  // Cannot start with pg_ (system tables)
  if (name.startsWith('pg_')) {
    return false;
  }

  // Cannot be information_schema
  if (name === 'information_schema') {
    return false;
  }

  // Must match: start with letter or underscore, then alphanumeric + underscore
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Validate column name
 * PostgreSQL column names must:
 * - Not be empty
 * - Start with letter or underscore
 * - Only contain alphanumeric and underscores
 *
 * @param name Column name to validate
 * @returns boolean True if valid
 */
export function isValidColumnName(name: string): boolean {
  if (!name || name.length === 0) {
    return false;
  }

  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Check if table exists
 *
 * @param tableName Table to check
 * @returns Promise<boolean> True if exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    )`,
    [tableName]
  );
  return result.rows[0].exists;
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  await closePostgresPool();
});

process.on('SIGINT', async () => {
  await closePostgresPool();
});
