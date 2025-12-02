/**
 * Update Todo Tool
 * Updates a task's text and/or completion status
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const updateTodoTool = tool({
  description: `Update a task in the todo list.

Use this when:
- User wants to mark a task as complete/incomplete
- User wants to edit a task's text
- User wants to change task details
- User completes or uncompletes a task

Examples:
- "Mark task 5 as complete"
- "Update task 3 to say 'buy milk and eggs'"
- "Mark todo 7 as done"
- "Change task 2 to incomplete"`,

  inputSchema: z.object({
    id: z.number().int().positive().describe('The task ID to update'),
    task: z.string().min(1).optional().describe('New task description (optional)'),
    isCompleted: z.boolean().optional().describe('New completion status (optional)'),
  }),

  execute: async ({ id, task, isCompleted }) => {
    console.log(`✏️ [Todo] Updating task with id: ${id}`);

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

      // Build update data
      const updateData: any = {};
      if (task !== undefined) {
        updateData.task = task;
      }
      if (isCompleted !== undefined) {
        updateData.isCompleted = isCompleted;
      }

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'NO_UPDATES',
          message: 'No updates provided. Specify task text or completion status.',
        };
      }

      const updatedTodo = await prisma.todoList.update({
        where: { id },
        data: updateData,
      });

      console.log(`✅ [Todo] Updated task: ${updatedTodo.task}`);

      return {
        success: true,
        todo: {
          id: updatedTodo.id,
          task: updatedTodo.task,
          isCompleted: updatedTodo.isCompleted,
          createdAt: updatedTodo.createdAt.toISOString(),
          updatedAt: updatedTodo.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      console.error(`❌ [Todo] Failed to update task:`, error);
      return {
        success: false,
        error: 'UPDATE_FAILED',
        message: `Failed to update task: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
