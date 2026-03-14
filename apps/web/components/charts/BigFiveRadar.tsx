'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BigFiveRadarProps {
  scores: { trait: string; value: number; ciLow?: number; ciHigh?: number }[];
  compareTo?: { trait: string; value: number }[];
  label?: string;
  compareLabel?: string;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, unknown>; name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as { trait: string; value: number; ciLow?: number; ciHigh?: number };
  return (
    <div className="rounded-lg border border-zinc-700 px-3 py-2 font-mono text-sm" style={{ backgroundColor: '#27272a', color: '#fff' }}>
      <p className="font-semibold">{data.trait}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.name === 'compare' ? '#fb923c' : '#2dd4bf' }}>
          {entry.name === 'compare' ? 'Compare' : 'Score'}: {entry.value}
        </p>
      ))}
      {data.ciLow != null && data.ciHigh != null && (
        <p className="text-zinc-400">CI: {data.ciLow} - {data.ciHigh}</p>
      )}
    </div>
  );
}

export function BigFiveRadar({ scores, compareTo, label = 'Score', compareLabel = 'Compare' }: BigFiveRadarProps) {
  const data = scores.map((s) => {
    const compareEntry = compareTo?.find((c) => c.trait === s.trait);
    return {
      ...s,
      compare: compareEntry?.value,
    };
  });

  return (
    <div className="w-full rounded-xl p-4" style={{ backgroundColor: '#09090b' }}>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#3f3f46" />
          <PolarAngleAxis dataKey="trait" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} />
          {scores.some((s) => s.ciLow != null) && (
            <Radar
              name="ciHigh"
              dataKey="ciHigh"
              stroke="none"
              fill="#2dd4bf"
              fillOpacity={0.1}
            />
          )}
          <Radar
            name={label}
            dataKey="value"
            stroke="#2dd4bf"
            fill="#2dd4bf"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          {compareTo && (
            <Radar
              name={compareLabel}
              dataKey="compare"
              stroke="#fb923c"
              fill="#fb923c"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          {compareTo && <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 12 }} />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
