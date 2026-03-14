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

interface CognitiveStyleRadarProps {
  scores: { axis: string; value: number }[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, unknown>; value: number }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as { axis: string; value: number };
  return (
    <div className="rounded-lg border border-zinc-700 px-3 py-2 font-mono text-sm" style={{ backgroundColor: '#27272a', color: '#fff' }}>
      <p className="font-semibold">{data.axis}</p>
      <p style={{ color: '#c084fc' }}>Score: {data.value}</p>
    </div>
  );
}

export function CognitiveStyleRadar({ scores }: CognitiveStyleRadarProps) {
  return (
    <div className="w-full rounded-xl p-4" style={{ backgroundColor: '#09090b' }}>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={scores} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#3f3f46" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} />
          <Radar
            name="Cognitive Style"
            dataKey="value"
            stroke="#c084fc"
            fill="#c084fc"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
