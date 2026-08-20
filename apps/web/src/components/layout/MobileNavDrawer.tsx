'use client';

import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, X } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { Logo } from '@/components/ui/Logo';
import { NAV, PERFIL_LABEL_SIDEBAR, iniciais, podeVerItem } from './Sidebar';

export function MobileNavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, sair, pode } = usePainelSession();

  if (!open || typeof document === 'undefined') return null;

  async function handleSair() {
    await sair();
    router.replace('/login');
  }

  return createPortal(
    <div className="fixed inset-0 z-30 flex md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="scrollbar-escura relative flex w-72 flex-col overflow-y-auto bg-sidebar-bg">
        <div className="flex items-center justify-between px-5 pb-5 pt-6">
          <Logo size={32} variant="white" showText />
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="rounded-md p-1 text-sidebar-text transition-colors hover:bg-sidebar-bg-hover hover:text-sidebar-text-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.filter((item) => podeVerItem(item, pode)).map((item) => {
            const ativo = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={ativo ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-bg ${
                  ativo
                    ? 'bg-sidebar-bg-hover text-sidebar-text-active'
                    : 'text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active'
                }`}
              >
                <Icon size={18} className={ativo ? 'text-accent-green' : ''} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-sidebar-text-active">
              {usuario ? iniciais(usuario.nome) : ''}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-text-active">{usuario?.nome}</p>
              <p className="text-xs text-sidebar-text">{usuario ? PERFIL_LABEL_SIDEBAR[usuario.perfil] : ''}</p>
            </div>
          </div>
          <button
            onClick={handleSair}
            className="mt-3 flex w-full items-center gap-2 rounded-md border border-sidebar-border px-2 py-1.5 text-xs text-sidebar-text transition-colors hover:border-danger hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-bg"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
