'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface DespesasPieChartProps {
  data: { categoria: string; total: number }[];
}

// Paleta categórica Verde Missionário — uma cor por categoria de despesa
const CORES = ['#1A7A4A', '#2563EB', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#0F5233', '#6B7280'];

export function DespesasPieChart({ data }: DespesasPieChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-text-secondary">Sem despesas no período.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="categoria" innerRadius={45} outerRadius={75} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.categoria} fill={CORES[index % CORES.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => `R$ ${(Number(value) || 0).toFixed(2)}`}
          contentStyle={{ borderRadius: 8, background: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
