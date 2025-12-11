/**
 * Agent Management Service
 * Manages agent instances, configuration, and lifecycle
 * Part of the Autonomous Enhancement Framework (Issue #822)
 */

import { getPostgresPool } from '@repo/database';

export interface Agent {
  id: number;
  name: string;
  description: string | null;
  status: string;
  config: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  status?: string;
  config?: Record<string, any>;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  status?: string;
  config?: Record<string, any>;
}

/**
 * Create a new agent
 */
export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `INSERT INTO agents (name, description, status, config)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      input.name,
      input.description || null,
      input.status || 'active',
      JSON.stringify(input.config || {}),
    ]
  );

  return result.rows[0];
}

/**
 * Get agent by ID
 */
export async function getAgent(id: number): Promise<Agent | null> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT * FROM agents WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get agent by name
 */
export async function getAgentByName(name: string): Promise<Agent | null> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT * FROM agents WHERE name = $1`,
    [name]
  );

  return result.rows[0] || null;
}

/**
 * List all agents with optional filters
 */
export async function listAgents(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Agent[]> {
  const pool = await getPostgresPool();

  let query = 'SELECT * FROM agents';
  const params: any[] = [];
  const conditions: string[] = [];

  if (options?.status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(options.status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

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
 * Update an agent
 */
export async function updateAgent(
  id: number,
  updates: UpdateAgentInput
): Promise<Agent | null> {
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

  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    params.push(updates.status);
  }

  if (updates.config !== undefined) {
    fields.push(`config = $${paramIndex++}`);
    params.push(JSON.stringify(updates.config));
  }

  if (fields.length === 0) {
    return getAgent(id);
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const result = await pool.query(
    `UPDATE agents SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  return result.rows[0] || null;
}

/**
 * Delete an agent
 */
export async function deleteAgent(id: number): Promise<boolean> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `DELETE FROM agents WHERE id = $1`,
    [id]
  );

  return result.rowCount ? result.rowCount > 0 : false;
}

/**
 * Get agent statistics
 */
export async function getAgentStats(id: number): Promise<{
  agent: Agent;
  skillCount: number;
  activeSkillCount: number;
}> {
  const pool = await getPostgresPool();

  const agentResult = await pool.query(
    `SELECT * FROM agents WHERE id = $1`,
    [id]
  );

  if (agentResult.rows.length === 0) {
    throw new Error(`Agent ${id} not found`);
  }

  const statsResult = await pool.query(
    `SELECT
      COUNT(*) as total_skills,
      COUNT(*) FILTER (WHERE is_enabled = true) as active_skills
     FROM skills
     WHERE agent_id = $1`,
    [id]
  );

  return {
    agent: agentResult.rows[0],
    skillCount: parseInt(statsResult.rows[0].total_skills),
    activeSkillCount: parseInt(statsResult.rows[0].active_skills),
  };
}
