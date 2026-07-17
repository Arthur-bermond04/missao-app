'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { UpgradePlanoModal } from './UpgradePlanoModal';
import type { Comunidade } from '@/types/database';

const PLANO_LABEL: Record<Comunidade['plano'], string> = {
  semente: 'Semente',
  missao: 'Missão',
  diocese: 'Diocese',
};

export function AbaPlano({ comunidade }: { comunidade: Comunidade }) {
  const [totalContatos, setTotalContatos] = useState(0);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    supabase
      .from('contatos')
      .select('id', { count: 'exact', head: true })
      .eq('comunidade_id', comunidade.id)
      .then(({ count }) => setTotalContatos(count ?? 0));
  }, [comunidade.id]);

  const limite = comunidade.max_contatos;
  const percentual = limite ? Math.min(100, (totalContatos / limite) * 100) : 0;

  return (
    <div className="max-w-md space-y-4">
      <div className="rounded-lg border border-border p-4">
        <p className="text-xs font-semibold text-text-secondary">Plano atual</p>
        <p className="mt-1 text-xl font-extrabold text-primary">{PLANO_LABEL[comunidade.plano]}</p>

        {limite ? (
          <>
            <p className="mt-3 text-sm text-text-secondary">
              {totalContatos} de {limite} contatos utilizados
            </p>
            <div className="mt-1 h-2 w-full rounded-full bg-bg-page">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${percentual}%` }} />
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">{totalContatos} contatos cadastrados · sem limite</p>
        )}

        {comunidade.plano === 'semente' && (
          <Button className="mt-4" variant="success" onClick={() => setModalAberto(true)}>
            Fazer upgrade
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="text-xs font-semibold text-text-secondary">Histórico de pagamentos</p>
        <p className="mt-2 text-sm text-text-secondary">Em breve.</p>
      </div>

      <UpgradePlanoModal open={modalAberto} onClose={() => setModalAberto(false)} planoAtual={comunidade.plano} />
    </div>
  );
}
