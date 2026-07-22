'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface FunilBarChartProps {
  data: { valor: string; label: string; total: number }[];
}

// Degradê dourado claro -> preto nobre, uma cor por etapa (sequencial, não categórico)
const CORES_DEGRADE = ['#E8C96A', '#C9A84C', '#8B6A2A', '#4A3A18', '#1A1208'];

export function FunilBarChart({ data }: FunilBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tick={{ fontSize: 11, fill: '#6b6357' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => {
            const numero = Number(value) || 0;
            const maior = data[0]?.total || 1;
            const pct = ((numero / maior) * 100).toFixed(0);
            return [`${numero} (${pct}%)`, 'Total'];
          }}
          contentStyle={{ borderRadius: 8, borderColor: '#e2d9c8', fontSize: 12 }}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={16}>
          {data.map((entry, index) => (
            <Cell key={entry.valor} fill={CORES_DEGRADE[index % CORES_DEGRADE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
