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
  ScrollText,
  Users2,
  type LucideIcon,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { Logo } from '@/components/ui/Logo';
import { BuscaGlobal } from '@/components/layout/BuscaGlobal';
import type { AcaoPermissao, Perfil } from '@/types/database';

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Chave em permissoes_modulos. O item só aparece se o perfil logado tiver
   * a ação "ver" nesse módulo. Antes isso era uma lista fixa de perfis
   * (requerPerfil); agora quem decide é a matriz de permissões, configurável
   * por comunidade em Configurações › Permissões.
   */
  modulo: string;
}
interface NavGrupo {
  titulo: string;
  itens: NavLink[];
}

// Estrutura enxuta: cada rota aparece uma única vez, sem submenu — Pessoas,
// Pastoral e Ministérios já são cadastros de gente, não precisam de duas
// portas de entrada diferentes pra mesma tela.
export const NAV_GRUPOS: NavGrupo[] = [
  {
    titulo: 'Início',
    // Dashboard não tem módulo próprio: é a porta de entrada e cada bloco
    // dentro dele já respeita a permissão do seu módulo.
    itens: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, modulo: '' }],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { href: '/pessoas', label: 'Pessoas', icon: IdCard, modulo: 'pessoas' },
      { href: '/membros', label: 'Membros', icon: Users, modulo: 'membros' },
      { href: '/equipe', label: 'Equipe', icon: Network, modulo: 'equipe' },
    ],
  },
  {
    titulo: 'Missão',
    itens: [
      { href: '/funil', label: 'Funil', icon: Filter, modulo: 'funil' },
      { href: '/retiros', label: 'Retiros', icon: Tent, modulo: 'retiros' },
      { href: '/ministerios', label: 'Ministérios', icon: HandHeart, modulo: 'ministerios' },
      { href: '/celulas', label: 'Células', icon: Users2, modulo: 'celulas' },
      { href: '/pastoral', label: 'Pastoral', icon: HeartHandshake, modulo: 'pastoral' },
      { href: '/pastoral/monitoria', label: 'Monitoria pastoral', icon: Gauge, modulo: 'monitoria' },
      { href: '/agenda', label: 'Agenda', icon: Calendar, modulo: 'agenda' },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { href: '/alertas', label: 'Alertas', icon: Bell, modulo: 'alertas' },
      { href: '/mensagens', label: 'Comunicação', icon: MessageCircle, modulo: 'mensagens' },
      { href: '/financeiro', label: 'Financeiro', icon: Wallet, modulo: 'financeiro' },
      { href: '/relatorios', label: 'Relatórios', icon: BarChart3, modulo: 'relatorios' },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      { href: '/configuracoes', label: 'Configurações', icon: Settings, modulo: 'configuracoes' },
      { href: '/auditoria', label: 'Auditoria', icon: ScrollText, modulo: 'auditoria' },
    ],
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

export function podeVerItem(item: NavLink, pode: (modulo: string, acao: AcaoPermissao) => boolean): boolean {
  return !item.modulo || pode(item.modulo, 'ver');
}

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const letras = partes.length > 1 ? [partes[0][0], partes[partes.length - 1][0]] : [partes[0]?.[0] ?? ''];
  return letras.join('').toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, sair, pode } = usePainelSession();
  const [nomeComunidade, setNomeComunidade] = useState('');
  const [buscaAberta, setBuscaAberta] = useState(false);

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

  // Esconde da navegação os itens cujo módulo o perfil logado não pode ver,
  // segundo a matriz de permissões da comunidade — grupos que ficam vazios
  // depois do filtro simplesmente não aparecem.
  const gruposVisiveis = NAV_GRUPOS.map((grupo) => ({
    ...grupo,
    itens: grupo.itens.filter((item) => podeVerItem(item, pode)),
  })).filter((grupo) => grupo.itens.length > 0);

  return (
    <aside className="scrollbar-escura fixed inset-y-0 left-0 z-20 hidden w-[72px] flex-col overflow-y-auto bg-sidebar-bg md:flex lg:w-[240px]">
      {usuario?.comunidade_id && (
        <BuscaGlobal open={buscaAberta} onClose={() => setBuscaAberta(false)} comunidadeId={usuario.comunidade_id} />
      )}

      <div className="px-5 pb-4 pt-6">
        <div className="flex items-center justify-center lg:hidden">
          <Logo size={32} variant="white" />
        </div>
        <div className="hidden lg:flex">
          <Logo size={36} variant="white" showText />
        </div>
        {!!nomeComunidade && (
          <p className="mt-1 hidden truncate text-xs text-sidebar-text lg:block">{nomeComunidade}</p>
        )}
      </div>

      {/* Busca global — abre a mesma paleta de comando (Ctrl+K) usada no resto do app */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => setBuscaAberta(true)}
          title="Buscar (Ctrl+K)"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-sidebar-text transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-bg lg:justify-start"
        >
          <Search size={16} />
          <span className="hidden flex-1 text-left lg:inline">Buscar...</span>
        </button>
      </div>

      <nav className="mt-1 flex-1 space-y-1 px-2 pb-3">
        {gruposVisiveis.map((grupo, indiceGrupo) => (
          <div key={grupo.titulo}>
            {indiceGrupo > 0 && <div className="mx-3 my-1 h-px bg-sidebar-border" />}
            <p className="hidden px-3 pb-0.5 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-text/70 lg:block">
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
                    aria-current={ativo ? 'page' : undefined}
                    className={`mx-2 my-px flex items-center justify-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-bg lg:justify-start ${
                      ativo
                        ? 'bg-sidebar-bg-hover font-medium text-sidebar-text-active'
                        : 'text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active'
                    }`}
                  >
                    <Icon size={18} className={`shrink-0 ${ativo ? 'text-accent-green' : ''}`} />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center justify-center gap-2 lg:justify-start">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-sidebar-text-active">
            {usuario ? iniciais(usuario.nome) : ''}
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-[13px] font-medium text-sidebar-text-active">{usuario?.nome}</p>
            <p className="text-[11px] text-sidebar-text">{usuario ? PERFIL_LABEL_SIDEBAR[usuario.perfil] : ''}</p>
          </div>
        </div>
        <button
          onClick={handleSair}
          title="Sair"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-sidebar-border px-2 py-1.5 text-xs text-sidebar-text transition-colors hover:border-danger hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-bg lg:justify-start"
        >
          <LogOut size={14} />
          <span className="hidden lg:inline">Sair</span>
        </button>
      </div>
    </aside>
  );
}
