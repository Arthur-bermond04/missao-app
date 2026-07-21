'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu, Search } from 'lucide-react';
import { NAV } from './Sidebar';
import { BuscaGlobal } from './BuscaGlobal';
import { NotificacoesBell } from './NotificacoesBell';

export function Topbar({ comunidadeId, onAbrirDrawer }: { comunidadeId: string; onAbrirDrawer: () => void }) {
  const pathname = usePathname();
  const [buscaAberta, setBuscaAberta] = useState(false);

  const secaoAtual = NAV.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBuscaAberta(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-bg-card px-4 py-2.5 md:ml-[72px] md:px-6 lg:ml-[240px]">
      <BuscaGlobal open={buscaAberta} onClose={() => setBuscaAberta(false)} comunidadeId={comunidadeId} />

      <button onClick={onAbrirDrawer} className="rounded-md p-1.5 text-text-primary hover:bg-bg-page md:hidden">
        <Menu size={20} />
      </button>

      <div className="hidden items-center gap-1 text-sm text-text-secondary md:flex">
        <span>MissãoApp</span>
        {!!secaoAtual && (
          <>
            <ChevronRight size={14} />
            <span className="font-semibold text-text-primary">{secaoAtual.label}</span>
          </>
        )}
      </div>

      <button
        onClick={() => setBuscaAberta(true)}
        className="ml-2 flex flex-1 items-center gap-2 rounded-md border border-border bg-bg-page px-3 py-1.5 text-sm text-text-secondary hover:border-primary/40 md:ml-4 md:max-w-xs"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Buscar...</span>
        <span className="hidden rounded border border-border bg-bg-card px-1.5 py-0.5 text-[10px] font-semibold sm:inline">
          Ctrl+K
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <NotificacoesBell comunidadeId={comunidadeId} />
      </div>
    </div>
  );
}
