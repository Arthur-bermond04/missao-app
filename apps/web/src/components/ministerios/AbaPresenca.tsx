'use client';

import { useMemo } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { CalendarClock } from 'lucide-react';
import { chaveMembroMinisterio, type MembroDetalhe, type MembroPessoaDetalhe } from '@/lib/ministerios';
import type { MinisterioEncontro, MinisterioPresenca } from '@/types/database';

interface AbaPresencaProps {
  membros: MembroDetalhe[];
  membrosPessoa?: MembroPessoaDetalhe[];
  encontros: MinisterioEncontro[];
  presencas: MinisterioPresenca[];
}

export function AbaPresenca({ membros, membrosPessoa = [], encontros, presencas }: AbaPresencaProps) {
  const todosMembros = useMemo(() => [...membros, ...membrosPessoa], [membros, membrosPessoa]);

  // últimos 6 encontros (mais recentes), em ordem cronológica crescente para a tabela
  const ultimos6 = useMemo(
    () => [...encontros].sort((a, b) => a.data.localeCompare(b.data)).slice(-6),
    [encontros]
  );

  // presença por (encontro, membro) — chave unificada usuario_id/pessoa_id
  const mapa = useMemo(() => {
    const m = new Map<string, MinisterioPresenca>();
    for (const p of presencas) {
      const chave = p.usuario_id ?? p.pessoa_id;
      if (chave) m.set(`${p.encontro_id}:${chave}`, p);
    }
    return m;
  }, [presencas]);

  // frequência de cada membro nos últimos 6 encontros
  const frequencia = useMemo(() => {
    const freq = new Map<string, number>();
    if (ultimos6.length === 0) return freq;
    for (const membro of todosMembros) {
      const chave = chaveMembroMinisterio(membro);
      let presentes = 0;
      for (const e of ultimos6) {
        if (mapa.get(`${e.id}:${chave}`)?.presente) presentes += 1;
      }
      freq.set(chave, Math.round((presentes / ultimos6.length) * 100));
    }
    return freq;
  }, [todosMembros, ultimos6, mapa]);

  // frequência 3 meses para destaque de gargalo
  const freq3m = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 90);
    const limiteIso = limite.toISOString().slice(0, 10);
    const encontros3m = encontros.filter((e) => e.data >= limiteIso);
    const freq = new Map<string, number>();
    if (encontros3m.length === 0) return freq;
    for (const membro of todosMembros) {
      const chave = chaveMembroMinisterio(membro);
      let presentes = 0;
      for (const e of encontros3m) if (mapa.get(`${e.id}:${chave}`)?.presente) presentes += 1;
      freq.set(chave, Math.round((presentes / encontros3m.length) * 100));
    }
    return freq;
  }, [todosMembros, encontros, mapa]);

  if (encontros.length === 0 || todosMembros.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Sem dados de presença"
        description="Registre encontros com presença para acompanhar a frequência dos membros."
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Barras de frequência (últimos 6 encontros) */}
      <div>
        <h3 className="text-sm font-bold text-text-primary">Frequência nos últimos {ultimos6.length} encontros</h3>
        <div className="mt-3 space-y-3">
          {todosMembros.map((m) => {
            const chave = chaveMembroMinisterio(m);
            const f = frequencia.get(chave) ?? 0;
            const gargalo = (freq3m.get(chave) ?? 100) < 50;
            return (
              <div key={chave}>
                <div className="flex justify-between text-sm">
                  <span className={gargalo ? 'font-semibold text-warning' : 'text-text-primary'}>
                    {m.nome} {gargalo && '· gargalo'}
                  </span>
                  <span className="text-text-secondary">{f}%</span>
                </div>
                <div className="mt-1 h-2.5 w-full rounded-full bg-bg-page">
                  <div
                    className="h-2.5 rounded-full"
                    style={{ width: `${f}%`, backgroundColor: gargalo ? '#DC2626' : '#22C55E' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-text-secondary">
          Membros em <span className="font-semibold text-warning">âmbar</span> estão abaixo de 50% de presença nos
          últimos 3 meses.
        </p>
      </div>

      {/* Tabela comparativa membro × encontro */}
      <div>
        <h3 className="text-sm font-bold text-text-primary">Comparativo por encontro</h3>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-page text-xs uppercase text-text-secondary">
                <th className="px-3 py-2">Membro</th>
                {ultimos6.map((e) => (
                  <th key={e.id} className="px-2 py-2 text-center">
                    {new Date(e.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todosMembros.map((m) => {
                const chave = chaveMembroMinisterio(m);
                return (
                  <tr key={chave} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 text-text-primary">{m.nome}</td>
                    {ultimos6.map((e) => {
                      const p = mapa.get(`${e.id}:${chave}`);
                      let simbolo = '—';
                      let cor = 'text-text-secondary';
                      if (p) {
                        if (p.presente) {
                          simbolo = '✓';
                          cor = 'text-accent';
                        } else if (p.justificativa) {
                          simbolo = 'J';
                          cor = 'text-warning';
                        } else {
                          simbolo = '✗';
                          cor = 'text-danger';
                        }
                      }
                      return (
                        <td key={e.id} className={`px-2 py-2 text-center font-semibold ${cor}`}>
                          {simbolo}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-text-secondary">✓ presente · ✗ ausente · J justificado</p>
      </div>
    </div>
  );
}
