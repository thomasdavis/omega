'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface SharedLink {
  id: string;
  url: string;
  title?: string;
  description?: string;
  tags: string[];
  sharedBy: {
    userId: string;
    username: string;
  };
  channel: {
    id: string;
    name: string;
  };
  messageId: string;
  category?: string;
  createdAt: string;
}

interface Tag {
  tag: string;
  count: number;
}

export default function SharedLinksPage() {
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 20;

  useEffect(() => {
    loadLinks();
  }, [page, selectedTags]);

  useEffect(() => {
    loadTags();
  }, []);

  async function loadLinks() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
        sortBy: 'recent',
      });

      if (selectedTags.length > 0) {
        params.set('tags', selectedTags.join(','));
      }

      const res = await fetch(`/api/shared-links?${params}`);
      const data = await res.json();
      setLinks(data.links);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load shared links:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTags() {
    try {
      const res = await fetch('/api/shared-links/tags?limit=50');
      const data = await res.json();
      setTags(data.tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
    setPage(0); // Reset to first page when filtering
  }

  function clearFilters() {
    setSelectedTags([]);
    setPage(0);
  }

  function formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  function formatTimeAgo(timestamp: string): string {
    const now = new Date().getTime();
    const then = new Date(timestamp).getTime();
    const diff = now - then;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return new Date(timestamp).toLocaleDateString();
    } else if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  }

  const totalPages = Math.ceil(total / limit);
  const filteredTags = tags.filter(t =>
    t.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Page Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-light text-white tracking-tight">Shared Links</h1>
          <p className="mt-3 text-zinc-400 font-light max-w-2xl">
            Curated collection of links shared in Discord, automatically tagged with AI
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Tags Filter */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-light text-white">Filter by Tags</h2>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Tag Search */}
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white text-sm mb-4 focus:outline-none focus:border-teal-500"
                />

                {/* Tag List */}
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {filteredTags.map(({ tag, count }) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`w-full text-left px-3 py-2 text-sm transition-all duration-200 ${
                        selectedTags.includes(tag)
                          ? 'bg-teal-500/20 text-teal-400 border-l-2 border-teal-500'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <span className="font-mono">{tag}</span>
                      <span className="float-right text-xs text-zinc-600">
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="bg-zinc-900 border border-zinc-800 p-6">
                <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                  Total Links
                </p>
                <p className="text-3xl font-light text-white">
                  {total.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-600 mt-2">
                  {tags.length} unique tags
                </p>
              </div>
            </div>
          </div>

          {/* Main Content - Links */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-400">No links found</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 p-6"
                    >
                      {/* Link Header */}
                      <div className="flex items-start justify-between mb-3">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-teal-400 transition-colors font-light text-lg group"
                        >
                          {link.title || link.url}
                          <svg
                            className="inline-block w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      </div>

                      {/* Description */}
                      {link.description && (
                        <p className="text-zinc-400 text-sm mb-3 line-clamp-2">
                          {link.description}
                        </p>
                      )}

                      {/* URL */}
                      <p className="text-xs text-zinc-600 font-mono mb-3 truncate">
                        {link.url}
                      </p>

                      {/* Tags */}
                      {link.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {link.tags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className="px-2 py-1 bg-zinc-800 hover:bg-teal-500/20 text-xs text-zinc-400 hover:text-teal-400 font-mono transition-all duration-200"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-xs text-zinc-600">
                        <div className="flex items-center gap-4">
                          <span>
                            Shared by <span className="text-zinc-400">{link.sharedBy.username}</span>
                          </span>
                          <span>
                            in <span className="text-zinc-400">#{link.channel.name}</span>
                          </span>
                        </div>
                        <span title={formatTimestamp(link.createdAt)}>
                          {formatTimeAgo(link.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-800">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-4 py-2 bg-zinc-800 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                    >
                      Previous
                    </button>

                    <span className="text-sm text-zinc-400">
                      Page {page + 1} of {totalPages}
                    </span>

                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-4 py-2 bg-zinc-800 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
