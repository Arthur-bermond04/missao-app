'use client';

import { Flag, Tent, ArrowUpCircle, ArrowDownCircle, Circle } from 'lucide-react';
import { ESTADOS_OVELHA_ENCONTRO, type PastoralEncontro, type PessoaRetiro } from '@/types/database';

interface MarcoJornada {
  data: string;
  tipo: 'inicio' | 'encontro' | 'retiro';
  label: string;
  cor?: string;
  tendencia?: 'sobe' | 'desce' | null;
}

export function JornadaTimeline({
  dataInicio,
  encontros,
  retiros,
}: {
  dataInicio: string;
  encontros: PastoralEncontro[];
  retiros: PessoaRetiro[];
}) {
  const encontrosOrdenados = [...encontros].sort((a, b) => a.data.localeCompare(b.data));

  const marcos: MarcoJornada[] = [
    { data: dataInicio, tipo: 'inicio' as const, label: 'Início do acompanhamento' },
    ...encontrosOrdenados.map((e, i) => {
      const cfg = ESTADOS_OVELHA_ENCONTRO.find((x) => x.valor === e.estado_ovelha);
      const anterior = encontrosOrdenados[i - 1];
      const cfgAnterior = anterior ? ESTADOS_OVELHA_ENCONTRO.find((x) => x.valor === anterior.estado_ovelha) : null;
      let tendencia: 'sobe' | 'desce' | null = null;
      if (cfg && cfgAnterior) {
        const indiceAtual = ESTADOS_OVELHA_ENCONTRO.indexOf(cfg);
        const indiceAnterior = ESTADOS_OVELHA_ENCONTRO.indexOf(cfgAnterior);
        if (indiceAtual < indiceAnterior) tendencia = 'sobe';
        else if (indiceAtual > indiceAnterior) tendencia = 'desce';
      }
      return {
        data: e.data,
        tipo: 'encontro' as const,
        label: `${cfg?.emoji ?? ''} ${cfg?.label ?? e.estado_ovelha}`,
        tendencia,
      };
    }),
    ...retiros.map((r) => ({ data: r.data_retiro, tipo: 'retiro' as const, label: r.nome_retiro })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative flex min-w-max items-start gap-6 px-1 pt-6">
        <div className="absolute left-5 right-5 top-[34px] h-px bg-border" />
        {marcos.map((m, i) => (
          <div key={`${m.tipo}-${i}`} className="relative flex flex-col items-center" style={{ minWidth: 96 }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-xlight text-primary">
              {m.tipo === 'inicio' && <Flag size={15} />}
              {m.tipo === 'retiro' && <Tent size={15} />}
              {m.tipo === 'encontro' &&
                (m.tendencia === 'sobe' ? (
                  <ArrowUpCircle size={15} className="text-accent" />
                ) : m.tendencia === 'desce' ? (
                  <ArrowDownCircle size={15} className="text-danger" />
                ) : (
                  <Circle size={10} className="fill-primary text-primary" />
                ))}
            </div>
            <p className="mt-2 text-center text-xs font-semibold text-text-primary">
              {new Date(m.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </p>
            <p className="text-center text-xs text-text-secondary">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
