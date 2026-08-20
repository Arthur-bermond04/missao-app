'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ListChecks } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { listarParaFazer, type ItemParaFazer, type PrioridadeParaFazer } from '@/lib/paraFazer';

const COR_PRIORIDADE: Record<PrioridadeParaFazer, string> = {
  urgente: 'bg-danger',
  hoje: 'bg-warning',
  semana: 'bg-accent',
};

const LABEL_PRIORIDADE: Record<PrioridadeParaFazer, string> = {
  urgente: 'Urgente',
  hoje: 'Hoje',
  semana: 'Esta semana',
};

// Sino de pendências pessoais — dá acesso ao "Para fazer hoje" de qualquer
// tela, não só do dashboard. O badge conta só os itens urgentes + de hoje.
export function ParaFazerBell() {
  const { usuario } = usePainelSession();
  const [itens, setItens] = useState<ItemParaFazer[]>([]);
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!usuario?.id) return;
    listarParaFazer(usuario.id).then(setItens).catch(() => setItens([]));
  }, [usuario?.id]);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  const pendentesAgora = useMemo(
    () => itens.filter((i) => i.prioridade === 'urgente' || i.prioridade === 'hoje').length,
    [itens]
  );

  const grupos = useMemo(() => {
    const g: Record<PrioridadeParaFazer, ItemParaFazer[]> = { urgente: [], hoje: [], semana: [] };
    for (const i of itens) g[i.prioridade].push(i);
    return g;
  }, [itens]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="group relative rounded-md p-2 text-sidebar-text transition-colors hover:bg-sidebar-bg-hover hover:text-sidebar-text-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
        title="Para fazer"
      >
        <ListChecks size={18} />
        {pendentesAgora > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {pendentesAgora > 9 ? '9+' : pendentesAgora}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-40 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-lg border border-border bg-bg-card p-2 shadow-hover">
          <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-text-secondary">Para fazer</p>
          {itens.length === 0 ? (
            <p className="px-2 py-3 text-sm text-text-secondary">Tudo em dia! Nenhuma ação pendente. 🎉</p>
          ) : (
            <div className="mt-1 space-y-3">
              {(['urgente', 'hoje', 'semana'] as PrioridadeParaFazer[]).map((prioridade) => {
                const grupo = grupos[prioridade];
                if (grupo.length === 0) return null;
                return (
                  <div key={prioridade}>
                    <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-text-secondary/70">
                      {LABEL_PRIORIDADE[prioridade]}
                    </p>
                    <div className="space-y-1">
                      {grupo.map((item) => (
                        <Link
                          key={item.chave}
                          href={item.href}
                          onClick={() => setAberto(false)}
                          className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-bg-page"
                        >
                          <span className={`h-2 w-2 shrink-0 rounded-full ${COR_PRIORIDADE[prioridade]}`} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-text-primary">{item.nome}</span>
                            <span className="block truncate text-xs text-text-secondary">{item.descricao}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
