'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { useTerminologia } from '@/lib/terminologia';
import { useSidebarLayout } from '@/lib/SidebarLayoutContext';
import { montarNavGrupos, type NavLink } from '@/lib/navegacao';
import { Logo } from '@/components/ui/Logo';
import { BuscaGlobal } from '@/components/layout/BuscaGlobal';
import type { AcaoPermissao, Perfil } from '@/types/database';

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
  const { usuario, pode } = usePainelSession();
  const terminologia = useTerminologia();
  const { colapsada } = useSidebarLayout();
  // Texto/rótulos só aparecem em telas lg+ E quando a sidebar não foi
  // encolhida manualmente — em md (sempre estreita) o toggle não tem efeito
  // nenhum, de propósito: não há o que "expandir" abaixo de lg.
  const mostrarTexto = !colapsada;
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

  // Esconde da navegação os itens cujo módulo o perfil logado não pode ver,
  // segundo a matriz de permissões da comunidade — grupos que ficam vazios
  // depois do filtro simplesmente não aparecem.
  const gruposVisiveis = montarNavGrupos(terminologia)
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.filter((item) => podeVerItem(item, pode)),
    }))
    .filter((grupo) => grupo.itens.length > 0);

  return (
    <aside
      className={`scrollbar-escura fixed inset-y-0 left-0 z-20 hidden w-[72px] flex-col overflow-y-auto bg-sidebar-bg md:flex ${
        colapsada ? '' : 'lg:w-[264px]'
      }`}
    >
      {usuario?.comunidade_id && (
        <BuscaGlobal open={buscaAberta} onClose={() => setBuscaAberta(false)} comunidadeId={usuario.comunidade_id} />
      )}

      {/*
        Colapsada (72px em lg): logo e botão empilhados e centralizados —
        lado a lado eles não cabem na largura estreita. Expandida (264px):
        lado a lado, botão empurrado pra direita.
      */}
      <div className={`flex px-5 pb-4 pt-6 ${colapsada ? 'flex-col items-center gap-3' : 'items-center gap-2'}`}>
        <div className={`flex items-center justify-center ${mostrarTexto ? 'lg:hidden' : ''}`}>
          <Logo size={32} variant="white" />
        </div>
        {mostrarTexto && (
          <div className="hidden lg:flex">
            <Logo size={36} variant="white" showText />
          </div>
        )}
      </div>

      {mostrarTexto && !!nomeComunidade && (
        <p className="-mt-3 hidden truncate px-5 pb-4 text-xs text-sidebar-text lg:block">{nomeComunidade}</p>
      )}

      {/* Busca global — abre a mesma paleta de comando (Ctrl+K) usada no resto do app */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => setBuscaAberta(true)}
          title="Buscar (Ctrl+K)"
          className={`flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-[15px] text-sidebar-text transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-bg ${
            mostrarTexto ? 'lg:justify-start' : ''
          }`}
        >
          <Search size={16} />
          <span className={`hidden flex-1 text-left ${mostrarTexto ? 'lg:inline' : ''}`}>Buscar...</span>
        </button>
      </div>

      <nav className="mt-1 flex-1 space-y-1 px-2 pb-3">
        {gruposVisiveis.map((grupo, indiceGrupo) => (
          <div key={grupo.titulo}>
            {indiceGrupo > 0 && <div className="mx-3 my-1 h-px bg-sidebar-border" />}
            <p
              className={`hidden px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-text/70 ${
                mostrarTexto ? 'lg:block' : ''
              }`}
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
                    title={`${item.label} — ${item.descricao}`}
                    aria-current={ativo ? 'page' : undefined}
                    className={`mx-2 my-px flex items-center justify-center gap-3 rounded-md px-2.5 py-2.5 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-bg ${
                      mostrarTexto ? 'lg:justify-start' : ''
                    } ${
                      ativo
                        ? 'bg-sidebar-bg-hover font-medium text-sidebar-text-active'
                        : 'text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active'
                    }`}
                  >
                    <Icon size={21} className={`shrink-0 ${ativo ? 'text-accent-green' : ''}`} />
                    <span className={`hidden ${mostrarTexto ? 'lg:inline' : ''}`}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

    </aside>
  );
}
