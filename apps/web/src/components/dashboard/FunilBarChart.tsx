'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DEGRADE_FUNIL, EIXO_GRAFICO, TOOLTIP_GRAFICO } from '@/lib/cores';

interface FunilBarChartProps {
  data: { valor: string; label: string; total: number }[];
}

export function FunilBarChart({ data }: FunilBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tick={EIXO_GRAFICO}
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
          contentStyle={TOOLTIP_GRAFICO}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={16}>
          {data.map((entry, index) => (
            <Cell key={entry.valor} fill={DEGRADE_FUNIL[index % DEGRADE_FUNIL.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
