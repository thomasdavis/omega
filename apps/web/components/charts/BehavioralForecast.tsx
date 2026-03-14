'use client';

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface BehavioralForecastProps {
  forecast: { day: number; predicted: number; confidenceLow: number; confidenceHigh: number }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const predicted = payload.find((p) => p.name === 'predicted');
  const low = payload.find((p) => p.name === 'confidenceLow');
  const high = payload.find((p) => p.name === 'confidenceHigh');
  return (
    <div className="rounded-lg border border-zinc-700 px-3 py-2 font-mono text-sm" style={{ backgroundColor: '#27272a', color: '#fff' }}>
      <p className="font-semibold text-zinc-400">Day {label}</p>
      {predicted && <p style={{ color: '#2dd4bf' }}>Predicted: {predicted.value}</p>}
      {low && high && (
        <p className="text-zinc-400">
          CI: {low.value} - {high.value}
        </p>
      )}
    </div>
  );
}

export function BehavioralForecast({ forecast, label = 'Behavioral Forecast' }: BehavioralForecastProps) {
  return (
    <div className="w-full rounded-xl p-4" style={{ backgroundColor: '#09090b' }}>
      {label && <p className="mb-2 font-mono text-sm text-zinc-400">{label}</p>}
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={forecast} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="day"
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={{ stroke: '#3f3f46' }}
            label={{ value: 'Days', position: 'insideBottom', offset: -5, fill: '#71717a', fontSize: 11 }}
          />
          <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#3f3f46' }} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="confidenceHigh"
            stroke="none"
            fill="url(#confidenceBand)"
            fillOpacity={1}
          />
          <Area
            type="monotone"
            dataKey="confidenceLow"
            stroke="none"
            fill="#09090b"
            fillOpacity={1}
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#2dd4bf"
            strokeWidth={2}
            dot={{ r: 2, fill: '#2dd4bf' }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
