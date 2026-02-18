'use client';

import { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';

interface Comic {
  id: number;
  number: number;
  filename: string;
  description?: string;
  toolName?: string;
  url: string;
  createdAt: string;
  size: number;
}

export default function ComicsPage() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComics = () => {
    setLoading(true);
    setError(null);
    fetch('/api/comics')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setComics(data.comics);
        } else {
          setError(data.error || 'Failed to load comics');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchComics();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading comics..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Error: {error}</p>
          <p className="text-zinc-500 mb-6">Failed to load comics</p>
          <button
            onClick={fetchComics}
            className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700 transition-colors text-sm font-mono"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-light text-white tracking-tight">Comics Gallery</h1>
          <p className="mt-3 text-zinc-400 font-light max-w-2xl">
            AI-generated comics created by Omega, sorted from newest to oldest
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {comics.length === 0 ? (
          <EmptyState
            icon="🎨"
            title="No comics found"
            description="Comics will appear here when Omega creates visual stories and artwork."
          />
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {comics.map((comic) => (
              <article
                key={comic.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden"
              >
                {/* Comic Preview */}
                <div className="w-full h-96 bg-zinc-800 border-b border-zinc-800 flex items-center justify-center overflow-hidden">
                  <img
                    src={comic.url}
                    alt={comic.filename}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Comic Info */}
                <div className="p-6">
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <h2 className="text-xl font-light text-white flex-1 line-clamp-2">
                      {comic.description || comic.filename.replace('.html', '').replace(/-comic/gi, '')}
                    </h2>
                    <Badge variant="accent" className="shrink-0">
                      {comic.toolName === 'generateDilbertComic' ? 'DILBERT' :
                       comic.toolName === 'generateXkcdComic' ? 'XKCD' : 'COMIC'}
                    </Badge>
                  </div>

                  <time
                    dateTime={comic.createdAt}
                    className="block text-xs font-mono text-zinc-500 mb-4"
                  >
                    {new Date(comic.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>

                  <a
                    href={`/api/artifacts/${comic.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 hover:text-teal-300 transition-colors text-sm font-mono flex items-center gap-2"
                  >
                    View Full Comic
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
