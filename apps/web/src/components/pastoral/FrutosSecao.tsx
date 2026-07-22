'use client';

import { useState } from 'react';
import { Sparkles, Church, Rocket, HeartPulse, Cross, Star, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { RegistrarFrutoModal } from './RegistrarFrutoModal';
import { excluirFruto } from '@/lib/pastoral';
import { toastError, toastSuccess } from '@/lib/toast';
import type { PastoralFruto, TipoFrutoPastoral } from '@/types/database';

const ICONE_TIPO: Record<TipoFrutoPastoral, typeof Sparkles> = {
  conquista: Sparkles,
  sacramento: Church,
  missao: Rocket,
  cura: HeartPulse,
  conversao: Cross,
  outro: Star,
};

const LABEL_TIPO: Record<TipoFrutoPastoral, string> = {
  conquista: 'Conquista espiritual',
  sacramento: 'Sacramento',
  missao: 'Entrou na missão',
  cura: 'Cura',
  conversao: 'Conversão',
  outro: 'Outro',
};

export function FrutosSecao({
  ovelhaId,
  pastorId,
  frutos,
  onRefresh,
}: {
  ovelhaId: string;
  pastorId: string;
  frutos: PastoralFruto[];
  onRefresh: () => void;
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<PastoralFruto | null>(null);

  async function handleExcluir() {
    if (!paraExcluir) return;
    try {
      await excluirFruto(paraExcluir.id);
      toastSuccess('Fruto excluído.');
      setParaExcluir(null);
      onRefresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao excluir. Tente novamente.');
    }
  }

  return (
    <div className="rounded-lg bg-bg-card p-6 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary">Frutos</h3>
        <Button size="sm" icon={Plus} onClick={() => setModalAberto(true)}>
          Registrar fruto
        </Button>
      </div>

      <RegistrarFrutoModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        ovelhaId={ovelhaId}
        pastorId={pastorId}
        onRegistrado={onRefresh}
      />
      <ConfirmModal
        open={!!paraExcluir}
        onClose={() => setParaExcluir(null)}
        onConfirm={handleExcluir}
        title="Excluir este fruto?"
        description="Ação irreversível."
        confirmLabel="Excluir"
      />

      {frutos.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nenhum fruto registrado ainda"
          description="Documente conquistas espirituais, sacramentos e outras vitórias além dos encontros regulares."
        />
      ) : (
        <div className="mt-3 space-y-2">
          {frutos.map((f) => {
            const Icon = ICONE_TIPO[f.tipo] ?? Star;
            return (
              <div key={f.id} className="group flex items-start gap-3 rounded-md border border-border p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-xlight text-primary">
                  <Icon size={15} />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">{f.titulo}</p>
                    <span className="rounded-full bg-bg-page px-2 py-0.5 text-xs text-text-secondary">
                      {LABEL_TIPO[f.tipo] ?? f.tipo}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-text-secondary">{new Date(f.data).toLocaleDateString('pt-BR')}</p>
                  {!!f.descricao && <p className="mt-1 text-sm text-text-primary">{f.descricao}</p>}
                </div>
                <button
                  onClick={() => setParaExcluir(f)}
                  className="text-text-secondary opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
