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
            <stop offset="0%" stopColor="#8b6a2a" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#8b6a2a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2d9c8" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b6357' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#6b6357' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2d9c8', fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#8b6a2a"
          strokeWidth={2}
          fill="url(#membrosFill)"
          dot={{ r: 4, fill: '#8b6a2a', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
