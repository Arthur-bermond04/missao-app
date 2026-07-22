'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Menu } from 'lucide-react';
import { NAV } from './Sidebar';
import { NotificacoesBell } from './NotificacoesBell';

export function Topbar({ comunidadeId, onAbrirDrawer }: { comunidadeId: string; onAbrirDrawer: () => void }) {
  const pathname = usePathname();

  const secaoAtual = NAV.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-bg-card px-4 py-2.5 md:ml-[72px] md:px-6 lg:ml-[240px]">
      <button onClick={onAbrirDrawer} className="rounded-md p-1.5 text-text-primary hover:bg-bg-page md:hidden">
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-1 text-sm text-text-secondary">
        <span className="hidden md:inline">MissãoApp</span>
        {!!secaoAtual && (
          <>
            <ChevronRight size={14} className="hidden md:inline" />
            <span className="font-semibold text-text-primary">{secaoAtual.label}</span>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <NotificacoesBell comunidadeId={comunidadeId} />
      </div>
    </div>
  );
}
