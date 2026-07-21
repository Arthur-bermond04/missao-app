'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Financeiro } from '@/types/database';

const JANELAS = [
  { valor: 3, label: '3 meses' },
  { valor: 6, label: '6 meses' },
  { valor: 12, label: '12 meses' },
] as const;

function mesLabel(chave: string) {
  const [ano, mes] = chave.split('-');
  return `${mes}/${ano}`;
}

function inicioMes(offsetMeses: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMeses, 1);
  return d.toISOString().slice(0, 7);
}

export function EvolucaoFinanceiraChart({ lancamentos }: { lancamentos: Financeiro[] }) {
  const [janela, setJanela] = useState<3 | 6 | 12>(3);

  const dados = useMemo(() => {
    const meses = Array.from({ length: janela }, (_, i) => inicioMes(-(janela - 1 - i)));
    const porMes = new Map<string, { receitas: number; despesas: number }>();
    for (const l of lancamentos) {
      const chave = l.data.slice(0, 7);
      const atual = porMes.get(chave) ?? { receitas: 0, despesas: 0 };
      if (l.tipo === 'receita') atual.receitas += l.valor;
      else atual.despesas += l.valor;
      porMes.set(chave, atual);
    }
    return meses.map((chave) => ({ mes: mesLabel(chave), ...(porMes.get(chave) ?? { receitas: 0, despesas: 0 }) }));
  }, [lancamentos, janela]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-text-primary">Evolução</h2>
        <div className="flex gap-1">
          {JANELAS.map((j) => (
            <button
              key={j.valor}
              onClick={() => setJanela(j.valor)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                janela === j.valor ? 'bg-primary text-white' : 'bg-bg-page text-text-secondary hover:bg-primary-xlight'
              }`}
            >
              {j.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dados} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E8F0" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6B6B8A' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6B6B8A' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => `R$ ${(Number(value) || 0).toFixed(2)}`}
              contentStyle={{ borderRadius: 8, borderColor: '#E8E8F0', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => (value === 'receitas' ? 'Receitas' : 'Despesas')} />
            <Line type="monotone" dataKey="receitas" stroke="#0F6E56" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="despesas" stroke="#993C1D" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
