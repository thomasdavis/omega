'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Tool {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  tags: string[];
  examples: string[];
  isCore?: boolean;
  category: string;
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, core: 0, filtered: 0, categories: 0 });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExamples, setShowExamples] = useState(false);

  useEffect(() => {
    loadTools();
  }, [selectedCategory, selectedTags]);

  async function loadTools() {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (selectedCategory) {
        params.set('category', selectedCategory);
      }

      if (selectedTags.length > 0) {
        params.set('tags', selectedTags.join(','));
      }

      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const res = await fetch(`/api/tools?${params}`);
      const data = await res.json();

      setTools(data.tools);
      setStats(data.stats);
      setAllCategories(data.categories);
      setAllTags(data.tags);
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }

  function clearFilters() {
    setSelectedCategory('');
    setSelectedTags([]);
    setSearchQuery('');
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    // Debounce search
    const timer = setTimeout(() => {
      loadTools();
    }, 300);
    return () => clearTimeout(timer);
  }

  const filteredTags = allTags.filter(t =>
    t.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Page Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-light text-white tracking-tight">Omega Tools</h1>
          <p className="mt-3 text-zinc-400 font-light max-w-2xl">
            Comprehensive documentation for all {stats.total} AI-callable tools available in Omega
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              {/* Search */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 mb-6">
                <h2 className="text-lg font-light text-white mb-4">Search Tools</h2>
                <input
                  type="text"
                  placeholder="Search by name, keyword..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white text-sm mb-4 focus:outline-none focus:border-teal-500"
                />
                <button
                  onClick={() => loadTools()}
                  className="w-full px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm transition-colors"
                >
                  Search
                </button>
              </div>

              {/* Category Filter */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-light text-white">Category</h2>
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory('')}
                      className="text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {allCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category === selectedCategory ? '' : category)}
                      className={`w-full text-left px-3 py-2 text-sm transition-all duration-200 ${
                        selectedCategory === category
                          ? 'bg-teal-500/20 text-teal-400 border-l-2 border-teal-500'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <span className="capitalize">{category}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag Filter */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-light text-white">Filter by Tags</h2>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {filteredTags.slice(0, 20).map((tag) => (
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
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="bg-zinc-900 border border-zinc-800 p-6">
                <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                  Total Tools
                </p>
                <p className="text-3xl font-light text-white">
                  {stats.total}
                </p>
                <div className="mt-4 space-y-2 text-xs text-zinc-400">
                  <div className="flex justify-between">
                    <span>Core tools:</span>
                    <span className="text-teal-400">{stats.core}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Filtered:</span>
                    <span className="text-white">{stats.filtered}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Categories:</span>
                    <span>{stats.categories}</span>
                  </div>
                </div>

                {(selectedCategory || selectedTags.length > 0 || searchQuery) && (
                  <button
                    onClick={clearFilters}
                    className="w-full mt-4 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs transition-colors"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Tools */}
          <div className="lg:col-span-3">
            {/* Display Options */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                Showing {stats.filtered} of {stats.total} tools
              </p>
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showExamples}
                  onChange={(e) => setShowExamples(e.target.checked)}
                  className="w-4 h-4 bg-zinc-800 border-zinc-700 text-teal-500 focus:ring-teal-500"
                />
                Show Examples
              </label>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : tools.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-400">No tools found matching your filters</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {tools.map((tool) => (
                  <div
                    key={tool.id}
                    id={tool.id}
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 p-6 scroll-mt-6"
                  >
                    {/* Tool Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-white font-light text-xl">
                          {tool.name}
                        </h3>
                        {tool.isCore && (
                          <span className="px-2 py-1 bg-teal-500/20 text-teal-400 text-xs font-mono border border-teal-500/30">
                            CORE
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono capitalize">
                        {tool.category}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
                      {tool.description}
                    </p>

                    {/* Tool ID */}
                    <div className="mb-3">
                      <span className="text-xs text-zinc-600 font-mono">
                        ID: <span className="text-zinc-500">{tool.id}</span>
                      </span>
                    </div>

                    {/* Keywords */}
                    {tool.keywords.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Keywords</p>
                        <div className="flex flex-wrap gap-2">
                          {tool.keywords.map((keyword) => (
                            <span
                              key={keyword}
                              className="px-2 py-1 bg-zinc-800 text-xs text-zinc-400 font-mono"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {tool.tags.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {tool.tags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className={`px-2 py-1 text-xs font-mono transition-all duration-200 ${
                                selectedTags.includes(tag)
                                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                                  : 'bg-zinc-800 text-zinc-400 hover:bg-teal-500/20 hover:text-teal-400'
                              }`}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Examples */}
                    {showExamples && tool.examples.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-zinc-800">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Example Queries</p>
                        <ul className="space-y-1">
                          {tool.examples.map((example, idx) => (
                            <li key={idx} className="text-sm text-zinc-400 font-mono">
                              <span className="text-zinc-600 mr-2">•</span>
                              "{example}"
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
