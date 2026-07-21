'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Filter,
  Tent,
  MessageCircle,
  Wallet,
  Users,
  Settings,
  HandHeart,
  HeartHandshake,
  IdCard,
  type LucideIcon,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { Logo } from '@/components/ui/Logo';
import type { Perfil } from '@/types/database';

export const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pessoas', label: 'Pessoas', icon: IdCard },
  { href: '/funil', label: 'Funil', icon: Filter },
  { href: '/retiros', label: 'Retiros', icon: Tent },
  { href: '/ministerios', label: 'Ministérios', icon: HandHeart },
  { href: '/pastoral', label: 'Pastoral', icon: HeartHandshake },
  { href: '/mensagens', label: 'Mensagens', icon: MessageCircle },
  { href: '/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/membros', label: 'Membros', icon: Users },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

// Índices (0-based) depois dos quais entra um divisor ornamental na navegação
const DIVISORES_APOS_INDICE = new Set([1, 5, 7]);

export const PERFIL_LABEL_SIDEBAR: Record<Perfil, string> = {
  missionario: 'Missionário',
  lider: 'Líder',
  coordenador: 'Coordenador',
  padre: 'Padre',
  admin: 'Admin',
};

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const letras = partes.length > 1 ? [partes[0][0], partes[partes.length - 1][0]] : [partes[0]?.[0] ?? ''];
  return letras.join('').toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, sair } = usePainelSession();
  const [nomeComunidade, setNomeComunidade] = useState('');

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    supabase
      .from('comunidades')
      .select('nome')
      .eq('id', usuario.comunidade_id)
      .single()
      .then(({ data }) => setNomeComunidade((data as { nome: string } | null)?.nome ?? ''));
  }, [usuario?.comunidade_id]);

  async function handleSair() {
    await sair();
    router.replace('/login');
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[72px] flex-col bg-primary text-white md:flex lg:w-[240px]">
      <div className="px-5 pb-5 pt-6">
        <div className="flex items-center justify-center lg:hidden">
          <Logo size={32} variant="dark" />
        </div>
        <div className="hidden lg:flex">
          <Logo size={36} variant="dark" showText />
        </div>
        {!!nomeComunidade && <p className="mt-1 hidden text-xs text-stone lg:block">{nomeComunidade}</p>}
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map((item, index) => {
          const ativo = pathname === item.href;
          const Icon = item.icon;
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors lg:justify-start ${
                  ativo ? 'border-gold bg-gold/12 text-gold' : 'border-transparent text-stone hover:bg-white/5 hover:text-gold-light'
                }`}
              >
                <Icon size={18} />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
              {DIVISORES_APOS_INDICE.has(index) && (
                <div className="my-2 hidden items-center gap-2 px-2 lg:flex" aria-hidden="true">
                  <div className="h-px flex-1 bg-gold/20" />
                  <span className="text-[8px] text-gold/30">✝</span>
                  <div className="h-px flex-1 bg-gold/20" />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-gold/20 px-4 py-4">
        <div className="flex items-center justify-center gap-2 lg:justify-start">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-primary">
            {usuario ? iniciais(usuario.nome) : ''}
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-semibold text-[#F5E6C8]">{usuario?.nome}</p>
            <p className="text-xs text-stone">{usuario ? PERFIL_LABEL_SIDEBAR[usuario.perfil] : ''}</p>
          </div>
        </div>
        <button
          onClick={handleSair}
          title="Sair"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-stone px-2 py-1.5 text-xs text-stone transition-colors hover:border-gold hover:text-gold lg:justify-start"
        >
          <LogOut size={14} />
          <span className="hidden lg:inline">Sair</span>
        </button>
      </div>
    </aside>
  );
}
