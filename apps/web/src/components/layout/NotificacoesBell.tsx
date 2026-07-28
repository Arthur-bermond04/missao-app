'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { resumoNotificacoes, LABEL_CATEGORIA, type ResumoNotificacoes } from '@/lib/notificacoes';

const ORDEM_CATEGORIAS = ['pastoral', 'pessoas', 'retiros', 'ministerios', 'financeiro', 'mensagens'] as const;

export function NotificacoesBell({ comunidadeId }: { comunidadeId: string }) {
  const { usuario } = usePainelSession();
  const [resumo, setResumo] = useState<ResumoNotificacoes | null>(null);
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resumoNotificacoes(comunidadeId, usuario?.perfil).then(setResumo);
  }, [comunidadeId, usuario?.perfil]);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  const total = resumo?.total ?? 0;

  const grupos = useMemo(() => {
    if (!resumo) return [];
    return ORDEM_CATEGORIAS.map((categoria) => ({
      categoria,
      itens: resumo.itens.filter((i) => i.categoria === categoria),
    })).filter((g) => g.itens.length > 0);
  }, [resumo]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="group relative rounded-md p-2 hover:bg-bg-page"
        style={{ color: '#6B7280' }}
        title="Notificações"
      >
        <Bell size={18} className="transition-colors group-hover:text-[#1A7A4A]" />
        {total > 0 && (
          <span
            className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ backgroundColor: '#22C55E' }}
          >
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-40 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-lg border border-border bg-bg-card p-2 shadow-hover">
          <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-text-secondary">Notificações</p>
          {grupos.length === 0 ? (
            <p className="px-2 py-3 text-sm text-text-secondary">Tudo em dia — nenhum alerta agora.</p>
          ) : (
            <div className="mt-1 space-y-3">
              {grupos.map((grupo) => (
                <div key={grupo.categoria}>
                  <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-text-secondary/70">
                    {LABEL_CATEGORIA[grupo.categoria]}
                  </p>
                  <div className="space-y-1">
                    {grupo.itens.map((item, indice) => (
                      <Link
                        key={`${grupo.categoria}-${indice}`}
                        href={item.href}
                        onClick={() => setAberto(false)}
                        className={`block rounded-md px-2 py-2 text-sm hover:bg-bg-page ${
                          item.tone === 'danger' ? 'text-danger' : 'text-warning'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/alertas"
            onClick={() => setAberto(false)}
            className="mt-2 block border-t border-border px-2 py-2 text-center text-xs font-medium text-primary hover:bg-bg-page"
          >
            Ver central de alertas →
          </Link>
        </div>
      )}
    </div>
  );
}
