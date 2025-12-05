'use client';

import { useState, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';

interface StatusUpdate {
  phase: 'idle' | 'composing' | 'waiting-on-tool' | 'tool-running' | 'fetching' | 'rate-limited' | 'error' | 'recovering';
  message: string;
  toolName?: string;
  timestamp: number;
}

interface PusherConfig {
  enabled: boolean;
  key?: string;
  cluster?: string;
  channel?: string;
  event?: string;
}

// Error comics - randomly selected on error states
const ERROR_COMICS = [
  { id: 413, caption: "Request Entity Too Large... or my patience" },
  { id: 422, caption: "Unprocessable Entity... story of my life" },
  { id: 429, caption: "Too Many Requests... tell me about it" },
  { id: 500, caption: "Internal Server Error... internally screaming" },
  { id: 502, caption: "Bad Gateway... to what fresh hell?" },
  { id: 503, caption: "Service Unavailable... emotionally too" },
  { id: 504, caption: "Gateway Timeout... patience.exe has stopped" },
];

export default function BoopingPage() {
  const [status, setStatus] = useState<StatusUpdate>({
    phase: 'idle',
    message: 'Connecting...',
    timestamp: Date.now(),
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [errorComic, setErrorComic] = useState<typeof ERROR_COMICS[0] | null>(null);
  const [comicCooldown, setComicCooldown] = useState(false);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);

  // Initialize Pusher connection
  useEffect(() => {
    let mounted = true;
    let pusherInstance: Pusher | null = null;

    async function initializePusher() {
      try {
        // Fetch Pusher configuration
        const configRes = await fetch('/api/booping/pusher-config');
        const config: PusherConfig = await configRes.json();

        if (!config.enabled || !config.key) {
          console.warn('Pusher not configured, status updates disabled');
          setConnectionStatus('disconnected');
          return;
        }

        // Initialize Pusher client
        pusherInstance = new Pusher(config.key, {
          cluster: config.cluster || 'us2',
        });

        pusherRef.current = pusherInstance;

        // Subscribe to status channel
        const channel = pusherInstance.subscribe(config.channel || 'omega-status');
        channelRef.current = channel;

        // Handle connection state
        pusherInstance.connection.bind('connected', () => {
          if (mounted) {
            setConnectionStatus('connected');
            console.log('✅ Connected to Pusher');
          }
        });

        pusherInstance.connection.bind('disconnected', () => {
          if (mounted) {
            setConnectionStatus('disconnected');
            console.log('❌ Disconnected from Pusher');
          }
        });

        pusherInstance.connection.bind('error', (err: any) => {
          console.error('Pusher connection error:', err);
        });

        // Listen for status updates
        channel.bind(config.event || 'status-update', (data: StatusUpdate) => {
          if (mounted) {
            setStatus(data);
            setLastUpdate(new Date());

            // Show error comic on error state (with cooldown)
            if (data.phase === 'error' && !comicCooldown) {
              const randomComic = ERROR_COMICS[Math.floor(Math.random() * ERROR_COMICS.length)];
              setErrorComic(randomComic);
              setComicCooldown(true);

              // Clear comic after 5 seconds
              setTimeout(() => {
                setErrorComic(null);
              }, 5000);

              // Cooldown for 15 seconds
              setTimeout(() => {
                setComicCooldown(false);
              }, 15000);
            }

            // Clear error comic on recovery
            if (data.phase === 'recovering' || data.phase === 'idle') {
              setTimeout(() => setErrorComic(null), 1000);
            }
          }
        });

      } catch (error) {
        console.error('Failed to initialize Pusher:', error);
        setConnectionStatus('disconnected');
      }
    }

    initializePusher();

    // Cleanup
    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusherRef.current?.unsubscribe(channelRef.current.name);
      }
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, [comicCooldown]);

  // Polling fallback (every 5 seconds) if Pusher disconnected
  useEffect(() => {
    if (connectionStatus !== 'connected') {
      const interval = setInterval(async () => {
        try {
          const res = await fetch('/api/booping');
          const data = await res.json();
          if (data && !data.error) {
            setStatus(data);
            setLastUpdate(new Date());
          }
        } catch (error) {
          console.error('Polling failed:', error);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [connectionStatus]);

  // Get phase-specific styling
  function getPhaseStyles(phase: StatusUpdate['phase']) {
    switch (phase) {
      case 'idle':
        return {
          bg: 'bg-zinc-800',
          text: 'text-zinc-400',
          border: 'border-zinc-700',
          spinnerColor: 'border-zinc-600',
        };
      case 'composing':
        return {
          bg: 'bg-teal-500/10',
          text: 'text-teal-400',
          border: 'border-teal-500/30',
          spinnerColor: 'border-teal-500',
        };
      case 'tool-running':
      case 'waiting-on-tool':
        return {
          bg: 'bg-purple-500/10',
          text: 'text-purple-400',
          border: 'border-purple-500/30',
          spinnerColor: 'border-purple-500',
        };
      case 'fetching':
        return {
          bg: 'bg-blue-500/10',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
          spinnerColor: 'border-blue-500',
        };
      case 'rate-limited':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          spinnerColor: 'border-amber-500',
        };
      case 'error':
        return {
          bg: 'bg-red-500/10',
          text: 'text-red-400',
          border: 'border-red-500/30',
          spinnerColor: 'border-red-500',
        };
      case 'recovering':
        return {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          spinnerColor: 'border-emerald-500',
        };
      default:
        return {
          bg: 'bg-zinc-800',
          text: 'text-zinc-400',
          border: 'border-zinc-700',
          spinnerColor: 'border-zinc-600',
        };
    }
  }

  // Get spinner for current phase
  function getSpinner(phase: StatusUpdate['phase']) {
    const styles = getPhaseStyles(phase);
    const isActive = phase !== 'idle';

    return (
      <div
        className={`w-12 h-12 border-4 border-t-transparent ${styles.spinnerColor} rounded-full ${
          isActive ? 'animate-spin' : ''
        }`}
        role="status"
        aria-live="polite"
        aria-label={`Status: ${phase}`}
      />
    );
  }

  const styles = getPhaseStyles(status.phase);

  return (
    <>
      {/* Page Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-light text-white tracking-tight">booping</h1>
          <p className="mt-3 text-zinc-400 font-light max-w-2xl">
            Omega's live runtime status — what's happening right now, no filters
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Connection Status Badge */}
        <div className="mb-8 flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-teal-400 animate-pulse'
                : connectionStatus === 'connecting'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-zinc-600'
            }`}
            aria-hidden="true"
          />
          <span className="text-sm font-mono text-zinc-500">
            {connectionStatus === 'connected'
              ? 'Live updates active'
              : connectionStatus === 'connecting'
              ? 'Connecting to live updates...'
              : 'Polling for updates (live connection unavailable)'}
          </span>
        </div>

        {/* Status Display */}
        <div className={`border ${styles.border} ${styles.bg} p-12 mb-8`}>
          <div className="flex flex-col items-center gap-6">
            {/* Spinner */}
            {getSpinner(status.phase)}

            {/* Phase Name */}
            <div className="text-center">
              <p className={`text-2xl font-light ${styles.text} mb-2`}>
                {status.phase === 'tool-running' && status.toolName
                  ? `${status.toolName}`
                  : status.phase.replace(/-/g, ' ')}
              </p>
              <p className="text-zinc-400 font-light">{status.message}</p>
            </div>

            {/* Tool Name Badge */}
            {status.toolName && (
              <div className="px-4 py-2 bg-zinc-800 border border-zinc-700">
                <p className="text-sm font-mono text-zinc-400">
                  tool: <span className={styles.text}>{status.toolName}</span>
                </p>
              </div>
            )}

            {/* Timestamp */}
            <p className="text-xs font-mono text-zinc-500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Error Comic Panel */}
        {errorComic && (
          <div
            className="mb-8 bg-zinc-900 border border-red-500/30 p-6 animate-in fade-in duration-300"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <img
                src={`/comics/comic_${errorComic.id}.png`}
                alt="Error comic"
                className="w-full md:w-64 h-auto border border-zinc-800"
              />
              <div className="flex-1">
                <p className="text-xl font-light text-red-400 mb-2">Error {errorComic.id}</p>
                <p className="text-zinc-400 font-light italic">{errorComic.caption}</p>
              </div>
            </div>
          </div>
        )}

        {/* Phase Legend */}
        <div className="bg-zinc-900 border border-zinc-800 p-6">
          <h2 className="text-lg font-light text-white mb-4">Status Phases</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { phase: 'idle', desc: 'Waiting for messages' },
              { phase: 'composing', desc: 'Processing and thinking' },
              { phase: 'tool-running', desc: 'Executing a tool' },
              { phase: 'waiting-on-tool', desc: 'Waiting for tool response' },
              { phase: 'fetching', desc: 'Fetching external data' },
              { phase: 'rate-limited', desc: 'Rate limited, backing off' },
              { phase: 'error', desc: 'Error occurred' },
              { phase: 'recovering', desc: 'Recovering from error' },
            ].map((item) => {
              const itemStyles = getPhaseStyles(item.phase as StatusUpdate['phase']);
              return (
                <div key={item.phase} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${itemStyles.text.replace('text-', 'bg-')}`} />
                  <div>
                    <p className="text-sm font-mono text-white">{item.phase}</p>
                    <p className="text-xs text-zinc-500">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accessibility Note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-600 font-light">
            This page updates in real-time. Status changes are announced to screen readers via ARIA live regions.
          </p>
        </div>
      </div>
    </>
  );
}
