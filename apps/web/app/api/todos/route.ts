import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [todos, total] = await Promise.all([
      prisma.todoList.findMany({
        orderBy: [
          { isCompleted: 'asc' }, // incomplete first
          { createdAt: 'desc' },  // then by newest
        ],
        take: limit,
        skip: offset,
      }),
      prisma.todoList.count(),
    ]);

    // Convert BigInt timestamps to numbers for JSON serialization
    const formattedTodos = todos.map((todo) => ({
      id: todo.id,
      task: todo.task,
      is_completed: todo.isCompleted,
      created_at: todo.createdAt.toISOString(),
      updated_at: todo.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      todos: formattedTodos,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}
