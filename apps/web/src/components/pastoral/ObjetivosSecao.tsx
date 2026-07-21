'use client';

import { useState } from 'react';
import { Target, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { concluirObjetivo, definirNovoObjetivo } from '@/lib/pastoral';
import { toastError, toastSuccess } from '@/lib/toast';
import type { PastoralObjetivo } from '@/types/database';

export function ObjetivosSecao({
  ovelhaId,
  objetivoAtual,
  historico,
  onAtualizado,
}: {
  ovelhaId: string;
  objetivoAtual: string | null;
  historico: PastoralObjetivo[];
  onAtualizado: () => void;
}) {
  const [modoConcluir, setModoConcluir] = useState(false);
  const [modoNovo, setModoNovo] = useState(false);
  const [resultado, setResultado] = useState('');
  const [novoObjetivo, setNovoObjetivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const objetivoEmAndamento = historico.find((o) => !o.data_fim);

  async function handleConcluir() {
    if (!objetivoEmAndamento) return;
    setSalvando(true);
    try {
      await concluirObjetivo(objetivoEmAndamento.id, ovelhaId, resultado.trim() || 'Concluído');
      setResultado('');
      setModoConcluir(false);
      onAtualizado();
      toastSuccess('Objetivo marcado como atingido!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao concluir.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleNovoObjetivo() {
    if (!novoObjetivo.trim()) return;
    setSalvando(true);
    try {
      await definirNovoObjetivo(ovelhaId, novoObjetivo.trim());
      setNovoObjetivo('');
      setModoNovo(false);
      onAtualizado();
      toastSuccess('Novo objetivo definido!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao definir objetivo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="rounded-lg bg-bg-card p-6 shadow-card">
      <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
        <Target size={15} /> Objetivo do acompanhamento
      </h3>

      {objetivoAtual ? (
        <div className="mt-3 rounded-md border border-warning-light bg-warning-light/50 p-4">
          <p className="text-sm font-semibold text-text-primary">{objetivoAtual}</p>
          {!modoConcluir ? (
            <Button size="sm" variant="secondary" className="mt-3" icon={CheckCircle2} onClick={() => setModoConcluir(true)}>
              Marcar como atingido
            </Button>
          ) : (
            <div className="mt-3 space-y-2">
              <Textarea
                label="Resultado (opcional)"
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                rows={2}
                placeholder="O que mudou / como foi atingido"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleConcluir} loading={salvando}>
                  Confirmar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setModoConcluir(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : !modoNovo ? (
        <Button size="sm" className="mt-3" onClick={() => setModoNovo(true)}>
          Definir objetivo
        </Button>
      ) : (
        <div className="mt-3 space-y-2">
          <Textarea
            label="Novo objetivo"
            value={novoObjetivo}
            onChange={(e) => setNovoObjetivo(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleNovoObjetivo} loading={salvando}>
              Salvar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setModoNovo(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {historico.filter((o) => o.data_fim).length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">Objetivos anteriores</p>
          <div className="space-y-2">
            {historico
              .filter((o) => o.data_fim)
              .map((o) => (
                <div key={o.id} className="rounded-md border border-border p-2.5 text-sm">
                  <p className="font-medium text-text-primary">{o.objetivo}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(o.data_inicio).toLocaleDateString('pt-BR')} — {new Date(o.data_fim as string).toLocaleDateString('pt-BR')}
                  </p>
                  {!!o.resultado && <p className="mt-1 text-xs text-text-primary">{o.resultado}</p>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
