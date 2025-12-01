'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Artifact {
  id: string;
  filename: string;
  type: string;
  createdAt: string;
  size: number;
}

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/artifacts')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setArtifacts(data.artifacts);
        } else {
          setError(data.error || 'Failed to load artifacts');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <p className="text-lg">Loading artifacts...</p>
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-500 hover:underline">
            ← Back to home
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">Artifacts</h1>

        {artifacts.length === 0 ? (
          <p className="text-lg text-gray-500">No artifacts found.</p>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {artifacts.map((artifact) => (
              <a
                key={artifact.id}
                href={`/api/artifacts/${artifact.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-6 rounded-lg border border-gray-300 hover:border-gray-500 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-semibold truncate flex-1">
                    {artifact.filename}
                  </h2>
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    {artifact.type}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Created: {new Date(artifact.createdAt).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  Size: {(artifact.size / 1024).toFixed(2)} KB
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
