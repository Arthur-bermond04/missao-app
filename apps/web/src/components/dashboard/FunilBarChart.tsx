'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface FunilBarChartProps {
  data: { valor: string; label: string; total: number }[];
}

// Degradê roxo claro -> escuro, uma cor por etapa (sequencial, não categórico)
const CORES_DEGRADE = ['#8B84D4', '#6F66C4', '#534AB7', '#3c3489', '#2a2563'];

export function FunilBarChart({ data }: FunilBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tick={{ fontSize: 11, fill: '#6B6B8A' }}
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
          contentStyle={{ borderRadius: 8, borderColor: '#E8E8F0', fontSize: 12 }}
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
