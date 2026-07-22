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
  Building2,
  Calendar,
  BarChart3,
  ChevronDown,
  type LucideIcon,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { Logo } from '@/components/ui/Logo';
import type { Perfil } from '@/types/database';

interface NavLink {
  tipo: 'link';
  href: string;
  label: string;
  icon: LucideIcon;
}
interface NavSubmenu {
  tipo: 'submenu';
  label: string;
  icon: LucideIcon;
  itens: { href: string; label: string }[];
}
type NavItem = NavLink | NavSubmenu;
interface NavGrupo {
  titulo: string;
  itens: NavItem[];
}

export const NAV_GRUPOS: NavGrupo[] = [
  {
    titulo: 'Início',
    itens: [{ tipo: 'link', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    titulo: 'Cadastros',
    itens: [
      {
        tipo: 'submenu',
        label: 'Pessoas',
        icon: IdCard,
        itens: [
          { href: '/pessoas', label: 'Evangelizados' },
          { href: '/pastoral', label: 'Ovelhas' },
          { href: '/ministerios', label: 'Membros de ministério' },
        ],
      },
      { tipo: 'link', href: '/configuracoes', label: 'Comunidade', icon: Building2 },
      { tipo: 'link', href: '/membros', label: 'Membros', icon: Users },
    ],
  },
  {
    titulo: 'Missão',
    itens: [
      { tipo: 'link', href: '/funil', label: 'Funil de evangelização', icon: Filter },
      { tipo: 'link', href: '/retiros', label: 'Retiros', icon: Tent },
      { tipo: 'link', href: '/ministerios', label: 'Ministérios', icon: HandHeart },
      { tipo: 'link', href: '/pastoral', label: 'Pastoral', icon: HeartHandshake },
      { tipo: 'link', href: '/agenda', label: 'Agenda', icon: Calendar },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { tipo: 'link', href: '/mensagens', label: 'Comunicação', icon: MessageCircle },
      { tipo: 'link', href: '/financeiro', label: 'Financeiro', icon: Wallet },
      { tipo: 'link', href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [{ tipo: 'link', href: '/configuracoes', label: 'Configurações', icon: Settings }],
  },
];

// Lista achatada e sem duplicatas (por href) — usada pelo breadcrumb da Topbar
// e pelo drawer mobile, que não precisam da estrutura em grupos/submenu.
// Links de topo (label limpo, ex. "Ministérios") têm prioridade sobre itens
// de submenu que apontam pra mesma rota (ex. "Pessoas · Membros de ministério"),
// pra não duplicar a mesma página duas vezes com labels diferentes na lista.
function construirNavAchatada(): { href: string; label: string; icon: LucideIcon }[] {
  const vistos = new Set<string>();
  const resultado: { href: string; label: string; icon: LucideIcon }[] = [];

  for (const grupo of NAV_GRUPOS) {
    for (const item of grupo.itens) {
      if (item.tipo === 'link' && !vistos.has(item.href)) {
        vistos.add(item.href);
        resultado.push({ href: item.href, label: item.label, icon: item.icon });
      }
    }
  }
  for (const grupo of NAV_GRUPOS) {
    for (const item of grupo.itens) {
      if (item.tipo === 'submenu') {
        for (const sub of item.itens) {
          if (!vistos.has(sub.href)) {
            vistos.add(sub.href);
            resultado.push({ href: sub.href, label: `${item.label} · ${sub.label}`, icon: item.icon });
          }
        }
      }
    }
  }
  return resultado;
}

export const NAV: { href: string; label: string; icon: LucideIcon }[] = construirNavAchatada();

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
  const [submenuAberto, setSubmenuAberto] = useState<string | null>(
    NAV_GRUPOS.flatMap((g) => g.itens).find(
      (item) => item.tipo === 'submenu' && item.itens.some((sub) => pathname === sub.href)
    )?.label ?? null
  );

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
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[72px] flex-col overflow-y-auto bg-primary text-white md:flex lg:w-[240px]">
      <div className="px-5 pb-5 pt-6">
        <div className="flex items-center justify-center lg:hidden">
          <Logo size={32} variant="dark" />
        </div>
        <div className="hidden lg:flex">
          <Logo size={36} variant="dark" showText />
        </div>
        {!!nomeComunidade && <p className="mt-1 hidden text-xs text-stone lg:block">{nomeComunidade}</p>}
      </div>

      <nav className="mt-2 flex-1 space-y-4 px-3 pb-3">
        {NAV_GRUPOS.map((grupo) => (
          <div key={grupo.titulo}>
            <p className="hidden px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gold/50 lg:block">
              {grupo.titulo}
            </p>
            <div className="space-y-1">
              {grupo.itens.map((item) => {
                if (item.tipo === 'link') {
                  const ativo = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={`flex items-center justify-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors lg:justify-start ${
                        ativo ? 'border-gold bg-gold/12 text-gold' : 'border-transparent text-stone hover:bg-white/5 hover:text-gold-light'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="hidden lg:inline">{item.label}</span>
                    </Link>
                  );
                }

                const Icon = item.icon;
                const algumAtivo = item.itens.some((sub) => pathname === sub.href);
                const aberto = submenuAberto === item.label || algumAtivo;
                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() => setSubmenuAberto((atual) => (atual === item.label ? null : item.label))}
                      title={item.label}
                      className={`flex w-full items-center justify-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors lg:justify-start ${
                        algumAtivo ? 'border-gold bg-gold/12 text-gold' : 'border-transparent text-stone hover:bg-white/5 hover:text-gold-light'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="hidden flex-1 text-left lg:inline">{item.label}</span>
                      <ChevronDown
                        size={14}
                        className={`hidden transition-transform lg:block ${aberto ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {aberto && (
                      <div className="ml-6 mt-1 hidden space-y-1 border-l border-gold/15 pl-3 lg:block">
                        {item.itens.map((sub) => {
                          const ativo = pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`block rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                                ativo ? 'text-gold' : 'text-stone hover:text-gold-light'
                              }`}
                            >
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
