import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const senderType = searchParams.get('sender_type');
    const userId = searchParams.get('user_id');
    const channelId = searchParams.get('channel_id');
    const search = searchParams.get('search');

    // Build Prisma where clause
    const where: any = {};

    if (senderType) {
      where.senderType = senderType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (channelId) {
      where.channelId = channelId;
    }

    if (search) {
      where.OR = [
        { messageContent: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.message.count({ where }),
    ]);

    // Convert Prisma messages to match the expected format
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      timestamp: Number(msg.timestamp),
      sender_type: msg.senderType,
      user_id: msg.userId,
      username: msg.username,
      channel_id: msg.channelId,
      channel_name: msg.channelName,
      message_content: msg.messageContent,
      tool_name: msg.toolName,
    }));

    return NextResponse.json({
      messages: formattedMessages,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
