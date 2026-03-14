'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CognitiveBiasBarProps {
  biases: { name: string; severity: number; evidence?: string }[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, unknown>; value: number }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as { name: string; severity: number; evidence?: string };
  return (
    <div className="max-w-xs rounded-lg border border-zinc-700 px-3 py-2 font-mono text-sm" style={{ backgroundColor: '#27272a', color: '#fff' }}>
      <p className="font-semibold">{data.name}</p>
      <p style={{ color: '#22d3ee' }}>Severity: {data.severity}</p>
      {data.evidence && <p className="mt-1 text-zinc-400">{data.evidence}</p>}
    </div>
  );
}

export function CognitiveBiasBar({ biases }: CognitiveBiasBarProps) {
  const sorted = [...biases].sort((a, b) => b.severity - a.severity).slice(0, 5);

  return (
    <div className="w-full rounded-xl p-4" style={{ backgroundColor: '#09090b' }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#3f3f46' }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#a1a1aa', fontSize: 12 }}
            axisLine={{ stroke: '#3f3f46' }}
            width={140}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(39, 39, 42, 0.5)' }} />
          <Bar dataKey="severity" radius={[0, 4, 4, 0]} barSize={24}>
            {sorted.map((_, index) => (
              <Cell key={index} fill="#22d3ee" fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
