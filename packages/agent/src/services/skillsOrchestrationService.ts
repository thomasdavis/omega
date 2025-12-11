/**
 * Skills Orchestration Service
 * Manages skill workflows that combine multiple tools
 * Part of the Autonomous Enhancement Framework (Issue #822)
 */

import { getPostgresPool } from '@repo/database';

export interface Skill {
  id: number;
  agent_id: number | null;
  name: string;
  description: string | null;
  workflow_definition: Record<string, any>;
  tool_ids: string[];
  is_enabled: boolean;
  usage_count: number;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSkillInput {
  agent_id?: number;
  name: string;
  description?: string;
  workflow_definition: Record<string, any>;
  tool_ids?: string[];
  is_enabled?: boolean;
}

export interface UpdateSkillInput {
  agent_id?: number;
  name?: string;
  description?: string;
  workflow_definition?: Record<string, any>;
  tool_ids?: string[];
  is_enabled?: boolean;
}

export interface WorkflowStep {
  step: number;
  tool_id: string;
  inputs: Record<string, any>;
  condition?: string;
  on_success?: string;
  on_failure?: string;
}

export interface SkillExecutionResult {
  skill_id: number;
  success: boolean;
  steps_executed: number;
  results: any[];
  error?: string;
  execution_time_ms: number;
}

/**
 * Create a new skill
 */
export async function createSkill(input: CreateSkillInput): Promise<Skill> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `INSERT INTO skills (agent_id, name, description, workflow_definition, tool_ids, is_enabled)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.agent_id || null,
      input.name,
      input.description || null,
      JSON.stringify(input.workflow_definition),
      input.tool_ids || [],
      input.is_enabled !== false,
    ]
  );

  return result.rows[0];
}

/**
 * Get skill by ID
 */
export async function getSkill(id: number): Promise<Skill | null> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT * FROM skills WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get skill by name
 */
export async function getSkillByName(name: string): Promise<Skill | null> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT * FROM skills WHERE name = $1`,
    [name]
  );

  return result.rows[0] || null;
}

/**
 * List skills with optional filters
 */
export async function listSkills(options?: {
  agent_id?: number;
  is_enabled?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'usage_count' | 'last_used_at' | 'name';
}): Promise<Skill[]> {
  const pool = await getPostgresPool();

  let query = 'SELECT * FROM skills';
  const params: any[] = [];
  const conditions: string[] = [];

  if (options?.agent_id !== undefined) {
    conditions.push(`agent_id = $${params.length + 1}`);
    params.push(options.agent_id);
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
 * Update a skill
 */
export async function updateSkill(
  id: number,
  updates: UpdateSkillInput
): Promise<Skill | null> {
  const pool = await getPostgresPool();

  const fields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.agent_id !== undefined) {
    fields.push(`agent_id = $${paramIndex++}`);
    params.push(updates.agent_id);
  }

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    params.push(updates.name);
  }

  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    params.push(updates.description);
  }

  if (updates.workflow_definition !== undefined) {
    fields.push(`workflow_definition = $${paramIndex++}`);
    params.push(JSON.stringify(updates.workflow_definition));
  }

  if (updates.tool_ids !== undefined) {
    fields.push(`tool_ids = $${paramIndex++}`);
    params.push(updates.tool_ids);
  }

  if (updates.is_enabled !== undefined) {
    fields.push(`is_enabled = $${paramIndex++}`);
    params.push(updates.is_enabled);
  }

  if (fields.length === 0) {
    return getSkill(id);
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const result = await pool.query(
    `UPDATE skills SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  return result.rows[0] || null;
}

/**
 * Delete a skill
 */
export async function deleteSkill(id: number): Promise<boolean> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `DELETE FROM skills WHERE id = $1`,
    [id]
  );

  return result.rowCount ? result.rowCount > 0 : false;
}

/**
 * Track skill usage
 */
export async function trackSkillUsage(id: number): Promise<void> {
  const pool = await getPostgresPool();

  await pool.query(
    `UPDATE skills
     SET usage_count = usage_count + 1,
         last_used_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

/**
 * Execute a skill workflow
 * This orchestrates multiple tools according to the workflow definition
 */
export async function executeSkill(
  skillId: number,
  context: Record<string, any>,
  toolExecutor: (toolId: string, inputs: Record<string, any>) => Promise<any>
): Promise<SkillExecutionResult> {
  const startTime = Date.now();

  try {
    const skill = await getSkill(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    if (!skill.is_enabled) {
      throw new Error(`Skill ${skillId} is disabled`);
    }

    const workflow = skill.workflow_definition;
    const steps: WorkflowStep[] = workflow.steps || [];
    const results: any[] = [];
    let currentStep = 0;

    // Execute workflow steps sequentially
    for (const step of steps) {
      currentStep++;

      // Check if step should be executed based on condition
      if (step.condition) {
        const conditionMet = evaluateCondition(step.condition, context, results);
        if (!conditionMet) {
          continue;
        }
      }

      // Resolve inputs from context and previous results
      const resolvedInputs = resolveInputs(step.inputs, context, results);

      try {
        // Execute tool
        const result = await toolExecutor(step.tool_id, resolvedInputs);
        results.push(result);

        // Update context with result
        context[`step_${currentStep}_result`] = result;

        // Handle on_success transition
        if (step.on_success === 'break') {
          break;
        }
      } catch (error) {
        // Handle on_failure transition
        if (step.on_failure === 'continue') {
          results.push({ error: error instanceof Error ? error.message : 'Unknown error' });
          continue;
        } else if (step.on_failure === 'break') {
          break;
        } else {
          throw error;
        }
      }
    }

    // Track usage
    await trackSkillUsage(skillId);

    return {
      skill_id: skillId,
      success: true,
      steps_executed: currentStep,
      results,
      execution_time_ms: Date.now() - startTime,
    };
  } catch (error) {
    return {
      skill_id: skillId,
      success: false,
      steps_executed: 0,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      execution_time_ms: Date.now() - startTime,
    };
  }
}

/**
 * Evaluate a condition expression
 * Simple condition evaluator supporting basic comparisons
 */
function evaluateCondition(
  condition: string,
  context: Record<string, any>,
  results: any[]
): boolean {
  try {
    // Create a safe evaluation context
    const evalContext: Record<string, any> = { ...context, results };

    // Simple condition parser
    // Supports: variable == value, variable != value, variable > value, etc.
    const match = condition.match(/(\w+)\s*(==|!=|>|<|>=|<=)\s*(.+)/);
    if (!match) {
      return true; // If condition can't be parsed, execute step
    }

    const [, variable, operator, value] = match;
    const variableValue = evalContext[variable];
    const compareValue = value.trim().replace(/['"]/g, '');

    switch (operator) {
      case '==':
        return String(variableValue) === compareValue;
      case '!=':
        return String(variableValue) !== compareValue;
      case '>':
        return Number(variableValue) > Number(compareValue);
      case '<':
        return Number(variableValue) < Number(compareValue);
      case '>=':
        return Number(variableValue) >= Number(compareValue);
      case '<=':
        return Number(variableValue) <= Number(compareValue);
      default:
        return true;
    }
  } catch {
    return true; // If evaluation fails, execute step
  }
}

/**
 * Resolve inputs from context and previous results
 * Supports variable interpolation like {context.variable} and {step_1_result.field}
 */
function resolveInputs(
  inputs: Record<string, any>,
  context: Record<string, any>,
  results: any[]
): Record<string, any> {
  const resolved: Record<string, any> = {};

  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      // Variable reference
      const varPath = value.slice(1, -1);
      const parts = varPath.split('.');

      if (parts[0] === 'context') {
        resolved[key] = context[parts[1]];
      } else if (parts[0].startsWith('step_') && parts[0].endsWith('_result')) {
        const stepIndex = parseInt(parts[0].replace('step_', '').replace('_result', '')) - 1;
        const result = results[stepIndex];
        resolved[key] = parts.length > 1 ? result?.[parts[1]] : result;
      } else {
        resolved[key] = value;
      }
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Get skill statistics
 */
export async function getSkillStats(id: number): Promise<{
  skill: Skill;
  average_execution_time_ms?: number;
  success_rate?: number;
}> {
  const pool = await getPostgresPool();

  const skill = await getSkill(id);
  if (!skill) {
    throw new Error(`Skill ${id} not found`);
  }

  // Note: For execution statistics, we would need an execution_log table
  // For now, just return basic info
  return {
    skill,
  };
}
