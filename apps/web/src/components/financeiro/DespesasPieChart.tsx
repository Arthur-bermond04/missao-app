'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface DespesasPieChartProps {
  data: { categoria: string; total: number }[];
}

// Degradê de âmbar a roxo — paleta sequencial para categorias de despesa
const CORES = ['#854F0B', '#993C1D', '#3c3489', '#534AB7', '#6B6B8A', '#0F6E56', '#2a2563', '#8B84D4'];

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
