import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const userId = searchParams.get('user_id') || undefined;
    const githubIssueNumber = searchParams.get('github_issue_number');
    const isCompleted = searchParams.get('is_completed');

    // Build where clause
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }
    if (githubIssueNumber) {
      where.githubIssueNumber = parseInt(githubIssueNumber, 10);
    }
    if (isCompleted !== null) {
      where.isCompleted = isCompleted === 'true';
    }

    const [todos, total] = await Promise.all([
      prisma.todoList.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: [
          { isCompleted: 'asc' }, // incomplete first
          { createdAt: 'desc' },  // then by newest
        ],
        take: limit,
        skip: offset,
      }),
      prisma.todoList.count(Object.keys(where).length > 0 ? { where } : undefined),
    ]);

    // Convert BigInt timestamps to numbers for JSON serialization
    const formattedTodos = todos.map((todo) => ({
      id: todo.id,
      task: todo.task,
      user_id: todo.userId,
      github_issue_number: todo.githubIssueNumber,
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, user_id, github_issue_number } = body;

    if (!task || typeof task !== 'string' || task.trim().length === 0) {
      return NextResponse.json(
        { error: 'Task description is required' },
        { status: 400 }
      );
    }

    const todo = await prisma.todoList.create({
      data: {
        task: task.trim(),
        userId: user_id || null,
        githubIssueNumber: github_issue_number || null,
        isCompleted: false,
      },
    });

    return NextResponse.json({
      success: true,
      todo: {
        id: todo.id,
        task: todo.task,
        user_id: todo.userId,
        github_issue_number: todo.githubIssueNumber,
        is_completed: todo.isCompleted,
        created_at: todo.createdAt.toISOString(),
        updated_at: todo.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    );
  }
}
