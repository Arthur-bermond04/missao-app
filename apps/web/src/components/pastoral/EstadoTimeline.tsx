'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
        <CartesianGrid strokeDasharray="3 3" stroke="#e2d9c8" vertical={false} />
        <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#6b6357' }} axisLine={false} tickLine={false} />
        <YAxis
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          tick={{ fontSize: 11, fill: '#6b6357' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => SCORE_LABEL[v as number] ?? String(v)}
          width={90}
        />
        <Tooltip
          formatter={(value) => [SCORE_LABEL[Number(value)] ?? String(value), 'Estado']}
          contentStyle={{ borderRadius: 8, borderColor: '#e2d9c8', fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#8b6a2a"
          strokeWidth={2}
          dot={{ r: 4, fill: '#8b6a2a', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
