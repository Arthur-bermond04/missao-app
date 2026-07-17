'use client';

import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, X } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { NAV, PERFIL_LABEL_SIDEBAR, iniciais } from './Sidebar';

export function MobileNavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, sair } = usePainelSession();

  if (!open || typeof document === 'undefined') return null;

  async function handleSair() {
    await sair();
    router.replace('/login');
  }

  return createPortal(
    <div className="fixed inset-0 z-30 flex md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex w-72 flex-col bg-primary text-white">
        <div className="flex items-center justify-between px-5 pb-5 pt-6">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">✝</span>
            <span className="text-lg font-bold">MissãoApp</span>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const ativo = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-md border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors ${
                  ativo ? 'border-white bg-white/10 text-white' : 'border-transparent text-white/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
              {usuario ? iniciais(usuario.nome) : ''}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{usuario?.nome}</p>
              <p className="text-xs text-primary-xlight">{usuario ? PERFIL_LABEL_SIDEBAR[usuario.perfil] : ''}</p>
            </div>
          </div>
          <button
            onClick={handleSair}
            className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-white/70 hover:bg-white/5 hover:text-white"
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
