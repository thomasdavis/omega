/**
 * PostgreSQL Conversation Tracking Service
 * Provides conversation tracking functionality for the Omega bot
 */

import { prisma } from './prismaClient.js';

export interface ConversationParams {
  userId: string;
  username?: string;
  channelId?: string;
}

export interface MessageParams {
  conversationId: number;
  senderType: 'user' | 'bot';
  userId?: string;
  username?: string;
  content: string;
}

/**
 * Create a new conversation
 */
export async function createConversation(params: ConversationParams): Promise<number> {
  const conversation = await prisma.conversation.create({
    data: {
      userId: params.userId,
      username: params.username ?? null,
      channelId: params.channelId ?? null,
    },
  });

  console.log(`📝 Created new conversation ${conversation.id} for user ${params.userId}`);
  return conversation.id;
}

/**
 * Get or create a conversation for a user in a specific channel
 * Returns the most recent conversation or creates a new one
 */
export async function getOrCreateConversation(params: ConversationParams): Promise<number> {
  // Try to find a recent conversation (within last 24 hours)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const existingConversation = await prisma.conversation.findFirst({
    where: {
      userId: params.userId,
      channelId: params.channelId ?? null,
      startedAt: {
        gte: twentyFourHoursAgo,
      },
    },
    orderBy: {
      startedAt: 'desc',
    },
  });

  if (existingConversation) {
    console.log(`♻️ Using existing conversation ${existingConversation.id} for user ${params.userId}`);
    return existingConversation.id;
  }

  return createConversation(params);
}

/**
 * Add a message to a conversation
 */
export async function addMessageToConversation(params: MessageParams): Promise<number> {
  const message = await prisma.conversationMessage.create({
    data: {
      conversationId: params.conversationId,
      senderType: params.senderType,
      userId: params.userId ?? null,
      username: params.username ?? null,
      content: params.content,
    },
  });

  return message.id;
}

/**
 * Get all messages in a conversation
 */
export async function getConversationMessages(conversationId: number) {
  return prisma.conversationMessage.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

/**
 * Get conversation history for a user
 */
export async function getUserConversations(userId: string, limit = 10) {
  return prisma.conversation.findMany({
    where: {
      userId,
    },
    include: {
      conversationMessages: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
    orderBy: {
      startedAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Get conversation statistics for a user
 */
export async function getConversationStats(userId: string) {
  const totalConversations = await prisma.conversation.count({
    where: { userId },
  });

  const totalMessages = await prisma.conversationMessage.count({
    where: {
      conversation: {
        userId,
      },
    },
  });

  const userMessages = await prisma.conversationMessage.count({
    where: {
      conversation: {
        userId,
      },
      senderType: 'user',
    },
  });

  const botMessages = await prisma.conversationMessage.count({
    where: {
      conversation: {
        userId,
      },
      senderType: 'bot',
    },
  });

  return {
    totalConversations,
    totalMessages,
    userMessages,
    botMessages,
  };
}

/**
 * Get recent conversation activity across all users
 */
export async function getRecentConversations(limit = 20) {
  return prisma.conversation.findMany({
    include: {
      conversationMessages: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1, // Just get the last message
      },
    },
    orderBy: {
      startedAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Delete old conversations (cleanup utility)
 */
export async function deleteOldConversations(daysOld = 90): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  const result = await prisma.conversation.deleteMany({
    where: {
      startedAt: {
        lt: cutoffDate,
      },
    },
  });

  console.log(`🗑️ Deleted ${result.count} conversations older than ${daysOld} days`);
  return result.count;
}
