'use client';

import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, X } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { Logo } from '@/components/ui/Logo';
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
          <Logo size={32} variant="dark" showText />
          <button onClick={onClose} className="rounded-md p-1 text-stone hover:bg-white/10">
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
                  ativo ? 'border-gold bg-gold/12 text-gold' : 'border-transparent text-stone hover:bg-white/5 hover:text-gold-light'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gold/20 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-xs font-bold text-primary">
              {usuario ? iniciais(usuario.nome) : ''}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#F5E6C8]">{usuario?.nome}</p>
              <p className="text-xs text-stone">{usuario ? PERFIL_LABEL_SIDEBAR[usuario.perfil] : ''}</p>
            </div>
          </div>
          <button
            onClick={handleSair}
            className="mt-3 flex w-full items-center gap-2 rounded-md border border-stone px-2 py-1.5 text-xs text-stone transition-colors hover:border-gold hover:text-gold"
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
