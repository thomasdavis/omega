/**
 * Pusher Service for Real-Time Collaboration
 * Handles real-time document updates and presence
 */

import Pusher from 'pusher';

let pusherInstance: Pusher | null = null;

/**
 * Initialize Pusher instance
 */
export function initializePusher(): Pusher | null {
  // Check if Pusher credentials are configured
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || 'us2';

  if (!appId || !key || !secret) {
    console.warn('⚠️  Pusher credentials not configured. Real-time collaboration features will be disabled.');
    console.warn('   Set PUSHER_APP_ID, PUSHER_KEY, and PUSHER_SECRET in environment variables.');
    return null;
  }

  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
    console.log(`✅ Pusher initialized (cluster: ${cluster})`);
  }

  return pusherInstance;
}

/**
 * Get Pusher instance (initializes if needed)
 */
export function getPusher(): Pusher | null {
  if (!pusherInstance) {
    return initializePusher();
  }
  return pusherInstance;
}

/**
 * Broadcast document update event
 */
export async function broadcastDocumentUpdate(
  documentId: string,
  data: {
    content: string;
    userId: string;
    username?: string;
    timestamp: number;
  }
): Promise<void> {
  const pusher = getPusher();
  if (!pusher) {
    console.warn('Pusher not configured, skipping broadcast');
    return;
  }

  try {
    await pusher.trigger(`document-${documentId}`, 'content-update', data);
  } catch (error) {
    console.error('Error broadcasting document update:', error);
  }
}

/**
 * Broadcast cursor position update
 */
export async function broadcastCursorUpdate(
  documentId: string,
  data: {
    userId: string;
    username?: string;
    position: number;
    timestamp: number;
  }
): Promise<void> {
  const pusher = getPusher();
  if (!pusher) {
    return;
  }

  try {
    await pusher.trigger(`document-${documentId}`, 'cursor-update', data);
  } catch (error) {
    console.error('Error broadcasting cursor update:', error);
  }
}

/**
 * Broadcast user presence (join/leave)
 */
export async function broadcastPresence(
  documentId: string,
  data: {
    userId: string;
    username?: string;
    action: 'join' | 'leave';
    timestamp: number;
  }
): Promise<void> {
  const pusher = getPusher();
  if (!pusher) {
    return;
  }

  try {
    await pusher.trigger(`document-${documentId}`, 'presence', data);
  } catch (error) {
    console.error('Error broadcasting presence:', error);
  }
}

/**
 * Get Pusher configuration for frontend
 */
export function getPusherConfig(): {
  enabled: boolean;
  key?: string;
  cluster?: string;
} {
  const key = process.env.PUSHER_KEY;
  const cluster = process.env.PUSHER_CLUSTER || 'us2';

  console.log('🔍 DEBUG: getPusherConfig called');
  console.log('   PUSHER_KEY:', key ? `${key.substring(0, 5)}...` : 'NOT SET');
  console.log('   PUSHER_CLUSTER:', cluster);
  console.log('   enabled:', !!key);

  return {
    enabled: !!key,
    key,
    cluster,
  };
}
