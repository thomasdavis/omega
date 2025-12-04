/**
 * List Autonomous Tools - View all autonomously created tools
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '@repo/database';

export const listAutonomousToolsTool = tool({
  description: 'List all autonomously created tools with their status, usage statistics, and metadata. Use this to see what tools Omega has created on its own.',

  inputSchema: z.object({
    onlyEnabled: z.boolean()
      .default(false)
      .describe('If true, only show enabled tools. If false, show all tools.'),

    category: z.enum(['development', 'content', 'research', 'specialized', 'all'])
      .default('all')
      .describe('Filter by category'),

    sortBy: z.enum(['created_at', 'usage_count', 'name'])
      .default('created_at')
      .describe('Sort order for results'),
  }),

  execute: async ({ onlyEnabled, category, sortBy }) => {
    try {
      const pool = await getPostgresPool();

      let query = `
        SELECT
          id,
          name,
          description,
          category,
          keywords,
          examples,
          tags,
          is_enabled,
          usage_count,
          created_at,
          last_used_at,
          safety_validated,
          validation_notes
        FROM autonomous_tools
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (onlyEnabled) {
        query += ` AND is_enabled = true`;
      }

      if (category !== 'all') {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      // Add sorting
      const sortColumn = sortBy === 'created_at' ? 'created_at DESC' :
                        sortBy === 'usage_count' ? 'usage_count DESC' :
                        'name ASC';
      query += ` ORDER BY ${sortColumn}`;

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return {
          success: true,
          tools: [],
          count: 0,
          message: 'No autonomous tools found matching the criteria.',
        };
      }

      const tools = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        keywords: row.keywords,
        examples: row.examples,
        tags: row.tags,
        isEnabled: row.is_enabled,
        usageCount: row.usage_count,
        createdAt: row.created_at,
        lastUsedAt: row.last_used_at,
        safetyValidated: row.safety_validated,
        validationNotes: row.validation_notes,
      }));

      return {
        success: true,
        tools,
        count: tools.length,
        summary: {
          total: tools.length,
          enabled: tools.filter(t => t.isEnabled).length,
          validated: tools.filter(t => t.safetyValidated).length,
          totalUsage: tools.reduce((sum, t) => sum + t.usageCount, 0),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list autonomous tools',
      };
    }
  },
});
