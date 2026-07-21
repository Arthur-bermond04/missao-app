'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { resumoNotificacoes, type ResumoNotificacoes } from '@/lib/notificacoes';

export function NotificacoesBell({ comunidadeId }: { comunidadeId: string }) {
  const [resumo, setResumo] = useState<ResumoNotificacoes | null>(null);
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resumoNotificacoes(comunidadeId).then(setResumo);
  }, [comunidadeId]);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  const total = resumo?.total ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="relative rounded-md p-2 text-text-secondary hover:bg-bg-page"
        title="Notificações"
      >
        <Bell size={18} />
        {total > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-lg border border-border bg-bg-card p-2 shadow-hover">
          <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-text-secondary">Notificações</p>
          {!resumo || resumo.itens.length === 0 ? (
            <p className="px-2 py-3 text-sm text-text-secondary">Tudo em dia — nenhum alerta agora.</p>
          ) : (
            <div className="mt-1 space-y-1">
              {resumo.itens.map((item) => (
                <Link
                  key={item.href}
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
          )}
        </div>
      )}
    </div>
  );
}
