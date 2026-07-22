'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface DespesasPieChartProps {
  data: { categoria: string; total: number }[];
}

// Paleta categórica tema Vaticano — uma cor por categoria de despesa
const CORES = ['#C9A84C', '#8B2B1A', '#1C3A5C', '#5A7A52', '#8B6A2A', '#0F6E56', '#8B7355', '#1A1208'];

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
        <Tooltip formatter={(value) => `R$ ${(Number(value) || 0).toFixed(2)}`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
