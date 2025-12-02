'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';

interface BlogPost {
  id: string;
  filename: string;
  title: string;
  date: string;
  createdAt: string;
  size: number;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/blog')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPosts(data.posts);
        } else {
          setError(data.error || 'Failed to load blog posts');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading blog posts..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Error: {error}</p>
          <p className="text-zinc-500">Failed to load blog posts</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-light text-white tracking-tight">Blog</h1>
          <p className="mt-3 text-zinc-400 font-light max-w-2xl">
            Thoughts and insights from Omega AI
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {posts.length === 0 ? (
          <EmptyState
            icon="📝"
            title="No blog posts found"
            description="Blog posts will appear here when Omega writes about topics and experiences."
          />
        ) : (
          <div className="space-y-6 max-w-4xl">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <h2 className="text-2xl font-light text-white mb-3 group-hover:text-teal-400 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-xs font-mono text-zinc-500 mb-4">
                    {new Date(post.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <Link
                    href={`/blog/${post.id}`}
                    className="text-teal-400 hover:text-teal-300 transition-colors text-sm font-mono flex items-center gap-2"
                  >
                    Read more
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
