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
  Calendar,
  BarChart3,
  Search,
  Network,
  Bell,
  Gauge,
  Users2,
  type LucideIcon,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { Logo } from '@/components/ui/Logo';
import { BuscaGlobal } from '@/components/layout/BuscaGlobal';
import type { Perfil } from '@/types/database';

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  requerPerfil?: Perfil[];
}
interface NavGrupo {
  titulo: string;
  itens: NavLink[];
}

const PERFIS_GESTAO_FINANCEIRA: Perfil[] = ['coordenador', 'admin'];

// Estrutura enxuta: cada rota aparece uma única vez, sem submenu — Pessoas,
// Pastoral e Ministérios já são cadastros de gente, não precisam de duas
// portas de entrada diferentes pra mesma tela.
export const NAV_GRUPOS: NavGrupo[] = [
  {
    titulo: 'Início',
    itens: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { href: '/pessoas', label: 'Pessoas', icon: IdCard },
      { href: '/membros', label: 'Membros', icon: Users },
      { href: '/equipe', label: 'Equipe', icon: Network },
    ],
  },
  {
    titulo: 'Missão',
    itens: [
      { href: '/funil', label: 'Funil', icon: Filter },
      { href: '/retiros', label: 'Retiros', icon: Tent },
      { href: '/ministerios', label: 'Ministérios', icon: HandHeart },
      { href: '/celulas', label: 'Células', icon: Users2 },
      { href: '/pastoral', label: 'Pastoral', icon: HeartHandshake },
      { href: '/pastoral/monitoria', label: 'Monitoria pastoral', icon: Gauge, requerPerfil: PERFIS_GESTAO_FINANCEIRA },
      { href: '/agenda', label: 'Agenda', icon: Calendar },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { href: '/alertas', label: 'Alertas', icon: Bell, requerPerfil: PERFIS_GESTAO_FINANCEIRA },
      { href: '/mensagens', label: 'Comunicação', icon: MessageCircle },
      { href: '/financeiro', label: 'Financeiro', icon: Wallet, requerPerfil: PERFIS_GESTAO_FINANCEIRA },
      { href: '/relatorios', label: 'Relatórios', icon: BarChart3, requerPerfil: PERFIS_GESTAO_FINANCEIRA },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [{ href: '/configuracoes', label: 'Configurações', icon: Settings }],
  },
];

// Lista achatada — usada pelo breadcrumb da Topbar e pelo drawer mobile.
export const NAV: NavLink[] = NAV_GRUPOS.flatMap((g) => g.itens);

export const PERFIL_LABEL_SIDEBAR: Record<Perfil, string> = {
  missionario: 'Missionário',
  lider: 'Líder',
  coordenador: 'Coordenador',
  padre: 'Padre',
  admin: 'Admin',
};

export function podeVerItem(item: NavLink, perfil: Perfil | undefined): boolean {
  return !item.requerPerfil || (!!perfil && item.requerPerfil.includes(perfil));
}

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const letras = partes.length > 1 ? [partes[0][0], partes[partes.length - 1][0]] : [partes[0]?.[0] ?? ''];
  return letras.join('').toUpperCase();
}

// Cores fixas da identidade "Verde Missionário" — sidebar branca, acento
// verde só no item ativo e nos estados de hover/foco.
const COR_INATIVO_TEXTO = '#374151';
const COR_INATIVO_ICONE = '#6B7280';
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

  // Esconde da navegação os itens que o perfil logado não pode acessar
  // (Financeiro/Relatórios são coordenador/admin) — grupos que ficam
  // vazios depois do filtro simplesmente não aparecem.
  const gruposVisiveis = NAV_GRUPOS.map((grupo) => ({
    ...grupo,
    itens: grupo.itens.filter((item) => podeVerItem(item, usuario?.perfil)),
  })).filter((grupo) => grupo.itens.length > 0);

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
        {gruposVisiveis.map((grupo, indiceGrupo) => (
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
