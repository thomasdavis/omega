'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface InfluenceRadarProps {
  susceptibility: { principle: string; score: number }[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, unknown>; value: number }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as { principle: string; score: number };
  return (
    <div className="rounded-lg border border-zinc-700 px-3 py-2 font-mono text-sm" style={{ backgroundColor: '#27272a', color: '#fff' }}>
      <p className="font-semibold">{data.principle}</p>
      <p style={{ color: '#fbbf24' }}>Susceptibility: {data.score}</p>
    </div>
  );
}

export function InfluenceRadar({ susceptibility }: InfluenceRadarProps) {
  return (
    <div className="w-full rounded-xl p-4" style={{ backgroundColor: '#09090b' }}>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={susceptibility} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#3f3f46" />
          <PolarAngleAxis dataKey="principle" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} />
          <Radar
            name="Influence Susceptibility"
            dataKey="score"
            stroke="#fbbf24"
            fill="#fbbf24"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
