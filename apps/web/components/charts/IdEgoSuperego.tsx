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

interface IdEgoSuperEgoProps {
  balance: { id: number; ego: number; superego: number };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, unknown>; value: number }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as { dimension: string; value: number };
  return (
    <div className="rounded-lg border border-zinc-700 px-3 py-2 font-mono text-sm" style={{ backgroundColor: '#27272a', color: '#fff' }}>
      <p className="font-semibold">{data.dimension}</p>
      <p style={{ color: '#fb7185' }}>Score: {data.value}</p>
    </div>
  );
}

export function IdEgoSuperego({ balance }: IdEgoSuperEgoProps) {
  const data = [
    { dimension: 'Id', value: balance.id },
    { dimension: 'Ego', value: balance.ego },
    { dimension: 'Superego', value: balance.superego },
  ];

  return (
    <div className="w-full rounded-xl p-4" style={{ backgroundColor: '#09090b' }}>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#3f3f46" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: '#a1a1aa', fontSize: 14, fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} />
          <Radar
            name="Freudian Balance"
            dataKey="value"
            stroke="#fb7185"
            fill="#fb7185"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
