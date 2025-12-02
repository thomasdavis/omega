/**
 * Create Todo Tool
 * Creates a new task in the todo_list table
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const createTodoTool = tool({
  description: `Create a new task in the todo list.

Use this when:
- User wants to add a new task/todo
- User asks to create a reminder
- User wants to track something they need to do

Examples:
- "Add 'buy groceries' to my todo list"
- "Create a task to call mom"
- "Remind me to finish the report"`,

  inputSchema: z.object({
    task: z.string().min(1).describe('The task description'),
  }),

  execute: async ({ task }) => {
    console.log(`📝 [Todo] Creating task: ${task}`);

    try {
      const todo = await prisma.todoList.create({
        data: {
          task,
          isCompleted: false,
        },
      });

      console.log(`✅ [Todo] Created task with id: ${todo.id}`);

      return {
        success: true,
        todo: {
          id: todo.id,
          task: todo.task,
          isCompleted: todo.isCompleted,
          createdAt: todo.createdAt.toISOString(),
          updatedAt: todo.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      console.error(`❌ [Todo] Failed to create task:`, error);
      return {
        success: false,
        error: 'CREATE_FAILED',
        message: `Failed to create task: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
