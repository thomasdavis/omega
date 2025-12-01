'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Comic {
  id: string;
  filename: string;
  createdAt: string;
  size: number;
}

export default function ComicsPage() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <p className="text-lg">Loading comics...</p>
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
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline font-medium">
            ← Back to home
          </Link>
        </div>

        <h1 className="text-5xl font-bold mb-4 text-gray-900">Comics Gallery</h1>
        <p className="text-gray-600 mb-12 text-lg">
          Explore all the comics, sorted from newest to oldest.
        </p>

        {comics.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-gray-500">No comics found yet.</p>
            <p className="text-gray-400 mt-2">Check back later for new comics!</p>
          </div>
        ) : (
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {comics.map((comic) => (
              <article
                key={comic.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                {/* Comic Preview in iframe */}
                <div className="w-full h-96 bg-gray-100 border-b border-gray-200">
                  <iframe
                    src={`/api/artifacts/${comic.id}`}
                    className="w-full h-full"
                    title={comic.filename}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>

                {/* Comic Info */}
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-3 text-gray-900 line-clamp-2">
                    {comic.filename.replace('.html', '').replace(/-comic/gi, '')}
                  </h2>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <time dateTime={comic.createdAt}>
                      {new Date(comic.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                    <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
                      COMIC
                    </span>
                  </div>

                  <a
                    href={`/api/artifacts/${comic.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    View Full Comic →
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
