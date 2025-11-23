/**
 * Message Persistence Service
 * Handles storing and retrieving messages from the database
 */

import { getDatabase } from './client.js';
import type { MessageRecord } from './schema.js';
import { randomUUID } from 'crypto';
import { analyzeMessage } from '../lib/messageAnalysis.js';

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
  const db = getDatabase();
  const id = randomUUID();
  const timestamp = Date.now();

  // Get previous messages from this user for context
  let previousMessages: Array<{ content: string; sentiment?: string }> = [];
  try {
    const recentMessages = await queryMessages({
      userId: params.userId,
      senderType: 'human',
      limit: 5,
    });

    previousMessages = recentMessages.map((msg) => ({
      content: msg.message_content,
      sentiment: msg.sentiment_analysis
        ? JSON.parse(msg.sentiment_analysis).sentiment
        : undefined,
    }));
  } catch (error) {
    console.warn('Could not fetch previous messages for context:', error);
  }

  // Generate AI summary and sentiment analysis
  let aiSummary = '';
  let sentimentAnalysisJson = '';

  try {
    const analysis = await analyzeMessage(params.messageContent, params.username, {
      previousMessages,
    });

    aiSummary = analysis.summary;
    sentimentAnalysisJson = JSON.stringify(analysis.sentimentAnalysis);

    console.log(`📊 Message analysis for ${params.username}:`, {
      summary: aiSummary,
      sentiment: analysis.sentimentAnalysis.sentiment,
      confidence: analysis.sentimentAnalysis.confidence,
    });
  } catch (error) {
    console.error('Failed to generate message analysis:', error);
    // Continue saving the message even if analysis fails
  }

  // Serialize response decision if provided
  let responseDecisionJson = '';
  if (params.responseDecision) {
    responseDecisionJson = JSON.stringify(params.responseDecision);
  }

  await db.execute({
    sql: `INSERT INTO messages (
      id, timestamp, sender_type, user_id, username,
      channel_id, channel_name, guild_id, message_content, session_id,
      ai_summary, sentiment_analysis, response_decision
    ) VALUES (?, ?, 'human', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      timestamp,
      params.userId,
      params.username,
      params.channelId,
      params.channelName,
      params.guildId || null,
      params.messageContent,
      params.sessionId || null,
      aiSummary || null,
      sentimentAnalysisJson || null,
      responseDecisionJson || null,
    ],
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
  const db = getDatabase();
  const id = randomUUID();
  const timestamp = Date.now();

  await db.execute({
    sql: `INSERT INTO messages (
      id, timestamp, sender_type, user_id, username,
      channel_id, channel_name, guild_id, message_content,
      parent_message_id, session_id, metadata
    ) VALUES (?, ?, 'ai', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      timestamp,
      params.userId,
      params.username,
      params.channelId,
      params.channelName,
      params.guildId || null,
      params.messageContent,
      params.parentMessageId || null,
      params.sessionId || null,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ],
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
  const db = getDatabase();
  const id = randomUUID();
  const timestamp = Date.now();

  // Create a summary message content from tool execution
  const messageContent = `Tool: ${params.toolName}`;

  await db.execute({
    sql: `INSERT INTO messages (
      id, timestamp, sender_type, user_id, username,
      channel_id, channel_name, guild_id, message_content,
      tool_name, tool_args, tool_result,
      parent_message_id, session_id
    ) VALUES (?, ?, 'tool', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      timestamp,
      params.userId,
      params.username,
      params.channelId,
      params.channelName,
      params.guildId || null,
      messageContent,
      params.toolName,
      JSON.stringify(params.toolArgs),
      JSON.stringify(params.toolResult),
      params.parentMessageId || null,
      params.sessionId || null,
    ],
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
  const db = getDatabase();
  const conditions: string[] = [];
  const args: any[] = [];

  // Build WHERE clause
  if (params.userId) {
    conditions.push('user_id = ?');
    args.push(params.userId);
  }

  if (params.channelId) {
    conditions.push('channel_id = ?');
    args.push(params.channelId);
  }

  if (params.senderType) {
    conditions.push('sender_type = ?');
    args.push(params.senderType);
  }

  if (params.startTime) {
    conditions.push('timestamp >= ?');
    args.push(params.startTime);
  }

  if (params.endTime) {
    conditions.push('timestamp <= ?');
    args.push(params.endTime);
  }

  // Handle full-text search
  if (params.searchText) {
    const ftsResult = await db.execute({
      sql: `
        SELECT messages.* FROM messages
        INNER JOIN messages_fts ON messages.rowid = messages_fts.rowid
        WHERE messages_fts MATCH ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `,
      args: [params.searchText, params.limit || 100, params.offset || 0],
    });

    return ftsResult.rows as unknown as MessageRecord[];
  }

  // Regular query
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = params.limit || 100;
  const offset = params.offset || 0;

  args.push(limit, offset);

  const result = await db.execute({
    sql: `
      SELECT * FROM messages
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `,
    args,
  });

  return result.rows as unknown as MessageRecord[];
}

/**
 * Get message by ID
 */
export async function getMessageById(id: string): Promise<MessageRecord | null> {
  const db = getDatabase();

  const result = await db.execute({
    sql: 'SELECT * FROM messages WHERE id = ?',
    args: [id],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as unknown as MessageRecord;
}

/**
 * Get total message count with optional filters
 */
export async function getMessageCount(params: {
  userId?: string;
  channelId?: string;
  senderType?: 'human' | 'ai' | 'tool';
}): Promise<number> {
  const db = getDatabase();
  const conditions: string[] = [];
  const args: any[] = [];

  if (params.userId) {
    conditions.push('user_id = ?');
    args.push(params.userId);
  }

  if (params.channelId) {
    conditions.push('channel_id = ?');
    args.push(params.channelId);
  }

  if (params.senderType) {
    conditions.push('sender_type = ?');
    args.push(params.senderType);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM messages ${whereClause}`,
    args,
  });

  return (result.rows[0] as any).count;
}
