'use client';

import { useMemo, useState } from 'react';

interface CompatibilityHeatmapProps {
  matrix: { userA: string; userB: string; score: number }[];
  users: string[];
}

function scoreToColor(score: number): string {
  if (score <= 25) return `rgba(239, 68, 68, ${0.4 + score / 50})`;
  if (score <= 50) return `rgba(234, 179, 8, ${0.4 + (score - 25) / 50})`;
  if (score <= 75) return `rgba(34, 197, 94, ${0.3 + (score - 50) / 80})`;
  return `rgba(34, 197, 94, ${0.6 + (score - 75) / 100})`;
}

export function CompatibilityHeatmap({ matrix, users }: CompatibilityHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ userA: string; userB: string; score: number; x: number; y: number } | null>(null);

  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();
    matrix.forEach(({ userA, userB, score }) => {
      map.set(`${userA}:${userB}`, score);
      map.set(`${userB}:${userA}`, score);
    });
    users.forEach((u) => map.set(`${u}:${u}`, 100));
    return map;
  }, [matrix, users]);

  return (
    <div className="w-full rounded-xl p-4" style={{ backgroundColor: '#09090b' }}>
      <div className="relative overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header row */}
          <div className="flex" style={{ marginLeft: 100 }}>
            {users.map((user) => (
              <div
                key={user}
                className="flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap px-1 text-center font-mono text-xs text-zinc-400"
                style={{ width: 48 }}
                title={user}
              >
                {user.slice(0, 5)}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {users.map((rowUser) => (
            <div key={rowUser} className="flex items-center">
              <div
                className="flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap pr-2 text-right font-mono text-xs text-zinc-400"
                style={{ width: 100 }}
                title={rowUser}
              >
                {rowUser}
              </div>
              {users.map((colUser) => {
                const score = scoreMap.get(`${rowUser}:${colUser}`) ?? 0;
                return (
                  <div
                    key={colUser}
                    className="flex-shrink-0 cursor-pointer rounded-sm border border-zinc-800 transition-transform hover:scale-110"
                    style={{
                      width: 44,
                      height: 44,
                      margin: 2,
                      backgroundColor: scoreToColor(score),
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ userA: rowUser, userB: colUser, score, x: rect.left, y: rect.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none fixed z-50 rounded-lg border border-zinc-700 px-3 py-2 font-mono text-sm"
            style={{
              backgroundColor: '#27272a',
              color: '#fff',
              left: tooltip.x + 50,
              top: tooltip.y - 10,
            }}
          >
            <p className="font-semibold">
              {tooltip.userA} &times; {tooltip.userB}
            </p>
            <p className="text-zinc-300">Compatibility: {tooltip.score}</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-2 font-mono text-xs text-zinc-500">
        <span>0</span>
        <div className="flex">
          {[0, 25, 50, 75, 100].map((v) => (
            <div key={v} className="h-3 w-6" style={{ backgroundColor: scoreToColor(v) }} />
          ))}
        </div>
        <span>100</span>
      </div>
    </div>
  );
}
