/**
 * Tools Registry Service
 * Manages tool metadata and integrates with existing tool infrastructure
 * Part of the Autonomous Enhancement Framework (Issue #822)
 */

import { getPostgresPool } from '@repo/database';
import { ToolMetadata } from '../toolRegistry/types.js';

export interface ToolRegistryEntry {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  api_endpoint: string | null;
  specification: Record<string, any>;
  is_core: boolean;
  is_enabled: boolean;
  usage_count: number;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface RegisterToolInput {
  id: string;
  name: string;
  description?: string;
  category?: string;
  api_endpoint?: string;
  specification: Record<string, any>;
  is_core?: boolean;
  is_enabled?: boolean;
}

/**
 * Register a tool in the registry
 */
export async function registerTool(input: RegisterToolInput): Promise<ToolRegistryEntry> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `INSERT INTO tools (id, name, description, category, api_endpoint, specification, is_core, is_enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id)
     DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       category = EXCLUDED.category,
       api_endpoint = EXCLUDED.api_endpoint,
       specification = EXCLUDED.specification,
       is_core = EXCLUDED.is_core,
       is_enabled = EXCLUDED.is_enabled,
       updated_at = NOW()
     RETURNING *`,
    [
      input.id,
      input.name,
      input.description || null,
      input.category || null,
      input.api_endpoint || null,
      JSON.stringify(input.specification),
      input.is_core || false,
      input.is_enabled !== false,
    ]
  );

  return result.rows[0];
}

/**
 * Get tool from registry
 */
export async function getTool(id: string): Promise<ToolRegistryEntry | null> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT * FROM tools WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * List tools with filters
 */
export async function listTools(options?: {
  category?: string;
  is_core?: boolean;
  is_enabled?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'usage_count' | 'last_used_at' | 'name';
}): Promise<ToolRegistryEntry[]> {
  const pool = await getPostgresPool();

  let query = 'SELECT * FROM tools';
  const params: any[] = [];
  const conditions: string[] = [];

  if (options?.category) {
    conditions.push(`category = $${params.length + 1}`);
    params.push(options.category);
  }

  if (options?.is_core !== undefined) {
    conditions.push(`is_core = $${params.length + 1}`);
    params.push(options.is_core);
  }

  if (options?.is_enabled !== undefined) {
    conditions.push(`is_enabled = $${params.length + 1}`);
    params.push(options.is_enabled);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  const sortField = options?.sort_by || 'created_at';
  const sortOrder = sortField === 'name' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortField} ${sortOrder}`;

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
 * Update tool
 */
export async function updateTool(
  id: string,
  updates: Partial<Omit<RegisterToolInput, 'id'>>
): Promise<ToolRegistryEntry | null> {
  const pool = await getPostgresPool();

  const fields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    params.push(updates.name);
  }

  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    params.push(updates.description);
  }

  if (updates.category !== undefined) {
    fields.push(`category = $${paramIndex++}`);
    params.push(updates.category);
  }

  if (updates.api_endpoint !== undefined) {
    fields.push(`api_endpoint = $${paramIndex++}`);
    params.push(updates.api_endpoint);
  }

  if (updates.specification !== undefined) {
    fields.push(`specification = $${paramIndex++}`);
    params.push(JSON.stringify(updates.specification));
  }

  if (updates.is_core !== undefined) {
    fields.push(`is_core = $${paramIndex++}`);
    params.push(updates.is_core);
  }

  if (updates.is_enabled !== undefined) {
    fields.push(`is_enabled = $${paramIndex++}`);
    params.push(updates.is_enabled);
  }

  if (fields.length === 0) {
    return getTool(id);
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const result = await pool.query(
    `UPDATE tools SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  return result.rows[0] || null;
}

/**
 * Delete tool
 */
export async function deleteTool(id: string): Promise<boolean> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `DELETE FROM tools WHERE id = $1`,
    [id]
  );

  return result.rowCount ? result.rowCount > 0 : false;
}

/**
 * Track tool usage
 */
export async function trackToolUsage(id: string): Promise<void> {
  const pool = await getPostgresPool();

  await pool.query(
    `UPDATE tools
     SET usage_count = usage_count + 1,
         last_used_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

/**
 * Sync existing tools to registry
 * This populates the tools table from the existing tool metadata
 */
export async function syncToolsFromMetadata(metadata: ToolMetadata[]): Promise<number> {
  let synced = 0;

  for (const meta of metadata) {
    try {
      await registerTool({
        id: meta.id,
        name: meta.name,
        description: meta.description,
        category: meta.category,
        specification: {
          keywords: meta.keywords,
          tags: meta.tags,
          examples: meta.examples,
        },
        is_core: meta.isCore || false,
        is_enabled: true,
      });
      synced++;
    } catch (error) {
      console.error(`Failed to sync tool ${meta.id}:`, error);
    }
  }

  console.log(`✅ Synced ${synced}/${metadata.length} tools to registry`);
  return synced;
}

/**
 * Get tool statistics
 */
export async function getToolStats(): Promise<{
  total_tools: number;
  core_tools: number;
  enabled_tools: number;
  disabled_tools: number;
  tools_by_category: Record<string, number>;
  most_used_tools: Array<{ id: string; name: string; usage_count: number }>;
  least_used_tools: Array<{ id: string; name: string; usage_count: number }>;
}> {
  const pool = await getPostgresPool();

  const statsResult = await pool.query(`
    SELECT
      COUNT(*) as total_tools,
      COUNT(*) FILTER (WHERE is_core = true) as core_tools,
      COUNT(*) FILTER (WHERE is_enabled = true) as enabled_tools,
      COUNT(*) FILTER (WHERE is_enabled = false) as disabled_tools
    FROM tools
  `);

  const byCategoryResult = await pool.query(`
    SELECT category, COUNT(*) as count
    FROM tools
    WHERE category IS NOT NULL
    GROUP BY category
    ORDER BY count DESC
  `);

  const mostUsedResult = await pool.query(`
    SELECT id, name, usage_count
    FROM tools
    WHERE usage_count > 0
    ORDER BY usage_count DESC
    LIMIT 10
  `);

  const leastUsedResult = await pool.query(`
    SELECT id, name, usage_count
    FROM tools
    WHERE usage_count >= 0
    ORDER BY usage_count ASC, created_at DESC
    LIMIT 10
  `);

  const toolsByCategory: Record<string, number> = {};
  for (const row of byCategoryResult.rows) {
    toolsByCategory[row.category] = parseInt(row.count);
  }

  return {
    total_tools: parseInt(statsResult.rows[0].total_tools),
    core_tools: parseInt(statsResult.rows[0].core_tools),
    enabled_tools: parseInt(statsResult.rows[0].enabled_tools),
    disabled_tools: parseInt(statsResult.rows[0].disabled_tools),
    tools_by_category: toolsByCategory,
    most_used_tools: mostUsedResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      usage_count: row.usage_count,
    })),
    least_used_tools: leastUsedResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      usage_count: row.usage_count,
    })),
  };
}

/**
 * Get tool recommendations based on context
 */
export async function getToolRecommendations(options: {
  category?: string;
  exclude_ids?: string[];
  limit?: number;
}): Promise<ToolRegistryEntry[]> {
  const pool = await getPostgresPool();

  let query = `
    SELECT * FROM tools
    WHERE is_enabled = true
  `;

  const params: any[] = [];

  if (options.category) {
    query += ` AND category = $${params.length + 1}`;
    params.push(options.category);
  }

  if (options.exclude_ids && options.exclude_ids.length > 0) {
    query += ` AND id != ALL($${params.length + 1})`;
    params.push(options.exclude_ids);
  }

  query += ' ORDER BY usage_count DESC, created_at DESC';

  if (options.limit) {
    query += ` LIMIT $${params.length + 1}`;
    params.push(options.limit);
  }

  const result = await pool.query(query, params);
  return result.rows;
}
