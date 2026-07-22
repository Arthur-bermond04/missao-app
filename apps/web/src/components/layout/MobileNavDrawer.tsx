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
      <div className="relative flex w-72 flex-col bg-white">
        <div className="flex items-center justify-between px-5 pb-5 pt-6">
          <Logo size={32} variant="color" showText />
          <button onClick={onClose} className="rounded-md p-1 hover:bg-[#F9FAFB]" style={{ color: '#6B7280' }}>
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
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: ativo ? '#E8F5EE' : 'transparent',
                  color: ativo ? '#1A7A4A' : '#374151',
                }}
              >
                <Icon size={18} color={ativo ? '#22C55E' : '#6B7280'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4" style={{ backgroundColor: '#F9FAFB', borderTop: '0.5px solid #E5E7EB' }}>
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: '#E8F5EE', color: '#1A7A4A' }}
            >
              {usuario ? iniciais(usuario.nome) : ''}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" style={{ color: '#111827' }}>
                {usuario?.nome}
              </p>
              <p className="text-xs" style={{ color: '#6B7280' }}>
                {usuario ? PERFIL_LABEL_SIDEBAR[usuario.perfil] : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleSair}
            className="mt-3 flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
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
