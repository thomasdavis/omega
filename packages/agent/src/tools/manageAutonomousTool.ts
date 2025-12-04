/**
 * Manage Autonomous Tool - Enable, disable, or delete autonomously created tools
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getPostgresPool } from '@repo/database';

export const manageAutonomousToolTool = tool({
  description: 'Manage autonomously created tools: enable, disable, validate for safety, or delete them. This provides control over which autonomous tools are active.',

  inputSchema: z.object({
    toolId: z.string()
      .describe('The ID of the autonomous tool to manage'),

    action: z.enum(['enable', 'disable', 'validate', 'delete', 'view'])
      .describe('Action to perform on the tool'),

    validationNotes: z.string()
      .optional()
      .describe('Notes about safety validation (required when action is "validate")'),
  }),

  execute: async ({ toolId, action, validationNotes }) => {
    try {
      const pool = await getPostgresPool();

      // First, check if tool exists
      const checkResult = await pool.query(
        'SELECT id, name, is_enabled, safety_validated FROM autonomous_tools WHERE id = $1',
        [toolId]
      );

      if (checkResult.rows.length === 0) {
        return {
          success: false,
          error: 'TOOL_NOT_FOUND',
          message: `No autonomous tool found with ID '${toolId}'`,
        };
      }

      const tool = checkResult.rows[0];

      switch (action) {
        case 'enable':
          await pool.query(
            'UPDATE autonomous_tools SET is_enabled = true WHERE id = $1',
            [toolId]
          );
          return {
            success: true,
            message: `Enabled autonomous tool '${tool.name}' (${toolId})`,
            toolId,
            toolName: tool.name,
            isEnabled: true,
          };

        case 'disable':
          await pool.query(
            'UPDATE autonomous_tools SET is_enabled = false WHERE id = $1',
            [toolId]
          );
          return {
            success: true,
            message: `Disabled autonomous tool '${tool.name}' (${toolId})`,
            toolId,
            toolName: tool.name,
            isEnabled: false,
          };

        case 'validate':
          if (!validationNotes) {
            return {
              success: false,
              error: 'VALIDATION_NOTES_REQUIRED',
              message: 'Validation notes are required when validating a tool',
            };
          }

          await pool.query(
            `UPDATE autonomous_tools
             SET safety_validated = true,
                 validation_notes = $1,
                 is_enabled = true
             WHERE id = $2`,
            [validationNotes, toolId]
          );

          return {
            success: true,
            message: `Validated and enabled autonomous tool '${tool.name}' (${toolId})`,
            toolId,
            toolName: tool.name,
            safetyValidated: true,
            isEnabled: true,
            validationNotes,
          };

        case 'delete':
          await pool.query('DELETE FROM autonomous_tools WHERE id = $1', [toolId]);
          return {
            success: true,
            message: `Deleted autonomous tool '${tool.name}' (${toolId})`,
            toolId,
            toolName: tool.name,
          };

        case 'view':
          const viewResult = await pool.query(
            `SELECT * FROM autonomous_tools WHERE id = $1`,
            [toolId]
          );
          const fullTool = viewResult.rows[0];

          return {
            success: true,
            tool: {
              id: fullTool.id,
              name: fullTool.name,
              description: fullTool.description,
              category: fullTool.category,
              parameters: fullTool.parameters,
              implementation: fullTool.implementation,
              keywords: fullTool.keywords,
              examples: fullTool.examples,
              tags: fullTool.tags,
              isEnabled: fullTool.is_enabled,
              usageCount: fullTool.usage_count,
              createdAt: fullTool.created_at,
              lastUsedAt: fullTool.last_used_at,
              createdBy: fullTool.created_by,
              safetyValidated: fullTool.safety_validated,
              validationNotes: fullTool.validation_notes,
            },
          };

        default:
          return {
            success: false,
            error: 'INVALID_ACTION',
            message: `Unknown action: ${action}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to manage autonomous tool',
      };
    }
  },
});
