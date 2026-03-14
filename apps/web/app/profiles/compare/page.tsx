'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const BigFiveRadar = dynamic(
  () => import('@/components/charts/BigFiveRadar').then(mod => ({ default: mod.BigFiveRadar })),
  { ssr: false }
);

// =============================================================================
// TYPES
// =============================================================================

interface UserProfile {
  userId: string;
  username: string;
  uploadedPhotoUrl: string | null;
  omega_rating: number | null;
  omega_rating_reason: string | null;
  messageCount: number;
  lastInteractionAt: number;
  overallSentiment: string | null;
  dominant_archetype: string | null;
  attachmentStyle: string | null;

  // Big Five
  openness_score: number | null;
  conscientiousness_score: number | null;
  extraversion_score: number | null;
  agreeableness_score: number | null;
  neuroticism_score: number | null;

  // Communication
  communication_formality: string | null;
  communication_assertiveness: string | null;
  communication_engagement: string | null;
  verbal_fluency_score: number | null;

  // Emotional
  emotional_awareness_score: number | null;
  empathy_score: number | null;
  emotional_regulation_score: number | null;

  // Cognitive
  analytical_thinking_score: number | null;
  creative_thinking_score: number | null;
  system1_dominance: number | null;
  decision_quality_score: number | null;

  // Social
  cooperation_score: number | null;
  social_dominance_score: number | null;
  conflictStyle: string | null;
  humorStyle: string | null;

  // Expert panel
  expert_consensus_score: number | null;
  leadership_potential: number | null;
  will_to_power_score: number | null;
  resilience_score: number | null;
  adaptability_score: number | null;
  order_chaos_balance: number | null;
  responsibility_index: number | null;
  shadow_integration_score: number | null;
  persona_authenticity_gap: number | null;
  strategic_value_score: number | null;
  persuadability_index: number | null;
  sublimation_score: number | null;
  narrative_coherence_score: number | null;
  dopamine_seeking_score: number | null;
  serotonin_stability_score: number | null;
}

interface CompatibilityPair {
  userA: string;
  userB: string;
  score: number;
}

interface CompareListProfile {
  userId: string;
  username: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const USER_COLORS = ['#2dd4bf', '#fb923c', '#a78bfa'];

function ratingColor(rating: number): string {
  if (rating <= 20) return '#dc2626';
  if (rating <= 40) return '#ea580c';
  if (rating <= 60) return '#eab308';
  if (rating <= 80) return '#22c55e';
  return '#3b82f6';
}

function compatibilityColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#2dd4bf';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#ea580c';
  return '#dc2626';
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function ComparePage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading comparison..." />}>
      <ComparePageContent />
    </Suspense>
  );
}

function ComparePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [allProfiles, setAllProfiles] = useState<CompareListProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [compatibility, setCompatibility] = useState<CompatibilityPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  // Load list of all profiles for the selector
  useEffect(() => {
    fetch('/api/profiles?limit=100')
      .then(res => res.json())
      .then(data => {
        const items = (data.profiles || [])
          .filter((p: CompareListProfile) => p.username)
          .sort((a: CompareListProfile, b: CompareListProfile) =>
            (a.username || '').localeCompare(b.username || '')
          );
        setAllProfiles(items);
        setListLoading(false);
      })
      .catch(() => setListLoading(false));
  }, []);

  // Initialize from URL params
  useEffect(() => {
    const usersParam = searchParams.get('users');
    if (usersParam) {
      const usernames = usersParam.split(',').map(u => u.trim()).filter(Boolean);
      setSelectedUsers(usernames);
    }
  }, [searchParams]);

  // Fetch comparison data
  const fetchComparison = useCallback((usernames: string[]) => {
    if (usernames.length < 2) return;
    setLoading(true);
    setError(null);
    fetch(`/api/profiles/compare?users=${usernames.join(',')}`)
      .then(res => {
        if (!res.ok) return res.json().then(d => { throw new Error(d.error || 'Failed'); });
        return res.json();
      })
      .then(data => {
        setProfiles(data.profiles || []);
        setCompatibility(data.compatibility || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load comparison');
        setLoading(false);
      });
  }, []);

  // Auto-fetch when selected users come from URL
  useEffect(() => {
    if (selectedUsers.length >= 2) {
      fetchComparison(selectedUsers);
    }
  }, [selectedUsers, fetchComparison]);

  const handleCompare = () => {
    if (selectedUsers.length < 2) return;
    const params = new URLSearchParams({ users: selectedUsers.join(',') });
    router.push(`/profiles/compare?${params.toString()}`);
    fetchComparison(selectedUsers);
  };

  const toggleUser = (username: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(username)) return prev.filter(u => u !== username);
      if (prev.length >= 3) return prev;
      return [...prev, username];
    });
  };

  // ==========================================================================
  // Build radar data for multi-user overlay
  // ==========================================================================

  const bigFiveTraits = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'];
  const bigFiveKeys = ['openness_score', 'conscientiousness_score', 'extraversion_score', 'agreeableness_score', 'neuroticism_score'] as const;

  // Build radar data: use first user as base, second as compareTo
  const radarScores = bigFiveTraits.map((trait, i) => ({
    trait,
    value: profiles[0]?.[bigFiveKeys[i]] ?? 0,
  }));

  const radarCompare = profiles.length >= 2
    ? bigFiveTraits.map((trait, i) => ({
        trait,
        value: profiles[1]?.[bigFiveKeys[i]] ?? 0,
      }))
    : undefined;

  // ==========================================================================
  // Expert score dimensions for comparison table
  // ==========================================================================

  const expertDimensions: { label: string; key: keyof UserProfile }[] = [
    { label: 'Leadership Potential', key: 'leadership_potential' },
    { label: 'Will to Power', key: 'will_to_power_score' },
    { label: 'Resilience', key: 'resilience_score' },
    { label: 'Adaptability', key: 'adaptability_score' },
    { label: 'Strategic Value', key: 'strategic_value_score' },
    { label: 'Order/Chaos Balance', key: 'order_chaos_balance' },
    { label: 'Responsibility Index', key: 'responsibility_index' },
    { label: 'Shadow Integration', key: 'shadow_integration_score' },
    { label: 'Persona Authenticity Gap', key: 'persona_authenticity_gap' },
    { label: 'Persuadability', key: 'persuadability_index' },
    { label: 'System 1 Dominance', key: 'system1_dominance' },
    { label: 'Decision Quality', key: 'decision_quality_score' },
    { label: 'Sublimation', key: 'sublimation_score' },
    { label: 'Narrative Coherence', key: 'narrative_coherence_score' },
    { label: 'Dopamine Seeking', key: 'dopamine_seeking_score' },
    { label: 'Serotonin Stability', key: 'serotonin_stability_score' },
    { label: 'Expert Consensus', key: 'expert_consensus_score' },
  ];

  const hasExpertData = profiles.some(p =>
    expertDimensions.some(d => p[d.key] != null)
  );

  // ==========================================================================
  // Communication style fields
  // ==========================================================================

  const commFields: { label: string; key: keyof UserProfile }[] = [
    { label: 'Formality', key: 'communication_formality' },
    { label: 'Assertiveness', key: 'communication_assertiveness' },
    { label: 'Engagement', key: 'communication_engagement' },
    { label: 'Conflict Style', key: 'conflictStyle' },
    { label: 'Humor Style', key: 'humorStyle' },
    { label: 'Attachment Style', key: 'attachmentStyle' },
    { label: 'Dominant Archetype', key: 'dominant_archetype' },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <>
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-baseline gap-4">
            <Link href="/profiles" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm font-mono">
              &larr; Profiles
            </Link>
          </div>
          <h1 className="mt-4 text-5xl font-light text-white tracking-tight">Compare Profiles</h1>
          <p className="mt-3 text-zinc-400 font-light max-w-2xl">
            Side-by-side psychological comparison and compatibility analysis
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {/* User Selector */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Select 2-3 Profiles to Compare</div>

          {/* Multi-select dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full md:w-96 px-4 py-3 bg-zinc-800 border border-zinc-700 text-left text-sm font-mono text-zinc-300 hover:border-zinc-600 transition-colors flex items-center justify-between"
            >
              <span>
                {selectedUsers.length === 0
                  ? 'Select users...'
                  : selectedUsers.join(', ')}
              </span>
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute z-50 mt-1 w-full md:w-96 bg-zinc-800 border border-zinc-700 max-h-64 overflow-y-auto">
                {listLoading ? (
                  <div className="px-4 py-3 text-sm text-zinc-500">Loading...</div>
                ) : (
                  allProfiles.map(p => (
                    <button
                      key={p.userId}
                      onClick={() => toggleUser(p.username!)}
                      className={`w-full px-4 py-2 text-left text-sm font-mono flex items-center gap-3 hover:bg-zinc-700 transition-colors ${
                        selectedUsers.includes(p.username!)
                          ? 'text-teal-400 bg-zinc-700/50'
                          : 'text-zinc-300'
                      }`}
                    >
                      <span className={`w-4 h-4 border flex items-center justify-center text-xs ${
                        selectedUsers.includes(p.username!)
                          ? 'border-teal-400 bg-teal-400/20 text-teal-400'
                          : 'border-zinc-600'
                      }`}>
                        {selectedUsers.includes(p.username!) ? '\u2713' : ''}
                      </span>
                      {p.username}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected tags */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((u, i) => (
                <span
                  key={u}
                  className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono border"
                  style={{ borderColor: USER_COLORS[i], color: USER_COLORS[i] }}
                >
                  {u}
                  <button onClick={() => toggleUser(u)} className="hover:opacity-70">&times;</button>
                </span>
              ))}
            </div>
          )}

          <button
            onClick={handleCompare}
            disabled={selectedUsers.length < 2}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Compare
          </button>
        </div>

        {/* Loading / Error states */}
        {loading && <LoadingSpinner message="Loading comparison..." />}
        {error && (
          <div className="bg-red-950/30 border border-red-800 p-4 text-red-400 text-sm font-mono">{error}</div>
        )}

        {/* Empty state */}
        {!loading && !error && profiles.length < 2 && selectedUsers.length < 2 && (
          <div className="bg-zinc-900 border border-zinc-800 p-12 text-center space-y-3">
            <div className="text-zinc-500 text-4xl">&#x2194;</div>
            <div className="text-zinc-400 font-light">Select at least 2 profiles above to see a side-by-side comparison</div>
            <div className="text-xs font-mono text-zinc-600">Includes Big Five overlay, expert panel scores, and compatibility analysis</div>
          </div>
        )}

        {/* Results */}
        {!loading && profiles.length >= 2 && (
          <div className="space-y-10">
            {/* Overview Table */}
            <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-lg font-light text-white">Overview</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase tracking-wider">Attribute</th>
                      {profiles.map((p, i) => (
                        <th key={p.userId} className="px-6 py-3 text-left text-xs font-mono uppercase tracking-wider" style={{ color: USER_COLORS[i] }}>
                          {p.username}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {/* Photo row */}
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono text-zinc-500">Photo</td>
                      {profiles.map(p => (
                        <td key={p.userId} className="px-6 py-4">
                          {p.uploadedPhotoUrl ? (
                            <img src={p.uploadedPhotoUrl} alt={p.username} className="w-16 h-16 object-cover rounded" />
                          ) : (
                            <div className="w-16 h-16 bg-zinc-800 rounded flex items-center justify-center text-2xl text-zinc-600">
                              {p.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                    {/* Username */}
                    <tr>
                      <td className="px-6 py-3 text-xs font-mono text-zinc-500">Username</td>
                      {profiles.map(p => (
                        <td key={p.userId} className="px-6 py-3">
                          <Link href={`/profiles/${p.username}`} className="text-sm font-mono text-teal-400 hover:underline">
                            {p.username}
                          </Link>
                        </td>
                      ))}
                    </tr>
                    {/* Omega Rating */}
                    <tr>
                      <td className="px-6 py-3 text-xs font-mono text-zinc-500">Omega Rating</td>
                      {profiles.map(p => (
                        <td key={p.userId} className="px-6 py-3">
                          {p.omega_rating != null ? (
                            <span className="text-sm font-mono font-medium" style={{ color: ratingColor(p.omega_rating) }}>
                              {p.omega_rating}/100
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600 font-mono">N/A</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    {/* Message Count */}
                    <tr>
                      <td className="px-6 py-3 text-xs font-mono text-zinc-500">Interactions</td>
                      {profiles.map(p => (
                        <td key={p.userId} className="px-6 py-3 text-sm font-mono text-zinc-300">
                          {p.messageCount}
                        </td>
                      ))}
                    </tr>
                    {/* Sentiment */}
                    <tr>
                      <td className="px-6 py-3 text-xs font-mono text-zinc-500">Sentiment</td>
                      {profiles.map(p => (
                        <td key={p.userId} className="px-6 py-3 text-sm text-zinc-300 font-light">
                          {p.overallSentiment || <span className="text-zinc-600">N/A</span>}
                        </td>
                      ))}
                    </tr>
                    {/* Archetype */}
                    <tr>
                      <td className="px-6 py-3 text-xs font-mono text-zinc-500">Archetype</td>
                      {profiles.map(p => (
                        <td key={p.userId} className="px-6 py-3 text-sm text-zinc-300 font-light">
                          {p.dominant_archetype || <span className="text-zinc-600">N/A</span>}
                        </td>
                      ))}
                    </tr>
                    {/* Last Seen */}
                    <tr>
                      <td className="px-6 py-3 text-xs font-mono text-zinc-500">Last Seen</td>
                      {profiles.map(p => (
                        <td key={p.userId} className="px-6 py-3 text-xs font-mono text-zinc-400">
                          {new Date(p.lastInteractionAt * 1000).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric'
                          })}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Compatibility Scores */}
            <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-lg font-light text-white">Compatibility</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {compatibility.map(c => (
                  <div key={`${c.userA}-${c.userB}`} className="bg-zinc-800/50 border border-zinc-700/50 p-6 text-center space-y-3">
                    <div className="text-xs font-mono text-zinc-500">
                      {c.userA} &harr; {c.userB}
                    </div>
                    <div
                      className="text-4xl font-light font-mono"
                      style={{ color: compatibilityColor(c.score) }}
                    >
                      {c.score}%
                    </div>
                    <div className="w-full bg-zinc-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${c.score}%`,
                          backgroundColor: compatibilityColor(c.score),
                        }}
                      />
                    </div>
                    <div className="text-xs font-mono text-zinc-500">
                      {c.score >= 80 ? 'High Compatibility' :
                       c.score >= 60 ? 'Moderate Compatibility' :
                       c.score >= 40 ? 'Mixed Compatibility' :
                       'Low Compatibility'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Big Five Radar Overlay */}
            <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-lg font-light text-white">Big Five Personality Overlay</h2>
                <div className="mt-2 flex gap-4">
                  {profiles.map((p, i) => (
                    <span key={p.userId} className="text-xs font-mono flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: USER_COLORS[i] }} />
                      <span style={{ color: USER_COLORS[i] }}>{p.username}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-6">
                {BigFiveRadar && (
                  <BigFiveRadar
                    scores={radarScores}
                    compareTo={radarCompare}
                    label={profiles[0]?.username || 'User 1'}
                    compareLabel={profiles[1]?.username || 'User 2'}
                  />
                )}
                {/* Third user Big Five as supplemental bar display */}
                {profiles.length === 3 && (
                  <div className="mt-6 border-t border-zinc-800 pt-6">
                    <div className="text-xs font-mono text-zinc-500 mb-3" style={{ color: USER_COLORS[2] }}>
                      {profiles[2].username} (Big Five)
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      {bigFiveTraits.map((trait, i) => {
                        const val = profiles[2]?.[bigFiveKeys[i]];
                        return (
                          <div key={trait} className="space-y-1">
                            <div className="text-xs font-mono text-zinc-500">{trait.slice(0, 4)}</div>
                            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${val ?? 0}%`, backgroundColor: USER_COLORS[2] }}
                              />
                            </div>
                            <div className="text-xs font-mono" style={{ color: USER_COLORS[2] }}>
                              {val != null ? val : 'N/A'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Expert Scores Comparison */}
            {hasExpertData && (
              <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800">
                  <h2 className="text-lg font-light text-white">Expert Panel Scores</h2>
                </div>
                <div className="p-6 space-y-3">
                  {expertDimensions.map(dim => {
                    const anyHasValue = profiles.some(p => p[dim.key] != null);
                    if (!anyHasValue) return null;
                    return (
                      <div key={dim.key} className="space-y-1">
                        <div className="text-xs font-mono text-zinc-500">{dim.label}</div>
                        <div className="flex items-center gap-4">
                          {profiles.map((p, i) => {
                            const val = p[dim.key] as number | null;
                            return (
                              <div key={p.userId} className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-zinc-800 h-3 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${val ?? 0}%`,
                                        backgroundColor: USER_COLORS[i],
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono w-8 text-right" style={{ color: USER_COLORS[i] }}>
                                    {val != null ? val : '-'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Communication Style Matrix */}
            <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-lg font-light text-white">Communication Style Matrix</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase tracking-wider">Dimension</th>
                      {profiles.map((p, i) => (
                        <th key={p.userId} className="px-6 py-3 text-left text-xs font-mono uppercase tracking-wider" style={{ color: USER_COLORS[i] }}>
                          {p.username}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {commFields.map(field => {
                      const anyHasValue = profiles.some(p => p[field.key] != null);
                      if (!anyHasValue) return null;
                      return (
                        <tr key={field.key}>
                          <td className="px-6 py-3 text-xs font-mono text-zinc-500">{field.label}</td>
                          {profiles.map(p => (
                            <td key={p.userId} className="px-6 py-3 text-sm text-zinc-300 font-light">
                              {(p[field.key] as string) || <span className="text-zinc-600">N/A</span>}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {/* Numeric communication scores */}
                    <tr>
                      <td className="px-6 py-3 text-xs font-mono text-zinc-500">Verbal Fluency</td>
                      {profiles.map((p, i) => (
                        <td key={p.userId} className="px-6 py-3 text-sm font-mono" style={{ color: USER_COLORS[i] }}>
                          {p.verbal_fluency_score != null ? p.verbal_fluency_score : <span className="text-zinc-600">N/A</span>}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-3 text-xs font-mono text-zinc-500">Emotional Awareness</td>
                      {profiles.map((p, i) => (
                        <td key={p.userId} className="px-6 py-3 text-sm font-mono" style={{ color: USER_COLORS[i] }}>
                          {p.emotional_awareness_score != null ? p.emotional_awareness_score : <span className="text-zinc-600">N/A</span>}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-3 text-xs font-mono text-zinc-500">Empathy</td>
                      {profiles.map((p, i) => (
                        <td key={p.userId} className="px-6 py-3 text-sm font-mono" style={{ color: USER_COLORS[i] }}>
                          {p.empathy_score != null ? p.empathy_score : <span className="text-zinc-600">N/A</span>}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-3 text-xs font-mono text-zinc-500">Cooperation</td>
                      {profiles.map((p, i) => (
                        <td key={p.userId} className="px-6 py-3 text-sm font-mono" style={{ color: USER_COLORS[i] }}>
                          {p.cooperation_score != null ? p.cooperation_score : <span className="text-zinc-600">N/A</span>}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-3 text-xs font-mono text-zinc-500">Social Dominance</td>
                      {profiles.map((p, i) => (
                        <td key={p.userId} className="px-6 py-3 text-sm font-mono" style={{ color: USER_COLORS[i] }}>
                          {p.social_dominance_score != null ? p.social_dominance_score : <span className="text-zinc-600">N/A</span>}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
