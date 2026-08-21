'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Users } from 'lucide-react';
import { listarEncontrosCelula, listarFrequenciaCelula, listarPresencasDaCelula, type ParticipanteFrequencia } from '@/lib/celulas';
import type { CelulaEncontro } from '@/types/database';

function dataLegivel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Histórico de encontros + frequência agregada da célula. Diferente da
// AbaPresenca de Ministérios (grade roster × encontro), aqui não há roster
// fixo pra comparar — a lista de quem apareceu muda a cada encontro — então
// mostramos o log de encontros e um ranking de frequência de quem já esteve.
export function HistoricoEncontrosCelula({ celulaId, recarregarChave }: { celulaId: string; recarregarChave: number }) {
  const [encontros, setEncontros] = useState<CelulaEncontro[]>([]);
  const [contagemPorEncontro, setContagemPorEncontro] = useState<Map<string, number>>(new Map());
  const [frequencia, setFrequencia] = useState<ParticipanteFrequencia[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    Promise.all([listarEncontrosCelula(celulaId), listarPresencasDaCelula(celulaId), listarFrequenciaCelula(celulaId)])
      .then(([enc, presencas, freq]) => {
        setEncontros(enc);
        const contagem = new Map<string, number>();
        for (const p of presencas) {
          if (!p.presente) continue;
          contagem.set(p.encontro_id, (contagem.get(p.encontro_id) ?? 0) + 1);
        }
        setContagemPorEncontro(contagem);
        setFrequencia(freq);
      })
      .catch(() => {
        setEncontros([]);
        setFrequencia([]);
      })
      .finally(() => setCarregando(false));
  }, [celulaId, recarregarChave]);

  if (carregando) return <p className="text-sm text-text-secondary">Carregando...</p>;

  if (encontros.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-center">
        <CalendarClock size={20} className="mx-auto text-text-secondary" />
        <p className="mt-2 text-sm text-text-secondary">Nenhum encontro registrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-text-secondary">
          Encontros ({encontros.length})
        </h4>
        <div className="mt-2 space-y-1.5">
          {encontros.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span className="text-text-primary">{dataLegivel(e.data)}</span>
              <span className="flex items-center gap-1 text-text-secondary">
                <Users size={12} /> {contagemPorEncontro.get(e.id) ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {frequencia.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-text-secondary">
            Frequência (últimos 90 dias)
          </h4>
          <div className="mt-2 space-y-2">
            {frequencia.map((p) => (
              <div key={p.chave}>
                <div className="flex justify-between text-sm">
                  <span className={p.frequencia < 50 ? 'font-semibold text-warning' : 'text-text-primary'}>{p.nome}</span>
                  <span className="text-text-secondary">{p.frequencia}%</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-bg-page">
                  <div
                    className={`h-2 rounded-full ${p.frequencia < 50 ? 'bg-danger' : 'bg-accent-green'}`}
                    style={{ width: `${p.frequencia}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
