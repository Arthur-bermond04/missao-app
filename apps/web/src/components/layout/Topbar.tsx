'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Menu } from 'lucide-react';
import { montarNavGrupos } from '@/lib/navegacao';
import { useTerminologia } from '@/lib/terminologia';
import { NotificacoesBell } from './NotificacoesBell';
import { ParaFazerBell } from './ParaFazerBell';

export function Topbar({ comunidadeId, onAbrirDrawer }: { comunidadeId: string; onAbrirDrawer: () => void }) {
  const pathname = usePathname();
  const terminologia = useTerminologia();

  const nav = montarNavGrupos(terminologia).flatMap((g) => g.itens);
  const secaoAtual = nav.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <div className="sticky top-0 z-20 flex h-12 items-center gap-3 bg-topbar-bg px-4 md:ml-[72px] md:px-6 lg:ml-[240px]">
      <button
        onClick={onAbrirDrawer}
        aria-label="Abrir menu"
        className="rounded-md p-1.5 text-sidebar-text transition-colors hover:bg-sidebar-bg-hover hover:text-sidebar-text-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green md:hidden"
      >
        <Menu size={20} />
      </button>

      <nav aria-label="Trilha de navegação" className="flex items-center gap-1 text-sm">
        <span className="hidden text-sidebar-text md:inline">MissãoApp</span>
        {!!secaoAtual && (
          <>
            <ChevronRight size={14} className="hidden text-sidebar-text/60 md:inline" />
            <span className="font-medium text-sidebar-text-active">{secaoAtual.label}</span>
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <ParaFazerBell />
        <NotificacoesBell comunidadeId={comunidadeId} />
      </div>
    </div>
  );
}
