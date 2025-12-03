import Pusher from 'pusher';

let pusherInstance: Pusher | null = null;

/**
 * Get or create Pusher instance for server-side broadcasting
 */
export function getPusher(): Pusher | null {
  // Return cached instance if available
  if (pusherInstance) {
    return pusherInstance;
  }

  // Check if Pusher is configured
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2';

  if (!appId || !key || !secret) {
    console.warn('Pusher not configured: Missing required environment variables');
    return null;
  }

  // Create and cache Pusher instance
  pusherInstance = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return pusherInstance;
}

/**
 * Check if Pusher is enabled
 */
export function isPusherEnabled(): boolean {
  return Boolean(
    process.env.PUSHER_APP_ID &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.PUSHER_SECRET
  );
}
