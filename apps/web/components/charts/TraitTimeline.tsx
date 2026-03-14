'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TraitTimelineProps {
  history: { date: string; traits: Record<string, number> }[];
  selectedTraits?: string[];
}

const TRAIT_COLORS = [
  '#60a5fa', '#f87171', '#c084fc', '#34d399', '#fbbf24',
  '#fb7185', '#22d3ee', '#fb923c', '#facc15', '#a3e635',
  '#a78bfa',
];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 px-3 py-2 font-mono text-sm" style={{ backgroundColor: '#27272a', color: '#fff' }}>
      <p className="mb-1 font-semibold text-zinc-400">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function TraitTimeline({ history, selectedTraits }: TraitTimelineProps) {
  const allTraits = useMemo(() => {
    const traits = new Set<string>();
    history.forEach((h) => Object.keys(h.traits).forEach((t) => traits.add(t)));
    return Array.from(traits);
  }, [history]);

  const displayTraits = selectedTraits ?? allTraits;

  const data = useMemo(
    () => history.map((h) => ({ date: h.date, ...h.traits })),
    [history],
  );

  return (
    <div className="w-full rounded-xl p-4" style={{ backgroundColor: '#09090b' }}>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#3f3f46' }} />
          <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#3f3f46' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 12 }} />
          {displayTraits.map((trait, i) => (
            <Line
              key={trait}
              type="monotone"
              dataKey={trait}
              stroke={TRAIT_COLORS[i % TRAIT_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: TRAIT_COLORS[i % TRAIT_COLORS.length] }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
