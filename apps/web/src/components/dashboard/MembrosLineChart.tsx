'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CORES, EIXO_GRAFICO, GRADE_GRAFICO, TOOLTIP_GRAFICO } from '@/lib/cores';

interface MembrosLineChartProps {
  data: { mes: string; total: number }[];
}

export function MembrosLineChart({ data }: MembrosLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="membrosFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CORES.accentGreen} stopOpacity={0.1} />
            <stop offset="100%" stopColor={CORES.accentGreen} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRADE_GRAFICO} vertical={false} />
        <XAxis dataKey="mes" tick={EIXO_GRAFICO} axisLine={false} tickLine={false} />
        <YAxis tick={EIXO_GRAFICO} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_GRAFICO} />
        <Area
          type="monotone"
          dataKey="total"
          stroke={CORES.accentGreen}
          strokeWidth={2}
          fill="url(#membrosFill)"
          dot={{ r: 4, fill: CORES.accentGreen, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
