import { prisma } from '../index.js';
import { randomUUID } from 'crypto';

export interface CreateNotificationParams {
  userId: string;
  eventType: string;
  sourceType: 'issue' | 'pr' | 'deploy';
  sourceId?: number;
  sourceUrl?: string;
  payload?: Record<string, any>;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  eventType: string;
  sourceType: string;
  sourceId: number | null;
  sourceUrl: string | null;
  payload: any;
  status: string;
  error: string | null;
  createdAt: Date;
  sentAt: Date | null;
}

/**
 * Create a new notification for a user
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<NotificationRecord> {
  const notification = await prisma.notification.create({
    data: {
      id: randomUUID(),
      userId: params.userId,
      eventType: params.eventType,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      sourceUrl: params.sourceUrl,
      payload: params.payload,
      status: 'pending',
    },
  });

  return notification;
}

/**
 * Get notifications for a specific user
 */
export async function getUserNotifications(
  userId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<NotificationRecord[]> {
  const { status, limit = 50, offset = 0 } = options || {};

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(status && { status }),
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return notifications;
}

/**
 * Get pending notifications (for processing)
 */
export async function getPendingNotifications(
  limit: number = 100
): Promise<NotificationRecord[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      status: 'pending',
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: limit,
  });

  return notifications;
}

/**
 * Mark notification as sent
 */
export async function markNotificationSent(
  notificationId: string
): Promise<NotificationRecord> {
  const notification = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: 'sent',
      sentAt: new Date(),
    },
  });

  return notification;
}

/**
 * Mark notification as failed
 */
export async function markNotificationFailed(
  notificationId: string,
  error: string
): Promise<NotificationRecord> {
  const notification = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: 'failed',
      error,
    },
  });

  return notification;
}

/**
 * Check if user has notifications enabled
 */
export async function isUserNotificationEnabled(
  userId: string
): Promise<boolean> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { notifyOnFeatureComplete: true },
  });

  return profile?.notifyOnFeatureComplete ?? true;
}

/**
 * Update user notification preference
 */
export async function updateUserNotificationPreference(
  userId: string,
  enabled: boolean
): Promise<void> {
  await prisma.userProfile.update({
    where: { userId },
    data: {
      notifyOnFeatureComplete: enabled,
    },
  });
}

/**
 * Get notification statistics for a user
 */
export async function getUserNotificationStats(userId: string): Promise<{
  total: number;
  pending: number;
  sent: number;
  failed: number;
}> {
  const [total, pending, sent, failed] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, status: 'pending' } }),
    prisma.notification.count({ where: { userId, status: 'sent' } }),
    prisma.notification.count({ where: { userId, status: 'failed' } }),
  ]);

  return { total, pending, sent, failed };
}
