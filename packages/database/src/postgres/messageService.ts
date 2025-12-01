/**
 * PostgreSQL Message Persistence Service
 * Port of libsql/messageService.ts for PostgreSQL
 */

import { getPostgresPool } from './client.js';
import type { MessageRecord } from '../libsql/schema.js';
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
  const pool = await getPostgresPool();
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

  // Prepare response decision JSONB
  const responseDecision = params.responseDecision || null;

  await pool.query(
    `INSERT INTO messages (
      id, timestamp, sender_type, user_id, username,
      channel_id, channel_name, guild_id, message_content, session_id,
      ai_summary, sentiment_analysis, response_decision,
      interaction_type, user_intent, bot_perception, conversation_quality
    ) VALUES ($1, $2, 'human', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
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
      sentimentAnalysis,
      responseDecision,
      interactionType || null,
      userIntent || null,
      botPerception || null,
      conversationQuality || null,
    ]
  );

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
  const pool = await getPostgresPool();
  const id = randomUUID();
  const timestamp = Date.now();

  await pool.query(
    `INSERT INTO messages (
      id, timestamp, sender_type, user_id, username,
      channel_id, channel_name, guild_id, message_content,
      parent_message_id, session_id, metadata
    ) VALUES ($1, $2, 'ai', $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
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
      params.metadata || null,
    ]
  );

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
  const pool = await getPostgresPool();
  const id = randomUUID();
  const timestamp = Date.now();

  // Create a summary message content from tool execution
  const messageContent = `Tool: ${params.toolName}`;

  await pool.query(
    `INSERT INTO messages (
      id, timestamp, sender_type, user_id, username,
      channel_id, channel_name, guild_id, message_content,
      tool_name, tool_args, tool_result,
      parent_message_id, session_id
    ) VALUES ($1, $2, 'tool', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
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
    ]
  );

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
  const pool = await getPostgresPool();
  const conditions: string[] = [];
  const args: any[] = [];
  let paramIndex = 1;

  // Build WHERE clause
  if (params.userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    args.push(params.userId);
  }

  if (params.channelId) {
    conditions.push(`channel_id = $${paramIndex++}`);
    args.push(params.channelId);
  }

  if (params.senderType) {
    conditions.push(`sender_type = $${paramIndex++}`);
    args.push(params.senderType);
  }

  if (params.startTime) {
    conditions.push(`timestamp >= $${paramIndex++}`);
    args.push(params.startTime);
  }

  if (params.endTime) {
    conditions.push(`timestamp <= $${paramIndex++}`);
    args.push(params.endTime);
  }

  const limit = params.limit || 100;
  const offset = params.offset || 0;

  // Handle full-text search (PostgreSQL GIN index)
  if (params.searchText) {
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

  // Regular query
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  args.push(limit, offset);

  const result = await pool.query(
    `SELECT * FROM messages
     ${whereClause}
     ORDER BY timestamp DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    args
  );

  return result.rows as MessageRecord[];
}

/**
 * Get message by ID
 */
export async function getMessageById(id: string): Promise<MessageRecord | null> {
  const pool = await getPostgresPool();

  const result = await pool.query('SELECT * FROM messages WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as MessageRecord;
}

/**
 * Get total message count with optional filters
 */
export async function getMessageCount(params: {
  userId?: string;
  channelId?: string;
  senderType?: 'human' | 'ai' | 'tool';
}): Promise<number> {
  const pool = await getPostgresPool();
  const conditions: string[] = [];
  const args: any[] = [];
  let paramIndex = 1;

  if (params.userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    args.push(params.userId);
  }

  if (params.channelId) {
    conditions.push(`channel_id = $${paramIndex++}`);
    args.push(params.channelId);
  }

  if (params.senderType) {
    conditions.push(`sender_type = $${paramIndex++}`);
    args.push(params.senderType);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(`SELECT COUNT(*) as count FROM messages ${whereClause}`, args);

  return parseInt(result.rows[0].count, 10);
}
