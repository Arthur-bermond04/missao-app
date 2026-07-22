'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ReceitaDespesaChartProps {
  data: { mes: string; receitas: number; despesas: number }[];
}

export function ReceitaDespesaChart({ data }: ReceitaDespesaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2d9c8" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b6357' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#6b6357' }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value) => `R$ ${(Number(value) || 0).toFixed(2)}`}
          contentStyle={{ borderRadius: 8, borderColor: '#e2d9c8', fontSize: 12 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value) => (value === 'receitas' ? 'Receitas' : 'Despesas')}
        />
        <Bar dataKey="receitas" fill="#0F6E56" radius={[4, 4, 0, 0]} barSize={16} />
        <Bar dataKey="despesas" fill="#8B2B1A" radius={[4, 4, 0, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
