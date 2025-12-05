import { Client, TextChannel, DMChannel, User } from 'discord.js';
import {
  getPendingNotifications,
  markNotificationSent,
  markNotificationFailed,
  type NotificationRecord,
} from '@repo/database/services/notificationService';

/**
 * Format notification message for Discord
 */
function formatNotificationMessage(notification: NotificationRecord): string {
  const { payload, sourceType, sourceUrl } = notification;
  const title = payload?.title || 'Feature';
  const repository = payload?.repository || 'Repository';

  const emoji = sourceType === 'pr' ? '🔀' : '✅';
  const typeLabel = sourceType === 'pr' ? 'Pull Request' : 'Issue';

  let message = `${emoji} **Feature Complete!**\n\n`;
  message += `The feature you requested has been completed:\n`;
  message += `**${title}**\n\n`;
  message += `📦 Repository: ${repository}\n`;
  message += `🔗 ${typeLabel}: ${sourceUrl}\n\n`;
  message += `Thank you for your contribution to the project!`;

  return message;
}

/**
 * Send DM to a Discord user
 */
async function sendDiscordDM(
  client: Client,
  userId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch the user
    const user = await client.users.fetch(userId);
    if (!user) {
      return {
        success: false,
        error: `User not found: ${userId}`,
      };
    }

    // Send DM
    await user.send(message);

    return { success: true };
  } catch (error: any) {
    // DMs might be disabled or user might not share a server
    console.error(`Failed to send DM to user ${userId}:`, error);
    return {
      success: false,
      error: error.message || 'Failed to send DM',
    };
  }
}

/**
 * Process a single notification
 */
async function processNotification(
  client: Client,
  notification: NotificationRecord
): Promise<void> {
  const message = formatNotificationMessage(notification);

  const result = await sendDiscordDM(
    client,
    notification.userId,
    message
  );

  if (result.success) {
    await markNotificationSent(notification.id);
    console.log(`✅ Notification sent to user ${notification.userId}`);
  } else {
    await markNotificationFailed(notification.id, result.error || 'Unknown error');
    console.error(
      `❌ Failed to send notification ${notification.id}: ${result.error}`
    );
  }
}

/**
 * Process all pending notifications
 * This should be called periodically (e.g., every 30 seconds)
 */
export async function processPendingNotifications(
  client: Client,
  options?: { batchSize?: number }
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const { batchSize = 50 } = options || {};

  try {
    // Fetch pending notifications
    const notifications = await getPendingNotifications(batchSize);

    if (notifications.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    console.log(`📬 Processing ${notifications.length} pending notifications...`);

    // Process each notification
    const results = await Promise.allSettled(
      notifications.map((notification) =>
        processNotification(client, notification)
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(
      `📊 Notification processing complete: ${succeeded} succeeded, ${failed} failed`
    );

    return {
      processed: notifications.length,
      succeeded,
      failed,
    };
  } catch (error) {
    console.error('Error processing pending notifications:', error);
    throw error;
  }
}

/**
 * Start notification processing worker
 * This will check for pending notifications every 30 seconds
 */
export function startNotificationWorker(client: Client): void {
  const INTERVAL_MS = 30000; // 30 seconds

  console.log('🚀 Starting notification worker...');

  // Process immediately on startup
  processPendingNotifications(client).catch((error) => {
    console.error('Error in notification worker:', error);
  });

  // Then process on interval
  setInterval(() => {
    processPendingNotifications(client).catch((error) => {
      console.error('Error in notification worker:', error);
    });
  }, INTERVAL_MS);

  console.log(`✅ Notification worker started (interval: ${INTERVAL_MS}ms)`);
}
