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

interface ExpertComparisonBarProps {
  experts: { name: string; keyScore: number; color: string }[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, unknown>; value: number }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as { name: string; keyScore: number; color: string };
  return (
    <div className="rounded-lg border border-zinc-700 px-3 py-2 font-mono text-sm" style={{ backgroundColor: '#27272a', color: '#fff' }}>
      <p className="font-semibold">{data.name}</p>
      <p style={{ color: data.color }}>Score: {data.keyScore}</p>
    </div>
  );
}

export function ExpertComparisonBar({ experts }: ExpertComparisonBarProps) {
  return (
    <div className="w-full rounded-xl p-4" style={{ backgroundColor: '#09090b' }}>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={experts} margin={{ left: 10, right: 20, top: 10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={{ stroke: '#3f3f46' }}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#3f3f46' }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(39, 39, 42, 0.5)' }} />
          <Bar dataKey="keyScore" radius={[4, 4, 0, 0]} barSize={32}>
            {experts.map((expert, index) => (
              <Cell key={index} fill={expert.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
