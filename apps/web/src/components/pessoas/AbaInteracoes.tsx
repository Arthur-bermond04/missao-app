'use client';

import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { NovaInteracaoModal } from '@/components/pessoas/NovaInteracaoModal';
import { CANAIS_INTERACAO, TIPOS_INTERACAO, type PessoaInteracao } from '@/types/database';

const TIPO_LABEL = Object.fromEntries(TIPOS_INTERACAO.map((t) => [t.valor, t.label]));
const CANAL_LABEL = Object.fromEntries(CANAIS_INTERACAO.map((c) => [c.valor, c.label]));

export function AbaInteracoes({
  pessoaId,
  usuarioId,
  interacoes,
  onRefresh,
}: {
  pessoaId: string;
  usuarioId: string;
  interacoes: PessoaInteracao[];
  onRefresh: () => void;
}) {
  const [modalNova, setModalNova] = useState(false);

  return (
    <div>
      <NovaInteracaoModal
        open={modalNova}
        onClose={() => setModalNova(false)}
        pessoaId={pessoaId}
        usuarioId={usuarioId}
        onRegistrada={onRefresh}
      />
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary">Histórico de interações</h3>
        <Button size="sm" icon={MessageSquarePlus} onClick={() => setModalNova(true)}>
          Nova interação
        </Button>
      </div>

      {interacoes.length === 0 ? (
        <EmptyState
          icon={MessageSquarePlus}
          title="Nenhuma interação registrada"
          description="Registre contatos, visitas e conversas com esta pessoa."
          action={{ label: 'Nova interação', onClick: () => setModalNova(true) }}
        />
      ) : (
        <div className="mt-3 space-y-3">
          {interacoes.map((i) => (
            <div key={i.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">
                  {new Date(i.data).toLocaleDateString('pt-BR')}
                </span>
                <span className="rounded-full bg-bg-page px-2 py-0.5 text-xs text-text-secondary">
                  {TIPO_LABEL[i.tipo] ?? i.tipo}
                </span>
                {!!i.canal && (
                  <span className="rounded-full bg-bg-page px-2 py-0.5 text-xs text-text-secondary">
                    {CANAL_LABEL[i.canal] ?? i.canal}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-text-primary">{i.descricao}</p>
              {!!i.proximo_passo && (
                <p className="mt-2 rounded-md bg-bg-page p-2 text-sm text-text-primary">
                  <span className="font-semibold">Próximo passo:</span> {i.proximo_passo}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
