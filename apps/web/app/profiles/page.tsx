'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface UserProfile {
  userId: string;
  username: string | null;
  uploadedPhotoUrl: string | null;
  emotionalState: string | null;
  zodiacSign: string | null;
  lastInteractionAt: Date;
  messageCount: number;
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/profiles')
      .then(res => res.json())
      .then(data => {
        setProfiles(data.profiles || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load profiles');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading profiles..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-red-400 text-xl font-light">{error}</div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-baseline gap-4">
            <h1 className="text-5xl font-light text-white tracking-tight">Profiles</h1>
            <div className="text-zinc-500 text-sm font-mono">{profiles.length} subjects</div>
          </div>
          <p className="mt-3 text-zinc-400 font-light max-w-2xl">
            Comprehensive psychological and physical phenotype analysis database
          </p>
        </div>
      </div>

      {/* Profiles Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <Link
              key={profile.userId}
              href={`/profiles/${profile.username}`}
              className="group block bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden"
            >
              {/* Photo Section */}
              <div className="aspect-square bg-zinc-800 relative overflow-hidden">
                {profile.uploadedPhotoUrl ? (
                  <img
                    src={profile.uploadedPhotoUrl}
                    alt={profile.username || 'Profile'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                    <div className="text-6xl text-zinc-700">
                      {profile.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-mono text-white">
                  {profile.userId.slice(0, 8)}
                </div>
              </div>

              {/* Info Section */}
              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-2xl font-light text-white tracking-tight group-hover:text-teal-400 transition-colors">
                    {profile.username || 'Unknown Subject'}
                  </h2>
                  <div className="mt-2 flex items-center gap-3 text-xs font-mono text-zinc-500">
                    {profile.zodiacSign && (
                      <span className="uppercase tracking-wider">{profile.zodiacSign}</span>
                    )}
                    <span>•</span>
                    <span>{profile.messageCount} interactions</span>
                  </div>
                </div>

                {profile.emotionalState && (
                  <div className="pt-4 border-t border-zinc-800">
                    <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                      Current State
                    </div>
                    <div className="text-sm text-zinc-300 font-light">
                      {profile.emotionalState}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-zinc-800">
                  <div className="text-xs font-mono text-zinc-500">
                    Last seen: {new Date(profile.lastInteractionAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-teal-400 text-sm font-mono group-hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                    View Profile
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {profiles.length === 0 && (
          <div className="text-center py-20">
            <div className="text-zinc-600 text-xl font-light">No profiles found</div>
            <div className="mt-2 text-zinc-500 text-sm">
              Profiles are created when users interact with the bot
            </div>
          </div>
        )}
      </div>
    </>
  );
}
