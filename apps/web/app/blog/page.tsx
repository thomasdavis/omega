'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <p className="text-lg">Loading blog posts...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <p className="text-lg text-red-500">Error: {error}</p>
        <Link href="/" className="mt-4 text-blue-500 hover:underline">
          Go back home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-500 hover:underline">
            ← Back to home
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">Blog Posts</h1>

        {posts.length === 0 ? (
          <p className="text-lg text-gray-500">No blog posts found.</p>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="p-6 rounded-lg border border-gray-300 hover:border-gray-500 hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-2xl font-semibold mb-2">{post.title}</h2>
                <p className="text-sm text-gray-500 mb-4">
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <Link
                  href={`/blog/${post.id}`}
                  className="text-blue-500 hover:underline"
                >
                  Read more →
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
