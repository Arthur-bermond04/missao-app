'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface MembrosLineChartProps {
  data: { mes: string; total: number }[];
}

export function MembrosLineChart({ data }: MembrosLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="membrosFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 8, background: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#22C55E"
          strokeWidth={2}
          fill="url(#membrosFill)"
          dot={{ r: 4, fill: '#22C55E', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
