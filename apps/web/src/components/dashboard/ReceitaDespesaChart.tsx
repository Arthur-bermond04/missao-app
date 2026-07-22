'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ReceitaDespesaChartProps {
  data: { mes: string; receitas: number; despesas: number }[];
}

export function ReceitaDespesaChart({ data }: ReceitaDespesaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value) => `R$ ${(Number(value) || 0).toFixed(2)}`}
          contentStyle={{ borderRadius: 8, background: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 12 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value) => (value === 'receitas' ? 'Receitas' : 'Despesas')}
        />
        <Bar dataKey="receitas" fill="#22C55E" radius={[4, 4, 0, 0]} barSize={16} />
        <Bar dataKey="despesas" fill="#DC2626" radius={[4, 4, 0, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
