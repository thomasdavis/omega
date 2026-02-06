/**
 * Get Todo Tool
 * Retrieves a specific task by ID
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const getTodoTool = tool({
  description: `Get a specific task from the todo list by ID.

Use this when:
- User wants details about a specific task
- User references a task by its ID
- User needs to check the status of a particular task

Examples:
- "Show me task #5"
- "What is task 3?"
- "Get details for todo 10"`,

  inputSchema: z.object({
    id: z.number().int().positive().describe('The task ID'),
  }),

  execute: async ({ id }) => {
    console.log(`🔍 [Todo] Getting task with id: ${id}`);

    try {
      const todo = await prisma.todoList.findUnique({
        where: { id },
      });

      if (!todo) {
        console.log(`⚠️ [Todo] Task not found: ${id}`);
        return {
          success: false,
          error: 'NOT_FOUND',
          message: `Task with id ${id} not found`,
        };
      }

      console.log(`✅ [Todo] Found task: ${todo.task}`);

      return {
        success: true,
        todo: {
          id: todo.id,
          task: todo.task,
          userId: todo.userId,
          githubIssueNumber: todo.githubIssueNumber,
          isCompleted: todo.isCompleted,
          createdAt: todo.createdAt.toISOString(),
          updatedAt: todo.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      console.error(`❌ [Todo] Failed to get task:`, error);
      return {
        success: false,
        error: 'GET_FAILED',
        message: `Failed to get task: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
