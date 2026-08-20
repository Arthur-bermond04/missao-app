'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PALETA_CATEGORICA, TOOLTIP_GRAFICO } from '@/lib/cores';

interface DespesasPieChartProps {
  data: { categoria: string; total: number }[];
}

export function DespesasPieChart({ data }: DespesasPieChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-text-secondary">Sem despesas no período.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="categoria" innerRadius={45} outerRadius={75} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.categoria} fill={PALETA_CATEGORICA[index % PALETA_CATEGORICA.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => `R$ ${(Number(value) || 0).toFixed(2)}`}
          contentStyle={TOOLTIP_GRAFICO}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
