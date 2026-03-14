'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface UserProfile {
  userId: string;
  username: string | null;
  uploadedPhotoUrl: string | null;
  overall_sentiment: string | null;
  dominant_archetype: string | null;
  omega_rating: number | null;
  lastInteractionAt: number;
  messageCount: number;
}

type SortOption = 'rating-desc' | 'messages-desc' | 'username-asc';

function ratingColor(rating: number): string {
  if (rating <= 20) return '#dc2626';
  if (rating <= 40) return '#ea580c';
  if (rating <= 60) return '#eab308';
  if (rating <= 80) return '#22c55e';
  return '#3b82f6';
}

function ratingLabel(rating: number): string {
  if (rating <= 20) return 'Critical';
  if (rating <= 40) return 'Low';
  if (rating <= 60) return 'Moderate';
  if (rating <= 80) return 'Good';
  return 'Excellent';
}

function sentimentColor(sentiment: string): string {
  const s = sentiment.toLowerCase();
  if (
    s.includes('positive') ||
    s.includes('friendly') ||
    s.includes('warm')
  )
    return 'text-emerald-400';
  if (
    s.includes('negative') ||
    s.includes('hostile') ||
    s.includes('cold')
  )
    return 'text-red-400';
  if (s.includes('neutral')) return 'text-zinc-400';
  return 'text-amber-400';
}

function archetypeStyle(archetype: string): string {
  const s = archetype.toLowerCase();
  if (s.includes('sage') || s.includes('scholar'))
    return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  if (s.includes('rebel') || s.includes('outlaw'))
    return 'bg-red-500/20 text-red-300 border-red-500/30';
  if (s.includes('hero') || s.includes('warrior'))
    return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
  if (s.includes('creator') || s.includes('artist'))
    return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
  if (s.includes('care') || s.includes('nurtur'))
    return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
  if (s.includes('explorer') || s.includes('seeker'))
    return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
  if (s.includes('jester') || s.includes('trick'))
    return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
  if (s.includes('ruler') || s.includes('leader'))
    return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
}

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('rating-desc');
  const pageSize = 24;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/profiles?limit=${pageSize}&offset=${page * pageSize}`)
      .then((res) => res.json())
      .then((data) => {
        setProfiles(data.profiles || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load profiles');
        setLoading(false);
      });
  }, [page]);

  const sortedProfiles = useMemo(() => {
    const sorted = [...profiles];
    switch (sortBy) {
      case 'rating-desc':
        sorted.sort(
          (a, b) => (b.omega_rating ?? -1) - (a.omega_rating ?? -1),
        );
        break;
      case 'messages-desc':
        sorted.sort((a, b) => b.messageCount - a.messageCount);
        break;
      case 'username-asc':
        sorted.sort((a, b) =>
          (a.username || '').localeCompare(b.username || ''),
        );
        break;
    }
    return sorted;
  }, [profiles, sortBy]);

  const toggleCompareSelection = (username: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(username)) return prev.filter((u) => u !== username);
      if (prev.length >= 3) return prev;
      return [...prev, username];
    });
  };

  const handleCompareSelected = () => {
    if (selectedForCompare.length >= 2) {
      router.push(`/profiles/compare?users=${selectedForCompare.join(',')}`);
    }
  };

  if (loading && profiles.length === 0) {
    return <LoadingSpinner message="Loading profiles..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-red-400 text-xl font-light">{error}</div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      {/* Page Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-baseline gap-4">
            <h1 className="text-5xl font-light text-white tracking-tight">
              Profiles
            </h1>
            <div className="text-zinc-500 text-sm font-mono">
              {total} subjects
            </div>
          </div>
          <p className="mt-3 text-zinc-400 font-light max-w-2xl">
            Comprehensive psychological and physical phenotype analysis database
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        <div className="flex flex-wrap items-center gap-4">
          {/* Sort Dropdown */}
          <div className="relative flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              Sort:
            </span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm font-mono pl-3 pr-8 py-2 rounded-md hover:border-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 appearance-none cursor-pointer"
              >
                <option value="rating-desc">Omega Rating (High to Low)</option>
                <option value="messages-desc">
                  Message Count (High to Low)
                </option>
                <option value="username-asc">Username (A to Z)</option>
              </select>
              <svg
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* Compare Mode Toggle */}
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) setSelectedForCompare([]);
            }}
            className={`px-4 py-2 text-sm font-mono border rounded-md transition-all duration-200 ${
              compareMode
                ? 'bg-teal-600/20 border-teal-400 text-teal-300 shadow-lg shadow-teal-500/10 hover:bg-teal-600/30'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
            }`}
          >
            {compareMode ? 'Cancel Compare' : 'Compare Mode'}
          </button>

          {/* Compare Selected Button */}
          {compareMode && selectedForCompare.length >= 2 && (
            <button
              onClick={handleCompareSelected}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-mono rounded-md transition-all duration-200 shadow-lg shadow-teal-600/20 hover:shadow-teal-500/30"
            >
              Compare Selected ({selectedForCompare.length})
            </button>
          )}

          {/* Selected count indicator */}
          {compareMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 border border-zinc-700 rounded-full">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i < selectedForCompare.length
                        ? 'bg-teal-400'
                        : 'bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {selectedForCompare.length}/3
              </span>
            </div>
          )}
        </div>

        {/* Compare mode banner */}
        {compareMode && (
          <div className="mt-4 px-4 py-3 bg-teal-950/40 border border-teal-800/50 rounded-lg">
            <p className="text-sm text-teal-300/80 font-mono">
              Select 2-3 profiles to compare side by side. Click cards to select
              them.
            </p>
          </div>
        )}
      </div>

      {/* Profiles Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProfiles.map((profile) => {
            const isSelected = profile.username
              ? selectedForCompare.includes(profile.username)
              : false;

            const cardContent = (
              <>
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

                  {/* Top-right: user ID tag */}
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-mono text-white rounded">
                    {profile.userId.slice(0, 8)}
                  </div>

                  {/* Archetype badge */}
                  {profile.dominant_archetype && (
                    <div className="absolute bottom-4 left-4">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-mono border rounded-full backdrop-blur-sm ${archetypeStyle(profile.dominant_archetype)}`}
                      >
                        {profile.dominant_archetype}
                      </span>
                    </div>
                  )}

                  {/* Compare checkbox overlay */}
                  {compareMode && profile.username && (
                    <div className="absolute top-4 left-4">
                      <div
                        className={`w-8 h-8 rounded-md border-2 flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                          isSelected
                            ? 'bg-teal-500 border-teal-400 text-white shadow-lg shadow-teal-500/30'
                            : 'bg-black/60 border-zinc-400 text-transparent hover:border-white hover:bg-black/80'
                        }`}
                      >
                        {isSelected ? '\u2713' : ''}
                      </div>
                    </div>
                  )}

                  {/* Selected overlay glow */}
                  {compareMode && isSelected && (
                    <div className="absolute inset-0 bg-teal-500/10 pointer-events-none" />
                  )}
                </div>

                {/* Info Section */}
                <div className="p-6 space-y-4">
                  <div>
                    <h2 className="text-2xl font-light text-white tracking-tight group-hover:text-teal-400 transition-colors">
                      {profile.username || 'Unknown Subject'}
                    </h2>
                    <div className="mt-2 flex items-center gap-3 text-xs font-mono text-zinc-500">
                      {profile.omega_rating !== null &&
                        profile.omega_rating !== undefined && (
                          <span
                            className="font-semibold px-2 py-0.5 rounded-md"
                            style={{
                              color: ratingColor(profile.omega_rating),
                              backgroundColor: `${ratingColor(profile.omega_rating)}15`,
                            }}
                          >
                            {profile.omega_rating}/100{' '}
                            {ratingLabel(profile.omega_rating)}
                          </span>
                        )}
                      <span className="text-zinc-600">&bull;</span>
                      <span>{profile.messageCount} interactions</span>
                    </div>
                  </div>

                  {profile.overall_sentiment && (
                    <div className="pt-4 border-t border-zinc-800">
                      <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-1.5">
                        Overall Sentiment
                      </div>
                      <div
                        className={`text-sm font-medium ${sentimentColor(profile.overall_sentiment)}`}
                      >
                        {profile.overall_sentiment}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-zinc-800">
                    <div className="text-xs font-mono text-zinc-500">
                      Last seen:{' '}
                      {new Date(
                        profile.lastInteractionAt * 1000,
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="text-teal-400 text-sm font-mono group-hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                      {compareMode
                        ? isSelected
                          ? 'Selected'
                          : 'Select'
                        : 'View Profile'}
                      {!compareMode && (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </>
            );

            if (compareMode && profile.username) {
              return (
                <div
                  key={profile.userId}
                  onClick={() => toggleCompareSelection(profile.username!)}
                  className={`group block bg-zinc-900 border-2 cursor-pointer transition-all duration-300 overflow-hidden rounded-lg ${
                    isSelected
                      ? 'border-teal-400 ring-2 ring-teal-400/20 shadow-xl shadow-teal-500/10 scale-[1.02]'
                      : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {cardContent}
                </div>
              );
            }

            return (
              <Link
                key={profile.userId}
                href={`/profiles/${profile.username}`}
                className="group block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all duration-300 overflow-hidden rounded-lg hover:shadow-lg hover:shadow-black/20"
              >
                {cardContent}
              </Link>
            );
          })}
        </div>

        {profiles.length === 0 && (
          <div className="text-center py-20">
            <div className="text-zinc-600 text-xl font-light">
              No profiles found
            </div>
            <div className="mt-2 text-zinc-500 text-sm">
              Profiles are created when users interact with the bot
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-mono rounded-md hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-zinc-500 text-sm font-mono">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-mono rounded-md hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
