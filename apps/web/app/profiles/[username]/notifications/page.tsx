'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Notification {
  id: string;
  userId: string;
  eventType: string;
  sourceType: string;
  sourceId: number | null;
  sourceUrl: string | null;
  payload: any;
  status: string;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
}

export default function NotificationsPage() {
  const params = useParams();
  const username = params.username as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // First get the userId from the username
        const profileRes = await fetch(`/api/profiles/by-username/${username}`);
        if (!profileRes.ok) {
          throw new Error('Profile not found');
        }
        const profileData = await profileRes.json();
        const userIdValue = profileData.profile.userId;
        setUserId(userIdValue);

        // Then get the notifications
        const notificationsRes = await fetch(`/api/notifications/${userIdValue}`);
        if (!notificationsRes.ok) {
          throw new Error('Failed to fetch notifications');
        }
        const notificationsData = await notificationsRes.json();
        setNotifications(notificationsData.notifications);

        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load notifications');
        setLoading(false);
      }
    }

    fetchData();
  }, [username]);

  if (loading) {
    return <LoadingSpinner message="Loading notifications..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-400 text-xl font-light">{error}</div>
          <Link
            href={`/profiles/${username}`}
            className="inline-block text-teal-400 hover:text-teal-300 transition-colors"
          >
            ← Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/profiles/${username}`}
              className="text-zinc-500 hover:text-teal-400 transition-colors"
            >
              ← Back to Profile
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-light text-white tracking-tight">
                Notification History
              </h1>
              <div className="text-zinc-500 text-sm font-mono mt-2">@{username}</div>
            </div>
            <Link
              href={`/profiles/${username}/settings`}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-zinc-500 text-lg font-light mb-4">
              No notifications yet
            </div>
            <div className="text-zinc-600 text-sm">
              You'll see notifications here when features you request are completed
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-colors"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-mono uppercase ${
                          notification.status === 'sent'
                            ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                            : notification.status === 'failed'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}
                      >
                        {notification.status}
                      </span>

                      {/* Source Type Badge */}
                      <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-mono text-zinc-400">
                        {notification.sourceType === 'pr' ? 'Pull Request' : 'Issue'}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-zinc-500 font-mono">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    {/* Title */}
                    {notification.payload?.title && (
                      <div className="text-white font-light">
                        {notification.payload.title}
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                      {notification.payload?.repository && (
                        <div>
                          <span className="text-zinc-500">Repository:</span>{' '}
                          {notification.payload.repository}
                        </div>
                      )}
                      {notification.payload?.action && (
                        <div>
                          <span className="text-zinc-500">Action:</span>{' '}
                          {notification.payload.action}
                        </div>
                      )}
                    </div>

                    {/* Link */}
                    {notification.sourceUrl && (
                      <div>
                        <a
                          href={notification.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors text-sm"
                        >
                          <span>View on GitHub</span>
                          <span>→</span>
                        </a>
                      </div>
                    )}

                    {/* Error message if failed */}
                    {notification.status === 'failed' && notification.error && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                        <div className="font-mono text-xs uppercase mb-1">Error</div>
                        {notification.error}
                      </div>
                    )}

                    {/* Sent timestamp */}
                    {notification.sentAt && (
                      <div className="text-xs text-zinc-600 font-mono">
                        Sent: {new Date(notification.sentAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
