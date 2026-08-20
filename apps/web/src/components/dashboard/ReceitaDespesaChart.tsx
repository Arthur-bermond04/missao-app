'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CORES, EIXO_GRAFICO, GRADE_GRAFICO, TOOLTIP_GRAFICO } from '@/lib/cores';

interface ReceitaDespesaChartProps {
  data: { mes: string; receitas: number; despesas: number }[];
}

export function ReceitaDespesaChart({ data }: ReceitaDespesaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRADE_GRAFICO} vertical={false} />
        <XAxis dataKey="mes" tick={EIXO_GRAFICO} axisLine={false} tickLine={false} />
        <YAxis tick={EIXO_GRAFICO} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value) => `R$ ${(Number(value) || 0).toFixed(2)}`}
          contentStyle={TOOLTIP_GRAFICO}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value) => (value === 'receitas' ? 'Receitas' : 'Despesas')}
        />
        <Bar dataKey="receitas" fill={CORES.accentGreen} radius={[4, 4, 0, 0]} barSize={16} />
        <Bar dataKey="despesas" fill={CORES.danger} radius={[4, 4, 0, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
