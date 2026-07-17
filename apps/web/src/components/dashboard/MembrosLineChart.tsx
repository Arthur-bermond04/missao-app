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
            <stop offset="0%" stopColor="#3c3489" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#3c3489" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8E8F0" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6B6B8A' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#6B6B8A' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E8E8F0', fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#3c3489"
          strokeWidth={2}
          fill="url(#membrosFill)"
          dot={{ r: 4, fill: '#3c3489', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
