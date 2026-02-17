import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid todo ID' },
        { status: 400 }
      );
    }

    const todo = await prisma.todoList.findUnique({
      where: { id },
    });

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      todo: {
        id: todo.id,
        task: todo.task,
        user_id: todo.userId,
        github_issue_number: todo.githubIssueNumber,
        is_completed: todo.isCompleted,
        created_at: todo.createdAt.toISOString(),
        updated_at: todo.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching todo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todo' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid todo ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { task, user_id, github_issue_number, is_completed } = body;

    // Check if todo exists
    const existingTodo = await prisma.todoList.findUnique({
      where: { id },
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (task !== undefined) {
      if (typeof task !== 'string' || task.trim().length === 0) {
        return NextResponse.json(
          { error: 'Task must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.task = task.trim();
    }
    if (user_id !== undefined) {
      updateData.userId = user_id || null;
    }
    if (github_issue_number !== undefined) {
      updateData.githubIssueNumber = github_issue_number || null;
    }
    if (is_completed !== undefined) {
      updateData.isCompleted = Boolean(is_completed);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const updatedTodo = await prisma.todoList.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      todo: {
        id: updatedTodo.id,
        task: updatedTodo.task,
        user_id: updatedTodo.userId,
        github_issue_number: updatedTodo.githubIssueNumber,
        is_completed: updatedTodo.isCompleted,
        created_at: updatedTodo.createdAt.toISOString(),
        updated_at: updatedTodo.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid todo ID' },
        { status: 400 }
      );
    }

    // Check if todo exists
    const existingTodo = await prisma.todoList.findUnique({
      where: { id },
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    await prisma.todoList.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Todo deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
