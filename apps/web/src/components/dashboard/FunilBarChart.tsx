'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface FunilBarChartProps {
  data: { valor: string; label: string; total: number }[];
}

// Degradê verde claro -> verde missão, uma cor por etapa (sequencial, não categórico)
const CORES_DEGRADE = ['#BBF7D0', '#86EFAC', '#4ADE80', '#22C55E', '#1A7A4A'];

export function FunilBarChart({ data }: FunilBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
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
          contentStyle={{ borderRadius: 8, background: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 12 }}
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
