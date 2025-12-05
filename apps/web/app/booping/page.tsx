'use client';

import { useState, useEffect } from 'react';
import { StatusSnapshot } from '@repo/agent/lib/status';

type SpinnerType = 'dots' | 'orbit' | 'pulse' | 'success' | 'error' | 'idle';

const ERROR_COMICS = [
  {
    title: 'Connection Timeout',
    panels: [
      { text: 'Omega: "Connecting to the void..."', emoji: '🔌' },
      { text: 'Void: "..."', emoji: '🕳️' },
    ],
  },
  {
    title: 'Tool Malfunction',
    panels: [
      { text: 'Omega: "Let me use this tool..."', emoji: '🔧' },
      { text: 'Tool: "I quit."', emoji: '💥' },
    ],
  },
  {
    title: 'Network Error',
    panels: [
      { text: 'Omega: "Fetching data..."', emoji: '📡' },
      { text: 'Internet: "No."', emoji: '🚫' },
    ],
  },
  {
    title: 'Unexpected Response',
    panels: [
      { text: 'Omega: "Generate a haiku..."', emoji: '✍️' },
      { text: 'AI: "Error 418: I\'m a teapot"', emoji: '🫖' },
    ],
  },
];

function getSpinnerType(state: string): SpinnerType {
  switch (state) {
    case 'thinking':
      return 'dots';
    case 'running-tool':
      return 'orbit';
    case 'waiting-network':
    case 'generating-image':
      return 'pulse';
    case 'success':
      return 'success';
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
}

function Spinner({ type }: { type: SpinnerType }) {
  if (type === 'idle') {
    return <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl">💤</div>;
  }

  if (type === 'success') {
    return <div className="w-16 h-16 rounded-full bg-green-900/50 flex items-center justify-center text-2xl animate-pulse">✓</div>;
  }

  if (type === 'error') {
    return <div className="w-16 h-16 rounded-full bg-red-900/50 flex items-center justify-center text-2xl animate-pulse">✗</div>;
  }

  if (type === 'dots') {
    return (
      <div className="flex gap-2">
        <div className="w-4 h-4 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-4 h-4 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-4 h-4 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    );
  }

  if (type === 'orbit') {
    return (
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (type === 'pulse') {
    return (
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 bg-cyan-500/50 rounded-full animate-ping" />
        <div className="relative w-16 h-16 bg-cyan-500 rounded-full" />
      </div>
    );
  }

  return null;
}

function ErrorComic({ comic }: { comic: typeof ERROR_COMICS[0] }) {
  return (
    <div className="mt-8 p-6 bg-zinc-900 border border-red-900/50 rounded-lg max-w-md">
      <h3 className="text-red-400 font-bold mb-4 text-center">{comic.title}</h3>
      <div className="space-y-4">
        {comic.panels.map((panel, idx) => (
          <div key={idx} className="bg-zinc-950 p-4 rounded border border-zinc-800">
            <div className="text-4xl mb-2 text-center">{panel.emoji}</div>
            <p className="text-sm text-zinc-400 text-center">{panel.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStateLabel(status: StatusSnapshot): string {
  const { state, toolName, substate } = status;

  if (state === 'idle') return 'Ready';
  if (state === 'thinking') return 'Thinking...';
  if (state === 'running-tool') return toolName ? `Running ${toolName}` : 'Running tool';
  if (state === 'waiting-network') return 'Waiting on network...';
  if (state === 'generating-image') return 'Generating image...';
  if (state === 'success') return 'Success!';
  if (state === 'error') return 'Error occurred';

  return substate || state;
}

export default function BoopingPage() {
  const [status, setStatus] = useState<StatusSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorComic, setErrorComic] = useState<typeof ERROR_COMICS[0] | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        setStatus(data);
        setLastUpdate(new Date());

        // Show error comic if in error state
        if (data.state === 'error' && !errorComic) {
          const randomComic = ERROR_COMICS[Math.floor(Math.random() * ERROR_COMICS.length)];
          setErrorComic(randomComic);
        } else if (data.state !== 'error' && errorComic) {
          setErrorComic(null);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch status:', error);
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 2 seconds
    const interval = setInterval(fetchStatus, 2000);

    return () => clearInterval(interval);
  }, [errorComic]);

  const spinnerType = status ? getSpinnerType(status.state) : 'idle';
  const stateLabel = status ? getStateLabel(status) : 'Loading...';

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  // Low power indicator (if available from feelings)
  const lowPowerMode = status && status.uptimeSec > 3600 * 12; // After 12 hours

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-20 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">
            Omega Status{' '}
            {lowPowerMode && <span className="text-zinc-600 animate-pulse">💤</span>}
          </h1>
          <p className="text-zinc-400 text-sm">
            Updated {lastUpdate.toLocaleTimeString('en-US', { hour12: false })} UTC
          </p>
        </div>

        <div
          className="bg-zinc-900 rounded-lg p-12 text-center border border-zinc-800"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
              <p className="text-zinc-400">Loading status...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <Spinner type={spinnerType} />

              <div>
                <h2 className="text-2xl font-semibold mb-2">{stateLabel}</h2>
                {status?.currentChannel && (
                  <p className="text-zinc-500 text-sm">
                    #{status.currentChannel}
                    {status.currentUser && ` • @${status.currentUser}`}
                  </p>
                )}
              </div>

              {status && (
                <div className="grid grid-cols-2 gap-4 mt-4 w-full max-w-md text-sm">
                  <div className="bg-zinc-950 p-3 rounded">
                    <div className="text-zinc-500">Uptime</div>
                    <div className="text-zinc-200 font-mono">
                      {formatUptime(status.uptimeSec)}
                    </div>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded">
                    <div className="text-zinc-500">Version</div>
                    <div className="text-zinc-200 font-mono">{status.version}</div>
                  </div>
                  {status.elapsedMs > 0 && (
                    <div className="bg-zinc-950 p-3 rounded col-span-2">
                      <div className="text-zinc-500">Current Task Duration</div>
                      <div className="text-zinc-200 font-mono">
                        {(status.elapsedMs / 1000).toFixed(1)}s
                      </div>
                    </div>
                  )}
                </div>
              )}

              {status?.lastError && (
                <div className="mt-4 p-4 bg-red-950/30 border border-red-900/50 rounded max-w-md">
                  <div className="text-red-400 font-semibold mb-1">Last Error</div>
                  <div className="text-red-300/80 text-sm">{status.lastError.message}</div>
                  <div className="text-red-500/60 text-xs mt-1">
                    {new Date(status.lastError.at).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {errorComic && <ErrorComic comic={errorComic} />}

        <div className="mt-8 text-center text-zinc-600 text-xs">
          <p>Status updates every 2 seconds</p>
          <p className="mt-1">No sensitive data is exposed on this page</p>
        </div>
      </div>
    </div>
  );
}
