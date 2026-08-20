'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CORES, EIXO_GRAFICO, GRADE_GRAFICO, TOOLTIP_GRAFICO } from '@/lib/cores';
import { ESTADOS_OVELHA_ENCONTRO } from '@/types/database';

interface EstadoTimelineProps {
  data: { data: string; score: number }[];
}

const SCORE_LABEL: Record<number, string> = Object.fromEntries(
  ESTADOS_OVELHA_ENCONTRO.map((e) => [e.score, e.label])
);

export function EstadoTimeline({ data }: EstadoTimelineProps) {
  if (data.length === 0) {
    return <p className="text-sm text-text-secondary">Sem encontros registrados para montar a linha do tempo.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRADE_GRAFICO} vertical={false} />
        <XAxis dataKey="data" tick={EIXO_GRAFICO} axisLine={false} tickLine={false} />
        <YAxis
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          tick={EIXO_GRAFICO}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => SCORE_LABEL[v as number] ?? String(v)}
          width={90}
        />
        <Tooltip
          formatter={(value) => [SCORE_LABEL[Number(value)] ?? String(value), 'Estado']}
          contentStyle={TOOLTIP_GRAFICO}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke={CORES.primary}
          strokeWidth={2}
          dot={{ r: 4, fill: CORES.primary, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
