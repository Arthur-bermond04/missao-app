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

// Cores fixas da identidade "Verde Missionário" — sidebar branca, acento
// verde só no item ativo e nos estados de hover/foco.
const COR_INATIVO_TEXTO = '#374151';
const COR_INATIVO_ICONE = '#6B7280';
const COR_HOVER_ICONE = '#1A7A4A';
const COR_LABEL_GRUPO = '#9CA3AF';
const COR_ATIVO_BG = '#E8F5EE';
const COR_ATIVO_TEXTO = '#1A7A4A';
const COR_ATIVO_ICONE = '#22C55E';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, sair } = usePainelSession();
  const [nomeComunidade, setNomeComunidade] = useState('');
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [buscaFocada, setBuscaFocada] = useState(false);
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
      className="fixed inset-y-0 left-0 z-20 hidden w-[72px] flex-col overflow-y-auto bg-white md:flex lg:w-[240px]"
      style={{ boxShadow: '1px 0 0 #E5E7EB' }}
    >
      {usuario?.comunidade_id && (
        <BuscaGlobal open={buscaAberta} onClose={() => setBuscaAberta(false)} comunidadeId={usuario.comunidade_id} />
      )}

      <div className="px-5 pb-4 pt-6">
        <div className="flex items-center justify-center lg:hidden">
          <Logo size={32} variant="color" />
        </div>
        <div className="hidden lg:flex">
          <Logo size={36} variant="color" showText />
        </div>
        {!!nomeComunidade && (
          <p className="mt-1 hidden truncate text-xs lg:block" style={{ color: '#6B7280' }}>
            {nomeComunidade}
          </p>
        )}
      </div>

      {/* Busca global — abre a mesma paleta de comando (Ctrl+K) usada no resto do app */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => setBuscaAberta(true)}
          onFocus={() => setBuscaFocada(true)}
          onBlur={() => setBuscaFocada(false)}
          title="Buscar (Ctrl+K)"
          className="flex w-full items-center justify-center gap-2 rounded-lg text-sm transition-colors focus:outline-none lg:justify-start"
          style={{
            backgroundColor: '#F3F4F6',
            border: buscaFocada ? '1.5px solid #22C55E' : '1.5px solid transparent',
            boxShadow: buscaFocada ? '0 0 0 3px rgba(34,197,94,0.1)' : 'none',
            color: '#9CA3AF',
            padding: '8px 12px',
          }}
        >
          <Search size={16} />
          <span className="hidden flex-1 text-left lg:inline">Buscar...</span>
        </button>
      </div>

      <nav className="mt-1 flex-1 space-y-1 px-2 pb-3">
        {NAV_GRUPOS.map((grupo, indiceGrupo) => (
          <div key={grupo.titulo}>
            {indiceGrupo > 0 && (
              <div style={{ height: '0.5px', background: '#F3F4F6', margin: '4px 12px' }} />
            )}
            <p
              className="hidden lg:block"
              style={{
                color: COR_LABEL_GRUPO,
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                padding: '0.6rem 0.75rem 0.2rem',
              }}
            >
              {grupo.titulo}
            </p>
            <div>
              {grupo.itens.map((item) => {
                if (item.tipo === 'link') {
                  const ativo = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className="group flex items-center justify-center gap-3 rounded-md text-sm transition-colors lg:justify-start"
                      style={{
                        margin: '1px 8px',
                        padding: '7px 10px',
                        backgroundColor: ativo ? COR_ATIVO_BG : 'transparent',
                        color: ativo ? COR_ATIVO_TEXTO : COR_INATIVO_TEXTO,
                        fontWeight: ativo ? 500 : 400,
                      }}
                      onMouseEnter={(e) => {
                        if (!ativo) {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                          e.currentTarget.style.color = '#111827';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!ativo) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = COR_INATIVO_TEXTO;
                        }
                      }}
                    >
                      <Icon size={18} color={ativo ? COR_ATIVO_ICONE : COR_INATIVO_ICONE} className="shrink-0" />
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
                      className="flex w-full items-center justify-center gap-3 rounded-md text-sm transition-colors lg:justify-start"
                      style={{
                        margin: '1px 8px',
                        padding: '7px 10px',
                        backgroundColor: algumAtivo ? COR_ATIVO_BG : 'transparent',
                        color: algumAtivo ? COR_ATIVO_TEXTO : COR_INATIVO_TEXTO,
                        fontWeight: algumAtivo ? 500 : 400,
                      }}
                      onMouseEnter={(e) => {
                        if (!algumAtivo) {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                          e.currentTarget.style.color = '#111827';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!algumAtivo) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = COR_INATIVO_TEXTO;
                        }
                      }}
                    >
                      <Icon size={18} color={algumAtivo ? COR_ATIVO_ICONE : COR_INATIVO_ICONE} className="shrink-0" />
                      <span className="hidden flex-1 text-left lg:inline">{item.label}</span>
                      <ChevronDown
                        size={14}
                        color={algumAtivo ? COR_ATIVO_ICONE : COR_INATIVO_ICONE}
                        className={`hidden transition-transform lg:block ${aberto ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {aberto && (
                      <div className="ml-6 mt-1 hidden space-y-1 border-l pl-3 lg:block" style={{ borderColor: '#E5E7EB' }}>
                        {item.itens.map((sub) => {
                          const ativo = pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className="block rounded-md px-2 py-1.5 text-xs transition-colors"
                              style={{
                                color: ativo ? COR_ATIVO_TEXTO : COR_INATIVO_TEXTO,
                                fontWeight: ativo ? 500 : 400,
                                backgroundColor: ativo ? COR_ATIVO_BG : 'transparent',
                              }}
                              onMouseEnter={(e) => {
                                if (!ativo) e.currentTarget.style.color = '#111827';
                              }}
                              onMouseLeave={(e) => {
                                if (!ativo) e.currentTarget.style.color = COR_INATIVO_TEXTO;
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

      <div className="px-4 py-4" style={{ backgroundColor: '#F9FAFB', borderTop: '0.5px solid #E5E7EB' }}>
        <div className="flex items-center justify-center gap-2 lg:justify-start">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ backgroundColor: '#E8F5EE', color: '#1A7A4A' }}
          >
            {usuario ? iniciais(usuario.nome) : ''}
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-medium" style={{ color: '#111827', fontSize: 13 }}>
              {usuario?.nome}
            </p>
            <p style={{ color: '#6B7280', fontSize: 11 }}>{usuario ? PERFIL_LABEL_SIDEBAR[usuario.perfil] : ''}</p>
          </div>
        </div>
        <button
          onClick={handleSair}
          title="Sair"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors lg:justify-start"
          style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
        >
          <LogOut size={14} />
          <span className="hidden lg:inline">Sair</span>
        </button>
      </div>
    </aside>
  );
}
