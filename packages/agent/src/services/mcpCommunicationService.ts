/**
 * MCP (Multi-Component Protocol) Communication Service
 * Message bus for inter-component communication
 * Part of the Autonomous Enhancement Framework (Issue #822)
 */

import { getPostgresPool } from '@repo/database';

export interface MCPMessage {
  id: number;
  sender_type: string;
  sender_id: string;
  receiver_type: string | null;
  receiver_id: string | null;
  message_type: string;
  payload: Record<string, any>;
  status: string;
  priority: number;
  processed_at: Date | null;
  sent_at: Date;
  expires_at: Date | null;
}

export interface SendMessageInput {
  sender_type: string;
  sender_id: string;
  receiver_type?: string;
  receiver_id?: string;
  message_type: string;
  payload: Record<string, any>;
  priority?: number;
  expires_in_seconds?: number;
}

export type MessageHandler = (message: MCPMessage) => Promise<void>;

const messageHandlers = new Map<string, MessageHandler[]>();
const broadcastHandlers: MessageHandler[] = [];

/**
 * Send a message through the MCP bus
 */
export async function sendMessage(input: SendMessageInput): Promise<MCPMessage> {
  const pool = await getPostgresPool();

  const expiresAt = input.expires_in_seconds
    ? new Date(Date.now() + input.expires_in_seconds * 1000)
    : null;

  const result = await pool.query(
    `INSERT INTO mcp_messages
     (sender_type, sender_id, receiver_type, receiver_id, message_type, payload, priority, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.sender_type,
      input.sender_id,
      input.receiver_type || null,
      input.receiver_id || null,
      input.message_type,
      JSON.stringify(input.payload),
      input.priority || 5,
      expiresAt,
    ]
  );

  const message = result.rows[0];

  // Trigger in-memory handlers asynchronously
  setImmediate(() => {
    processMessageHandlers(message).catch(error => {
      console.error('Error processing message handlers:', error);
    });
  });

  return message;
}

/**
 * Broadcast a message to all listeners
 */
export async function broadcastMessage(input: Omit<SendMessageInput, 'receiver_type' | 'receiver_id'>): Promise<MCPMessage> {
  return sendMessage({
    ...input,
    receiver_type: 'broadcast',
    receiver_id: '*',
  });
}

/**
 * Get pending messages for a receiver
 */
export async function getPendingMessages(options: {
  receiver_type: string;
  receiver_id: string;
  message_type?: string;
  limit?: number;
}): Promise<MCPMessage[]> {
  const pool = await getPostgresPool();

  let query = `
    SELECT * FROM mcp_messages
    WHERE (receiver_type = $1 AND receiver_id = $2)
       OR (receiver_type = 'broadcast')
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW())
  `;

  const params: any[] = [options.receiver_type, options.receiver_id];

  if (options.message_type) {
    query += ` AND message_type = $${params.length + 1}`;
    params.push(options.message_type);
  }

  query += ' ORDER BY priority DESC, sent_at ASC';

  if (options.limit) {
    query += ` LIMIT $${params.length + 1}`;
    params.push(options.limit);
  }

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Mark message as processed
 */
export async function markMessageProcessed(
  messageId: number,
  status: 'processed' | 'failed' = 'processed'
): Promise<void> {
  const pool = await getPostgresPool();

  await pool.query(
    `UPDATE mcp_messages
     SET status = $1, processed_at = NOW()
     WHERE id = $2`,
    [status, messageId]
  );
}

/**
 * Get message by ID
 */
export async function getMessage(id: number): Promise<MCPMessage | null> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `SELECT * FROM mcp_messages WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get message history
 */
export async function getMessageHistory(options: {
  sender_type?: string;
  sender_id?: string;
  receiver_type?: string;
  receiver_id?: string;
  message_type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<MCPMessage[]> {
  const pool = await getPostgresPool();

  let query = 'SELECT * FROM mcp_messages';
  const params: any[] = [];
  const conditions: string[] = [];

  if (options.sender_type) {
    conditions.push(`sender_type = $${params.length + 1}`);
    params.push(options.sender_type);
  }

  if (options.sender_id) {
    conditions.push(`sender_id = $${params.length + 1}`);
    params.push(options.sender_id);
  }

  if (options.receiver_type) {
    conditions.push(`receiver_type = $${params.length + 1}`);
    params.push(options.receiver_type);
  }

  if (options.receiver_id) {
    conditions.push(`receiver_id = $${params.length + 1}`);
    params.push(options.receiver_id);
  }

  if (options.message_type) {
    conditions.push(`message_type = $${params.length + 1}`);
    params.push(options.message_type);
  }

  if (options.status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(options.status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY sent_at DESC';

  if (options.limit) {
    query += ` LIMIT $${params.length + 1}`;
    params.push(options.limit);
  }

  if (options.offset) {
    query += ` OFFSET $${params.length + 1}`;
    params.push(options.offset);
  }

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Clean up expired messages
 */
export async function cleanupExpiredMessages(): Promise<number> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `DELETE FROM mcp_messages
     WHERE expires_at IS NOT NULL AND expires_at < NOW()
     AND status != 'processed'`
  );

  const deletedCount = result.rowCount || 0;
  if (deletedCount > 0) {
    console.log(`🧹 Cleaned up ${deletedCount} expired MCP messages`);
  }

  return deletedCount;
}

/**
 * Register a message handler for specific message types
 * Handlers are called when messages are sent (in-memory only)
 */
export function registerMessageHandler(
  messageType: string,
  handler: MessageHandler
): void {
  if (!messageHandlers.has(messageType)) {
    messageHandlers.set(messageType, []);
  }
  messageHandlers.get(messageType)!.push(handler);
}

/**
 * Register a broadcast handler (receives all messages)
 */
export function registerBroadcastHandler(handler: MessageHandler): void {
  broadcastHandlers.push(handler);
}

/**
 * Unregister a message handler
 */
export function unregisterMessageHandler(
  messageType: string,
  handler: MessageHandler
): void {
  const handlers = messageHandlers.get(messageType);
  if (handlers) {
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
}

/**
 * Process message handlers (internal)
 */
async function processMessageHandlers(message: MCPMessage): Promise<void> {
  // Call specific handlers
  const handlers = messageHandlers.get(message.message_type) || [];
  for (const handler of handlers) {
    try {
      await handler(message);
    } catch (error) {
      console.error(`Error in message handler for ${message.message_type}:`, error);
    }
  }

  // Call broadcast handlers
  for (const handler of broadcastHandlers) {
    try {
      await handler(message);
    } catch (error) {
      console.error('Error in broadcast handler:', error);
    }
  }
}

/**
 * Poll for messages and process them
 * This can be run on a schedule to process queued messages
 */
export async function pollAndProcessMessages(options: {
  receiver_type: string;
  receiver_id: string;
  handler: MessageHandler;
  limit?: number;
}): Promise<number> {
  const messages = await getPendingMessages({
    receiver_type: options.receiver_type,
    receiver_id: options.receiver_id,
    limit: options.limit || 10,
  });

  for (const message of messages) {
    try {
      await options.handler(message);
      await markMessageProcessed(message.id, 'processed');
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error);
      await markMessageProcessed(message.id, 'failed');
    }
  }

  return messages.length;
}

/**
 * Get message bus statistics
 */
export async function getMessageBusStats(): Promise<{
  total_messages: number;
  pending_messages: number;
  processed_messages: number;
  failed_messages: number;
  messages_by_type: Record<string, number>;
}> {
  const pool = await getPostgresPool();

  const statsResult = await pool.query(`
    SELECT
      COUNT(*) as total_messages,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_messages,
      COUNT(*) FILTER (WHERE status = 'processed') as processed_messages,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_messages
    FROM mcp_messages
  `);

  const typeResult = await pool.query(`
    SELECT message_type, COUNT(*) as count
    FROM mcp_messages
    GROUP BY message_type
    ORDER BY count DESC
  `);

  const messagesByType: Record<string, number> = {};
  for (const row of typeResult.rows) {
    messagesByType[row.message_type] = parseInt(row.count);
  }

  return {
    total_messages: parseInt(statsResult.rows[0].total_messages),
    pending_messages: parseInt(statsResult.rows[0].pending_messages),
    processed_messages: parseInt(statsResult.rows[0].processed_messages),
    failed_messages: parseInt(statsResult.rows[0].failed_messages),
    messages_by_type: messagesByType,
  };
}
