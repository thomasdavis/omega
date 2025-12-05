'use client';

import { useEffect, useState } from 'react';

interface ServiceStatus {
  status: 'ok' | 'degraded' | 'error';
  message?: string;
  latency?: number;
  details?: Record<string, unknown>;
}

interface StatusData {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  version: {
    commit?: string;
    pr?: string;
    environment: string;
  };
  services: {
    database: ServiceStatus;
    web: ServiceStatus;
  };
  errors: {
    recent: boolean;
    lastError?: {
      message: string;
      timestamp: string;
    };
  };
  errorComics: Array<{
    url: string;
    filename: string;
    createdAt: string;
  }>;
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export default function BoopingPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fadeClass, setFadeClass] = useState('opacity-100');

  const fetchStatus = async () => {
    try {
      setFadeClass('opacity-50');

      const response = await fetch('/api/status');
      const data = await response.json();

      setTimeout(() => {
        setStatus(data);
        setError(null);
        setLoading(false);
        setFadeClass('opacity-100');
      }, 200);
    } catch (err) {
      setTimeout(() => {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
        setLoading(false);
        setFadeClass('opacity-100');
      }, 200);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading status...</p>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 border-4 border-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-light text-white mb-3">Offline</h1>
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-zinc-500 text-sm">Unable to fetch status data</p>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const getSpinnerColor = () => {
    switch (status.status) {
      case 'ok': return 'border-teal-500';
      case 'degraded': return 'border-yellow-500';
      case 'error': return 'border-red-500';
      default: return 'border-zinc-500';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'ok': return 'text-teal-400';
      case 'degraded': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-zinc-400';
    }
  };

  const getStatusBgColor = () => {
    switch (status.status) {
      case 'ok': return 'bg-teal-500/10 border-teal-500/20';
      case 'degraded': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'error': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-zinc-500/10 border-zinc-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-6">
      <div className={`max-w-4xl mx-auto transition-opacity duration-300 ${fadeClass}`}>
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-light text-white tracking-tight mb-4">
            Omega Status
          </h1>
          <p className="text-zinc-400">Real-time system health and operational status</p>
        </div>

        {/* Main Status Indicator */}
        <div className="text-center mb-12">
          <div className={`w-32 h-32 border-4 ${getSpinnerColor()} border-t-transparent rounded-full animate-spin mx-auto mb-6`}></div>
          <h2 className={`text-3xl font-light ${getStatusColor()} uppercase tracking-wider`}>
            {status.status}
          </h2>
          <p className="text-zinc-500 text-sm mt-2">
            Last updated: {new Date(status.timestamp).toLocaleTimeString()}
          </p>
        </div>

        {/* System Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
            <div className="text-zinc-500 text-sm mb-1">Uptime</div>
            <div className="text-white text-2xl font-light">{formatUptime(status.uptime)}</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
            <div className="text-zinc-500 text-sm mb-1">Environment</div>
            <div className="text-white text-2xl font-light capitalize">{status.version.environment}</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
            <div className="text-zinc-500 text-sm mb-1">Version</div>
            <div className="text-white text-xl font-mono">
              {status.version.commit || 'dev'}
              {status.version.pr && <span className="text-zinc-500"> #{status.version.pr}</span>}
            </div>
          </div>
        </div>

        {/* Service Status Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Database */}
          <div className={`border p-6 rounded-lg ${getStatusBgColor()}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-light flex items-center gap-2">
                <span className="text-2xl">🗄️</span>
                Database
              </h3>
              <div className={`w-3 h-3 rounded-full ${
                status.services.database.status === 'ok' ? 'bg-teal-500' :
                status.services.database.status === 'degraded' ? 'bg-yellow-500' :
                'bg-red-500'
              } animate-pulse`}></div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Status</span>
                <span className={getStatusColor()}>{status.services.database.status.toUpperCase()}</span>
              </div>
              {status.services.database.latency !== undefined && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Latency</span>
                  <span className="text-white font-mono">{status.services.database.latency}ms</span>
                </div>
              )}
              {status.services.database.message && (
                <div className="mt-2 text-zinc-500 text-xs">{status.services.database.message}</div>
              )}
            </div>
          </div>

          {/* Web Service */}
          <div className={`border p-6 rounded-lg ${getStatusBgColor()}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-light flex items-center gap-2">
                <span className="text-2xl">🌐</span>
                Web Service
              </h3>
              <div className={`w-3 h-3 rounded-full ${
                status.services.web.status === 'ok' ? 'bg-teal-500' :
                status.services.web.status === 'degraded' ? 'bg-yellow-500' :
                'bg-red-500'
              } animate-pulse`}></div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Status</span>
                <span className={getStatusColor()}>{status.services.web.status.toUpperCase()}</span>
              </div>
              {status.services.web.message && (
                <div className="mt-2 text-zinc-500 text-xs">{status.services.web.message}</div>
              )}
            </div>
          </div>
        </div>

        {/* Error Comics Section */}
        {status.errors.recent && status.errorComics.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-lg mb-8">
            <h3 className="text-red-400 text-lg font-light mb-4 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Recent Error Comics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {status.errorComics.map((comic, idx) => (
                <a
                  key={idx}
                  href={comic.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-zinc-900 border border-zinc-800 hover:border-red-500/50 transition-all rounded overflow-hidden group"
                >
                  <div className="aspect-square bg-zinc-800 flex items-center justify-center">
                    <img
                      src={comic.url}
                      alt={comic.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-3">
                    <div className="text-white text-sm font-mono truncate">{comic.filename}</div>
                    <div className="text-zinc-500 text-xs mt-1">
                      {new Date(comic.createdAt).toLocaleString()}
                    </div>
                  </div>
                </a>
              ))}
            </div>
            {status.errors.lastError && (
              <div className="mt-4 text-red-400 text-sm">
                Last error: {new Date(status.errors.lastError.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-zinc-600 text-sm">
          <p>Auto-refreshing every 8 seconds</p>
        </div>
      </div>
    </div>
  );
}
