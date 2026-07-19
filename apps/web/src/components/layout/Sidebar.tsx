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
  type LucideIcon,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePainelSession } from '@/lib/PainelSessionContext';
import type { Perfil } from '@/types/database';

export const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/funil', label: 'Funil', icon: Filter },
  { href: '/retiros', label: 'Retiros', icon: Tent },
  { href: '/ministerios', label: 'Ministérios', icon: HandHeart },
  { href: '/pastoral', label: 'Pastoral', icon: HeartHandshake },
  { href: '/mensagens', label: 'Mensagens', icon: MessageCircle },
  { href: '/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/membros', label: 'Membros', icon: Users },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

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
        <div className="flex items-center justify-center gap-2 lg:justify-start">
          <span className="text-xl leading-none">✝</span>
          <span className="hidden text-lg font-bold lg:inline">MissãoApp</span>
        </div>
        {!!nomeComunidade && <p className="mt-1 hidden text-xs text-primary-xlight lg:block">{nomeComunidade}</p>}
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const ativo = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center justify-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors lg:justify-start ${
                ativo
                  ? 'border-white bg-white/10 text-white'
                  : 'border-transparent text-white/75 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center justify-center gap-2 lg:justify-start">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
            {usuario ? iniciais(usuario.nome) : ''}
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-semibold">{usuario?.nome}</p>
            <p className="text-xs text-primary-xlight">{usuario ? PERFIL_LABEL_SIDEBAR[usuario.perfil] : ''}</p>
          </div>
        </div>
        <button
          onClick={handleSair}
          title="Sair"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs text-white/70 hover:bg-white/5 hover:text-white lg:justify-start"
        >
          <LogOut size={14} />
          <span className="hidden lg:inline">Sair</span>
        </button>
      </div>
    </aside>
  );
}
