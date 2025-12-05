/**
 * Status Service - Ephemeral status tracking for live /booping page
 * Tracks Omega's current state and broadcasts updates via Pusher
 */

import { getPusher } from '../lib/pusher.js';

export type StatusPhase =
  | 'idle'
  | 'composing'
  | 'waiting-on-tool'
  | 'tool-running'
  | 'fetching'
  | 'rate-limited'
  | 'error'
  | 'recovering';

export interface StatusUpdate {
  phase: StatusPhase;
  message: string;
  toolName?: string;
  timestamp: number;
}

// Ephemeral in-memory status (no database)
let currentStatus: StatusUpdate = {
  phase: 'idle',
  message: 'Waiting for messages',
  timestamp: Date.now(),
};

let lastHeartbeat = Date.now();

/**
 * Get current status
 */
export function getCurrentStatus(): StatusUpdate {
  return { ...currentStatus };
}

/**
 * Update status and broadcast via Pusher
 */
export async function updateStatus(
  phase: StatusPhase,
  message: string,
  toolName?: string
): Promise<void> {
  const update: StatusUpdate = {
    phase,
    message,
    toolName,
    timestamp: Date.now(),
  };

  currentStatus = update;
  lastHeartbeat = Date.now();

  // Log status change
  console.log(`📊 Status: ${phase}${toolName ? ` (${toolName})` : ''} - ${message}`);

  // Broadcast to Pusher channel
  await broadcastStatus(update);
}

/**
 * Broadcast status update via Pusher
 */
async function broadcastStatus(update: StatusUpdate): Promise<void> {
  const pusher = getPusher();
  if (!pusher) {
    return; // Pusher not configured, skip broadcast
  }

  try {
    await pusher.trigger('omega-status', 'status-update', update);
  } catch (error) {
    console.error('Failed to broadcast status update:', error);
  }
}

/**
 * Send heartbeat to indicate system is alive
 */
export async function sendHeartbeat(): Promise<void> {
  lastHeartbeat = Date.now();

  // If we've been idle for a while, broadcast heartbeat
  if (currentStatus.phase === 'idle') {
    await broadcastStatus({
      ...currentStatus,
      timestamp: lastHeartbeat,
    });
  }
}

/**
 * Get last heartbeat timestamp
 */
export function getLastHeartbeat(): number {
  return lastHeartbeat;
}

/**
 * Initialize heartbeat interval
 */
export function initializeHeartbeat(): void {
  // Send heartbeat every 10 seconds
  setInterval(async () => {
    await sendHeartbeat();
  }, 10000);

  console.log('✅ Status service heartbeat initialized (10s interval)');
}
