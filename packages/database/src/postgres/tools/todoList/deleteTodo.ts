/**
 * Delete Todo Tool
 * Deletes a task from the todo list
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const deleteTodoTool = tool({
  description: `Delete a task from the todo list.

Use this when:
- User wants to remove a task
- User asks to delete a todo
- User wants to clear a specific task

Examples:
- "Delete task 5"
- "Remove todo 3"
- "Delete the task about groceries"`,

  inputSchema: z.object({
    id: z.number().int().positive().describe('The task ID to delete'),
  }),

  execute: async ({ id }) => {
    console.log(`🗑️ [Todo] Deleting task with id: ${id}`);

    try {
      // Check if task exists
      const existingTodo = await prisma.todoList.findUnique({
        where: { id },
      });

      if (!existingTodo) {
        console.log(`⚠️ [Todo] Task not found: ${id}`);
        return {
          success: false,
          error: 'NOT_FOUND',
          message: `Task with id ${id} not found`,
        };
      }

      await prisma.todoList.delete({
        where: { id },
      });

      console.log(`✅ [Todo] Deleted task: ${existingTodo.task}`);

      return {
        success: true,
        message: `Task "${existingTodo.task}" has been deleted`,
        deletedTodo: {
          id: existingTodo.id,
          task: existingTodo.task,
        },
      };
    } catch (error) {
      console.error(`❌ [Todo] Failed to delete task:`, error);
      return {
        success: false,
        error: 'DELETE_FAILED',
        message: `Failed to delete task: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
