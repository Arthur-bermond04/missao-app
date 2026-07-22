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
  Search,
  type LucideIcon,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { Logo } from '@/components/ui/Logo';
import { BuscaGlobal } from '@/components/layout/BuscaGlobal';
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

// Cores fixas do novo padrão da sidebar (só o logo e o item ativo usam o
// dourado cheio — o resto usa tons discretos, pra criar hierarquia visual
// em vez de tudo competir pela mesma cor de destaque).
const COR_INATIVO = '#A89880';
const COR_INATIVO_HOVER = '#C4B49A';
const COR_LABEL_GRUPO = '#6B5E4E';
const COR_ATIVO = '#C9A84C';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, sair } = usePainelSession();
  const [nomeComunidade, setNomeComunidade] = useState('');
  const [buscaAberta, setBuscaAberta] = useState(false);
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

  async function handleSair() {
    await sair();
    router.replace('/login');
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-20 hidden w-[72px] flex-col overflow-y-auto text-white md:flex lg:w-[240px]"
      style={{ backgroundColor: '#1E1810' }}
    >
      {usuario?.comunidade_id && (
        <BuscaGlobal open={buscaAberta} onClose={() => setBuscaAberta(false)} comunidadeId={usuario.comunidade_id} />
      )}

      <div className="px-5 pb-4 pt-6">
        <div className="flex items-center justify-center lg:hidden">
          <Logo size={32} variant="dark" />
        </div>
        <div className="hidden lg:flex">
          <Logo size={36} variant="dark" showText />
        </div>
        {!!nomeComunidade && (
          <p className="mt-1 hidden truncate text-xs lg:block" style={{ color: '#6B5E4E' }}>
            {nomeComunidade}
          </p>
        )}
      </div>

      {/* Busca global — abre a mesma paleta de comando (Ctrl+K) usada no resto do app */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => setBuscaAberta(true)}
          title="Buscar (Ctrl+K)"
          className="flex w-full items-center justify-center gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors focus:outline-none lg:justify-start"
          style={{ backgroundColor: '#2C2416', borderColor: 'transparent', color: '#6B5E4E' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#C9A84C')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'transparent')}
        >
          <Search size={16} />
          <span className="hidden flex-1 text-left lg:inline">Buscar...</span>
        </button>
      </div>

      <nav className="mt-1 flex-1 space-y-1 px-3 pb-3">
        {NAV_GRUPOS.map((grupo, indiceGrupo) => (
          <div key={grupo.titulo}>
            {indiceGrupo > 0 && (
              <div className="my-2 mx-0 h-px" style={{ backgroundColor: 'rgba(201,168,76,0.15)' }} />
            )}
            <p
              className="hidden px-3 pb-1 pt-2 text-[10px] font-bold uppercase lg:block"
              style={{ color: COR_LABEL_GRUPO, letterSpacing: '0.07em' }}
            >
              {grupo.titulo}
            </p>
            <div className="space-y-0.5">
              {grupo.itens.map((item) => {
                if (item.tipo === 'link') {
                  const ativo = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className="group flex items-center justify-center gap-3 rounded-none border-l-[3px] px-3 py-2 text-sm font-medium transition-colors lg:justify-start"
                      style={{
                        borderColor: ativo ? COR_ATIVO : 'transparent',
                        backgroundColor: ativo ? 'rgba(201,168,76,0.12)' : 'transparent',
                        color: ativo ? COR_ATIVO : COR_INATIVO,
                      }}
                      onMouseEnter={(e) => {
                        if (!ativo) e.currentTarget.style.color = COR_INATIVO_HOVER;
                      }}
                      onMouseLeave={(e) => {
                        if (!ativo) e.currentTarget.style.color = COR_INATIVO;
                      }}
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
                      className="flex w-full items-center justify-center gap-3 rounded-none border-l-[3px] px-3 py-2 text-sm font-medium transition-colors lg:justify-start"
                      style={{
                        borderColor: algumAtivo ? COR_ATIVO : 'transparent',
                        backgroundColor: algumAtivo ? 'rgba(201,168,76,0.12)' : 'transparent',
                        color: algumAtivo ? COR_ATIVO : COR_INATIVO,
                      }}
                      onMouseEnter={(e) => {
                        if (!algumAtivo) e.currentTarget.style.color = COR_INATIVO_HOVER;
                      }}
                      onMouseLeave={(e) => {
                        if (!algumAtivo) e.currentTarget.style.color = COR_INATIVO;
                      }}
                    >
                      <Icon size={18} />
                      <span className="hidden flex-1 text-left lg:inline">{item.label}</span>
                      <ChevronDown
                        size={14}
                        className={`hidden transition-transform lg:block ${aberto ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {aberto && (
                      <div className="ml-6 mt-1 hidden space-y-1 border-l pl-3 lg:block" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
                        {item.itens.map((sub) => {
                          const ativo = pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className="block rounded-none px-2 py-1.5 text-xs font-medium transition-colors"
                              style={{ color: ativo ? COR_ATIVO : COR_INATIVO }}
                              onMouseEnter={(e) => {
                                if (!ativo) e.currentTarget.style.color = COR_INATIVO_HOVER;
                              }}
                              onMouseLeave={(e) => {
                                if (!ativo) e.currentTarget.style.color = COR_INATIVO;
                              }}
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

      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(201,168,76,0.15)' }}>
        <div className="flex items-center justify-center gap-2 lg:justify-start">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ backgroundColor: COR_ATIVO, color: '#1E1810' }}
          >
            {usuario ? iniciais(usuario.nome) : ''}
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-semibold" style={{ color: '#D4C4A8' }}>
              {usuario?.nome}
            </p>
            <p className="text-xs" style={{ color: '#6B5E4E' }}>
              {usuario ? PERFIL_LABEL_SIDEBAR[usuario.perfil] : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleSair}
          title="Sair"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors lg:justify-start"
          style={{ borderColor: '#6B5E4E', color: '#6B5E4E' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = COR_INATIVO)}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6B5E4E')}
        >
          <LogOut size={14} />
          <span className="hidden lg:inline">Sair</span>
        </button>
      </div>
    </aside>
  );
}
