/**
 * Context Store Service
 * Knowledge & Context persistence layer
 * Part of the Autonomous Enhancement Framework (Issue #822)
 */

import { getPostgresPool } from '@repo/database';

export interface ContextEntry {
  id: number;
  context_key: string;
  context_type: string;
  context_value: Record<string, any>;
  owner_type: string | null;
  owner_id: string | null;
  metadata: Record<string, any>;
  access_count: number;
  last_accessed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SetContextInput {
  context_key: string;
  context_type?: string;
  context_value: Record<string, any>;
  owner_type?: string;
  owner_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Set a context value (create or update)
 */
export async function setContext(input: SetContextInput): Promise<ContextEntry> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `INSERT INTO context_store
     (context_key, context_type, context_value, owner_type, owner_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (context_key)
     DO UPDATE SET
       context_value = EXCLUDED.context_value,
       context_type = EXCLUDED.context_type,
       owner_type = EXCLUDED.owner_type,
       owner_id = EXCLUDED.owner_id,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()
     RETURNING *`,
    [
      input.context_key,
      input.context_type || 'general',
      JSON.stringify(input.context_value),
      input.owner_type || null,
      input.owner_id || null,
      JSON.stringify(input.metadata || {}),
    ]
  );

  return result.rows[0];
}

/**
 * Get a context value
 */
export async function getContext(contextKey: string): Promise<ContextEntry | null> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `UPDATE context_store
     SET access_count = access_count + 1,
         last_accessed_at = NOW()
     WHERE context_key = $1
     RETURNING *`,
    [contextKey]
  );

  return result.rows[0] || null;
}

/**
 * Get context value without incrementing access count
 */
export async function peekContext(contextKey: string): Promise<ContextEntry | null> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT * FROM context_store WHERE context_key = $1`,
    [contextKey]
  );

  return result.rows[0] || null;
}

/**
 * Delete a context value
 */
export async function deleteContext(contextKey: string): Promise<boolean> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `DELETE FROM context_store WHERE context_key = $1`,
    [contextKey]
  );

  return result.rowCount ? result.rowCount > 0 : false;
}

/**
 * List context entries with filters
 */
export async function listContexts(options?: {
  context_type?: string;
  owner_type?: string;
  owner_id?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'updated_at' | 'access_count' | 'last_accessed_at';
}): Promise<ContextEntry[]> {
  const pool = await getPostgresPool();

  let query = 'SELECT * FROM context_store';
  const params: any[] = [];
  const conditions: string[] = [];

  if (options?.context_type) {
    conditions.push(`context_type = $${params.length + 1}`);
    params.push(options.context_type);
  }

  if (options?.owner_type) {
    conditions.push(`owner_type = $${params.length + 1}`);
    params.push(options.owner_type);
  }

  if (options?.owner_id) {
    conditions.push(`owner_id = $${params.length + 1}`);
    params.push(options.owner_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  const sortField = options?.sort_by || 'updated_at';
  query += ` ORDER BY ${sortField} DESC`;

  if (options?.limit) {
    query += ` LIMIT $${params.length + 1}`;
    params.push(options.limit);
  }

  if (options?.offset) {
    query += ` OFFSET $${params.length + 1}`;
    params.push(options.offset);
  }

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Search context values by JSONB field
 */
export async function searchContexts(options: {
  field_path: string;
  value: any;
  operator?: '=' | '>' | '<' | '>=' | '<=' | '!=' | '@>' | '<@';
  context_type?: string;
  limit?: number;
}): Promise<ContextEntry[]> {
  const pool = await getPostgresPool();

  const operator = options.operator || '=';
  let query = `SELECT * FROM context_store WHERE context_value->>'${options.field_path}' ${operator} $1`;
  const params: any[] = [options.value];

  if (options.context_type) {
    query += ` AND context_type = $${params.length + 1}`;
    params.push(options.context_type);
  }

  query += ' ORDER BY updated_at DESC';

  if (options.limit) {
    query += ` LIMIT $${params.length + 1}`;
    params.push(options.limit);
  }

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Merge context values (deep merge)
 */
export async function mergeContext(
  contextKey: string,
  updates: Record<string, any>
): Promise<ContextEntry | null> {
  const pool = await getPostgresPool();

  // Get current value
  const current = await peekContext(contextKey);
  if (!current) {
    // If doesn't exist, create new
    return setContext({
      context_key: contextKey,
      context_value: updates,
    });
  }

  // Merge values
  const merged = {
    ...current.context_value,
    ...updates,
  };

  return setContext({
    context_key: contextKey,
    context_type: current.context_type,
    context_value: merged,
    owner_type: current.owner_type || undefined,
    owner_id: current.owner_id || undefined,
    metadata: current.metadata,
  });
}

/**
 * Update context metadata
 */
export async function updateContextMetadata(
  contextKey: string,
  metadata: Record<string, any>
): Promise<ContextEntry | null> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `UPDATE context_store
     SET metadata = $2, updated_at = NOW()
     WHERE context_key = $1
     RETURNING *`,
    [contextKey, JSON.stringify(metadata)]
  );

  return result.rows[0] || null;
}

/**
 * Get context statistics
 */
export async function getContextStats(): Promise<{
  total_contexts: number;
  contexts_by_type: Record<string, number>;
  most_accessed: ContextEntry[];
  recently_updated: ContextEntry[];
}> {
  const pool = await getPostgresPool();

  const totalResult = await pool.query(`
    SELECT COUNT(*) as total FROM context_store
  `);

  const byTypeResult = await pool.query(`
    SELECT context_type, COUNT(*) as count
    FROM context_store
    GROUP BY context_type
    ORDER BY count DESC
  `);

  const mostAccessedResult = await pool.query(`
    SELECT * FROM context_store
    WHERE access_count > 0
    ORDER BY access_count DESC
    LIMIT 10
  `);

  const recentlyUpdatedResult = await pool.query(`
    SELECT * FROM context_store
    ORDER BY updated_at DESC
    LIMIT 10
  `);

  const contextsByType: Record<string, number> = {};
  for (const row of byTypeResult.rows) {
    contextsByType[row.context_type] = parseInt(row.count);
  }

  return {
    total_contexts: parseInt(totalResult.rows[0].total),
    contexts_by_type: contextsByType,
    most_accessed: mostAccessedResult.rows,
    recently_updated: recentlyUpdatedResult.rows,
  };
}

/**
 * Bulk set contexts (efficient batch insert/update)
 */
export async function bulkSetContexts(
  entries: SetContextInput[]
): Promise<number> {
  if (entries.length === 0) {
    return 0;
  }

  const pool = await getPostgresPool();

  const values = entries.map((entry, i) => {
    const base = i * 6;
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
  }).join(', ');

  const params = entries.flatMap(entry => [
    entry.context_key,
    entry.context_type || 'general',
    JSON.stringify(entry.context_value),
    entry.owner_type || null,
    entry.owner_id || null,
    JSON.stringify(entry.metadata || {}),
  ]);

  const result = await pool.query(
    `INSERT INTO context_store
     (context_key, context_type, context_value, owner_type, owner_id, metadata)
     VALUES ${values}
     ON CONFLICT (context_key)
     DO UPDATE SET
       context_value = EXCLUDED.context_value,
       context_type = EXCLUDED.context_type,
       owner_type = EXCLUDED.owner_type,
       owner_id = EXCLUDED.owner_id,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()`,
    params
  );

  return result.rowCount || 0;
}

/**
 * Clean up old context entries
 */
export async function cleanupOldContexts(options: {
  older_than_days: number;
  context_type?: string;
  min_access_count?: number;
}): Promise<number> {
  const pool = await getPostgresPool();

  let query = `
    DELETE FROM context_store
    WHERE updated_at < NOW() - INTERVAL '${options.older_than_days} days'
  `;

  const params: any[] = [];

  if (options.context_type) {
    query += ` AND context_type = $${params.length + 1}`;
    params.push(options.context_type);
  }

  if (options.min_access_count !== undefined) {
    query += ` AND access_count < $${params.length + 1}`;
    params.push(options.min_access_count);
  }

  const result = await pool.query(query, params);
  const deletedCount = result.rowCount || 0;

  if (deletedCount > 0) {
    console.log(`🧹 Cleaned up ${deletedCount} old context entries`);
  }

  return deletedCount;
}
