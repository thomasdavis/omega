/**
 * List Todos Tool
 * Lists all tasks or filters by completion status
 */

import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '../../prismaClient.js';

export const listTodosTool = tool({
  description: `List tasks from the todo list with optional filtering.

Use this when:
- User wants to see their todo list
- User asks what tasks they have
- User wants to see completed/incomplete tasks
- User wants to check their reminders

Examples:
- "Show me my todo list"
- "What tasks do I have?"
- "Show completed tasks"
- "List incomplete todos"`,

  inputSchema: z.object({
    isCompleted: z.boolean().optional().describe('Filter by completion status (true = completed, false = incomplete, undefined = all)'),
    userId: z.string().optional().describe('Filter by user ID'),
    githubIssueNumber: z.number().int().positive().optional().describe('Filter by GitHub issue number'),
    limit: z.number().int().positive().max(100).optional().describe('Maximum number of tasks to return (default: 50)'),
    orderBy: z.enum(['createdAt', 'updatedAt']).optional().describe('Sort by field (default: createdAt)'),
    orderDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc)'),
  }),

  execute: async ({ isCompleted, userId, githubIssueNumber, limit = 50, orderBy = 'createdAt', orderDirection = 'desc' }) => {
    console.log(`📋 [Todo] Listing tasks (completed: ${isCompleted ?? 'all'}, userId: ${userId ?? 'all'}, issue: ${githubIssueNumber ?? 'all'})`);

    try {
      const where: any = {};
      if (isCompleted !== undefined) {
        where.isCompleted = isCompleted;
      }
      if (userId !== undefined) {
        where.userId = userId;
      }
      if (githubIssueNumber !== undefined) {
        where.githubIssueNumber = githubIssueNumber;
      }

      const todos = await prisma.todoList.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: {
          [orderBy]: orderDirection,
        },
        take: limit,
      });

      console.log(`✅ [Todo] Found ${todos.length} task(s)`);

      return {
        success: true,
        count: todos.length,
        todos: todos.map(todo => ({
          id: todo.id,
          task: todo.task,
          userId: todo.userId,
          githubIssueNumber: todo.githubIssueNumber,
          isCompleted: todo.isCompleted,
          createdAt: todo.createdAt.toISOString(),
          updatedAt: todo.updatedAt.toISOString(),
        })),
      };
    } catch (error) {
      console.error(`❌ [Todo] Failed to list tasks:`, error);
      return {
        success: false,
        error: 'LIST_FAILED',
        message: `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
