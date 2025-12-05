'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ProfileSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [notifyOnFeatureComplete, setNotifyOnFeatureComplete] = useState(true);

  // Fetch user profile and settings
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

        // Then get the settings
        const settingsRes = await fetch(`/api/profiles/${userIdValue}/settings`);
        if (!settingsRes.ok) {
          throw new Error('Failed to fetch settings');
        }
        const settingsData = await settingsRes.json();
        setNotifyOnFeatureComplete(settingsData.notify_on_feature_complete);

        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load settings');
        setLoading(false);
      }
    }

    fetchData();
  }, [username]);

  // Handle toggle change
  async function handleToggleChange(enabled: boolean) {
    if (!userId) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/profiles/${userId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notify_on_feature_complete: enabled,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update settings');
      }

      setNotifyOnFeatureComplete(enabled);
      setSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  if (error && !userId) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-400 text-xl font-light">{error}</div>
          <Link
            href="/profiles"
            className="inline-block text-teal-400 hover:text-teal-300 transition-colors"
          >
            ← Back to Profiles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/profiles/${username}`}
              className="text-zinc-500 hover:text-teal-400 transition-colors"
            >
              ← Back to Profile
            </Link>
          </div>
          <h1 className="text-5xl font-light text-white tracking-tight">
            Notification Settings
          </h1>
          <div className="text-zinc-500 text-sm font-mono mt-2">@{username}</div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          {/* Success Message */}
          {success && (
            <div className="px-6 py-4 bg-teal-500/10 border-b border-teal-500/30">
              <div className="text-teal-400 text-sm font-mono">
                ✓ Settings saved successfully
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && userId && (
            <div className="px-6 py-4 bg-red-500/10 border-b border-red-500/30">
              <div className="text-red-400 text-sm font-mono">✗ {error}</div>
            </div>
          )}

          {/* Settings Section */}
          <div className="p-6 space-y-6">
            {/* Feature Completion Notifications */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-light text-white mb-2">
                  Discord Notifications
                </h2>
                <p className="text-zinc-400 text-sm font-light">
                  Manage how you receive notifications about features you've requested.
                </p>
              </div>

              {/* Toggle Setting */}
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-800">
                <div className="flex-1">
                  <div className="text-white font-light mb-1">
                    Feature Completion Notifications
                  </div>
                  <div className="text-sm text-zinc-400 font-light">
                    Receive a Discord DM when features you requested are merged and deployed
                  </div>
                </div>
                <button
                  onClick={() => handleToggleChange(!notifyOnFeatureComplete)}
                  disabled={saving}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                    notifyOnFeatureComplete
                      ? 'bg-teal-500'
                      : 'bg-zinc-700'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      notifyOnFeatureComplete ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Additional Info */}
              <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-800">
                <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                  How it Works
                </div>
                <ul className="space-y-2 text-sm text-zinc-400 font-light">
                  <li className="flex items-start gap-2">
                    <span className="text-teal-400 mt-1">•</span>
                    <span>
                      When a GitHub PR or issue you requested is merged or marked as complete,
                      you'll receive a Discord DM notification
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-400 mt-1">•</span>
                    <span>
                      Notifications include links to the PR/issue and deployment information
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-400 mt-1">•</span>
                    <span>
                      You can disable notifications at any time by toggling this setting off
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* View Notification History */}
        {userId && (
          <div className="mt-6">
            <Link
              href={`/profiles/${username}/notifications`}
              className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors font-light"
            >
              <span>View Notification History</span>
              <span>→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
