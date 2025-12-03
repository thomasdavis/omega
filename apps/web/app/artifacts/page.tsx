'use client';

import { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';

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
    return <LoadingSpinner message="Loading artifacts..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Error: {error}</p>
          <p className="text-zinc-500">Failed to load artifacts</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-light text-white tracking-tight">Artifacts</h1>
          <p className="mt-3 text-zinc-400 font-light max-w-2xl">
            Interactive HTML, SVG, and Markdown content created by Omega AI
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {artifacts.length === 0 ? (
          <EmptyState
            icon="🎨"
            title="No artifacts found"
            description="Artifacts will appear here when Omega creates interactive HTML, SVG, or Markdown content."
          />
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {artifacts.map((artifact) => (
              <a
                key={artifact.id}
                href={`/api/artifacts/${artifact.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <h2 className="text-xl font-light text-white truncate flex-1 group-hover:text-teal-400 transition-colors">
                      {artifact.filename}
                    </h2>
                    <Badge variant="accent" className="shrink-0">
                      {artifact.type}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs font-mono text-zinc-500">
                    <p>
                      Created: {new Date(artifact.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p>Size: {(artifact.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <div className="mt-4 text-teal-400 text-sm font-mono flex items-center gap-2">
                    View Artifact
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
