/**
 * PostgreSQL Message Persistence Service
 * Refactored to use Prisma ORM for type-safe database operations
 */

import { prisma } from './prismaClient.js';
import type { MessageRecord } from './schema.js';
import { randomUUID } from 'crypto';
import { analyzeMessage } from '@repo/shared';

/**
 * Save a human message to the database
 * Automatically generates AI summary and sentiment analysis
 */
export async function saveHumanMessage(params: {
  userId: string;
  username: string;
  channelId: string;
  channelName: string;
  guildId?: string;
  messageContent: string;
  messageId: string;
  sessionId?: string;
  responseDecision?: {
    shouldRespond: boolean;
    confidence: number;
    reason: string;
  };
}): Promise<string> {
  const id = randomUUID();
  const timestamp = BigInt(Date.now());

  // Get previous messages from this user for context
  let previousMessages: Array<{ content: string; sentiment?: string }> = [];
  try {
    const recentMessages = await queryMessages({
      userId: params.userId,
      senderType: 'human',
      limit: 5,
    });

    previousMessages = recentMessages.map((msg) => {
      let sentiment: string | undefined;
      if (msg.sentiment_analysis) {
        if (typeof msg.sentiment_analysis === 'string') {
          try {
            sentiment = JSON.parse(msg.sentiment_analysis).sentiment;
          } catch {
            sentiment = undefined;
          }
        } else if (typeof msg.sentiment_analysis === 'object' && msg.sentiment_analysis !== null) {
          sentiment = (msg.sentiment_analysis as any).sentiment;
        }
      }
      return {
        content: msg.message_content,
        sentiment,
      };
    });
  } catch (error) {
    console.warn('Could not fetch previous messages for context:', error);
  }

  // Generate AI summary, sentiment analysis, and interaction metrics
  let aiSummary = '';
  let sentimentAnalysis: any = null;
  let interactionType = '';
  let userIntent = '';
  let botPerception = '';
  let conversationQuality = '';

  try {
    const analysis = await analyzeMessage(params.messageContent, params.username, {
      previousMessages,
    });

    aiSummary = analysis.summary;
    sentimentAnalysis = analysis.sentimentAnalysis;
    interactionType = analysis.interactionMetrics.interactionType;
    userIntent = analysis.interactionMetrics.userIntent;
    botPerception = analysis.interactionMetrics.botPerception;
    conversationQuality = analysis.interactionMetrics.conversationQuality;

    console.log(`📊 Message analysis for ${params.username}:`, {
      summary: aiSummary,
      sentiment: analysis.sentimentAnalysis.sentiment,
      confidence: analysis.sentimentAnalysis.confidence,
      interactionType,
      userIntent,
      botPerception,
      conversationQuality,
    });
  } catch (error) {
    console.error('Failed to generate message analysis:', error);
    // Continue saving the message even if analysis fails
  }

  await prisma.message.create({
    data: {
      id,
      timestamp,
      senderType: 'human',
      userId: params.userId,
      username: params.username,
      channelId: params.channelId,
      channelName: params.channelName,
      guildId: params.guildId || null,
      messageContent: params.messageContent,
      sessionId: params.sessionId || null,
      aiSummary: aiSummary || null,
      sentimentAnalysis: sentimentAnalysis || undefined,
      responseDecision: params.responseDecision || undefined,
      interactionType: interactionType || null,
      userIntent: userIntent || null,
      botPerception: botPerception || null,
      conversationQuality: conversationQuality || null,
    },
  });

  return id;
}

/**
 * Save an AI response message to the database
 */
export async function saveAIMessage(params: {
  userId: string;
  username: string;
  channelId: string;
  channelName: string;
  guildId?: string;
  messageContent: string;
  parentMessageId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const id = randomUUID();
  const timestamp = BigInt(Date.now());

  await prisma.message.create({
    data: {
      id,
      timestamp,
      senderType: 'ai',
      userId: params.userId,
      username: params.username,
      channelId: params.channelId,
      channelName: params.channelName,
      guildId: params.guildId || null,
      messageContent: params.messageContent,
      parentMessageId: params.parentMessageId || null,
      sessionId: params.sessionId || null,
      metadata: params.metadata || undefined,
    },
  });

  return id;
}

/**
 * Save a tool execution to the database
 */
export async function saveToolExecution(params: {
  userId: string;
  username: string;
  channelId: string;
  channelName: string;
  guildId?: string;
  toolName: string;
  toolArgs: Record<string, any>;
  toolResult: any;
  parentMessageId?: string;
  sessionId?: string;
}): Promise<string> {
  const id = randomUUID();
  const timestamp = BigInt(Date.now());

  // Create a summary message content from tool execution
  const messageContent = `Tool: ${params.toolName}`;

  await prisma.message.create({
    data: {
      id,
      timestamp,
      senderType: 'tool',
      userId: params.userId,
      username: params.username,
      channelId: params.channelId,
      channelName: params.channelName,
      guildId: params.guildId || null,
      messageContent,
      toolName: params.toolName,
      toolArgs: JSON.stringify(params.toolArgs),
      toolResult: JSON.stringify(params.toolResult),
      parentMessageId: params.parentMessageId || null,
      sessionId: params.sessionId || null,
    },
  });

  return id;
}

/**
 * Query messages with optional filters
 */
export async function queryMessages(params: {
  userId?: string;
  channelId?: string;
  senderType?: 'human' | 'ai' | 'tool';
  limit?: number;
  offset?: number;
  startTime?: number;
  endTime?: number;
  searchText?: string;
}): Promise<MessageRecord[]> {
  const limit = params.limit || 100;
  const offset = params.offset || 0;

  // Build where clause
  const where: any = {};

  if (params.userId) {
    where.userId = params.userId;
  }

  if (params.channelId) {
    where.channelId = params.channelId;
  }

  if (params.senderType) {
    where.senderType = params.senderType;
  }

  if (params.startTime) {
    where.timestamp = { ...where.timestamp, gte: BigInt(params.startTime) };
  }

  if (params.endTime) {
    where.timestamp = { ...where.timestamp, lte: BigInt(params.endTime) };
  }

  // For full-text search, we need to use raw SQL since Prisma doesn't support PostgreSQL full-text search directly
  if (params.searchText) {
    const { getPostgresPool } = await import('./client.js');
    const pool = await getPostgresPool();

    const result = await pool.query(
      `SELECT * FROM messages
       WHERE to_tsvector('english',
         COALESCE(message_content, '') || ' ' ||
         COALESCE(tool_name, '') || ' ' ||
         COALESCE(username, '')
       ) @@ plainto_tsquery('english', $1)
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [params.searchText, limit, offset]
    );

    return result.rows as MessageRecord[];
  }

  // Regular Prisma query
  const messages = await prisma.message.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
    skip: offset,
  });

  return messages as any as MessageRecord[];
}

/**
 * Get message by ID
 */
export async function getMessageById(id: string): Promise<MessageRecord | null> {
  const message = await prisma.message.findUnique({
    where: { id },
  });

  if (!message) {
    return null;
  }

  return message as any as MessageRecord;
}

/**
 * Get total message count with optional filters
 */
export async function getMessageCount(params: {
  userId?: string;
  channelId?: string;
  senderType?: 'human' | 'ai' | 'tool';
}): Promise<number> {
  const where: any = {};

  if (params.userId) {
    where.userId = params.userId;
  }

  if (params.channelId) {
    where.channelId = params.channelId;
  }

  if (params.senderType) {
    where.senderType = params.senderType;
  }

  const count = await prisma.message.count({ where });

  return count;
}
